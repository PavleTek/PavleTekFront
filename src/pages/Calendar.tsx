import React, { useEffect, useState, useCallback } from 'react';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Card } from 'primereact/card';
import { Fieldset } from 'primereact/fieldset';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { calendarService } from '../services/calendarService';
import type { CalendarEvent as CalendarEventType, CalendarColorConfig } from '../types';

function getWeekColor(
  date: Date,
  startDate: Date,
  colorOne: string,
  colorTwo: string
): string {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = d.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'transparent';
  const weekIndex = Math.floor(diffDays / 7);
  return weekIndex % 2 === 0 ? colorOne : colorTwo;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type CalendarDateTemplateEvent = {
  day: number;
  month: number;
  year: number;
  otherMonth: boolean;
  today: boolean;
  selectable: boolean;
};

const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEventType[]>([]);
  const [colorConfig, setColorConfig] = useState<CalendarColorConfig | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [eventDialogVisible, setEventDialogVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventType | null>(null);
  const [eventForm, setEventForm] = useState({ title: '', description: '', timestamp: new Date() });
  const [savingEvent, setSavingEvent] = useState(false);
  const [colorConfigDialogVisible, setColorConfigDialogVisible] = useState(false);
  const [colorConfigDate, setColorConfigDate] = useState<Date | null>(null);
  const [savingColorConfig, setSavingColorConfig] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 6, 0);
      const { events: list } = await calendarService.getAllEvents(start.toISOString(), end.toISOString());
      setEvents(list);
    } catch (e) {
      console.error('Failed to load events', e);
      setEvents([]);
    }
  }, []);

  const loadColorConfig = useCallback(async () => {
    try {
      const { config } = await calendarService.getColorConfig();
      setColorConfig(config);
      if (!colorConfigDate && config.colorStartDate) {
        setColorConfigDate(new Date(config.colorStartDate));
      }
    } catch (e) {
      console.error('Failed to load color config', e);
      setColorConfig({
        id: 0,
        colorStartDate: new Date().toISOString(),
        colorOne: '#ef4444',
        colorTwo: '#22c55e',
      });
    }
  }, []);

  useEffect(() => {
    loadEvents();
    loadColorConfig();
  }, [loadEvents, loadColorConfig]);

  const config = colorConfig ?? {
    id: 0,
    colorStartDate: new Date().toISOString(),
    colorOne: '#ef4444',
    colorTwo: '#22c55e',
  };
  const startDate = new Date(config.colorStartDate);

  const eventsByDay = React.useMemo(() => {
    const map: Record<string, CalendarEventType[]> = {};
    events.forEach((ev) => {
      const key = toDateKey(new Date(ev.timestamp));
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    Object.keys(map).forEach((k) => map[k].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    return map;
  }, [events]);

  const selectedDateEvents = selectedDate ? eventsByDay[toDateKey(selectedDate)] ?? [] : [];

  const dateTemplate = (e: CalendarDateTemplateEvent) => {
    const date = new Date(e.year, e.month, e.day);
    const bgColor = getWeekColor(date, startDate, config.colorOne, config.colorTwo);
    const hasEvents = events.some((ev) => isSameDay(new Date(ev.timestamp), date));
    return (
      <div
        className="flex flex-col items-center justify-center w-full h-full min-h-[2.5rem]"
        style={{
          backgroundColor: bgColor !== 'transparent' ? `${bgColor}20` : undefined,
        }}
      >
        <span>{e.day}</span>
        {hasEvents && (
          <span className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-0.5" aria-hidden />
        )}
      </div>
    );
  };

  const openNewEventDialog = () => {
    setEditingEvent(null);
    setEventForm({
      title: '',
      description: '',
      timestamp: selectedDate ? new Date(selectedDate) : new Date(),
    });
    setEventDialogVisible(true);
  };

  const openEditEventDialog = (event: CalendarEventType) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description ?? '',
      timestamp: new Date(event.timestamp),
    });
    setEventDialogVisible(true);
  };

  const saveEvent = async () => {
    if (!eventForm.title.trim()) return;
    setSavingEvent(true);
    try {
      if (editingEvent) {
        await calendarService.updateEvent(editingEvent.id, {
          title: eventForm.title.trim(),
          description: eventForm.description.trim() || undefined,
          timestamp: eventForm.timestamp.toISOString(),
        });
      } else {
        await calendarService.createEvent({
          title: eventForm.title.trim(),
          description: eventForm.description.trim() || undefined,
          timestamp: eventForm.timestamp.toISOString(),
        });
      }
      setEventDialogVisible(false);
      loadEvents();
    } catch (err) {
      console.error('Failed to save event', err);
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = (event: CalendarEventType) => {
    confirmDialog({
      message: `Are you sure you want to delete "${event.title}"?`,
      header: 'Delete Event',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await calendarService.deleteEvent(event.id);
          loadEvents();
          if (editingEvent?.id === event.id) setEventDialogVisible(false);
        } catch (err) {
          console.error('Failed to delete event', err);
        }
      },
    });
  };

  const saveColorConfig = async () => {
    if (!colorConfigDate) return;
    setSavingColorConfig(true);
    try {
      const { config: next } = await calendarService.updateColorConfig({
        colorStartDate: colorConfigDate.toISOString(),
        colorOne: config.colorOne,
        colorTwo: config.colorTwo,
      });
      setColorConfig(next);
      setColorConfigDialogVisible(false);
    } catch (err) {
      console.error('Failed to save color config', err);
    } finally {
      setSavingColorConfig(false);
    }
  };

  return (
    <div className="calendar-page">
      <ConfirmDialog />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold m-0">Calendar</h1>
        <div className="flex gap-2">
          <Button
            label="Week colors"
            icon="pi pi-palette"
            onClick={() => {
              setColorConfigDate(colorConfig ? new Date(colorConfig.colorStartDate) : new Date());
              setColorConfigDialogVisible(true);
            }}
            outlined
            style={{ cursor: 'pointer' }}
          />
          <Button
            label="Add event"
            icon="pi pi-plus"
            onClick={openNewEventDialog}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <Card className="h-full">
            <Calendar
              value={selectedDate}
              viewDate={viewDate}
              onChange={(e) => setSelectedDate(e.value as Date | null)}
              onViewDateChange={(e) => setViewDate(e.value)}
              inline
              showWeek
              dateTemplate={dateTemplate}
              showOtherMonths
            />
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Card
            title={
              selectedDate
                ? selectedDate.toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Select a date'
            }
          >
            {selectedDate && (
              <div className="flex flex-col gap-2">
                {selectedDateEvents.length === 0 ? (
                  <p className="text-gray-500 m-0">No events for this date.</p>
                ) : (
                  selectedDateEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start justify-between gap-2 p-3 bg-gray-100 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{ev.title}</div>
                        {ev.description && (
                          <div className="text-sm text-gray-500 line-clamp-2 mt-1">{ev.description}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          {new Date(ev.timestamp).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          icon="pi pi-pencil"
                          rounded
                          text
                          severity="secondary"
                          onClick={() => openEditEventDialog(ev)}
                          style={{ cursor: 'pointer' }}
                          aria-label="Edit event"
                        />
                        <Button
                          icon="pi pi-trash"
                          rounded
                          text
                          severity="danger"
                          onClick={() => handleDeleteEvent(ev)}
                          style={{ cursor: 'pointer' }}
                          aria-label="Delete event"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog
        header={editingEvent ? 'Edit event' : 'New event'}
        visible={eventDialogVisible}
        onHide={() => setEventDialogVisible(false)}
        className="w-full max-w-md"
        contentStyle={{ padding: '1.5rem' }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              onClick={() => setEventDialogVisible(false)}
              text
              style={{ cursor: 'pointer' }}
            />
            <Button
              label={editingEvent ? 'Update' : 'Create'}
              onClick={saveEvent}
              loading={savingEvent}
              disabled={!eventForm.title.trim()}
              style={{ cursor: 'pointer' }}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Fieldset legend="Event details" className="mb-0">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="event-title" className="font-semibold">
                  Title
                </label>
                <InputText
                  id="event-title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full"
                  placeholder="Event title"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="event-desc" className="font-semibold">
                  Description (optional)
                </label>
                <InputTextarea
                  id="event-desc"
                  value={eventForm.description}
                  onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full"
                  placeholder="Add a description..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold">Date & time</label>
                <Calendar
                  value={eventForm.timestamp}
                  onChange={(e) => setEventForm((f) => ({ ...f, timestamp: (e.value as Date) ?? new Date() }))}
                  showTime
                  hourFormat="24"
                  className="w-full"
                />
              </div>
            </div>
          </Fieldset>
        </div>
      </Dialog>

      <Dialog
        header="Week color start date"
        visible={colorConfigDialogVisible}
        onHide={() => setColorConfigDialogVisible(false)}
        className="w-full max-w-md"
        contentStyle={{ padding: '1.5rem' }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              onClick={() => setColorConfigDialogVisible(false)}
              text
              style={{ cursor: 'pointer' }}
            />
            <Button
              label="Save"
              onClick={saveColorConfig}
              loading={savingColorConfig}
              disabled={!colorConfigDate}
              style={{ cursor: 'pointer' }}
            />
          </div>
        }
      >
        <p className="text-gray-500 m-0 mb-4">
          Choose the date when the first week color (red) starts. Weeks alternate every 7 days.
        </p>
        <Calendar
          value={colorConfigDate}
          onChange={(e) => setColorConfigDate(e.value as Date | null)}
          inline
          showWeek
          className="w-full"
        />
      </Dialog>
    </div>
  );
};

export default CalendarPage;
