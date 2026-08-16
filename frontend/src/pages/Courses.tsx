import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCourses, createCourse, updateCourse, deleteCourse } from '../api/courses';
import { getBranches } from '../api/branches';
import { getCourseTypes } from '../api/courseTypes';
import { getTeachers } from '../api/teachers';
import { getSeasons } from '../api/seasons';
import { getTroupes } from '../api/troupes';
import { Course, Branch, CourseType, Teacher, Season, Troupe, AgeCategory, AGE_CATEGORIES, AGE_CATEGORY_COLORS, DAY_NAMES } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { hasWriteAccess } from '../utils/roles';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';

function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function LockIcon({ label }: { label: string }) {
  return (
    <svg className="inline w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label={label}>
      <title>{label}</title>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

const emptyForm = {
  branchId: '',
  courseTypeId: '',
  teacherIds: [] as string[],
  seasonId: '',
  dayOfWeek: 0,
  startTime: '16:00',
  endTime: '17:00',
  roomName: '',
  ageGroupLevel: '',
  ageCategory: '' as AgeCategory | '',
  isOpen: true,
  troupeId: '',
  mandatoryForTroupeIds: [] as string[],
  capacity: undefined as number | undefined,
  price: undefined as number | undefined,
};

const getMultiSelectValues = (e: ChangeEvent<HTMLSelectElement>) =>
  Array.from(e.target.selectedOptions).map((o) => o.value);

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
  const [troupes, setTroupes] = useState<Troupe[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridBranchId, setGridBranchId] = useState('');
  const [gridTroupeId, setGridTroupeId] = useState('');
  const [gridAgeCategory, setGridAgeCategory] = useState<AgeCategory | ''>('');
  const [filters, setFilters] = useState<{
    branchId: string;
    teacherId: string;
    courseTypeId: string;
    troupeId: string;
    isOpen: string;
    ageCategory: AgeCategory | '';
  }>({
    branchId: '',
    teacherId: '',
    courseTypeId: '',
    troupeId: '',
    isOpen: '',
    ageCategory: '',
  });
  const [editing, setEditing] = useState<Course | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getCourses(), getBranches(), getCourseTypes(), getTeachers(), getSeasons(), getTroupes()]).then(
      ([c, b, ct, te, s, tr]) => {
        setCourses(c);
        setBranches(b);
        setCourseTypes(ct);
        setTeachers(te);
        setSeasons(s);
        setTroupes(tr);
        setGridBranchId(b[0]?._id ?? '');
        setLoading(false);
      }
    );
  }, []);

  const idOf = (v: string | { _id: string }) => (typeof v === 'string' ? v : v._id);
  const nameOf = <T extends { _id: string; name: string }>(list: T[], v: string | T) =>
    (typeof v === 'string' ? list.find((x) => x._id === v)?.name : v.name) ?? '—';
  const teacherNames = (ids: (string | Teacher)[]) =>
    ids.length ? ids.map((id) => nameOf(teachers, id)).join(', ') : '—';
  const matchesTroupe = (c: Course, troupeId: string) =>
    !troupeId ||
    (c.troupeId ? idOf(c.troupeId) === troupeId : false) ||
    c.mandatoryForTroupeIds.some((x) => idOf(x) === troupeId);

  const activeSeason = seasons.find((s) => s.isActive) ?? seasons[0];
  const currentBranch = branches.find((b) => b._id === gridBranchId);

  const gridCourses = useMemo(
    () =>
      courses.filter(
        (c) =>
          idOf(c.branchId) === gridBranchId &&
          c.isActive &&
          matchesTroupe(c, gridTroupeId) &&
          (!gridAgeCategory || c.ageCategory === gridAgeCategory)
      ),
    [courses, gridBranchId, gridTroupeId, gridAgeCategory]
  );

  const listCourses = useMemo(
    () =>
      courses.filter(
        (c) =>
          (!filters.branchId || idOf(c.branchId) === filters.branchId) &&
          (!filters.teacherId || c.teacherIds.some((x) => idOf(x) === filters.teacherId)) &&
          (!filters.courseTypeId || idOf(c.courseTypeId) === filters.courseTypeId) &&
          matchesTroupe(c, filters.troupeId) &&
          (!filters.isOpen || String(c.isOpen) === filters.isOpen) &&
          (!filters.ageCategory || c.ageCategory === filters.ageCategory)
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
      teacherIds: c.teacherIds.map(idOf),
      seasonId: idOf(c.seasonId),
      dayOfWeek: c.dayOfWeek,
      startTime: c.startTime,
      endTime: c.endTime,
      roomName: c.roomName,
      ageGroupLevel: c.ageGroupLevel,
      ageCategory: c.ageCategory ?? '',
      isOpen: c.isOpen,
      troupeId: c.troupeId ? idOf(c.troupeId) : '',
      mandatoryForTroupeIds: c.mandatoryForTroupeIds.map(idOf),
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
      const payload = {
        ...form,
        ageCategory: form.ageCategory || undefined,
        troupeId: form.troupeId || undefined,
      };
      if (editing) {
        const updated = await updateCourse(editing._id, payload);
        setCourses((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      } else {
        const created = await createCourse(payload);
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
          <div className="flex flex-wrap gap-2">
            <select className="input max-w-xs" value={gridBranchId} onChange={(e) => setGridBranchId(e.target.value)}>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select className="input max-w-[180px]" value={gridTroupeId} onChange={(e) => setGridTroupeId(e.target.value)}>
              <option value="">{t('courses.filterAllTroupes')}</option>
              {troupes.map((tr) => (
                <option key={tr._id} value={tr._id}>
                  {tr.name}
                </option>
              ))}
            </select>
            <select
              className="input max-w-[180px]"
              value={gridAgeCategory}
              onChange={(e) => setGridAgeCategory(e.target.value as AgeCategory | '')}
            >
              <option value="">{t('courses.filterAllAgeCategories')}</option>
              {AGE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`courses.ageCategoryLabels.${cat}`)}
                </option>
              ))}
            </select>
          </div>

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
                      const borderColor = c.ageCategory ? AGE_CATEGORY_COLORS[c.ageCategory] : '#B26CA1';
                      return (
                        <div
                          key={c._id}
                          className="text-xs rounded-md p-2 border-2 border-r-8 cursor-pointer"
                          style={{ borderColor, backgroundColor: hexToRgba(borderColor, 0.12) }}
                          onClick={() => canWrite && openEdit(c)}
                        >
                          <p className="font-semibold text-gray-800 flex items-center gap-1">
                            <span>
                              {c.startTime}–{c.endTime} · {nameOf(courseTypes, c.courseTypeId)}
                              {c.ageGroupLevel && ` · ${c.ageGroupLevel}`}
                            </span>
                            {!c.isOpen && <LockIcon label={t('courses.closed')} />}
                          </p>
                          <p className="text-gray-500">
                            {teacherNames(c.teacherIds)} · {c.roomName}
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
            <select className="input max-w-[180px]" value={filters.troupeId} onChange={(e) => setFilters((f) => ({ ...f, troupeId: e.target.value }))}>
              <option value="">{t('courses.filterAllTroupes')}</option>
              {troupes.map((tr) => (
                <option key={tr._id} value={tr._id}>
                  {tr.name}
                </option>
              ))}
            </select>
            <select
              className="input max-w-[180px]"
              value={filters.ageCategory}
              onChange={(e) => setFilters((f) => ({ ...f, ageCategory: e.target.value as AgeCategory | '' }))}
            >
              <option value="">{t('courses.filterAllAgeCategories')}</option>
              {AGE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`courses.ageCategoryLabels.${cat}`)}
                </option>
              ))}
            </select>
            <select className="input max-w-[140px]" value={filters.isOpen} onChange={(e) => setFilters((f) => ({ ...f, isOpen: e.target.value }))}>
              <option value="">{t('courses.filterAllOpenStatus')}</option>
              <option value="true">{t('courses.open')}</option>
              <option value="false">{t('courses.closed')}</option>
            </select>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.branch')}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.courseType')}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.ageCategory')}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.teacher')}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.dayOfWeek')}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">שעות</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.room')}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.ageGroup')}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('courses.isOpen')}</th>
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
                    <td className="px-3 py-2">
                      {c.ageCategory ? (
                        <Badge label={t(`courses.ageCategoryLabels.${c.ageCategory}`)} color={AGE_CATEGORY_COLORS[c.ageCategory]} />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2">{teacherNames(c.teacherIds)}</td>
                    <td className="px-3 py-2">{DAY_NAMES[c.dayOfWeek]}</td>
                    <td className="px-3 py-2">
                      {c.startTime}–{c.endTime}
                    </td>
                    <td className="px-3 py-2">{c.roomName}</td>
                    <td className="px-3 py-2">{c.ageGroupLevel || '—'}</td>
                    <td className="px-3 py-2">{!c.isOpen && <LockIcon label={t('courses.closed')} />}</td>
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
              <select
                className="input"
                multiple
                value={form.teacherIds}
                onChange={(e) => setForm((f) => ({ ...f, teacherIds: getMultiSelectValues(e) }))}
              >
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
              <label className="label">{t('courses.ageCategory')}</label>
              <select
                className="input"
                value={form.ageCategory}
                onChange={(e) => setForm((f) => ({ ...f, ageCategory: e.target.value as AgeCategory | '' }))}
              >
                <option value="">—</option>
                {AGE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`courses.ageCategoryLabels.${cat}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="isOpen"
                type="checkbox"
                checked={form.isOpen}
                onChange={(e) => setForm((f) => ({ ...f, isOpen: e.target.checked }))}
              />
              <label htmlFor="isOpen" className="label mb-0">
                {t('courses.isOpen')}
              </label>
            </div>
            <div>
              <label className="label">{t('courses.troupe')}</label>
              <select className="input" value={form.troupeId} onChange={(e) => setForm((f) => ({ ...f, troupeId: e.target.value }))}>
                <option value="">—</option>
                {troupes.map((tr) => (
                  <option key={tr._id} value={tr._id}>
                    {tr.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('courses.mandatoryFor')}</label>
              <select
                className="input"
                multiple
                value={form.mandatoryForTroupeIds}
                onChange={(e) => setForm((f) => ({ ...f, mandatoryForTroupeIds: getMultiSelectValues(e) }))}
              >
                {troupes.map((tr) => (
                  <option key={tr._id} value={tr._id}>
                    {tr.name}
                  </option>
                ))}
              </select>
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
