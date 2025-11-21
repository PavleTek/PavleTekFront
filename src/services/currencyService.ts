import api from './api';
import type {
  Currency,
  CreateCurrencyRequest,
  UpdateCurrencyRequest,
  ApiResponse,
} from '../types';

export const currencyService = {
  async getAllCurrencies(): Promise<{ currencies: Currency[] }> {
    const response = await api.get<ApiResponse & { currencies: Currency[] }>('/admin/currencies');
    return { currencies: response.data.currencies };
  },

  async createCurrency(data: CreateCurrencyRequest): Promise<{ currency: Currency }> {
    const response = await api.post<ApiResponse & { currency: Currency }>('/admin/currencies', data);
    return { currency: response.data.currency };
  },

  async updateCurrency(id: number, data: UpdateCurrencyRequest): Promise<{ currency: Currency }> {
    const response = await api.put<ApiResponse & { currency: Currency }>(`/admin/currencies/${id}`, data);
    return { currency: response.data.currency };
  },

  async deleteCurrency(id: number): Promise<void> {
    await api.delete<ApiResponse>(`/admin/currencies/${id}`);
  },
};

