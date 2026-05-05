import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  PaperClipIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { SelectButton } from "primereact/selectbutton";
import { SplitButton } from "primereact/splitbutton";
import { ProgressSpinner } from "primereact/progressspinner";
import { quoteInquiryService } from "../services/quoteInquiryService";
import { meetingRequestService } from "../services/meetingRequestService";
import type { QuoteInquiry, QuoteInquirySummary, InquiryStatus, MeetingRequest, MeetingStatus } from "../types/inquiries";
import SuccessBanner from "../components/SuccessBanner";
import ErrorBanner from "../components/ErrorBanner";
import ConfirmationDialog from "../components/ConfirmationDialog";

const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  archived: "Archived",
};

const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  new: "New",
  scheduled: "Scheduled",
  done: "Done",
  archived: "Archived",
};

const INQUIRY_STATUS_BADGE: Record<InquiryStatus, string> = {
  new: "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-600/10",
  contacted: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/10",
  qualified: "bg-green-50 text-green-800 ring-1 ring-inset ring-green-600/10",
  archived: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-500/10",
};

const MEETING_STATUS_BADGE: Record<MeetingStatus, string> = {
  new: "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-600/10",
  scheduled: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/10",
  done: "bg-green-50 text-green-800 ring-1 ring-inset ring-green-600/10",
  archived: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-500/10",
};

const BUDGET_LABELS: Record<string, string> = {
  lt_5k: "< $5k",
  "5k_15k": "$5k–$15k",
  "15k_50k": "$15k–$50k",
  "50k_150k": "$50k–$150k",
  "150k_500k": "$150k–$500k",
  "150k_plus": "$150k+",
  "1m_plus": "$1M+",
  unknown: "Unknown",
};

const CONTACT_METHOD_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  signal: "Signal",
};

const URGENCY_LABELS: Record<string, string> = {
  flexible: "Flexible",
  "1_3": "1–3 months",
  "3_6": "3–6 months",
  "6_plus": "6+ months",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Matches Invoicing list tables (tailwind divide + gray header row). */
const submissionsDataTablePt = {
  root: { className: "border-0" },
  wrapper: { className: "!border-0 shadow-none rounded-none bg-transparent" },
  table: { className: "min-w-full divide-y divide-gray-300" },
  thead: { className: "bg-gray-50" },
  tbody: { className: "divide-y divide-gray-200 bg-white" },
  headerRow: { className: "border-0" },
  bodyRow: { className: "border-0" },
  loadingOverlay: { className: "hidden" },
  paginator: {
    root: { className: "border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6" },
    firstPageButton: { className: "cursor-pointer" },
    prevPageButton: { className: "cursor-pointer" },
    nextPageButton: { className: "cursor-pointer" },
    lastPageButton: { className: "cursor-pointer" },
    pageButton: { className: "cursor-pointer" },
  },
};

const thFirst = "py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6";
const thMid = "px-3 py-3.5 text-left text-sm font-semibold text-gray-900";
const thActions = "py-3.5 pr-4 pl-3 text-right sm:pr-6";
const tdFirst = "py-4 pr-3 pl-4 text-sm sm:pl-6";
const tdMid = "px-3 py-4 text-sm whitespace-nowrap text-gray-500";
const tdStrong = "px-3 py-4 text-sm font-medium whitespace-nowrap text-gray-900";
const tdActions = "py-4 pr-4 pl-3 text-right text-sm sm:pr-6";

type SubmissionsTabOption = { label: string; value: string; icon: string };

const submissionsTabOptions: SubmissionsTabOption[] = [
  { label: "Quote Inquiries", value: "inquiries", icon: "pi pi-inbox" },
  { label: "Meeting Requests", value: "meetings", icon: "pi pi-calendar" },
];

const submissionsTabSelectPt = {
  root: {
    className:
      "inline-flex gap-0.5 rounded-xl border border-gray-200/90 bg-gray-100/90 p-1 shadow-inner",
  },
  button: (opts?: { context?: { selected?: boolean } }) => {
    const selected = !!opts?.context?.selected;
    return {
      className: [
        "!m-0 !rounded-lg !border-0 !shadow-none font-medium transition-all duration-150 cursor-pointer",
        selected
          ? "!bg-white !text-gray-900 !ring-1 !ring-gray-200 shadow-sm"
          : "!bg-transparent !text-gray-600 hover:!bg-white/70 hover:!text-gray-900",
      ].join(" "),
    };
  },
  label: {
    className: "text-sm px-3 py-2 font-semibold",
  },
};

const rowSplitButtonPt = {
  root: { className: "inline-flex" },
  button: { root: { className: "cursor-pointer" } },
  menuButton: { root: { className: "cursor-pointer" } },
  menuItem: { className: "cursor-pointer" },
};

const Submissions: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "meetings" ? "meetings" : "inquiries";

  const [inquiries, setInquiries] = useState<QuoteInquirySummary[]>([]);
  const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");

  const [inquiryDetail, setInquiryDetail] = useState<QuoteInquiry | null>(null);
  const [meetingDetail, setMeetingDetail] = useState<MeetingRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  const [editInquiryStatus, setEditInquiryStatus] = useState<InquiryStatus>("new");
  const [editMeetingStatus, setEditMeetingStatus] = useState<MeetingStatus>("new");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteInquiryTarget, setDeleteInquiryTarget] = useState<QuoteInquirySummary | null>(null);
  const [deleteMeetingTarget, setDeleteMeetingTarget] = useState<MeetingRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadInquiries = useCallback(async () => {
    try {
      setLoading(true);
      const result = await quoteInquiryService.list({ pageSize: 100 });
      setInquiries(result.data);
      setError(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || "Failed to load inquiries.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const result = await meetingRequestService.list({ pageSize: 100 });
      setMeetings(result.data);
      setError(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || "Failed to load meeting requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "inquiries") {
      loadInquiries();
    } else {
      loadMeetings();
    }
  }, [activeTab, loadInquiries, loadMeetings]);

  const openInquiryDetail = async (row: QuoteInquirySummary) => {
    setInquiryDetail(null);
    setMeetingDetail(null);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const full = await quoteInquiryService.getById(row.id);
      setInquiryDetail(full);
      setEditInquiryStatus(full.status as InquiryStatus);
      setEditNotes(full.adminNotes ?? "");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || "Failed to load inquiry details.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openMeetingDetail = (row: MeetingRequest) => {
    setInquiryDetail(null);
    setMeetingDetail(row);
    setEditMeetingStatus(row.status as MeetingStatus);
    setEditNotes(row.adminNotes ?? "");
    setDetailOpen(true);
  };

  const handleSaveInquiry = async () => {
    if (!inquiryDetail) return;
    setSaving(true);
    try {
      await quoteInquiryService.update(inquiryDetail.id, {
        status: editInquiryStatus,
        adminNotes: editNotes,
      });
      setSuccess("Inquiry updated.");
      setDetailOpen(false);
      loadInquiries();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || "Failed to update inquiry.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeeting = async () => {
    if (!meetingDetail) return;
    setSaving(true);
    try {
      await meetingRequestService.update(meetingDetail.id, {
        status: editMeetingStatus,
        adminNotes: editNotes,
      });
      setSuccess("Meeting request updated.");
      setDetailOpen(false);
      loadMeetings();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || "Failed to update meeting request.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInquiry = async () => {
    if (!deleteInquiryTarget) return;
    setDeleting(true);
    try {
      await quoteInquiryService.remove(deleteInquiryTarget.id);
      setSuccess("Inquiry deleted.");
      setDeleteInquiryTarget(null);
      loadInquiries();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || "Failed to delete inquiry.");
      setDeleteInquiryTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!deleteMeetingTarget) return;
    setDeleting(true);
    try {
      await meetingRequestService.remove(deleteMeetingTarget.id);
      setSuccess("Meeting request deleted.");
      setDeleteMeetingTarget(null);
      loadMeetings();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || "Failed to delete meeting request.");
      setDeleteMeetingTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const onTabChange = (e: { value: string }) => {
    if (e.value) {
      setSearchParams({ tab: e.value });
      setGlobalFilter("");
    }
  };

  const inquiryStatusBody = (row: QuoteInquirySummary) => {
    const s = row.status as InquiryStatus;
    const label = INQUIRY_STATUS_LABELS[s] ?? row.status;
    const badge = INQUIRY_STATUS_BADGE[s] ?? "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-500/10";
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${badge}`}>
        {label}
      </span>
    );
  };

  const meetingStatusBody = (row: MeetingRequest) => {
    const s = row.status as MeetingStatus;
    const label = MEETING_STATUS_LABELS[s] ?? row.status;
    const badge = MEETING_STATUS_BADGE[s] ?? "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-500/10";
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${badge}`}>
        {label}
      </span>
    );
  };

  const dateBody = (row: QuoteInquirySummary | MeetingRequest) => (
    <span className="whitespace-nowrap text-gray-500">{formatDate(row.createdAt)}</span>
  );

  const attachBody = (row: QuoteInquirySummary) =>
    row._count.attachments > 0 ? (
      <span className="inline-flex items-center gap-1 text-gray-500">
        <PaperClipIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{row._count.attachments}</span>
      </span>
    ) : (
      <span className="text-gray-400">—</span>
    );

  const rowActionsBody = (row: QuoteInquirySummary | MeetingRequest) => {
    const inquiry = activeTab === "inquiries";
    return (
      <div className="inline-flex justify-end" onClick={(e) => e.stopPropagation()}>
        <SplitButton
          label="View"
          icon="pi pi-eye"
          size="small"
          outlined
          severity="secondary"
          pt={rowSplitButtonPt}
          appendTo={typeof document !== "undefined" ? document.body : undefined}
          buttonClassName="!text-xs sm:!text-sm !font-semibold whitespace-nowrap"
          menuButtonClassName="shrink-0"
          menuClassName="min-w-[10rem]"
          onClick={
            inquiry
              ? () => openInquiryDetail(row as QuoteInquirySummary)
              : () => openMeetingDetail(row as MeetingRequest)
          }
          model={
            inquiry
              ? [
                  {
                    label: "Delete",
                    icon: "pi pi-trash",
                    className: "text-red-600",
                    command: () => setDeleteInquiryTarget(row as QuoteInquirySummary),
                  },
                ]
              : [
                  {
                    label: "Delete",
                    icon: "pi pi-trash",
                    className: "text-red-600",
                    command: () => setDeleteMeetingTarget(row as MeetingRequest),
                  },
                ]
          }
        />
      </div>
    );
  };

  const messagePreviewBody = (row: MeetingRequest) => (
    <span className="line-clamp-2 max-w-md text-gray-500">
      {row.message ? row.message.substring(0, 140) + (row.message.length > 140 ? "…" : "") : "—"}
    </span>
  );

  const tableToolbar = (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-base font-semibold leading-6 text-gray-900">
          {activeTab === "inquiries" ? "Quote Inquiries" : "Meeting Requests"}
        </span>
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          {activeTab === "inquiries" ? inquiries.length : meetings.length}
        </span>
        <button
          type="button"
          onClick={() => (activeTab === "inquiries" ? loadInquiries() : loadMeetings())}
          className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer transition-colors"
          title="Refresh"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-primary/15 focus-within:border-primary transition-shadow">
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-gray-400" />
        <InputText
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={activeTab === "inquiries" ? "Search name, email, project…" : "Search name or email…"}
          className="border-none shadow-none outline-none focus:ring-0 p-0 text-sm text-gray-800 bg-transparent w-52 md:w-64"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Submissions</h1>
        <SelectButton
          value={activeTab}
          options={submissionsTabOptions}
          optionLabel="label"
          optionValue="value"
          onChange={onTabChange}
          itemTemplate={(item: SubmissionsTabOption) => (
            <span className="flex items-center justify-center gap-2">
              <i className={item.icon + " text-sm opacity-90"} aria-hidden />
              <span>{item.label}</span>
            </span>
          )}
          pt={submissionsTabSelectPt}
        />
      </div>

      {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="mt-8 flow-root">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 sm:px-6 lg:px-8">{tableToolbar}</div>
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden bg-white shadow-sm outline-1 outline-black/5 sm:rounded-lg relative">
              {loading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                  <ProgressSpinner style={{ width: "40px", height: "40px" }} strokeWidth="4" />
                </div>
              )}

              {activeTab === "inquiries" ? (
                <DataTable
                  value={inquiries}
                  loading={false}
                  globalFilter={globalFilter}
                  globalFilterFields={["fullName", "email", "company", "projectName"]}
                  emptyMessage="No inquiries found."
                  rowHover
                  onRowClick={(e) => openInquiryDetail(e.data as QuoteInquirySummary)}
                  rowClassName={() => "cursor-pointer"}
                  paginator={inquiries.length > 0}
                  rows={10}
                  rowsPerPageOptions={[10, 25, 50]}
                  sortMode="multiple"
                  removableSort
                  dataKey="id"
                  pt={submissionsDataTablePt}
                  showGridlines={false}
                >
                  <Column
                    field="createdAt"
                    header="Date"
                    body={dateBody}
                    sortable
                    style={{ width: "9rem" }}
                    headerClassName={thFirst}
                    bodyClassName={`${tdFirst} text-gray-500 whitespace-nowrap`}
                  />
                  <Column
                    field="fullName"
                    header="Name"
                    sortable
                    headerClassName={thMid}
                    bodyClassName={tdStrong}
                  />
                  <Column field="company" header="Company" sortable headerClassName={thMid} bodyClassName={tdMid} />
                  <Column field="email" header="Email" sortable headerClassName={thMid} bodyClassName={tdMid} />
                  <Column
                    field="projectType"
                    header="Type"
                    sortable
                    style={{ width: "9rem" }}
                    headerClassName={thMid}
                    bodyClassName={tdMid}
                  />
                  <Column
                    field="budgetRange"
                    header="Budget"
                    body={(r: QuoteInquirySummary) => (
                      <span className="whitespace-nowrap text-gray-500">{BUDGET_LABELS[r.budgetRange] ?? r.budgetRange}</span>
                    )}
                    sortable
                    style={{ width: "8rem" }}
                    headerClassName={thMid}
                    bodyClassName={tdMid}
                  />
                  <Column
                    field="status"
                    header="Status"
                    body={inquiryStatusBody}
                    sortable
                    style={{ width: "9rem" }}
                    headerClassName={thMid}
                    bodyClassName={tdMid}
                  />
                  <Column
                    header="Files"
                    body={attachBody}
                    style={{ width: "5rem" }}
                    headerClassName={thMid}
                    bodyClassName={tdMid}
                  />
                  <Column
                    header={<span className="sr-only">Actions</span>}
                    body={rowActionsBody}
                    style={{ minWidth: "10.25rem", width: "10.25rem" }}
                    headerClassName={thActions}
                    bodyClassName={tdActions}
                  />
                </DataTable>
              ) : (
                <DataTable
                  value={meetings}
                  loading={false}
                  globalFilter={globalFilter}
                  globalFilterFields={["fullName", "email"]}
                  emptyMessage="No meeting requests found."
                  rowHover
                  onRowClick={(e) => openMeetingDetail(e.data as MeetingRequest)}
                  rowClassName={() => "cursor-pointer"}
                  paginator={meetings.length > 0}
                  rows={10}
                  rowsPerPageOptions={[10, 25, 50]}
                  sortMode="multiple"
                  removableSort
                  dataKey="id"
                  pt={submissionsDataTablePt}
                  showGridlines={false}
                >
                  <Column
                    field="createdAt"
                    header="Date"
                    body={dateBody}
                    sortable
                    style={{ width: "9rem" }}
                    headerClassName={thFirst}
                    bodyClassName={`${tdFirst} text-gray-500 whitespace-nowrap`}
                  />
                  <Column
                    field="fullName"
                    header="Name"
                    sortable
                    headerClassName={thMid}
                    bodyClassName={tdStrong}
                  />
                  <Column field="email" header="Email" sortable headerClassName={thMid} bodyClassName={tdMid} />
                  <Column
                    field="message"
                    header="Message"
                    body={messagePreviewBody}
                    headerClassName={thMid}
                    bodyClassName="px-3 py-4 text-sm text-gray-500 whitespace-normal align-top max-w-lg"
                  />
                  <Column
                    field="status"
                    header="Status"
                    body={meetingStatusBody}
                    sortable
                    style={{ width: "9rem" }}
                    headerClassName={thMid}
                    bodyClassName={tdMid}
                  />
                  <Column
                    header={<span className="sr-only">Actions</span>}
                    body={rowActionsBody}
                    style={{ minWidth: "10.25rem", width: "10.25rem" }}
                    headerClassName={thActions}
                    bodyClassName={tdActions}
                  />
                </DataTable>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-start justify-end p-0">
          <DialogPanel className="relative h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl flex flex-col">
            {detailLoading || (!inquiryDetail && !meetingDetail) ? (
              <div className="flex-1 flex items-center justify-center">
                <ProgressSpinner style={{ width: '40px', height: '40px' }} strokeWidth="4" />
              </div>
            ) : (
              <>
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                  <DialogTitle className="text-base font-semibold text-gray-900 truncate">
                    {inquiryDetail ? inquiryDetail.projectName : "Meeting Request"}
                  </DialogTitle>
                  <button
                    onClick={() => setDetailOpen(false)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                  {inquiryDetail ? (
                    <>
                      {/* Inquiry Content */}
                      <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Contact</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <span className="text-gray-500">Name</span><span className="font-medium">{inquiryDetail.fullName}</span>
                          <span className="text-gray-500">Email</span><span>{inquiryDetail.email}</span>
                          {inquiryDetail.company && <><span className="text-gray-500">Company</span><span>{inquiryDetail.company}</span></>}
                          {inquiryDetail.role && <><span className="text-gray-500">Role</span><span>{inquiryDetail.role}</span></>}
                          {inquiryDetail.phone && <><span className="text-gray-500">Phone</span><span>{inquiryDetail.phone}</span></>}
                          <span className="text-gray-500">Preferred contact</span><span>{CONTACT_METHOD_LABELS[inquiryDetail.contactMethod] ?? inquiryDetail.contactMethod}{inquiryDetail.contactTime ? ` · ${inquiryDetail.contactTime}` : ""}</span>
                          {inquiryDetail.timezone && <><span className="text-gray-500">Timezone</span><span>{inquiryDetail.timezone}</span></>}
                          <span className="text-gray-500">Submitted</span><span>{formatDate(inquiryDetail.createdAt)}</span>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Project</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                          <span className="text-gray-500">Type</span><span>{inquiryDetail.projectType}</span>
                          <span className="text-gray-500">Category</span><span>{inquiryDetail.projectCategory}</span>
                          <span className="text-gray-500">Budget</span><span>{BUDGET_LABELS[inquiryDetail.budgetRange] ?? inquiryDetail.budgetRange}</span>
                          <span className="text-gray-500">Urgency</span><span>{URGENCY_LABELS[inquiryDetail.urgency] ?? inquiryDetail.urgency}</span>
                          {inquiryDetail.startDate && <><span className="text-gray-500">Start date</span><span>{inquiryDetail.startDate}</span></>}
                          {inquiryDetail.endDate && <><span className="text-gray-500">End date</span><span>{inquiryDetail.endDate}</span></>}
                          <span className="text-gray-500">Hard deadline</span><span>{inquiryDetail.deadlineHard ? "Yes" : "No"}</span>
                          <span className="text-gray-500">NDA requested</span><span>{inquiryDetail.ndaRequested ? "Yes" : "No"}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">Description</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{inquiryDetail.description}</p>
                        <p className="text-xs text-gray-500 mt-3 mb-1">Goals</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{inquiryDetail.goals}</p>
                        {inquiryDetail.keyFeatures.length > 0 && (
                          <>
                            <p className="text-xs text-gray-500 mt-3 mb-1">Key features</p>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5 bg-gray-50 p-3 rounded-lg border border-gray-100">
                              {inquiryDetail.keyFeatures.map((f, i) => <li key={i}>{f}</li>)}
                            </ul>
                          </>
                        )}
                        {inquiryDetail.technologyIds.length > 0 && (
                          <>
                            <p className="text-xs text-gray-500 mt-3 mb-1">Technologies</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {inquiryDetail.technologyIds.map((t, i) => (
                                <span key={i} className="px-2 py-0.5 bg-primary/5 text-primary text-[11px] font-medium rounded-md border border-primary/10">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </section>

                      {inquiryDetail.attachments.length > 0 && (
                        <section>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Attachments</h3>
                          <ul className="space-y-2">
                            {inquiryDetail.attachments.map((att) => (
                              <li key={att.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm border border-gray-100">
                                <span className="flex items-center gap-2 truncate">
                                  <PaperClipIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                  <span className="truncate">{att.fileName}</span>
                                  <span className="text-gray-400 text-xs shrink-0">{formatBytes(att.size)}</span>
                                </span>
                                <button
                                  onClick={async () => {
                                    try {
                                      await quoteInquiryService.downloadAttachment(inquiryDetail.id, att.id, att.fileName);
                                    } catch {
                                      setError("Failed to download attachment.");
                                    }
                                  }}
                                  className="ml-3 shrink-0 text-primary hover:text-primary/70 cursor-pointer p-1.5 rounded-full hover:bg-white transition-colors"
                                  title="Download"
                                >
                                  <ArrowDownTrayIcon className="h-4 w-4" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}

                      {inquiryDetail.notes && (
                        <section>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Client notes</h3>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{inquiryDetail.notes}</p>
                        </section>
                      )}
                    </>
                  ) : meetingDetail ? (
                    <>
                      {/* Meeting Content */}
                      <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Contact</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <span className="text-gray-500">Name</span><span className="font-medium">{meetingDetail.fullName}</span>
                          <span className="text-gray-500">Email</span><span>{meetingDetail.email}</span>
                          <span className="text-gray-500">Submitted</span><span>{formatDate(meetingDetail.createdAt)}</span>
                        </div>
                      </section>

                      {meetingDetail.message && (
                        <section>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Message</h3>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{meetingDetail.message}</p>
                        </section>
                      )}
                    </>
                  ) : null}

                  {/* Admin section */}
                  <section className="pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Admin</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <select
                          value={inquiryDetail ? editInquiryStatus : editMeetingStatus}
                          onChange={(e) => inquiryDetail ? setEditInquiryStatus(e.target.value as InquiryStatus) : setEditMeetingStatus(e.target.value as MeetingStatus)}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none cursor-pointer transition-all"
                        >
                          {inquiryDetail ? (
                            (Object.keys(INQUIRY_STATUS_LABELS) as InquiryStatus[]).map((s) => (
                              <option key={s} value={s}>{INQUIRY_STATUS_LABELS[s]}</option>
                            ))
                          ) : (
                            (Object.keys(MEETING_STATUS_LABELS) as MeetingStatus[]).map((s) => (
                              <option key={s} value={s}>{MEETING_STATUS_LABELS[s]}</option>
                            ))
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin notes</label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={4}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                          placeholder="Internal notes…"
                        />
                      </div>
                    </div>
                  </section>
                </div>

                <div className="sticky bottom-0 flex justify-between border-t border-gray-200 bg-white px-6 py-4">
                  <button
                    onClick={() => {
                      setDetailOpen(false);
                      if (inquiryDetail) {
                        setDeleteInquiryTarget(inquiryDetail as unknown as QuoteInquirySummary);
                      } else {
                        setDeleteMeetingTarget(meetingDetail);
                      }
                    }}
                    className="text-sm font-medium text-red-600 hover:text-red-500 cursor-pointer p-2 -ml-2 rounded-md hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDetailOpen(false)}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={inquiryDetail ? handleSaveInquiry : handleSaveMeeting}
                      disabled={saving}
                      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </DialogPanel>
        </div>
      </Dialog>

      {/* Delete Confirmation Inquiry */}
      <ConfirmationDialog
        open={!!deleteInquiryTarget}
        onClose={() => setDeleteInquiryTarget(null)}
        variant="red"
        title="Delete Inquiry"
        message={`Are you sure you want to delete the inquiry from ${deleteInquiryTarget?.fullName ?? ""}? This will also remove all uploaded attachments.`}
        confirmButtonText={deleting ? "Deleting…" : "Delete"}
        onConfirm={handleDeleteInquiry}
      />

      {/* Delete Confirmation Meeting */}
      <ConfirmationDialog
        open={!!deleteMeetingTarget}
        onClose={() => setDeleteMeetingTarget(null)}
        variant="red"
        title="Delete Meeting Request"
        message={`Are you sure you want to delete the meeting request from ${deleteMeetingTarget?.fullName ?? ""}?`}
        confirmButtonText={deleting ? "Deleting…" : "Delete"}
        onConfirm={handleDeleteMeeting}
      />
    </div>
  );
};

export default Submissions;
