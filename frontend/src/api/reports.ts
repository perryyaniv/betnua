import client from './client';
import { DropoutReport } from '../types';

export interface DropoutReportFilters {
  branchId?: string;
  courseId?: string;
  reasonId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const getDropoutReport = (filters: DropoutReportFilters = {}) =>
  client.get<DropoutReport>('/reports/dropouts', { params: filters }).then((r) => r.data);
