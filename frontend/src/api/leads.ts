import client from './client';
import { Lead, Student } from '../types';

export interface LeadFilters {
  branchId?: string;
  status?: string;
  source?: string;
}

export const getLeads = (filters: LeadFilters = {}) => client.get<Lead[]>('/leads', { params: filters }).then((r) => r.data);
export const getLead = (id: string) => client.get<Lead>(`/leads/${id}`).then((r) => r.data);

export const createLead = (data: Partial<Lead>) => client.post<Lead>('/leads', data).then((r) => r.data);
export const updateLead = (id: string, data: Partial<Lead>) => client.put<Lead>(`/leads/${id}`, data).then((r) => r.data);
export const updateLeadStatus = (id: string, status: string) =>
  client.patch<Lead>(`/leads/${id}/status`, { status }).then((r) => r.data);
export const deleteLead = (id: string) => client.delete(`/leads/${id}`).then((r) => r.data);

export const convertLead = (id: string, courseId: string) =>
  client.post<{ lead: Lead; student: Student }>(`/leads/${id}/convert`, { courseId }).then((r) => r.data);
