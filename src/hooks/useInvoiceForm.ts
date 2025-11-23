import { useState, useEffect } from "react";
import { invoiceService } from "../services/invoiceService";
import type { CreateInvoiceRequest, InvoiceItem, ASTemplateItem, Invoice } from "../types";

const initialForm: CreateInvoiceRequest = {
  invoiceNumber: 1,
  date: new Date().toISOString().split("T")[0],
  subtotal: 0,
  taxRate: 0,
  taxAmount: 0,
  total: 0,
  items: [],
  isTemplate: false,
  sent: false,
  description: "",
};

export const useInvoiceForm = () => {
  const [invoiceForm, setInvoiceForm] = useState<CreateInvoiceRequest>(initialForm);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [asItems, setAsItems] = useState<ASTemplateItem[]>([]);
  const [addASDocument, setAddASDocument] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);

  // Load latest invoice number when toCompanyId changes
  useEffect(() => {
    if (invoiceForm.toCompanyId && !editingInvoiceId) {
      loadLatestInvoiceNumber(invoiceForm.toCompanyId);
    }
  }, [invoiceForm.toCompanyId, editingInvoiceId]);

  // Calculate totals when items or tax rate change
  useEffect(() => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (invoiceForm.taxRate / 100);
    const total = subtotal + taxAmount;

    setInvoiceForm((prev) => ({
      ...prev,
      subtotal,
      taxAmount,
      total,
    }));
  }, [invoiceItems, invoiceForm.taxRate]);

  const loadLatestInvoiceNumber = async (companyId: number) => {
    try {
      const { latestInvoiceNumber } = await invoiceService.getLatestInvoiceNumber(companyId);
      setInvoiceForm((prev) => ({
        ...prev,
        invoiceNumber: latestInvoiceNumber !== null ? latestInvoiceNumber + 1 : 1,
      }));
    } catch (err) {
      console.error("Failed to load latest invoice number:", err);
    }
  };

  const resetForm = () => {
    setInvoiceForm(initialForm);
    setInvoiceItems([]);
    setAsItems([]);
    setAddASDocument(false);
    setEditingInvoiceId(null);
  };

  const loadInvoiceForEdit = (invoice: Invoice) => {
    setEditingInvoiceId(invoice.id!);
    setInvoiceForm({
      invoiceNumber: invoice.invoiceNumber,
      date: new Date(invoice.date).toISOString().split("T")[0],
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      items: invoice.items,
      fromCompanyId: invoice.fromCompany?.id,
      fromContactId: invoice.fromContact?.id,
      toCompanyId: invoice.toCompany?.id,
      toContactId: invoice.toContact?.id,
      currencyId: invoice.currency?.id,
      emailTemplateId: invoice.emailTemplate?.id,
      name: invoice.name || undefined,
      description: invoice.description || "",
      hasASDocument: invoice.hasASDocument || false,
      isTemplate: invoice.isTemplate || false,
      sent: invoice.sent,
    });

    if (invoice.items && Array.isArray(invoice.items)) {
      setInvoiceItems(invoice.items as InvoiceItem[]);
    }

    if (invoice.ASDocument && Array.isArray(invoice.ASDocument)) {
      if (invoice.isTemplate) {
        // For templates, remove hours from AS items (keep only executedBy)
        const asItemsWithoutHours = invoice.ASDocument.map(item => ({
          executedBy: item.executedBy,
          hours: 0, // Templates don't have hours
          image: undefined,
        }));
        setAsItems(asItemsWithoutHours);
      } else {
        // For regular invoices, keep everything including hours
        setAsItems(invoice.ASDocument);
      }
      setAddASDocument(true);
    } else {
      setAsItems([]);
      setAddASDocument(false);
    }
  };

  const addInvoiceItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      { quantity: 1, description: "", unitPrice: 0, total: 0 },
    ]);
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...invoiceItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unitPrice") {
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    }
    setInvoiceItems(updated);
  };

  const addASItem = () => {
    setAsItems([...asItems, { executedBy: "", hours: 0, image: undefined }]);
  };

  const removeASItem = (index: number) => {
    setAsItems(asItems.filter((_, i) => i !== index));
  };

  const updateASItem = (index: number, field: keyof ASTemplateItem, value: any) => {
    const updated = [...asItems];
    updated[index] = { ...updated[index], [field]: value };
    setAsItems(updated);
  };

  return {
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
  };
};

