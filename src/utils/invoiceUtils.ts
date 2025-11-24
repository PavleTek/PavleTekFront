import type { Invoice, InvoiceItem } from "../types";

export const formatInvoiceNumber = (num: number): string => {
  return String(num).padStart(5, "0");
};

// Parse date string without timezone conversion issues
// Handles both ISO format (YYYY-MM-DD) and other formats
export const parseDateSafe = (dateString: string): Date => {
  if (!dateString) return new Date();
  
  // If it's in ISO format (YYYY-MM-DD), parse it as local time
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Otherwise, use standard Date parsing
  return new Date(dateString);
};

// Format date to locale string without timezone issues
export const formatDateSafe = (dateString: string): string => {
  const date = parseDateSafe(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
};

export const sanitizeFilename = (str: string): string => {
  return str.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
};

export const formatDateForFilename = (dateString: string): string => {
  const date = parseDateSafe(dateString);
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${month}_${year}`;
};

export const getInvoicePreviewDataFromInvoice = (invoice: Invoice) => {
  const items = invoice.items && Array.isArray(invoice.items) ? invoice.items.map(item => ({
    quantity: item.quantity ?? 0,
    description: item.description ?? "",
    unitPrice: item.unitPrice ?? 0,
    total: item.total ?? 0,
  })) : [];

  return {
    date: formatDateSafe(invoice.date),
    invoiceNumber: formatInvoiceNumber(invoice.invoiceNumber),
    fromCompany: invoice.fromCompany || null,
    fromContact: invoice.fromContact || null,
    toCompany: invoice.toCompany || null,
    toContact: invoice.toContact || null,
    items: items,
    salesTax: invoice.taxRate / 100,
  };
};

export const getInvoicePreviewData = (
  invoiceForm: any,
  companies: any[],
  contacts: any[],
  invoiceItems: InvoiceItem[]
) => {
  const fromCompany = companies.find((c) => c.id === invoiceForm.fromCompanyId);
  const toCompany = companies.find((c) => c.id === invoiceForm.toCompanyId);
  const fromContact = contacts.find((c) => c.id === invoiceForm.fromContactId);
  const toContact = contacts.find((c) => c.id === invoiceForm.toContactId);

  const items = invoiceItems.map(item => ({
    quantity: item.quantity ?? 0,
    description: item.description ?? "",
    unitPrice: item.unitPrice ?? 0,
    total: item.total ?? 0,
  }));

  return {
    date: invoiceForm.date ? formatDateSafe(invoiceForm.date) : "",
    invoiceNumber: formatInvoiceNumber(invoiceForm.invoiceNumber),
    fromCompany: fromCompany || null,
    fromContact: fromContact || null,
    toCompany: toCompany || null,
    toContact: toContact || null,
    items: items,
    salesTax: invoiceForm.taxRate / 100,
  };
};

