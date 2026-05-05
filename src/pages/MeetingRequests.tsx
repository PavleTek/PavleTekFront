import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from "@headlessui/react";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Menu } from "primereact/menu";
import { meetingRequestService } from "../services/meetingRequestService";
import type { MeetingRequest, MeetingStatus } from "../types/inquiries";
import SuccessBanner from "../components/SuccessBanner";
import ErrorBanner from "../components/ErrorBanner";
import ConfirmationDialog from "../components/ConfirmationDialog";

const STATUS_LABELS: Record<MeetingStatus, string> = {
  new: "New",
  scheduled: "Scheduled",
  done: "Done",
  archived: "Archived",
};

const STATUS_COLORS: Record<MeetingStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  scheduled: "bg-yellow-100 text-yellow-800",
  done: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-600",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const MeetingRequests: React.FC = () => {
  const [requests, setRequests] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");

  const [detail, setDetail] = useState<MeetingRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<MeetingStatus>("new");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MeetingRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  const menuRef = useRef<Menu>(null);
  const [menuRow, setMenuRow] = useState<MeetingRequest | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await meetingRequestService.list({ pageSize: 100 });
      setRequests(result.data);
      setError(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || "Failed to load meeting requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = (row: MeetingRequest) => {
    setDetail(row);
    setEditStatus(row.status as MeetingStatus);
    setEditNotes(row.adminNotes ?? "");
    setDetailOpen(true);
  };

  const handleSave = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await meetingRequestService.update(detail.id, {
        status: editStatus,
        adminNotes: editNotes,
      });
      setSuccess("Meeting request updated.");
      setDetailOpen(false);
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || "Failed to update meeting request.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await meetingRequestService.remove(deleteTarget.id);
      setSuccess("Meeting request deleted.");
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || "Failed to delete meeting request.");
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

  const statusBody = (row: MeetingRequest) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[row.status as MeetingStatus] ?? "bg-gray-100 text-gray-600"}`}>
      {STATUS_LABELS[row.status as MeetingStatus] ?? row.status}
    </span>
  );

  const dateBody = (row: MeetingRequest) => (
    <span className="text-gray-600 text-xs">{formatDate(row.createdAt)}</span>
  );

  const messagePreviewBody = (row: MeetingRequest) => (
    <span className="text-gray-500 text-xs line-clamp-1">
      {row.message ? row.message.substring(0, 80) + (row.message.length > 80 ? "…" : "") : "—"}
    </span>
  );

  const actionsBody = (row: MeetingRequest) => (
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
      <span className="text-base font-semibold text-gray-800">Meeting Requests</span>
      <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-500 bg-white">
        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
        <InputText
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search name or email…"
          className="border-none outline-none p-0 text-sm text-gray-700 bg-transparent w-48"
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
        value={requests}
        loading={loading}
        globalFilter={globalFilter}
        globalFilterFields={["fullName", "email"]}
        emptyMessage="No meeting requests found."
        header={header}
        className="p-datatable-sm"
        rowHover
        responsiveLayout="scroll"
        onRowClick={(e) => openDetail(e.data as MeetingRequest)}
        rowClassName={() => "cursor-pointer"}
        pt={{
          thead: { className: "text-[11px] uppercase tracking-wider text-gray-500 bg-gray-50" },
          tbody: { className: "text-sm text-gray-700" },
        }}
      >
        <Column field="createdAt" header="Date" body={dateBody} sortable style={{ width: "9rem" }} />
        <Column field="fullName" header="Name" sortable />
        <Column field="email" header="Email" sortable />
        <Column field="message" header="Message" body={messagePreviewBody} />
        <Column field="status" header="Status" body={statusBody} sortable style={{ width: "8rem" }} />
        <Column header="" body={actionsBody} style={{ width: "7rem" }} />
      </DataTable>

      {/* Detail Panel */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-start justify-end p-0">
          <DialogPanel className="relative h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl flex flex-col">
            {!detail ? null : (
              <>
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                  <DialogTitle className="text-base font-semibold text-gray-900">
                    Meeting Request
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
                      <span className="text-gray-500">Submitted</span><span>{formatDate(detail.createdAt)}</span>
                    </div>
                  </section>

                  {/* Message */}
                  {detail.message && (
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Message</h3>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{detail.message}</p>
                    </section>
                  )}

                  {/* Admin */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Admin</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as MeetingStatus)}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none cursor-pointer"
                        >
                          {(Object.keys(STATUS_LABELS) as MeetingStatus[]).map((s) => (
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
                      setDeleteTarget(detail);
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
        title="Delete Meeting Request"
        message={`Are you sure you want to delete the meeting request from ${deleteTarget?.fullName ?? ""}?`}
        confirmButtonText={deleting ? "Deleting…" : "Delete"}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default MeetingRequests;
