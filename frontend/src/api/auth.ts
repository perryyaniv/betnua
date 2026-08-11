import client from './client';
import { User } from '../types';

export const login = (username: string, password: string) =>
  client.post<{ token: string; user: User }>('/auth/login', { username, password }).then((r) => r.data);

export const changePassword = (newPassword: string) =>
  client.post('/auth/change-password', { newPassword }).then((r) => r.data);

export const getMe = () => client.get<User>('/auth/me').then((r) => r.data);
