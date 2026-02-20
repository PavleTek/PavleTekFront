import api from './api';
import type { CalendarEvent, CalendarColorConfig, ApiResponse } from '../types';

export const calendarService = {
  async getAllEvents(from?: string, to?: string): Promise<{ events: CalendarEvent[] }> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    const url = query ? `/admin/calendar/events?${query}` : '/admin/calendar/events';
    const response = await api.get<ApiResponse & { events: CalendarEvent[] }>(url);
    return { events: response.data.events };
  },

  async getEventById(id: number): Promise<{ event: CalendarEvent }> {
    const response = await api.get<ApiResponse & { event: CalendarEvent }>(`/admin/calendar/events/${id}`);
    return { event: response.data.event };
  },

  async createEvent(data: { title: string; description?: string; timestamp: string }): Promise<{ event: CalendarEvent }> {
    const response = await api.post<ApiResponse & { event: CalendarEvent }>('/admin/calendar/events', data);
    return { event: response.data.event };
  },

  async updateEvent(
    id: number,
    data: { title?: string; description?: string; timestamp?: string }
  ): Promise<{ event: CalendarEvent }> {
    const response = await api.put<ApiResponse & { event: CalendarEvent }>(`/admin/calendar/events/${id}`, data);
    return { event: response.data.event };
  },

  async deleteEvent(id: number): Promise<void> {
    await api.delete<ApiResponse>(`/admin/calendar/events/${id}`);
  },

  async getColorConfig(): Promise<{ config: CalendarColorConfig }> {
    const response = await api.get<ApiResponse & { config: CalendarColorConfig }>('/admin/calendar/color-config');
    return { config: response.data.config };
  },

  async updateColorConfig(data: {
    colorStartDate: string;
    colorOne?: string;
    colorTwo?: string;
  }): Promise<{ config: CalendarColorConfig }> {
    const response = await api.put<ApiResponse & { config: CalendarColorConfig }>('/admin/calendar/color-config', data);
    return { config: response.data.config };
  },
};
