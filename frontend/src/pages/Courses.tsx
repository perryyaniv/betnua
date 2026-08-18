import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCourses, createCourse, updateCourse, deleteCourse } from '../api/courses';
import { getBranches } from '../api/branches';
import { getCourseTypes } from '../api/courseTypes';
import { getTeachers } from '../api/teachers';
import { getSeasons } from '../api/seasons';
import { getTroupes } from '../api/troupes';
import {
  Course,
  Branch,
  CourseType,
  Teacher,
  Season,
  Troupe,
  AgeCategory,
  AGE_CATEGORIES,
  AGE_CATEGORY_COLORS,
  AGE_CATEGORY_TEXT_COLORS,
  AGE_CATEGORY_SECONDARY_TEXT_COLORS,
  DAY_NAMES,
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { hasWriteAccess } from '../utils/roles';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

function LockIcon({ label, color, className = 'w-3.5 h-3.5' }: { label: string; color: string; className?: string }) {
  return (
    <svg className={`inline ${className}`} style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label={label}>
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
  notes: '',
  isOpen: true,
  troupeId: '',
  mandatoryForTroupeIds: [] as string[],
  capacity: undefined as number | undefined,
  price: undefined as number | undefined,
};

const TROUPE_FILTER_ANY = '__any_troupe__';
const TROUPE_FILTER_NONE = '__no_troupe__';

const getMultiSelectValues = (e: ChangeEvent<HTMLSelectElement>) =>
  Array.from(e.target.selectedOptions).map((o) => o.value);

export default function Courses() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canWrite = hasWriteAccess(user?.role);

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
  const [searchQuery, setSearchQuery] = useState('');
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
  const matchesTroupe = (c: Course, troupeId: string) => {
    if (!troupeId) return true;
    if (troupeId === TROUPE_FILTER_ANY) return !!c.troupeId;
    if (troupeId === TROUPE_FILTER_NONE) return !c.troupeId;
    return (c.troupeId ? idOf(c.troupeId) === troupeId : false) || c.mandatoryForTroupeIds.some((x) => idOf(x) === troupeId);
  };
  const matchesSearch = (c: Course, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      nameOf(courseTypes, c.courseTypeId),
      teacherNames(c.teacherIds),
      c.roomName,
      c.ageGroupLevel,
      c.ageCategory ? t(`courses.ageCategoryLabels.${c.ageCategory}`) : '',
      c.troupeId ? nameOf(troupes, c.troupeId) : '',
      c.mandatoryForTroupeIds.map((id) => nameOf(troupes, id)).join(' '),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  };

  const activeSeason = seasons.find((s) => s.isActive) ?? seasons[0];
  const currentBranch = branches.find((b) => b._id === gridBranchId);
  const branchTroupes = troupes.filter((tr) => !gridBranchId || idOf(tr.branchId) === gridBranchId);

  const gridCourses = useMemo(
    () =>
      courses.filter(
        (c) =>
          (!gridBranchId || idOf(c.branchId) === gridBranchId) &&
          c.isActive &&
          matchesTroupe(c, gridTroupeId) &&
          (!gridAgeCategory || c.ageCategory === gridAgeCategory) &&
          matchesSearch(c, searchQuery)
      ),
    [courses, gridBranchId, gridTroupeId, gridAgeCategory, searchQuery]
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
      notes: c.notes,
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
    closeModal();
  };

  if (loading) return <Spinner />;

  const branchRooms = branches.find((b) => b._id === form.branchId)?.rooms ?? [];

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openAdd}>
            + {t('courses.addCourse')}
          </Button>
        </div>
      )}

      <>
          <div>
            <label className="label text-right">{t('common.search')}</label>
            <input
              type="text"
              className="input w-full"
              placeholder={t('courses.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-nowrap gap-2">
            <div className="flex-1 min-w-0">
              <label className="label text-right">{t('courses.branch')}</label>
              <select
                className="input w-full px-1"
                value={gridBranchId}
                onChange={(e) => {
                  setGridBranchId(e.target.value);
                  setGridTroupeId('');
                }}
              >
                <option value="">{t('common.all')}</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-0">
              <label className="label text-right">{t('courses.troupe')}</label>
              <select className="input w-full px-1" value={gridTroupeId} onChange={(e) => setGridTroupeId(e.target.value)}>
                <option value="">{t('courses.filterAllTroupes')}</option>
                <option value={TROUPE_FILTER_ANY}>{t('courses.filterAnyTroupe')}</option>
                <option value={TROUPE_FILTER_NONE}>{t('courses.filterNoTroupe')}</option>
                {branchTroupes.map((tr) => (
                  <option key={tr._id} value={tr._id}>
                    {tr.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-0">
              <label className="label text-right">{t('courses.ageGroupFilterLabel')}</label>
              <select
                className="input w-full px-1"
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
                      const bgColor = c.ageCategory ? AGE_CATEGORY_COLORS[c.ageCategory] : '#B26CA1';
                      const textColor = c.ageCategory ? AGE_CATEGORY_TEXT_COLORS[c.ageCategory] : '#1f2937';
                      const secondaryTextColor = c.ageCategory ? AGE_CATEGORY_SECONDARY_TEXT_COLORS[c.ageCategory] : '#4b5563';
                      // A flat red fails contrast on the dark "teens" background and on the
                      // already-pinkish "adultWomen" one, so pick per background darkness.
                      const mandatoryColor = textColor === '#ffffff' ? '#fecaca' : '#7f1d1d';
                      return (
                        <div
                          key={c._id}
                          className="text-xs rounded-md p-2 cursor-pointer flex items-center gap-2"
                          style={{ backgroundColor: bgColor }}
                          onClick={() => canWrite && openEdit(c)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold" style={{ color: textColor }}>
                              <span dir="ltr">
                                {c.startTime}-{c.endTime}
                              </span>{' '}
                              · {nameOf(courseTypes, c.courseTypeId)}
                              {c.notes && ` · ${c.notes}`}
                              {c.ageGroupLevel && !(!c.isOpen && c.troupeId) && ` · ${c.ageGroupLevel}`}
                              {c.isOpen &&
                                c.troupeId &&
                                !c.mandatoryForTroupeIds.some((id) => idOf(id) === idOf(c.troupeId as string | Troupe)) &&
                                ` · ${nameOf(troupes, c.troupeId)}`}
                            </p>
                            <p style={{ color: secondaryTextColor }}>
                              {!gridBranchId && `${nameOf(branches, c.branchId)} · `}
                              {teacherNames(c.teacherIds)} · {c.roomName}
                              {c.capacity ? ` · ${c.enrolledCount ?? 0}/${c.capacity}` : ''}
                              {c.isOpen && c.mandatoryForTroupeIds.length > 0 && (
                                <span className="font-semibold" style={{ color: mandatoryColor }}>
                                  {' · '}
                                  {t('courses.mandatoryForPrefix')} {c.mandatoryForTroupeIds.map((id) => nameOf(troupes, id)).join(', ')}
                                </span>
                              )}
                            </p>
                          </div>
                          {!c.isOpen && (
                            <div className="flex flex-col items-center flex-shrink-0 text-center">
                              <LockIcon label={t('courses.closed')} color={textColor} className="w-6 h-6" />
                              {(c.troupeId || c.mandatoryForTroupeIds.length > 0) && (
                                <span
                                  className="text-xs font-semibold leading-tight"
                                  style={{ color: c.troupeId ? textColor : mandatoryColor }}
                                >
                                  {c.troupeId
                                    ? nameOf(troupes, c.troupeId)
                                    : c.mandatoryForTroupeIds.map((id) => nameOf(troupes, id)).join(', ')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {(!gridBranchId || currentBranch) && gridCourses.length === 0 && (
              <p className="text-sm text-gray-400">{t('common.noData')}</p>
            )}
          </div>
        </>

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
              <label className="label">{t('courses.notes')}</label>
              <input className="input" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
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

          <div className="flex items-center justify-between">
            <div>
              {editing && (
                <button className="text-sm text-red-500" onClick={() => handleDelete(editing._id)}>
                  {t('common.delete')}
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={closeModal}>
                {t('common.cancel')}
              </Button>
              <Button loading={saving} onClick={handleSave}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
