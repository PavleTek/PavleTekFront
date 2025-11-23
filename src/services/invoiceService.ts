import api from './api';
import type {
  Invoice,
  InvoiceTemplate,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  ApiResponse,
} from '../types';

export const invoiceService = {
  async getAllInvoices(): Promise<{ invoices: Invoice[] }> {
    const response = await api.get<ApiResponse & { invoices: Invoice[] }>('/admin/invoices');
    return { invoices: response.data.invoices };
  },

  async getInvoiceById(id: number): Promise<{ invoice: Invoice }> {
    const response = await api.get<ApiResponse & { invoice: Invoice }>(`/admin/invoices/${id}`);
    return { invoice: response.data.invoice };
  },

  async createInvoice(data: CreateInvoiceRequest): Promise<{ invoice: Invoice }> {
    const response = await api.post<ApiResponse & { invoice: Invoice }>('/admin/invoices', data);
    return { invoice: response.data.invoice };
  },

  async updateInvoice(id: number, data: UpdateInvoiceRequest): Promise<{ invoice: Invoice }> {
    const response = await api.put<ApiResponse & { invoice: Invoice }>(`/admin/invoices/${id}`, data);
    return { invoice: response.data.invoice };
  },

  async deleteInvoice(id: number): Promise<void> {
    await api.delete<ApiResponse>(`/admin/invoices/${id}`);
  },

  async getAllInvoiceTemplates(): Promise<{ invoices: InvoiceTemplate[] }> {
    const response = await api.get<ApiResponse & { invoices: Invoice[] }>('/admin/invoices');
    const templates = response.data.invoices.filter(inv => inv.isTemplate) as InvoiceTemplate[];
    return { invoices: templates };
  },

  async getInvoiceTemplateById(id: number): Promise<{ invoice: InvoiceTemplate }> {
    const response = await api.get<ApiResponse & { invoice: Invoice }>(`/admin/invoices/${id}`);
    if (!response.data.invoice.isTemplate) {
      throw new Error('Invoice is not a template');
    }
    return { invoice: response.data.invoice as InvoiceTemplate };
  },

  async getLatestInvoiceNumber(toCompanyId: number): Promise<{ latestInvoiceNumber: number | null }> {
    const response = await api.get<ApiResponse & { latestInvoiceNumber: number | null }>(
      `/admin/invoices/latest-number/${toCompanyId}`
    );
    return { latestInvoiceNumber: response.data.latestInvoiceNumber };
  },
};

