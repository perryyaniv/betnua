import client from './client';
import { Branch } from '../types';

export const getBranches = () => client.get<Branch[]>('/branches').then((r) => r.data);
export const getBranch = (id: string) => client.get<Branch>(`/branches/${id}`).then((r) => r.data);

export const createBranch = (data: Partial<Branch>) => client.post<Branch>('/branches', data).then((r) => r.data);
export const updateBranch = (id: string, data: Partial<Branch>) =>
  client.put<Branch>(`/branches/${id}`, data).then((r) => r.data);

export const addRoom = (branchId: string, name: string) =>
  client.post<Branch>(`/branches/${branchId}/rooms`, { name }).then((r) => r.data);
export const updateRoom = (branchId: string, roomId: string, name: string) =>
  client.put<Branch>(`/branches/${branchId}/rooms/${roomId}`, { name }).then((r) => r.data);
export const deleteRoom = (branchId: string, roomId: string) =>
  client.delete<Branch>(`/branches/${branchId}/rooms/${roomId}`).then((r) => r.data);
