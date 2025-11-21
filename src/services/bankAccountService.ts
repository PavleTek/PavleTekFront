import api from './api';
import type {
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
  ApiResponse,
} from '../types';
import type { BankAccount } from '../types';

export const bankAccountService = {
  async getAllBankAccounts(): Promise<{ bankAccounts: BankAccount[] }> {
    const response = await api.get<ApiResponse & { bankAccounts: BankAccount[] }>('/admin/bank-accounts');
    return { bankAccounts: response.data.bankAccounts };
  },

  async getBankAccountById(id: number): Promise<{ bankAccount: BankAccount }> {
    const response = await api.get<ApiResponse & { bankAccount: BankAccount }>(`/admin/bank-accounts/${id}`);
    return { bankAccount: response.data.bankAccount };
  },

  async createBankAccount(data: CreateBankAccountRequest): Promise<{ bankAccount: BankAccount }> {
    const response = await api.post<ApiResponse & { bankAccount: BankAccount }>('/admin/bank-accounts', data);
    return { bankAccount: response.data.bankAccount };
  },

  async updateBankAccount(id: number, data: UpdateBankAccountRequest): Promise<{ bankAccount: BankAccount }> {
    const response = await api.put<ApiResponse & { bankAccount: BankAccount }>(`/admin/bank-accounts/${id}`, data);
    return { bankAccount: response.data.bankAccount };
  },

  async deleteBankAccount(id: number): Promise<void> {
    await api.delete<ApiResponse>(`/admin/bank-accounts/${id}`);
  },
};

