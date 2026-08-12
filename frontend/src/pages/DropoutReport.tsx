import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDropoutReport } from '../api/reports';
import { getBranches } from '../api/branches';
import { getCourses } from '../api/courses';
import { getDropoutReasons } from '../api/dropoutReasons';
import { Branch, Course, DropoutReason, DropoutReport as DropoutReportType } from '../types';
import { formatDate } from '../utils/date';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';

export default function DropoutReport() {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [reasons, setReasons] = useState<DropoutReason[]>([]);
  const [report, setReport] = useState<DropoutReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ branchId: '', courseId: '', reasonId: '', dateFrom: '', dateTo: '' });

  useEffect(() => {
    Promise.all([getBranches(), getCourses(), getDropoutReasons()]).then(([b, c, r]) => {
      setBranches(b);
      setCourses(c);
      setReasons(r);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getDropoutReport(filters)
      .then(setReport)
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select className="input max-w-[160px]" value={filters.branchId} onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}>
          <option value="">{t('dropoutReport.branch')}</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
        <select className="input max-w-[160px]" value={filters.courseId} onChange={(e) => setFilters((f) => ({ ...f, courseId: e.target.value }))}>
          <option value="">{t('nav.courses')}</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.startTime}–{c.endTime}
            </option>
          ))}
        </select>
        <select className="input max-w-[160px]" value={filters.reasonId} onChange={(e) => setFilters((f) => ({ ...f, reasonId: e.target.value }))}>
          <option value="">{t('dropoutReport.reason')}</option>
          {reasons.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input max-w-[160px]"
          value={filters.dateFrom}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          title={t('dropoutReport.dateFrom')}
        />
        <input
          type="date"
          className="input max-w-[160px]"
          value={filters.dateTo}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          title={t('dropoutReport.dateTo')}
        />
      </div>

      {loading || !report ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="text-center">
              <p className="text-2xl font-bold text-primary">{report.total}</p>
              <p className="text-xs text-gray-500 mt-1">{t('dropoutReport.total')}</p>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h2 className="section-title">{t('dropoutReport.byBranch')}</h2>
              <div className="space-y-2">
                {Object.entries(report.byBranch).map(([name, count]) => (
                  <Card key={name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{name}</span>
                    <span className="font-bold text-primary">{count}</span>
                  </Card>
                ))}
                {Object.keys(report.byBranch).length === 0 && <p className="text-sm text-gray-400">{t('dropoutReport.noData')}</p>}
              </div>
            </div>
            <div>
              <h2 className="section-title">{t('dropoutReport.byReason')}</h2>
              <div className="space-y-2">
                {Object.entries(report.byReason).map(([name, count]) => (
                  <Card key={name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{name}</span>
                    <span className="font-bold text-primary">{count}</span>
                  </Card>
                ))}
                {Object.keys(report.byReason).length === 0 && <p className="text-sm text-gray-400">{t('dropoutReport.noData')}</p>}
              </div>
            </div>
          </div>

          <div>
            <h2 className="section-title">{t('dropoutReport.table')}</h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('dropoutReport.student')}</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('dropoutReport.branch')}</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('dropoutReport.reason')}</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('dropoutReport.note')}</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('dropoutReport.date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{row.studentName}</td>
                      <td className="px-3 py-2 text-gray-600">{row.branchName}</td>
                      <td className="px-3 py-2 text-gray-600">{row.reasonName || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{row.dropoutNote || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{formatDate(row.droppedAt)}</td>
                    </tr>
                  ))}
                  {report.rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                        {t('dropoutReport.noData')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
