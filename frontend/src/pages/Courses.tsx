import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCourses, createCourse, updateCourse, deleteCourse } from '../api/courses';
import { getBranches } from '../api/branches';
import { getCourseTypes } from '../api/courseTypes';
import { getTeachers } from '../api/teachers';
import { getSeasons } from '../api/seasons';
import { Course, Branch, CourseType, Teacher, Season, DAY_NAMES } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { hasWriteAccess } from '../utils/roles';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';

const emptyForm = {
  branchId: '',
  courseTypeId: '',
  teacherId: '',
  seasonId: '',
  dayOfWeek: 0,
  startTime: '16:00',
  endTime: '17:00',
  roomName: '',
  ageGroupLevel: '',
  capacity: undefined as number | undefined,
  price: undefined as number | undefined,
};

export default function Courses() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canWrite = hasWriteAccess(user?.role);

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridBranchId, setGridBranchId] = useState('');
  const [filters, setFilters] = useState<{ branchId: string; teacherId: string; courseTypeId: string }>({
    branchId: '',
    teacherId: '',
    courseTypeId: '',
  });
  const [editing, setEditing] = useState<Course | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getCourses(), getBranches(), getCourseTypes(), getTeachers(), getSeasons()]).then(([c, b, ct, te, s]) => {
      setCourses(c);
      setBranches(b);
      setCourseTypes(ct);
      setTeachers(te);
      setSeasons(s);
      setGridBranchId(b[0]?._id ?? '');
      setLoading(false);
    });
  }, []);

  const idOf = (v: string | { _id: string }) => (typeof v === 'string' ? v : v._id);
  const nameOf = <T extends { _id: string; name: string }>(list: T[], v: string | T) =>
    (typeof v === 'string' ? list.find((x) => x._id === v)?.name : v.name) ?? '—';

  const activeSeason = seasons.find((s) => s.isActive) ?? seasons[0];
  const currentBranch = branches.find((b) => b._id === gridBranchId);

  const gridCourses = useMemo(
    () => courses.filter((c) => idOf(c.branchId) === gridBranchId && c.isActive),
    [courses, gridBranchId]
  );

  const listCourses = useMemo(
    () =>
      courses.filter(
        (c) =>
          (!filters.branchId || idOf(c.branchId) === filters.branchId) &&
          (!filters.teacherId || idOf(c.teacherId) === filters.teacherId) &&
          (!filters.courseTypeId || idOf(c.courseTypeId) === filters.courseTypeId)
      ),
    [courses, filters]
  );

  const openAdd = () => {
    setForm({ ...emptyForm, branchId: gridBranchId, seasonId: activeSeason?._id ?? '' });
    setError('');
    setAddModal(true);
  };

  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      branchId: idOf(c.branchId),
      courseTypeId: idOf(c.courseTypeId),
      teacherId: idOf(c.teacherId),
      seasonId: idOf(c.seasonId),
      dayOfWeek: c.dayOfWeek,
      startTime: c.startTime,
      endTime: c.endTime,
      roomName: c.roomName,
      ageGroupLevel: c.ageGroupLevel,
      capacity: c.capacity,
      price: c.price,
    });
    setError('');
  };

  const closeModal = () => {
    setAddModal(false);
    setEditing(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const updated = await updateCourse(editing._id, form);
        setCourses((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      } else {
        const created = await createCourse(form);
        setCourses((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('courses.roomConflict'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCourse(id);
    setCourses((prev) => prev.filter((c) => c._id !== id));
  };

  if (loading) return <Spinner />;

  const branchRooms = branches.find((b) => b._id === form.branchId)?.rooms ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <Button size="sm" variant={view === 'grid' ? 'primary' : 'secondary'} onClick={() => setView('grid')}>
            {t('courses.gridView')}
          </Button>
          <Button size="sm" variant={view === 'list' ? 'primary' : 'secondary'} onClick={() => setView('list')}>
            {t('courses.listView')}
          </Button>
        </div>
        {canWrite && (
          <Button size="sm" onClick={openAdd}>
            + {t('courses.addCourse')}
          </Button>
        )}
      </div>

      {view === 'grid' && (
        <>
          <select className="input max-w-xs" value={gridBranchId} onChange={(e) => setGridBranchId(e.target.value)}>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DAY_NAMES.map((dayName, dayIndex) => {
              const dayCourses = gridCourses
                .filter((c) => c.dayOfWeek === dayIndex)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              if (dayCourses.length === 0) return null;
              return (
                <div key={dayIndex} className="bg-white rounded-lg border border-gray-200 p-3">
                  <h3 className="text-sm font-bold text-primary mb-2">{dayName}</h3>
                  <div className="space-y-2">
                    {dayCourses.map((c) => {
                      const ct = courseTypes.find((x) => x._id === idOf(c.courseTypeId));
                      return (
                        <div
                          key={c._id}
                          className="text-xs rounded-md p-2 border-r-4 bg-gray-50 cursor-pointer"
                          style={{ borderRightColor: ct?.colorTag || '#B26CA1' }}
                          onClick={() => canWrite && openEdit(c)}
                        >
                          <p className="font-semibold text-gray-800">
                            {c.startTime}–{c.endTime} · {nameOf(courseTypes, c.courseTypeId)}
                          </p>
                          <p className="text-gray-500">
                            {nameOf(teachers, c.teacherId)} · {c.roomName}
                            {c.capacity ? ` · ${c.enrolledCount ?? 0}/${c.capacity}` : ''}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {currentBranch && gridCourses.length === 0 && <p className="text-sm text-gray-400">{t('common.noData')}</p>}
          </div>
        </>
      )}

      {view === 'list' && (
        <>
          <div className="flex flex-wrap gap-2">
            <select className="input max-w-[180px]" value={filters.branchId} onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}>
              <option value="">{t('events.filterAllBranches')}</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select className="input max-w-[180px]" value={filters.teacherId} onChange={(e) => setFilters((f) => ({ ...f, teacherId: e.target.value }))}>
              <option value="">כל המורים</option>
              {teachers.map((te) => (
                <option key={te._id} value={te._id}>
                  {te.name}
                </option>
              ))}
            </select>
            <select className="input max-w-[180px]" value={filters.courseTypeId} onChange={(e) => setFilters((f) => ({ ...f, courseTypeId: e.target.value }))}>
              <option value="">כל הסוגים</option>
              {courseTypes.map((ct) => (
                <option key={ct._id} value={ct._id}>
                  {ct.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.branch')}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.courseType')}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.teacher')}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.dayOfWeek')}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">שעות</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.room')}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.ageGroup')}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.capacity')}</th>
                  {canWrite && <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listCourses.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{nameOf(branches, c.branchId)}</td>
                    <td className="px-3 py-2">
                      <Badge label={nameOf(courseTypes, c.courseTypeId)} color={courseTypes.find((x) => x._id === idOf(c.courseTypeId))?.colorTag} />
                    </td>
                    <td className="px-3 py-2">{nameOf(teachers, c.teacherId)}</td>
                    <td className="px-3 py-2">{DAY_NAMES[c.dayOfWeek]}</td>
                    <td className="px-3 py-2">
                      {c.startTime}–{c.endTime}
                    </td>
                    <td className="px-3 py-2">{c.roomName}</td>
                    <td className="px-3 py-2">{c.ageGroupLevel || '—'}</td>
                    <td className="px-3 py-2 font-medium">{c.capacity ? `${c.enrolledCount ?? 0}/${c.capacity}` : '—'}</td>
                    {canWrite && (
                      <td className="px-3 py-2 flex gap-2">
                        <button className="text-xs text-primary" onClick={() => openEdit(c)}>
                          {t('common.edit')}
                        </button>
                        <button className="text-xs text-red-500" onClick={() => handleDelete(c._id)}>
                          {t('common.delete')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal open={addModal || !!editing} onClose={closeModal} title={editing ? t('common.edit') : t('courses.addCourse')} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('courses.branch')}</label>
              <select className="input" value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value, roomName: '' }))}>
                <option value="">—</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('courses.courseType')}</label>
              <select className="input" value={form.courseTypeId} onChange={(e) => setForm((f) => ({ ...f, courseTypeId: e.target.value }))}>
                <option value="">—</option>
                {courseTypes.map((ct) => (
                  <option key={ct._id} value={ct._id}>
                    {ct.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('courses.teacher')}</label>
              <select className="input" value={form.teacherId} onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}>
                <option value="">—</option>
                {teachers.map((te) => (
                  <option key={te._id} value={te._id}>
                    {te.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('courses.season')}</label>
              <select className="input" value={form.seasonId} onChange={(e) => setForm((f) => ({ ...f, seasonId: e.target.value }))}>
                <option value="">—</option>
                {seasons.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('courses.dayOfWeek')}</label>
              <select className="input" value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}>
                {DAY_NAMES.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('courses.room')}</label>
              <select className="input" value={form.roomName} onChange={(e) => setForm((f) => ({ ...f, roomName: e.target.value }))}>
                <option value="">—</option>
                {branchRooms.map((r) => (
                  <option key={r._id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('courses.startTime')}</label>
              <input type="time" className="input" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('courses.endTime')}</label>
              <input type="time" className="input" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('courses.ageGroup')}</label>
              <input className="input" value={form.ageGroupLevel} onChange={(e) => setForm((f) => ({ ...f, ageGroupLevel: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('courses.capacity')}</label>
              <input
                type="number"
                className="input"
                value={form.capacity ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
            <div>
              <label className="label">{t('courses.price')}</label>
              <input
                type="number"
                className="input"
                value={form.price ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button loading={saving} onClick={handleSave}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
