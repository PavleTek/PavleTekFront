import api from './api';
import type {
  CreateCompanyRequest,
  UpdateCompanyRequest,
  ApiResponse,
} from '../types';
import type { Company } from '../types';

export const companyService = {
  async getAllCompanies(): Promise<{ companies: Company[] }> {
    const response = await api.get<ApiResponse & { companies: Company[] }>('/admin/companies');
    return { companies: response.data.companies };
  },

  async getCompanyById(id: number): Promise<{ company: Company }> {
    const response = await api.get<ApiResponse & { company: Company }>(`/admin/companies/${id}`);
    return { company: response.data.company };
  },

  async createCompany(data: CreateCompanyRequest): Promise<{ company: Company }> {
    const response = await api.post<ApiResponse & { company: Company }>('/admin/companies', data);
    return { company: response.data.company };
  },

  async updateCompany(id: number, data: UpdateCompanyRequest): Promise<{ company: Company }> {
    const response = await api.put<ApiResponse & { company: Company }>(`/admin/companies/${id}`, data);
    return { company: response.data.company };
  },

  async deleteCompany(id: number): Promise<void> {
    await api.delete<ApiResponse>(`/admin/companies/${id}`);
  },
};

