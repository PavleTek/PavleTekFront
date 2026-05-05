import React, { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import ErrorBanner from "./ErrorBanner";

const CHILE_TZ = "America/Santiago";
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i).padStart(2, "0"),
  label: String(i).padStart(2, "0") + ":00",
}));

/** Get current date (YYYY-MM-DD) and hour (0-23) in Chile */
function getNowInChile(): { dateStr: string; hour: number } {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-CA", { timeZone: CHILE_TZ }).replace(/\//g, "-");
  const hour = parseInt(now.toLocaleTimeString("en-CA", { timeZone: CHILE_TZ, hour12: false }).slice(0, 2), 10);
  return { dateStr, hour };
}

/** Return hour options that are in the future for the given date (Chile) */
function getAvailableHours(selectedDateStr: string): { value: string; label: string }[] {
  const { dateStr: todayChile, hour: currentHour } = getNowInChile();
  if (selectedDateStr > todayChile) {
    return HOUR_OPTIONS;
  }
  if (selectedDateStr < todayChile) {
    return [];
  }
  return HOUR_OPTIONS.filter((opt) => parseInt(opt.value, 10) > currentHour);
}

/** Convert a date (YYYY-MM-DD) and hour (0-23) in Chile to UTC ISO string */
function chileToUTC(dateStr: string, hour: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const chileStr = utcNoon.toLocaleString("en-CA", {
    timeZone: CHILE_TZ,
    hour12: false,
  });
  const chileHour = parseInt(chileStr.split(" ")[1]?.slice(0, 2) || "12", 10);
  const offset = 12 - chileHour;
  const utcDate = new Date(Date.UTC(y, m - 1, d, hour + offset, 0, 0));
  return utcDate.toISOString();
}

export interface SchedulePlatformUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (scheduledAt: string) => Promise<void>;
}

const SchedulePlatformUploadDialog: React.FC<SchedulePlatformUploadDialogProps> = ({
  open,
  onClose,
  onSchedule,
}) => {
  const [scheduling, setScheduling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleHour, setScheduleHour] = useState<string>("09");

  useEffect(() => {
    if (open) {
      const { dateStr: todayChile } = getNowInChile();
      setScheduleDate(todayChile);
      const available = getAvailableHours(todayChile);
      const firstHour = available.length > 0 ? available[0].value : "00";
      setScheduleHour(firstHour);
    }
  }, [open]);

  const availableHours = getAvailableHours(scheduleDate);
  const effectiveHour = availableHours.some((h) => h.value === scheduleHour)
    ? scheduleHour
    : availableHours[0]?.value ?? "00";

  useEffect(() => {
    if (!open) return;
    const hours = getAvailableHours(scheduleDate);
    if (hours.length > 0 && !hours.some((h) => h.value === scheduleHour)) {
      setScheduleHour(hours[0].value);
    }
  }, [open, scheduleDate]);

  const handleSchedule = async () => {
    try {
      setError(null);
      setScheduling(true);

      if (!scheduleDate) {
        setError("Please select a date");
        setScheduling(false);
        return;
      }

      if (availableHours.length === 0) {
        setError("No future hours available for the selected date. Please choose another date.");
        setScheduling(false);
        return;
      }

      const hourNum = parseInt(effectiveHour, 10);
      const scheduledAt = chileToUTC(scheduleDate, hourNum);
      const sendAtDate = new Date(scheduledAt);
      if (sendAtDate <= new Date()) {
        setError("Scheduled time must be in the future (Santiago, Chile time)");
        setScheduling(false);
        return;
      }

      await onSchedule(scheduledAt);
      closeDialog();
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || "Failed to schedule upload"
      );
    } finally {
      setScheduling(false);
    }
  };

  const closeDialog = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={closeDialog} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="max-w-md w-full bg-white rounded-lg shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Schedule Platform Upload
            </DialogTitle>
            <button
              onClick={closeDialog}
              className="text-gray-400 hover:text-gray-500 cursor-pointer"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload date
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  min={getNowInChile().dateStr}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hour (Santiago, Chile — America/Santiago)
                </label>
                <select
                  value={effectiveHour}
                  onChange={(e) => setScheduleHour(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                >
                  {availableHours.length === 0 ? (
                    <option value="">Select a future date first</option>
                  ) : (
                    availableHours.map((h) => (
                      <option key={h.value} value={h.value}>
                        {h.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={closeDialog}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                disabled={scheduling}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {scheduling ? "Scheduling..." : "Schedule Upload"}
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default SchedulePlatformUploadDialog;
