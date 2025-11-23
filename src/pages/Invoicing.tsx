import React, { useState, useEffect } from "react";
import { invoiceService } from "../services/invoiceService";
import { emailService } from "../services/emailService";
import type {
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  SendTestEmailRequest,
} from "../types";
import SuccessBanner from "../components/SuccessBanner";
import ErrorBanner from "../components/ErrorBanner";
import ConfirmationDialog from "../components/ConfirmationDialog";
import InvoiceList from "../components/invoicing/InvoiceList";
import InvoiceForm from "../components/invoicing/InvoiceForm";
import TemplateManagement from "../components/invoicing/TemplateManagement";
import { useInvoiceData } from "../hooks/useInvoiceData";
import { useInvoiceForm } from "../hooks/useInvoiceForm";

type ViewType = "list" | "create" | "edit" | "templates";

const Invoicing: React.FC = () => {
  const [view, setView] = useState<ViewType>("list");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);

  const {
    invoices,
    invoiceTemplates,
    companies,
    contacts,
    currencies,
    emailTemplates,
    loading,
    error: dataError,
    setError: setDataError,
    loadInvoices,
    loadTemplates,
  } = useInvoiceData();

  const {
    invoiceForm,
    setInvoiceForm,
    invoiceItems,
    setInvoiceItems,
    asItems,
    setAsItems,
    addASDocument,
    setAddASDocument,
    editingInvoiceId,
    setEditingInvoiceId,
    resetForm,
    loadInvoiceForEdit,
    addInvoiceItem,
    removeInvoiceItem,
    updateInvoiceItem,
    addASItem,
    removeASItem,
    updateASItem,
  } = useInvoiceForm();


  useEffect(() => {
    if (dataError) {
      setError(dataError);
      setDataError(null);
    }
  }, [dataError, setDataError]);

  useEffect(() => {
    if (view === "templates") {
      loadTemplates();
    }
  }, [view, loadTemplates]);

  useEffect(() => {
    if (selectedTemplateId) {
      loadTemplate(selectedTemplateId);
    } else if (view === "create" && !editingInvoiceId && !invoiceForm.isTemplate) {
      // Only reset form if not creating a template
      resetForm();
    }
  }, [selectedTemplateId, view, editingInvoiceId, invoiceForm.isTemplate]);

  const loadTemplate = async (templateId: number) => {
    try {
      const { invoice: template } = await invoiceService.getInvoiceTemplateById(templateId);
      
      setEditingInvoiceId(null);
      
      let nextInvoiceNumber = 1;
      if (template.toCompany?.id) {
        try {
          const { latestInvoiceNumber } = await invoiceService.getLatestInvoiceNumber(template.toCompany.id);
          nextInvoiceNumber = latestInvoiceNumber !== null ? latestInvoiceNumber + 1 : 1;
        } catch (err) {
          console.error("Failed to load latest invoice number:", err);
        }
      }
      
      setInvoiceForm({
        invoiceNumber: nextInvoiceNumber,
        date: new Date().toISOString().split("T")[0],
        subtotal: template.subtotal,
        taxRate: template.taxRate,
        taxAmount: template.taxAmount,
        total: template.total,
        items: template.items,
        fromCompanyId: template.fromCompany?.id,
        fromContactId: template.fromContact?.id,
        toCompanyId: template.toCompany?.id,
        toContactId: template.toContact?.id,
        currencyId: template.currency?.id,
        emailTemplateId: template.emailTemplate?.id,
        name: template.name || undefined,
        description: template.description || "",
        hasASDocument: template.hasASDocument || false,
        isTemplate: false,
        sent: false,
      });

      if (template.items && Array.isArray(template.items)) {
        setInvoiceItems(template.items as any[]);
      } else {
        setInvoiceItems([]);
      }

      if (template.ASDocument && Array.isArray(template.ASDocument)) {
        // Remove hours from template AS items, keep only executedBy
        // Hours will be set from invoice item quantities
        const asItemsWithoutHours = template.ASDocument.map((item, index) => {
          const invoiceItem = template.items && Array.isArray(template.items) 
            ? (template.items as any[])[index] 
            : null;
          return {
            executedBy: item.executedBy,
            hours: invoiceItem?.quantity || 0, // Set hours from invoice item quantity
            image: undefined,
          };
        });
        setAsItems(asItemsWithoutHours);
        setAddASDocument(true);
      } else {
        setAsItems([]);
        setAddASDocument(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load template");
    }
  };

  const handleImageUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      updateASItem(index, "image", base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveInvoice = async () => {
    try {
      setError(null);
      
      const hasAS = addASDocument && asItems.length > 0;
      
      // Prepare ASDocument: for templates, remove hours (keep only executedBy); for invoices, keep everything
      let ASDocument: any[] | undefined = undefined;
      if (hasAS && asItems.length > 0) {
        if (invoiceForm.isTemplate) {
          // For templates, keep only executedBy (hours will be set from invoice items when using template)
          ASDocument = asItems
            .filter(item => item.executedBy)
            .map(item => ({
              executedBy: item.executedBy,
              hours: 0, // Templates don't store hours
            }));
        } else {
          // For regular invoices, keep everything including hours
          ASDocument = asItems.filter(item => item.executedBy);
        }
      }
      
      // Verify if we're editing
      let isEditing = false;
      if (editingInvoiceId) {
        try {
          await invoiceService.getInvoiceById(editingInvoiceId);
          isEditing = true;
        } catch (err) {
          console.warn("Editing invoice ID set but invoice not found, treating as create:", editingInvoiceId);
          setEditingInvoiceId(null);
          isEditing = false;
        }
      }
      
      // For new invoices, get the latest invoice number
      let finalInvoiceNumber = invoiceForm.invoiceNumber;
      if (!isEditing && invoiceForm.toCompanyId) {
        try {
          const { latestInvoiceNumber } = await invoiceService.getLatestInvoiceNumber(invoiceForm.toCompanyId);
          const nextNumber = latestInvoiceNumber !== null ? latestInvoiceNumber + 1 : 1;
          if (latestInvoiceNumber !== null && invoiceForm.invoiceNumber <= latestInvoiceNumber) {
            finalInvoiceNumber = nextNumber;
          }
        } catch (err) {
          console.error("Failed to verify latest invoice number:", err);
        }
      }
      
      if (isEditing && editingInvoiceId) {
        // FIX: When updating, exclude invoiceNumber to prevent "already exists" error
        const updateData: UpdateInvoiceRequest = {
          date: invoiceForm.date,
          subtotal: invoiceForm.subtotal,
          taxRate: invoiceForm.taxRate,
          taxAmount: invoiceForm.taxAmount,
          total: invoiceForm.total,
          items: invoiceItems,
          hasASDocument: hasAS,
          ASDocument: ASDocument,
          fromCompanyId: invoiceForm.fromCompanyId,
          fromContactId: invoiceForm.fromContactId,
          toCompanyId: invoiceForm.toCompanyId,
          toContactId: invoiceForm.toContactId,
          currencyId: invoiceForm.currencyId,
          emailTemplateId: invoiceForm.emailTemplateId,
          name: invoiceForm.name,
          description: invoiceForm.description,
          isTemplate: invoiceForm.isTemplate,
          sent: invoiceForm.sent,
          // Explicitly NOT including invoiceNumber
        };
        
        await invoiceService.updateInvoice(editingInvoiceId, updateData);
        setSuccess("Invoice updated successfully");
      } else {
        // Create new invoice
        const createData: CreateInvoiceRequest = {
          ...invoiceForm,
          invoiceNumber: finalInvoiceNumber,
          items: invoiceItems,
          hasASDocument: hasAS,
          ASDocument: ASDocument,
        };
        
        await invoiceService.createInvoice(createData);
        setSuccess("Invoice created successfully");
      }

      resetForm();
      setView("list");
      await loadInvoices();
    } catch (err: any) {
      setError(err.message || "Failed to save invoice");
    }
  };

  const handleEditInvoice = async (id: number) => {
    try {
      const { invoice } = await invoiceService.getInvoiceById(id);
      loadInvoiceForEdit(invoice);
      setView("edit");
    } catch (err: any) {
      setError(err.message || "Failed to load invoice");
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      await invoiceService.deleteInvoice(invoiceToDelete);
      setSuccess("Invoice deleted successfully");
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
      await loadInvoices();
    } catch (err: any) {
      setError(err.message || "Failed to delete invoice");
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      await invoiceService.deleteInvoice(templateToDelete);
      setSuccess("Template deleted successfully");
      setDeleteTemplateDialogOpen(false);
      setTemplateToDelete(null);
      await loadTemplates();
    } catch (err: any) {
      setError(err.message || "Failed to delete template");
    }
  };



  const handleTemplateSelect = (templateId: number | null) => {
    setSelectedTemplateId(templateId);
    setEditingInvoiceId(null);
    if (!templateId) {
      resetForm();
      setAddASDocument(false);
      setAsItems([]);
    }
  };

  const handleCreateNew = () => {
    resetForm();
    setEditingInvoiceId(null);
    setSelectedTemplateId(null);
    setView("create");
  };

  const handleCreateTemplate = () => {
    setEditingInvoiceId(null);
    setSelectedTemplateId(null);
    // Reset form first
    resetForm();
    // Then set isTemplate to true - React will batch these updates
    setInvoiceForm(prev => ({ ...prev, isTemplate: true }));
    // Change view - the useEffect checks isTemplate and won't reset if it's true
    setView("create");
  };

  const handleUseTemplate = (id: number) => {
    setEditingInvoiceId(null);
    setSelectedTemplateId(id);
    loadTemplate(id);
    setView("create");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setView("list")}
            className={`${
              view === "list"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm cursor-pointer`}
          >
            Invoices
          </button>
          <button
            onClick={() => setView("templates")}
            className={`${
              view === "templates"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm cursor-pointer`}
          >
            Templates
          </button>
        </nav>
      </div>

      {/* Content */}
      {view === "list" && (
        <InvoiceList
          invoices={invoices}
          onEdit={handleEditInvoice}
          onDelete={(id) => {
            setInvoiceToDelete(id);
            setDeleteDialogOpen(true);
          }}
          onCreateNew={handleCreateNew}
        />
      )}
      
      {(view === "create" || view === "edit") && (
        <InvoiceForm
          invoiceForm={invoiceForm}
          setInvoiceForm={setInvoiceForm}
          invoiceItems={invoiceItems}
          asItems={asItems}
          addASDocument={addASDocument}
          editingInvoiceId={editingInvoiceId}
          selectedTemplateId={selectedTemplateId}
          invoiceTemplates={invoiceTemplates}
          companies={companies}
          contacts={contacts}
          currencies={currencies}
          emailTemplates={emailTemplates}
          onTemplateSelect={handleTemplateSelect}
          onAddInvoiceItem={addInvoiceItem}
          onRemoveInvoiceItem={removeInvoiceItem}
          onUpdateInvoiceItem={updateInvoiceItem}
          onAddASItem={addASItem}
          onRemoveASItem={removeASItem}
          onUpdateASItem={updateASItem}
          onImageUpload={handleImageUpload}
          onSetAddASDocument={(value) => {
            setAddASDocument(value);
            if (!value) {
              setAsItems([]);
            }
          }}
          onCancel={() => {
            resetForm();
            setEditingInvoiceId(null);
            setSelectedTemplateId(null);
            setView("list");
          }}
          onSave={handleSaveInvoice}
          onSendEmail={async (emailData: SendTestEmailRequest) => {
            try {
              if (!editingInvoiceId) {
                // For new invoices, save first, then send email
                // We need to save the invoice first to get an ID
                const hasAS = addASDocument && asItems.length > 0;
                
                // Prepare ASDocument: for templates, remove hours (keep only executedBy); for invoices, keep everything
                let ASDocument: any[] | undefined = undefined;
                if (hasAS && asItems.length > 0) {
                  if (invoiceForm.isTemplate) {
                    // For templates, keep only executedBy (hours will be set from invoice items when using template)
                    ASDocument = asItems
                      .filter(item => item.executedBy)
                      .map(item => ({
                        executedBy: item.executedBy,
                        hours: 0, // Templates don't store hours
                      }));
                  } else {
                    // For regular invoices, keep everything including hours
                    ASDocument = asItems.filter(item => item.executedBy);
                  }
                }
                
                let finalInvoiceNumber = invoiceForm.invoiceNumber;
                if (invoiceForm.toCompanyId) {
                  try {
                    const { latestInvoiceNumber } = await invoiceService.getLatestInvoiceNumber(invoiceForm.toCompanyId);
                    const nextNumber = latestInvoiceNumber !== null ? latestInvoiceNumber + 1 : 1;
                    if (latestInvoiceNumber !== null && invoiceForm.invoiceNumber <= latestInvoiceNumber) {
                      finalInvoiceNumber = nextNumber;
                    }
                  } catch (err) {
                    console.error("Failed to verify latest invoice number:", err);
                  }
                }
                
                const createData: CreateInvoiceRequest = {
                  ...invoiceForm,
                  invoiceNumber: finalInvoiceNumber,
                  items: invoiceItems,
                  hasASDocument: hasAS,
                  ASDocument: ASDocument,
                };
                
                const response = await invoiceService.createInvoice(createData);
                const savedInvoice = response.invoice;
                
                // Send email and mark as sent
                await emailService.sendTestEmail(emailData);
                await invoiceService.updateInvoice(savedInvoice.id!, { sent: true });
                setSuccess("Invoice saved and email sent successfully");
                
                // Reset and go back to list
                resetForm();
                setView("list");
                await loadInvoices();
              } else {
                // For editing, send email and mark as sent
                await emailService.sendTestEmail(emailData);
                await invoiceService.updateInvoice(editingInvoiceId, { sent: true });
                setSuccess("Email sent successfully");
                await loadInvoices();
              }
            } catch (err: any) {
              setError(err.message || "Failed to send email");
              throw err;
            }
          }}
        />
      )}
      
      {view === "templates" && (
        <TemplateManagement
          templates={invoiceTemplates}
          onEdit={handleEditInvoice}
          onUseTemplate={handleUseTemplate}
          onCreateNew={handleCreateTemplate}
          onDelete={(id) => {
            setTemplateToDelete(id);
            setDeleteTemplateDialogOpen(true);
          }}
        />
      )}

      {/* Delete Invoice Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setInvoiceToDelete(null);
        }}
        onConfirm={handleDeleteInvoice}
        variant="red"
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        confirmButtonText="Delete"
      />

      {/* Delete Template Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteTemplateDialogOpen}
        onClose={() => {
          setDeleteTemplateDialogOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={handleDeleteTemplate}
        variant="red"
        title="Delete Template"
        message="Are you sure you want to delete this template? This action cannot be undone."
        confirmButtonText="Delete"
      />

    </div>
  );
};

export default Invoicing;
