import api from './api';
import type {
  Country,
  CreateCountryRequest,
  UpdateCountryRequest,
  ApiResponse,
} from '../types';

export const countryService = {
  async getAllCountries(): Promise<{ countries: Country[] }> {
    const response = await api.get<ApiResponse & { countries: Country[] }>('/admin/countries');
    return { countries: response.data.countries };
  },

  async createCountry(data: CreateCountryRequest): Promise<{ country: Country }> {
    const response = await api.post<ApiResponse & { country: Country }>('/admin/countries', data);
    return { country: response.data.country };
  },

  async updateCountry(id: number, data: UpdateCountryRequest): Promise<{ country: Country }> {
    const response = await api.put<ApiResponse & { country: Country }>(`/admin/countries/${id}`, data);
    return { country: response.data.country };
  },

  async deleteCountry(id: number): Promise<void> {
    await api.delete<ApiResponse>(`/admin/countries/${id}`);
  },
};

