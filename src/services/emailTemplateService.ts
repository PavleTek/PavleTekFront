import api from './api';
import type {
  EmailTemplate,
  CreateEmailTemplateRequest,
  UpdateEmailTemplateRequest,
  ApiResponse,
} from '../types';

export const emailTemplateService = {
  async getAllEmailTemplates(): Promise<{ emailTemplates: EmailTemplate[] }> {
    const response = await api.get<ApiResponse & { emailTemplates: EmailTemplate[] }>('/admin/email-templates');
    return { emailTemplates: response.data.emailTemplates };
  },

  async getEmailTemplateById(id: number): Promise<{ emailTemplate: EmailTemplate }> {
    const response = await api.get<ApiResponse & { emailTemplate: EmailTemplate }>(`/admin/email-templates/${id}`);
    return { emailTemplate: response.data.emailTemplate };
  },

  async createEmailTemplate(data: CreateEmailTemplateRequest): Promise<{ emailTemplate: EmailTemplate }> {
    const response = await api.post<ApiResponse & { emailTemplate: EmailTemplate }>('/admin/email-templates', data);
    return { emailTemplate: response.data.emailTemplate };
  },

  async updateEmailTemplate(id: number, data: UpdateEmailTemplateRequest): Promise<{ emailTemplate: EmailTemplate }> {
    const response = await api.put<ApiResponse & { emailTemplate: EmailTemplate }>(`/admin/email-templates/${id}`, data);
    return { emailTemplate: response.data.emailTemplate };
  },

  async deleteEmailTemplate(id: number): Promise<void> {
    await api.delete<ApiResponse>(`/admin/email-templates/${id}`);
  },
};

