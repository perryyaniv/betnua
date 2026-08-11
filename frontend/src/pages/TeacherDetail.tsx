import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTeacher, getTeacherHoursReport, TeacherHoursRow } from '../api/teachers';
import { getBranches } from '../api/branches';
import { Teacher, Branch } from '../types';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';

export default function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [hours, setHours] = useState<TeacherHoursRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getTeacher(id), getTeacherHoursReport(id), getBranches()])
      .then(([te, h, b]) => {
        setTeacher(te);
        setHours(h);
        setBranches(b);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !teacher) return <Spinner />;

  const branchName = (branchId: string) => branches.find((b) => b._id === branchId)?.name ?? '';
  const totalHours = hours.reduce((sum, r) => sum + r.weeklyHours, 0);

  return (
    <div className="space-y-4">
      <Link to="/teachers" className="text-sm text-primary">
        ← {t('nav.teachers')}
      </Link>

      <Card className="flex gap-4">
        <div className="w-20 h-20 rounded-full bg-accent/40 flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl font-bold text-primary">
          {teacher.photoUrl ? <img src={teacher.photoUrl} alt={teacher.name} className="w-full h-full object-cover" /> : teacher.name[0]}
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">{teacher.name}</h2>
          <p className="text-sm text-gray-500">{teacher.phone}</p>
          {teacher.email && <p className="text-sm text-gray-500">{teacher.email}</p>}
          {teacher.bio && <p className="text-sm text-gray-600 mt-2">{teacher.bio}</p>}
        </div>
      </Card>

      <div>
        <h3 className="section-title">
          {t('teachers.hoursReport')} — {totalHours.toFixed(1)} שעות שבועיות בסה"כ
        </h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('branches.title')}</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.title')}</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">שעות שבועיות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hours.map((row) => (
                <tr key={row.branchId}>
                  <td className="px-4 py-2">{branchName(row.branchId)}</td>
                  <td className="px-4 py-2">{row.courseCount}</td>
                  <td className="px-4 py-2">{row.weeklyHours.toFixed(1)}</td>
                </tr>
              ))}
              {hours.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                    {t('common.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
