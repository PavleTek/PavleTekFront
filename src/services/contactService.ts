import api from './api';
import type {
  CreateContactRequest,
  UpdateContactRequest,
  ApiResponse,
} from '../types';
import type { Contact as ContactType } from '../types';

export const contactService = {
  async getAllContacts(): Promise<{ contacts: ContactType[] }> {
    const response = await api.get<ApiResponse & { contacts: ContactType[] }>('/admin/contacts');
    return { contacts: response.data.contacts };
  },

  async getContactById(id: number): Promise<{ contact: ContactType }> {
    const response = await api.get<ApiResponse & { contact: ContactType }>(`/admin/contacts/${id}`);
    return { contact: response.data.contact };
  },

  async createContact(data: CreateContactRequest): Promise<{ contact: ContactType }> {
    const response = await api.post<ApiResponse & { contact: ContactType }>('/admin/contacts', data);
    return { contact: response.data.contact };
  },

  async updateContact(id: number, data: UpdateContactRequest): Promise<{ contact: ContactType }> {
    const response = await api.put<ApiResponse & { contact: ContactType }>(`/admin/contacts/${id}`, data);
    return { contact: response.data.contact };
  },

  async deleteContact(id: number): Promise<void> {
    await api.delete<ApiResponse>(`/admin/contacts/${id}`);
  },
};

