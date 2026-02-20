import React, { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { emailService } from "../services/emailService";
import type { EmailSender, ScheduleSendRequest } from "../types";
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

export interface ScheduleSendDialogProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (data: ScheduleSendRequest) => Promise<void>;
  initialData?: {
    fromEmail?: string;
    toEmails?: string[];
    ccEmails?: string[];
    bccEmails?: string[];
    subject?: string;
    content?: string;
  };
}

const ScheduleSendDialog: React.FC<ScheduleSendDialogProps> = ({
  open,
  onClose,
  onSchedule,
  initialData,
}) => {
  const [emails, setEmails] = useState<EmailSender[]>([]);
  const [scheduling, setScheduling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFormData, setEmailFormData] = useState({
    fromEmail: "",
    toEmails: [] as string[],
    ccEmails: [] as string[],
    bccEmails: [] as string[],
    subject: "",
    content: "",
  });
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleHour, setScheduleHour] = useState<string>("09");
  const [toEmailInput, setToEmailInput] = useState("");
  const [ccEmailInput, setCcEmailInput] = useState("");
  const [bccEmailInput, setBccEmailInput] = useState("");

  useEffect(() => {
    if (open) {
      loadEmails();
      if (initialData) {
        setEmailFormData({
          fromEmail: initialData.fromEmail || "",
          toEmails: initialData.toEmails || [],
          ccEmails: initialData.ccEmails || [],
          bccEmails: initialData.bccEmails || [],
          subject: initialData.subject || "",
          content: initialData.content || "",
        });
      }
      const { dateStr: todayChile } = getNowInChile();
      setScheduleDate(todayChile);
      const available = getAvailableHours(todayChile);
      const firstHour = available.length > 0 ? available[0].value : "00";
      setScheduleHour(firstHour);
    }
  }, [open, initialData]);

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

  const loadEmails = async () => {
    try {
      const data = await emailService.getAllEmails();
      setEmails(data.emails);
      if (data.emails.length > 0 && !initialData?.fromEmail) {
        setEmailFormData((prev) => ({
          ...prev,
          fromEmail: data.emails[0].email,
        }));
      }
    } catch (err) {
      console.error("Failed to load emails:", err);
    }
  };

  const addEmailToArray = (email: string, array: string[]) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && !array.includes(trimmedEmail)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(trimmedEmail)) {
        return [...array, trimmedEmail];
      }
      setError(`Invalid email format: ${trimmedEmail}`);
      return null;
    }
    return array;
  };

  const addToEmail = () => {
    const result = addEmailToArray(toEmailInput, emailFormData.toEmails);
    if (result !== null) {
      setEmailFormData({ ...emailFormData, toEmails: result });
      setToEmailInput("");
    }
  };

  const addCcEmail = () => {
    const result = addEmailToArray(ccEmailInput, emailFormData.ccEmails);
    if (result !== null) {
      setEmailFormData({ ...emailFormData, ccEmails: result });
      setCcEmailInput("");
    }
  };

  const addBccEmail = () => {
    const result = addEmailToArray(bccEmailInput, emailFormData.bccEmails);
    if (result !== null) {
      setEmailFormData({ ...emailFormData, bccEmails: result });
      setBccEmailInput("");
    }
  };

  const removeEmail = (email: string, type: "to" | "cc" | "bcc") => {
    if (type === "to") {
      setEmailFormData({
        ...emailFormData,
        toEmails: emailFormData.toEmails.filter((e) => e !== email),
      });
    } else if (type === "cc") {
      setEmailFormData({
        ...emailFormData,
        ccEmails: emailFormData.ccEmails.filter((e) => e !== email),
      });
    } else {
      setEmailFormData({
        ...emailFormData,
        bccEmails: emailFormData.bccEmails.filter((e) => e !== email),
      });
    }
  };

  const handleSchedule = async () => {
    try {
      setError(null);
      setScheduling(true);

      let toEmails = [...emailFormData.toEmails];
      let ccEmails = [...emailFormData.ccEmails];
      let bccEmails = [...emailFormData.bccEmails];

      if (toEmailInput.trim()) {
        const result = addEmailToArray(toEmailInput, toEmails);
        if (result === null) {
          setScheduling(false);
          return;
        }
        toEmails = result;
      }
      if (ccEmailInput.trim()) {
        const result = addEmailToArray(ccEmailInput, ccEmails);
        if (result === null) {
          setScheduling(false);
          return;
        }
        ccEmails = result;
      }
      if (bccEmailInput.trim()) {
        const result = addEmailToArray(bccEmailInput, bccEmails);
        if (result === null) {
          setScheduling(false);
          return;
        }
        bccEmails = result;
      }

      if (
        !emailFormData.fromEmail ||
        toEmails.length === 0 ||
        !emailFormData.subject ||
        !emailFormData.content
      ) {
        setError(
          "From email, at least one recipient, subject, and content are required"
        );
        setScheduling(false);
        return;
      }

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
      const scheduledSendAt = chileToUTC(scheduleDate, hourNum);
      const sendAtDate = new Date(scheduledSendAt);
      if (sendAtDate <= new Date()) {
        setError("Scheduled time must be in the future (Santiago, Chile time)");
        setScheduling(false);
        return;
      }

      const data: ScheduleSendRequest = {
        scheduledSendAt,
        fromEmail: emailFormData.fromEmail,
        toEmails,
        ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
        bccEmails: bccEmails.length > 0 ? bccEmails : undefined,
        subject: emailFormData.subject,
        content: emailFormData.content,
      };

      await onSchedule(data);
      closeDialog();
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || "Failed to schedule send"
      );
    } finally {
      setScheduling(false);
    }
  };

  const closeDialog = () => {
    setError(null);
    setEmailFormData({
      fromEmail: emails[0]?.email || "",
      toEmails: [],
      ccEmails: [],
      bccEmails: [],
      subject: "",
      content: "",
    });
    setToEmailInput("");
    setCcEmailInput("");
    setBccEmailInput("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={closeDialog} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Schedule Invoice Send
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send date
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Email
              </label>
              <select
                value={emailFormData.fromEmail}
                onChange={(e) =>
                  setEmailFormData({ ...emailFormData, fromEmail: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
              >
                {emails.map((email) => (
                  <option key={email.id} value={email.email}>
                    {email.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Emails
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={toEmailInput}
                  onChange={(e) => setToEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addToEmail();
                    }
                  }}
                  placeholder="Enter email and press Enter"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  onClick={addToEmail}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm cursor-pointer"
                >
                  Add
                </button>
              </div>
              {emailFormData.toEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {emailFormData.toEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800 rounded text-sm"
                    >
                      {email}
                      <button
                        onClick={() => removeEmail(email, "to")}
                        className="text-primary-600 hover:text-primary-800 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CC Emails (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={ccEmailInput}
                  onChange={(e) => setCcEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCcEmail();
                    }
                  }}
                  placeholder="Enter email and press Enter"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  onClick={addCcEmail}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm cursor-pointer"
                >
                  Add
                </button>
              </div>
              {emailFormData.ccEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {emailFormData.ccEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800 rounded text-sm"
                    >
                      {email}
                      <button
                        onClick={() => removeEmail(email, "cc")}
                        className="text-primary-600 hover:text-primary-800 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                BCC Emails (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={bccEmailInput}
                  onChange={(e) => setBccEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBccEmail();
                    }
                  }}
                  placeholder="Enter email and press Enter"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  onClick={addBccEmail}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm cursor-pointer"
                >
                  Add
                </button>
              </div>
              {emailFormData.bccEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {emailFormData.bccEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800 rounded text-sm"
                    >
                      {email}
                      <button
                        onClick={() => removeEmail(email, "bcc")}
                        className="text-primary-600 hover:text-primary-800 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={emailFormData.subject}
                onChange={(e) =>
                  setEmailFormData({ ...emailFormData, subject: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Content
              </label>
              <textarea
                value={emailFormData.content}
                onChange={(e) =>
                  setEmailFormData({ ...emailFormData, content: e.target.value })
                }
                rows={5}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
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
                {scheduling ? "Scheduling..." : "Schedule Send"}
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default ScheduleSendDialog;
