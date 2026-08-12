import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getStudents, createStudent, addEnrollment, updateEnrollment, deleteStudent } from '../api/students';
import { getCourses } from '../api/courses';
import { getCourseTypes } from '../api/courseTypes';
import { getDropoutReasons } from '../api/dropoutReasons';
import { Student, Course, CourseType, DropoutReason, Enrollment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { hasWriteAccess } from '../utils/roles';
import { formatDate } from '../utils/date';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';

export default function Students() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canWrite = hasWriteAccess(user?.role);
  const isAdmin = user?.role === 'admin';

  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [reasons, setReasons] = useState<DropoutReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ courseId: '', status: '' });

  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', guardianPhone: '', courseId: '' });
  const [saving, setSaving] = useState(false);

  const [enrollTarget, setEnrollTarget] = useState<Student | null>(null);
  const [enrollCourseId, setEnrollCourseId] = useState('');

  const [dropTarget, setDropTarget] = useState<{ student: Student; enrollment: Enrollment } | null>(null);
  const [dropReasonId, setDropReasonId] = useState('');
  const [dropNote, setDropNote] = useState('');

  useEffect(() => {
    Promise.all([getStudents(), getCourses(), getCourseTypes(), getDropoutReasons()]).then(([s, c, ct, r]) => {
      setStudents(s);
      setCourses(c);
      setCourseTypes(ct);
      setReasons(r);
      setLoading(false);
    });
  }, []);

  const idOf = (v: string | { _id: string }) => (typeof v === 'string' ? v : v._id);
  const courseLabel = (courseId: string | Course) => {
    const course = typeof courseId === 'string' ? courses.find((c) => c._id === courseId) : courseId;
    if (!course) return '—';
    const ctName = typeof course.courseTypeId === 'string' ? courseTypes.find((c) => c._id === course.courseTypeId)?.name : course.courseTypeId.name;
    return `${ctName || ''} · ${course.startTime}–${course.endTime}`;
  };

  const filtered = useMemo(
    () =>
      students.filter((s) =>
        s.enrollments.some(
          (e) => (!filters.courseId || idOf(e.courseId) === filters.courseId) && (!filters.status || e.status === filters.status)
        )
      ),
    [students, filters]
  );

  const handleCreate = async () => {
    setSaving(true);
    try {
      const created = await createStudent(addForm);
      setStudents((prev) => [...prev, created]);
      setAddModal(false);
      setAddForm({ name: '', guardianPhone: '', courseId: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddEnrollment = async () => {
    if (!enrollTarget || !enrollCourseId) return;
    const updated = await addEnrollment(enrollTarget._id, enrollCourseId);
    setStudents((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    setEnrollTarget(null);
  };

  const handleReactivate = async (student: Student, enrollment: Enrollment) => {
    const updated = await updateEnrollment(student._id, enrollment._id, { status: 'פעיל' });
    setStudents((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
  };

  const openDrop = (student: Student, enrollment: Enrollment) => {
    setDropTarget({ student, enrollment });
    setDropReasonId('');
    setDropNote('');
  };

  const handleDrop = async () => {
    if (!dropTarget) return;
    const updated = await updateEnrollment(dropTarget.student._id, dropTarget.enrollment._id, {
      status: 'פרש',
      dropoutReasonId: dropReasonId || null,
      dropoutNote: dropNote,
    });
    setStudents((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    setDropTarget(null);
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm(t('students.deleteConfirm'))) return;
    await deleteStudent(id);
    setStudents((prev) => prev.filter((s) => s._id !== id));
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-2">
          <select
            className="input max-w-[200px]"
            value={filters.courseId}
            onChange={(e) => setFilters((f) => ({ ...f, courseId: e.target.value }))}
          >
            <option value="">{t('students.filterAllCourses')}</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {courseLabel(c)}
              </option>
            ))}
          </select>
          <select className="input max-w-[150px]" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">{t('students.filterAllStatuses')}</option>
            <option value="פעיל">{t('enrollmentStatus.פעיל')}</option>
            <option value="פרש">{t('enrollmentStatus.פרש')}</option>
          </select>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => setAddModal(true)}>
            + {t('students.addStudent')}
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((student) => (
          <Card key={student._id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-800">{student.name}</h3>
                <p className="text-xs text-gray-500">{student.guardianPhone || '—'}</p>
              </div>
              {isAdmin && (
                <button className="text-xs text-red-500" onClick={() => handleDeleteStudent(student._id)}>
                  {t('common.delete')}
                </button>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {student.enrollments.map((e) => (
                <div key={e._id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                  <div>
                    <p className="text-gray-800">{courseLabel(e.courseId)}</p>
                    {e.status === 'פרש' && (
                      <p className="text-xs text-gray-500">
                        {formatDate(e.droppedAt)}
                        {e.dropoutReasonId ? ` · ${typeof e.dropoutReasonId === 'string' ? reasons.find((r) => r._id === e.dropoutReasonId)?.name : e.dropoutReasonId.name}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={t(`enrollmentStatus.${e.status}`)} color={e.status === 'פעיל' ? '#16A34A' : '#EF4444'} />
                    {canWrite &&
                      (e.status === 'פעיל' ? (
                        <button className="text-xs text-red-500" onClick={() => openDrop(student, e)}>
                          {t('students.markDropped')}
                        </button>
                      ) : (
                        <button className="text-xs text-primary" onClick={() => handleReactivate(student, e)}>
                          {t('students.reactivate')}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            {canWrite && (
              <button className="text-xs text-primary mt-3" onClick={() => setEnrollTarget(student)}>
                + {t('students.addEnrollment')}
              </button>
            )}
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-sm text-gray-400">{t('common.noData')}</p>}
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title={t('students.addStudent')}>
        <div className="space-y-4">
          <div>
            <label className="label">{t('students.name')}</label>
            <input className="input" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t('students.guardianPhone')}</label>
            <input className="input" value={addForm.guardianPhone} onChange={(e) => setAddForm((f) => ({ ...f, guardianPhone: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t('students.course')}</label>
            <select className="input" value={addForm.courseId} onChange={(e) => setAddForm((f) => ({ ...f, courseId: e.target.value }))}>
              <option value="">—</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {courseLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setAddModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button loading={saving} onClick={handleCreate} disabled={!addForm.name || !addForm.courseId}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!enrollTarget} onClose={() => setEnrollTarget(null)} title={t('students.addEnrollment')}>
        <div className="space-y-4">
          <select className="input" value={enrollCourseId} onChange={(e) => setEnrollCourseId(e.target.value)}>
            <option value="">—</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {courseLabel(c)}
              </option>
            ))}
          </select>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setEnrollTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddEnrollment} disabled={!enrollCourseId}>
              {t('common.add')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!dropTarget} onClose={() => setDropTarget(null)} title={t('students.markDropped')}>
        <div className="space-y-4">
          <div>
            <label className="label">{t('students.dropoutReason')}</label>
            <select className="input" value={dropReasonId} onChange={(e) => setDropReasonId(e.target.value)}>
              <option value="">—</option>
              {reasons.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('students.dropoutNote')}</label>
            <textarea className="input" rows={2} value={dropNote} onChange={(e) => setDropNote(e.target.value)} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDropTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="dangerSolid" onClick={handleDrop}>
              {t('students.markDropped')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
