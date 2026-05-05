import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  PaperClipIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Menu } from "primereact/menu";
import { quoteInquiryService } from "../services/quoteInquiryService";
import type { QuoteInquiry, QuoteInquirySummary, InquiryStatus } from "../types/inquiries";
import SuccessBanner from "../components/SuccessBanner";
import ErrorBanner from "../components/ErrorBanner";
import ConfirmationDialog from "../components/ConfirmationDialog";

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  archived: "Archived",
};

const STATUS_COLORS: Record<InquiryStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-600",
};

const BUDGET_LABELS: Record<string, string> = {
  lt_5k: "< $5k",
  "5k_15k": "$5k–$15k",
  "15k_50k": "$15k–$50k",
  "50k_150k": "$50k–$150k",
  "150k_plus": "$150k+",
  unknown: "Unknown",
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

const QuoteInquiries: React.FC = () => {
  const [inquiries, setInquiries] = useState<QuoteInquirySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");

  const [detail, setDetail] = useState<QuoteInquiry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editStatus, setEditStatus] = useState<InquiryStatus>("new");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<QuoteInquirySummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const menuRef = useRef<Menu>(null);
  const [menuRow, setMenuRow] = useState<QuoteInquirySummary | null>(null);

  const load = useCallback(async () => {
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

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (row: QuoteInquirySummary) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const full = await quoteInquiryService.getById(row.id);
      setDetail(full);
      setEditStatus(full.status as InquiryStatus);
      setEditNotes(full.adminNotes ?? "");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || "Failed to load inquiry details.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await quoteInquiryService.update(detail.id, {
        status: editStatus,
        adminNotes: editNotes,
      });
      setSuccess("Inquiry updated.");
      setDetailOpen(false);
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || "Failed to update inquiry.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await quoteInquiryService.remove(deleteTarget.id);
      setSuccess("Inquiry deleted.");
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || "Failed to delete inquiry.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const menuItems = [
    {
      label: "View details",
      icon: "pi pi-eye",
      command: () => menuRow && openDetail(menuRow),
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => menuRow && setDeleteTarget(menuRow),
    },
  ];

  const statusBody = (row: QuoteInquirySummary) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[row.status as InquiryStatus] ?? "bg-gray-100 text-gray-600"}`}>
      {STATUS_LABELS[row.status as InquiryStatus] ?? row.status}
    </span>
  );

  const dateBody = (row: QuoteInquirySummary) => (
    <span className="text-gray-600 text-xs">{formatDate(row.createdAt)}</span>
  );

  const attachBody = (row: QuoteInquirySummary) =>
    row._count.attachments > 0 ? (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <PaperClipIcon className="h-3.5 w-3.5" />
        {row._count.attachments}
      </span>
    ) : null;

  const actionsBody = (row: QuoteInquirySummary) => (
    <div className="flex items-center gap-2">
      <button
        className="text-primary hover:text-primary/70 text-sm font-medium cursor-pointer"
        onClick={() => openDetail(row)}
      >
        View
      </button>
      <button
        className="text-gray-400 hover:text-gray-600 cursor-pointer"
        onClick={(e) => {
          setMenuRow(row);
          menuRef.current?.toggle(e);
        }}
      >
        ···
      </button>
    </div>
  );

  const header = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span className="text-base font-semibold text-gray-800">Quote Inquiries</span>
      <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-500 bg-white">
        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
        <InputText
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search name, email, project…"
          className="border-none outline-none p-0 text-sm text-gray-700 bg-transparent w-52"
        />
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <Menu ref={menuRef} model={menuItems} popup />

      <DataTable
        value={inquiries}
        loading={loading}
        globalFilter={globalFilter}
        globalFilterFields={["fullName", "email", "company", "projectName"]}
        emptyMessage="No inquiries found."
        header={header}
        className="p-datatable-sm"
        rowHover
        responsiveLayout="scroll"
        onRowClick={(e) => openDetail(e.data as QuoteInquirySummary)}
        rowClassName={() => "cursor-pointer"}
        pt={{
          thead: { className: "text-[11px] uppercase tracking-wider text-gray-500 bg-gray-50" },
          tbody: { className: "text-sm text-gray-700" },
        }}
      >
        <Column field="createdAt" header="Date" body={dateBody} sortable style={{ width: "9rem" }} />
        <Column field="fullName" header="Name" sortable />
        <Column field="company" header="Company" sortable />
        <Column field="email" header="Email" sortable />
        <Column field="projectType" header="Type" sortable style={{ width: "9rem" }} />
        <Column field="budgetRange" header="Budget" body={(r: QuoteInquirySummary) => BUDGET_LABELS[r.budgetRange] ?? r.budgetRange} style={{ width: "8rem" }} />
        <Column field="status" header="Status" body={statusBody} sortable style={{ width: "8rem" }} />
        <Column header="Files" body={attachBody} style={{ width: "5rem" }} />
        <Column header="" body={actionsBody} style={{ width: "7rem" }} />
      </DataTable>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-start justify-end p-0">
          <DialogPanel className="relative h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl flex flex-col">
            {detailLoading || !detail ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Loading…
              </div>
            ) : (
              <>
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                  <DialogTitle className="text-base font-semibold text-gray-900 truncate">
                    {detail.projectName}
                  </DialogTitle>
                  <button
                    onClick={() => setDetailOpen(false)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                  {/* Contact */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Contact</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <span className="text-gray-500">Name</span><span className="font-medium">{detail.fullName}</span>
                      <span className="text-gray-500">Email</span><span>{detail.email}</span>
                      {detail.company && <><span className="text-gray-500">Company</span><span>{detail.company}</span></>}
                      {detail.role && <><span className="text-gray-500">Role</span><span>{detail.role}</span></>}
                      {detail.phone && <><span className="text-gray-500">Phone</span><span>{detail.phone}</span></>}
                      <span className="text-gray-500">Preferred contact</span><span>{detail.contactMethod}{detail.contactTime ? ` · ${detail.contactTime}` : ""}</span>
                      {detail.timezone && <><span className="text-gray-500">Timezone</span><span>{detail.timezone}</span></>}
                      <span className="text-gray-500">Submitted</span><span>{formatDate(detail.createdAt)}</span>
                    </div>
                  </section>

                  {/* Project */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Project</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                      <span className="text-gray-500">Type</span><span>{detail.projectType}</span>
                      <span className="text-gray-500">Category</span><span>{detail.projectCategory}</span>
                      <span className="text-gray-500">Budget</span><span>{BUDGET_LABELS[detail.budgetRange] ?? detail.budgetRange}</span>
                      <span className="text-gray-500">Urgency</span><span>{URGENCY_LABELS[detail.urgency] ?? detail.urgency}</span>
                      {detail.startDate && <><span className="text-gray-500">Start date</span><span>{detail.startDate}</span></>}
                      {detail.endDate && <><span className="text-gray-500">End date</span><span>{detail.endDate}</span></>}
                      <span className="text-gray-500">Hard deadline</span><span>{detail.deadlineHard ? "Yes" : "No"}</span>
                      <span className="text-gray-500">NDA requested</span><span>{detail.ndaRequested ? "Yes" : "No"}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">Description</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{detail.description}</p>
                    <p className="text-xs text-gray-500 mt-3 mb-1">Goals</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{detail.goals}</p>
                    {detail.keyFeatures.length > 0 && (
                      <>
                        <p className="text-xs text-gray-500 mt-3 mb-1">Key features</p>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                          {detail.keyFeatures.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </>
                    )}
                    {detail.technologyIds.length > 0 && (
                      <>
                        <p className="text-xs text-gray-500 mt-3 mb-1">Technologies</p>
                        <p className="text-sm text-gray-700">{detail.technologyIds.join(", ")}</p>
                      </>
                    )}
                  </section>

                  {/* Attachments */}
                  {detail.attachments.length > 0 && (
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Attachments</h3>
                      <ul className="space-y-2">
                        {detail.attachments.map((att) => (
                          <li key={att.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm">
                            <span className="flex items-center gap-2 truncate">
                              <PaperClipIcon className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="truncate">{att.fileName}</span>
                              <span className="text-gray-400 text-xs shrink-0">{formatBytes(att.size)}</span>
                            </span>
                            <button
                              onClick={async () => {
                                try {
                                  await quoteInquiryService.downloadAttachment(detail.id, att.id, att.fileName);
                                } catch {
                                  setError("Failed to download attachment.");
                                }
                              }}
                              className="ml-3 shrink-0 text-primary hover:text-primary/70 cursor-pointer"
                              title="Download"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Notes from client */}
                  {detail.notes && (
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Client notes</h3>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{detail.notes}</p>
                    </section>
                  )}

                  {/* Admin section */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Admin</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as InquiryStatus)}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none cursor-pointer"
                        >
                          {(Object.keys(STATUS_LABELS) as InquiryStatus[]).map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Admin notes</label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={4}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
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
                      setDeleteTarget(detail as unknown as QuoteInquirySummary);
                    }}
                    className="text-sm font-medium text-red-600 hover:text-red-500 cursor-pointer"
                  >
                    Delete
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDetailOpen(false)}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/80 disabled:opacity-50 cursor-pointer"
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

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        variant="red"
        title="Delete Inquiry"
        message={`Are you sure you want to delete the inquiry from ${deleteTarget?.fullName ?? ""}? This will also remove all uploaded attachments.`}
        confirmButtonText={deleting ? "Deleting…" : "Delete"}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default QuoteInquiries;
