import client from './client';
import { Troupe } from '../types';

export interface TroupeFilters {
  branchId?: string;
}

export const getTroupes = (filters: TroupeFilters = {}) =>
  client.get<Troupe[]>('/troupes', { params: filters }).then((r) => r.data);

export const createTroupe = (data: { name: string; branchId: string }) =>
  client.post<Troupe>('/troupes', data).then((r) => r.data);
export const updateTroupe = (id: string, data: Partial<Pick<Troupe, 'name' | 'isActive'>>) =>
  client.put<Troupe>(`/troupes/${id}`, data).then((r) => r.data);
export const deleteTroupe = (id: string) => client.delete(`/troupes/${id}`).then((r) => r.data);

export const addTroupeMember = (troupeId: string, studentId: string) =>
  client.post<Troupe>(`/troupes/${troupeId}/members`, { studentId }).then((r) => r.data);
export const updateTroupeMember = (troupeId: string, memberId: string, data: { isActive: boolean }) =>
  client.patch<Troupe>(`/troupes/${troupeId}/members/${memberId}`, data).then((r) => r.data);
export const removeTroupeMember = (troupeId: string, memberId: string) =>
  client.delete<Troupe>(`/troupes/${troupeId}/members/${memberId}`).then((r) => r.data);
