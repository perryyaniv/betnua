import client from './client';
import { AppSettings } from '../types';

export const getSettings = () => client.get<AppSettings>('/settings').then((r) => r.data);
export const updateSettings = (data: Partial<AppSettings>) =>
  client.put<AppSettings>('/settings', data).then((r) => r.data);
