import api from './api';
import type {
  Language,
  CreateLanguageRequest,
  UpdateLanguageRequest,
  ApiResponse,
} from '../types';

export const languageService = {
  async getAllLanguages(): Promise<{ languages: Language[] }> {
    const response = await api.get<ApiResponse & { languages: Language[] }>('/admin/languages');
    return { languages: response.data.languages };
  },

  async createLanguage(data: CreateLanguageRequest): Promise<{ language: Language }> {
    const response = await api.post<ApiResponse & { language: Language }>('/admin/languages', data);
    return { language: response.data.language };
  },

  async updateLanguage(id: number, data: UpdateLanguageRequest): Promise<{ language: Language }> {
    const response = await api.put<ApiResponse & { language: Language }>(`/admin/languages/${id}`, data);
    return { language: response.data.language };
  },

  async deleteLanguage(id: number): Promise<void> {
    await api.delete<ApiResponse>(`/admin/languages/${id}`);
  },
};

