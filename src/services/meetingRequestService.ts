import api from './api';
import type { MeetingRequest, PaginatedResponse } from '../types/inquiries';

export interface ListMeetingParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export const meetingRequestService = {
  async list(params: ListMeetingParams = {}): Promise<PaginatedResponse<MeetingRequest>> {
    const response = await api.get('/admin/meeting-requests', { params });
    return response.data;
  },

  async getById(id: string): Promise<MeetingRequest> {
    const response = await api.get(`/admin/meeting-requests/${id}`);
    return response.data;
  },

  async update(id: string, data: { status?: string; adminNotes?: string }): Promise<MeetingRequest> {
    const response = await api.patch(`/admin/meeting-requests/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/meeting-requests/${id}`);
  },
};
