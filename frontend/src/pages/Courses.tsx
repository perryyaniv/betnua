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
  CourseLinkType,
  COURSE_LINK_TYPES,
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { hasWriteAccess } from '../utils/roles';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

function EllipsisIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

function LockIcon({ label, color, className = 'w-3.5 h-3.5' }: { label: string; color: string; className?: string }) {
  return (
    <svg className={`inline ${className}`} style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label={label}>
      <title>{label}</title>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function WhatsappIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.462 3.484 1.34 4.997L2.003 22l5.135-1.317a9.94 9.94 0 004.866 1.24h.004c5.514 0 9.997-4.483 9.997-9.997 0-2.671-1.04-5.183-2.928-7.071a9.93 9.93 0 00-7.073-2.925zm0 18.187h-.003a8.2 8.2 0 01-4.181-1.145l-.3-.178-3.049.782.813-2.973-.195-.305a8.19 8.19 0 01-1.257-4.371c0-4.529 3.685-8.213 8.216-8.213a8.16 8.16 0 015.813 2.408 8.16 8.16 0 012.403 5.812c0 4.53-3.685 8.185-8.26 8.185z" />
    </svg>
  );
}

function ImageIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h16M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z"
      />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function GenericLinkIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m6.828-1.5l1.5-1.5a4 4 0 10-5.656-5.656l-3 3a4 4 0 000 5.656"
      />
    </svg>
  );
}

function ExternalLinkIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

const WHATSAPP_URL_RE = /wa\.me|whatsapp\.com/i;

function CourseLinkIcon({ type, className }: { type: CourseLinkType; className?: string }) {
  if (type === 'whatsapp') return <WhatsappIcon className={className} />;
  if (type === 'image') return <ImageIcon className={className} />;
  return <GenericLinkIcon className={className} />;
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
  links: [] as { name: string; url: string; type: CourseLinkType }[],
  capacity: undefined as number | undefined,
  price: undefined as number | undefined,
};

const TROUPE_FILTER_OPEN = '__open_courses__';
const TROUPE_FILTER_CLOSED = '__closed_courses__';

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
  const [openLinksId, setOpenLinksId] = useState<string | null>(null);
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
    if (troupeId === TROUPE_FILTER_OPEN) return c.isOpen;
    if (troupeId === TROUPE_FILTER_CLOSED) return !c.isOpen;
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
      c.links.map((l) => l.name).join(' '),
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
      links: c.links.map((l) => ({ name: l.name, url: l.url, type: l.type })),
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
                <option value={TROUPE_FILTER_CLOSED}>{t('courses.filterClosedCourses')}</option>
                <option value={TROUPE_FILTER_OPEN}>{t('courses.filterOpenCourses')}</option>
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
                          {!c.isOpen ? (
                            <div className="flex flex-col items-center flex-shrink-0 text-center">
                              <LockIcon label={t('courses.closed')} color={textColor} className="w-[1.35rem] h-[1.35rem]" />
                              {(c.troupeId || c.mandatoryForTroupeIds.length > 0) && (
                                <span
                                  className="text-[0.675rem] font-semibold leading-tight"
                                  style={{ color: c.troupeId ? textColor : mandatoryColor }}
                                >
                                  {c.troupeId
                                    ? nameOf(troupes, c.troupeId)
                                    : c.mandatoryForTroupeIds.map((id) => nameOf(troupes, id)).join(', ')}
                                </span>
                              )}
                            </div>
                          ) : (
                            canWrite && (
                              <button
                                type="button"
                                className="flex-shrink-0"
                                style={{ color: secondaryTextColor }}
                                onClick={() => openEdit(c)}
                                aria-label={t('common.edit')}
                              >
                                <EllipsisIcon className="w-[1.35rem] h-[1.35rem]" />
                              </button>
                            )
                          )}
                          {c.links.length > 0 && (
                            <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center"
                                onClick={() => setOpenLinksId(openLinksId === c._id ? null : c._id)}
                                aria-label={t('courses.links')}
                              >
                                <ExternalLinkIcon className="w-3.5 h-3.5" />
                              </button>
                              {openLinksId === c._id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setOpenLinksId(null)} />
                                  <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px] text-right">
                                    {c.links.map((link) => (
                                      <a
                                        key={link._id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                                        onClick={() => setOpenLinksId(null)}
                                      >
                                        <CourseLinkIcon
                                          type={link.type}
                                          className={`w-3.5 h-3.5 flex-shrink-0 ${link.type === 'whatsapp' ? 'text-[#25D366]' : 'text-gray-400'}`}
                                        />
                                        {link.name}
                                      </a>
                                    ))}
                                  </div>
                                </>
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

          <div>
            <label className="label">{t('courses.links')}</label>
            <div className="space-y-2">
              {form.links.map((link, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <CourseLinkIcon type={link.type} className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <input
                    className="input flex-1"
                    placeholder={t('courses.linkName')}
                    value={link.name}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        links: f.links.map((l, j) => (j === i ? { ...l, name: e.target.value } : l)),
                      }))
                    }
                  />
                  <input
                    className="input flex-1"
                    placeholder={t('courses.linkUrl')}
                    value={link.url}
                    onChange={(e) => {
                      const url = e.target.value;
                      setForm((f) => ({
                        ...f,
                        links: f.links.map((l, j) =>
                          j === i ? { ...l, url, type: l.type === 'generic' && WHATSAPP_URL_RE.test(url) ? 'whatsapp' : l.type } : l
                        ),
                      }));
                    }}
                  />
                  <select
                    className="input flex-shrink-0 w-28"
                    value={link.type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        links: f.links.map((l, j) => (j === i ? { ...l, type: e.target.value as CourseLinkType } : l)),
                      }))
                    }
                  >
                    {COURSE_LINK_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`courses.linkTypeLabels.${type}`)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="text-red-500 text-sm px-2 flex-shrink-0"
                    onClick={() => setForm((f) => ({ ...f, links: f.links.filter((_, j) => j !== i) }))}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              ))}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setForm((f) => ({ ...f, links: [...f.links, { name: '', url: '', type: 'generic' }] }))}
              >
                + {t('courses.addLink')}
              </Button>
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
