import api from './api';
import type { StrideDocument, ApiResponse } from '../types';

export const strideDocService = {
  /**
   * Get all Stride documents
   */
  async getAll(): Promise<{ data: StrideDocument[] }> {
    const response = await api.get<{ data: StrideDocument[] }>('/admin/stride-docs');
    return response.data;
  },

  /**
   * Create a new Stride document
   */
  async create(data: { name: string, markdownContent: string, colors: any, fontSize: string }): Promise<ApiResponse & { data: StrideDocument }> {
    const response = await api.post<ApiResponse & { data: StrideDocument }>(
      '/admin/stride-docs', 
      data
    );
    return response.data;
  },

  /**
   * Generate a PDF on-demand
   */
  async generatePdf(data: { markdownContent: string, colors: any, fontSize: string }): Promise<Blob> {
    const response = await api.post('/admin/stride-docs/generate-pdf', data, {
      responseType: 'blob',
    });
    return new Blob([response.data], { type: 'application/pdf' });
  },

  /**
   * Download a file (MD or PDF)
   */
  async downloadFile(id: number, type: 'md' | 'pdf', fileName: string): Promise<void> {
    const response = await api.get(`/admin/stride-docs/${id}/${type}`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const extension = type === 'md' ? 'md' : 'pdf';
    link.setAttribute('download', `${fileName}.${extension}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Delete a Stride document
   */
  async deleteDocument(id: number): Promise<ApiResponse> {
    const response = await api.delete<ApiResponse>(`/admin/stride-docs/${id}`);
    return response.data;
  },
};
