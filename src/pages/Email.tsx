import React, { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon, PencilIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import { emailTemplateService } from "../services/emailTemplateService";
import { emailService } from "../services/emailService";
import { contactService } from "../services/contactService";
import type { EmailTemplate, CreateEmailTemplateRequest, UpdateEmailTemplateRequest, EmailSender, Contact } from "../types";
import SuccessBanner from "../components/SuccessBanner";
import ErrorBanner from "../components/ErrorBanner";
import ConfirmationDialog from "../components/ConfirmationDialog";

const Email: React.FC = () => {
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailSenders, setEmailSenders] = useState<EmailSender[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null);
  
  // Email input states for manual entry
  const [destinationEmailInput, setDestinationEmailInput] = useState("");
  const [ccEmailInput, setCcEmailInput] = useState("");
  const [bccEmailInput, setBccEmailInput] = useState("");
  
  // Selected contact IDs for dropdowns
  const [selectedDestinationContactId, setSelectedDestinationContactId] = useState<number | null>(null);
  const [selectedCcContactId, setSelectedCcContactId] = useState<number | null>(null);
  const [selectedBccContactId, setSelectedBccContactId] = useState<number | null>(null);
  
  // Form state
  const [templateForm, setTemplateForm] = useState<CreateEmailTemplateRequest>({
    description: "",
    subject: "",
    content: "",
    destinationEmail: null,
    ccEmail: null,
    bccEmail: null,
    fromEmail: undefined,
  });
  
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, sendersData, contactsData] = await Promise.all([
        emailTemplateService.getAllEmailTemplates(),
        emailService.getAllEmails(),
        contactService.getAllContacts(),
      ]);
      setEmailTemplates(templatesData.emailTemplates);
      setEmailSenders(sendersData.emails);
      setContacts(contactsData.contacts);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsEditMode(false);
    setEditingId(null);
    setTemplateForm({
      description: "",
      subject: "",
      content: "",
      destinationEmail: null,
      ccEmail: null,
      bccEmail: null,
      fromEmail: undefined,
    });
    setDestinationEmailInput("");
    setCcEmailInput("");
    setBccEmailInput("");
    setSelectedDestinationContactId(null);
    setSelectedCcContactId(null);
    setSelectedBccContactId(null);
    setDialogOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setIsEditMode(true);
    setEditingId(template.id);
    
    // Parse JSON arrays if they exist, otherwise use empty arrays
    const destinationEmails = Array.isArray(template.destinationEmail) 
      ? template.destinationEmail 
      : template.destinationEmail ? [template.destinationEmail] : [];
    const ccEmails = Array.isArray(template.ccEmail) 
      ? template.ccEmail 
      : template.ccEmail ? [template.ccEmail] : [];
    const bccEmails = Array.isArray(template.bccEmail) 
      ? template.bccEmail 
      : template.bccEmail ? [template.bccEmail] : [];
    
    setTemplateForm({
      description: template.description || "",
      subject: template.subject || "",
      content: template.content || "",
      destinationEmail: destinationEmails.length > 0 ? destinationEmails : null,
      ccEmail: ccEmails.length > 0 ? ccEmails : null,
      bccEmail: bccEmails.length > 0 ? bccEmails : null,
      fromEmail: template.fromEmail || undefined,
    });
    setDestinationEmailInput("");
    setCcEmailInput("");
    setBccEmailInput("");
    setSelectedDestinationContactId(null);
    setSelectedCcContactId(null);
    setSelectedBccContactId(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (template: EmailTemplate) => {
    const name = template.description || template.subject || `Template #${template.id}`;
    setItemToDelete({ id: template.id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      setError(null);
      await emailTemplateService.deleteEmailTemplate(itemToDelete.id);
      setEmailTemplates(emailTemplates.filter((t) => t.id !== itemToDelete.id));
      setSuccess("Email template deleted successfully");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete");
    }
  };

  const addEmailToArray = (emailArray: string[] | null, newEmail: string): string[] => {
    const current = emailArray || [];
    if (!current.includes(newEmail.trim())) {
      return [...current, newEmail.trim()];
    }
    return current;
  };

  const removeEmailFromArray = (emailArray: string[] | null, emailToRemove: string): string[] | null => {
    const current = emailArray || [];
    const filtered = current.filter((email) => email !== emailToRemove);
    return filtered.length > 0 ? filtered : null;
  };

  const addContactEmail = (field: 'destinationEmail' | 'ccEmail' | 'bccEmail', contactId: number) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (contact && contact.email) {
      const currentEmails = templateForm[field] as string[] | null;
      setTemplateForm({
        ...templateForm,
        [field]: addEmailToArray(currentEmails, contact.email),
      });
      // Reset the selected contact ID after adding
      if (field === 'destinationEmail') setSelectedDestinationContactId(null);
      if (field === 'ccEmail') setSelectedCcContactId(null);
      if (field === 'bccEmail') setSelectedBccContactId(null);
    }
  };

  const addManualEmail = (field: 'destinationEmail' | 'ccEmail' | 'bccEmail', email: string) => {
    if (email.trim()) {
      const currentEmails = templateForm[field] as string[] | null;
      setTemplateForm({
        ...templateForm,
        [field]: addEmailToArray(currentEmails, email),
      });
      // Clear the input
      if (field === 'destinationEmail') setDestinationEmailInput("");
      if (field === 'ccEmail') setCcEmailInput("");
      if (field === 'bccEmail') setBccEmailInput("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      
      // Include any selected contact emails from dropdowns that weren't added yet
      let finalDestinationEmail = templateForm.destinationEmail as string[] | null;
      let finalCcEmail = templateForm.ccEmail as string[] | null;
      let finalBccEmail = templateForm.bccEmail as string[] | null;
      
      // Add selected destination contact email if exists
      if (selectedDestinationContactId) {
        const contact = contacts.find((c) => c.id === selectedDestinationContactId);
        if (contact && contact.email) {
          finalDestinationEmail = addEmailToArray(finalDestinationEmail, contact.email);
        }
      }
      
      // Add selected CC contact email if exists
      if (selectedCcContactId) {
        const contact = contacts.find((c) => c.id === selectedCcContactId);
        if (contact && contact.email) {
          finalCcEmail = addEmailToArray(finalCcEmail, contact.email);
        }
      }
      
      // Add selected BCC contact email if exists
      if (selectedBccContactId) {
        const contact = contacts.find((c) => c.id === selectedBccContactId);
        if (contact && contact.email) {
          finalBccEmail = addEmailToArray(finalBccEmail, contact.email);
        }
      }
      
      const data: CreateEmailTemplateRequest | UpdateEmailTemplateRequest = {
        ...templateForm,
        fromEmail: templateForm.fromEmail || undefined,
        // Ensure arrays are stored as JSON arrays
        destinationEmail: finalDestinationEmail || null,
        ccEmail: finalCcEmail || null,
        bccEmail: finalBccEmail || null,
      };
      if (isEditMode && editingId) {
        const updated = await emailTemplateService.updateEmailTemplate(editingId, data as UpdateEmailTemplateRequest);
        setEmailTemplates(emailTemplates.map((t) => (t.id === editingId ? updated.emailTemplate : t)));
        setSuccess("Email template updated successfully");
      } else {
        const created = await emailTemplateService.createEmailTemplate(data as CreateEmailTemplateRequest);
        setEmailTemplates([...emailTemplates, created.emailTemplate]);
        setSuccess("Email template created successfully");
      }
      setDialogOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      setSelectedDestinationContactId(null);
      setSelectedCcContactId(null);
      setSelectedBccContactId(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save");
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setIsEditMode(false);
    setEditingId(null);
    setError(null);
    setSelectedDestinationContactId(null);
    setSelectedCcContactId(null);
    setSelectedBccContactId(null);
  };

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <p className="mt-1 text-sm text-gray-600">Create and manage email templates for easier email sending</p>
      </div>

      {/* Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Email Templates</h2>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Template
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : emailTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No email templates found. Create one to get started.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {emailTemplates.map((template) => (
                    <tr key={template.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{template.description || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{template.subject || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{template.fromEmail || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(template.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleEdit(template)} className="text-primary-600 hover:text-primary-900 mr-4 cursor-pointer">
                          <PencilIcon className="h-5 w-5 inline" />
                        </button>
                        <button onClick={() => handleDeleteClick(template)} className="text-red-600 hover:text-red-900 cursor-pointer">
                          <TrashIcon className="h-5 w-5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-3xl w-full bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {isEditMode ? "Edit Email Template" : "Create Email Template"}
              </DialogTitle>
              <button onClick={closeDialog} className="text-gray-400 hover:text-gray-500 cursor-pointer">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Template description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
                <select
                  value={templateForm.fromEmail || ""}
                  onChange={(e) => setTemplateForm({ ...templateForm, fromEmail: e.target.value || undefined })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Select Email Sender</option>
                  {emailSenders.map((sender) => (
                    <option key={sender.id} value={sender.email}>
                      {sender.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Email subject"
                />
              </div>
              {/* Destination Emails */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Destination Emails (To)</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={selectedDestinationContactId || ""}
                      onChange={(e) => {
                        setSelectedDestinationContactId(e.target.value ? parseInt(e.target.value) : null);
                      }}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Select Contact</option>
                      {contacts.filter((c) => c.email).map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {`${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email} ({contact.email})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedDestinationContactId) {
                          addContactEmail('destinationEmail', selectedDestinationContactId);
                        }
                      }}
                      disabled={!selectedDestinationContactId}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Add
                    </button>
                    <div className="flex gap-2 flex-1">
                      <input
                        type="email"
                        value={destinationEmailInput}
                        onChange={(e) => setDestinationEmailInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addManualEmail('destinationEmail', destinationEmailInput);
                          }
                        }}
                        placeholder="Or enter email manually"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => addManualEmail('destinationEmail', destinationEmailInput)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  {(templateForm.destinationEmail as string[] | null) && (templateForm.destinationEmail as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(templateForm.destinationEmail as string[]).map((email, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => {
                              setTemplateForm({
                                ...templateForm,
                                destinationEmail: removeEmailFromArray(templateForm.destinationEmail as string[] | null, email),
                              });
                            }}
                            className="text-primary-600 hover:text-primary-900 cursor-pointer"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* CC Emails */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CC Emails</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={selectedCcContactId || ""}
                      onChange={(e) => {
                        setSelectedCcContactId(e.target.value ? parseInt(e.target.value) : null);
                      }}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Select Contact</option>
                      {contacts.filter((c) => c.email).map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {`${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email} ({contact.email})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCcContactId) {
                          addContactEmail('ccEmail', selectedCcContactId);
                        }
                      }}
                      disabled={!selectedCcContactId}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                    <div className="flex gap-2 flex-1">
                      <input
                        type="email"
                        value={ccEmailInput}
                        onChange={(e) => setCcEmailInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addManualEmail('ccEmail', ccEmailInput);
                          }
                        }}
                        placeholder="Or enter email manually"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => addManualEmail('ccEmail', ccEmailInput)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  {(templateForm.ccEmail as string[] | null) && (templateForm.ccEmail as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(templateForm.ccEmail as string[]).map((email, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => {
                              setTemplateForm({
                                ...templateForm,
                                ccEmail: removeEmailFromArray(templateForm.ccEmail as string[] | null, email),
                              });
                            }}
                            className="text-blue-600 hover:text-blue-900 cursor-pointer"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* BCC Emails */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">BCC Emails</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={selectedBccContactId || ""}
                      onChange={(e) => {
                        setSelectedBccContactId(e.target.value ? parseInt(e.target.value) : null);
                      }}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Select Contact</option>
                      {contacts.filter((c) => c.email).map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {`${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email} ({contact.email})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedBccContactId) {
                          addContactEmail('bccEmail', selectedBccContactId);
                        }
                      }}
                      disabled={!selectedBccContactId}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                    <div className="flex gap-2 flex-1">
                      <input
                        type="email"
                        value={bccEmailInput}
                        onChange={(e) => setBccEmailInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addManualEmail('bccEmail', bccEmailInput);
                          }
                        }}
                        placeholder="Or enter email manually"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => addManualEmail('bccEmail', bccEmailInput)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  {(templateForm.bccEmail as string[] | null) && (templateForm.bccEmail as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(templateForm.bccEmail as string[]).map((email, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => {
                              setTemplateForm({
                                ...templateForm,
                                bccEmail: removeEmailFromArray(templateForm.bccEmail as string[] | null, email),
                              });
                            }}
                            className="text-gray-600 hover:text-gray-900 cursor-pointer"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  rows={10}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Email content (supports HTML)"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeDialog} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 cursor-pointer">
                  {isEditMode ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Email Template?"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        variant="red"
      />
    </div>
  );
};

export default Email;
