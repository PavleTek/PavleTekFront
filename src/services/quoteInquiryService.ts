import api from './api';
import type { QuoteInquiry, QuoteInquirySummary, PaginatedResponse } from '../types/inquiries';

export interface ListInquiriesParams {
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export const quoteInquiryService = {
  async list(params: ListInquiriesParams = {}): Promise<PaginatedResponse<QuoteInquirySummary>> {
    const response = await api.get('/admin/quote-inquiries', { params });
    return response.data;
  },

  async getById(id: string): Promise<QuoteInquiry> {
    const response = await api.get(`/admin/quote-inquiries/${id}`);
    return response.data;
  },

  async update(id: string, data: { status?: string; adminNotes?: string }): Promise<QuoteInquiry> {
    const response = await api.patch(`/admin/quote-inquiries/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/quote-inquiries/${id}`);
  },

  /**
   * Downloads an attachment as a blob and returns an object URL.
   * Auth header is added by the Axios interceptor.
   */
  async downloadAttachment(inquiryId: string, attId: string, fileName: string): Promise<void> {
    const response = await api.get(
      `/admin/quote-inquiries/${inquiryId}/attachments/${attId}/download`,
      { responseType: 'blob' }
    );

    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },
};
