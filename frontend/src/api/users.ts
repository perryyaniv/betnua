import client from './client';
import { User, UserRole } from '../types';

export const getUsers = () => client.get<User[]>('/users').then((r) => r.data);

export const createUser = (data: { name: string; username: string; password: string; role: UserRole; branchIds: string[] }) =>
  client.post<User>('/users', data).then((r) => r.data);

export const updateUser = (id: string, data: Partial<Pick<User, 'name' | 'role' | 'active'>> & { branchIds?: string[] }) =>
  client.put<User>(`/users/${id}`, data).then((r) => r.data);

export const deleteUser = (id: string) => client.delete(`/users/${id}`).then((r) => r.data);

export const resetPassword = (id: string, tempPassword: string) =>
  client.post(`/users/${id}/reset-password`, { tempPassword }).then((r) => r.data);
