import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSettings, updateSettings } from '../api/settings';
import { getCourseTypes, createCourseType, deleteCourseType } from '../api/courseTypes';
import { getSeasons, createSeason } from '../api/seasons';
import { getClosures, createClosure, deleteClosure } from '../api/closures';
import { getBranches } from '../api/branches';
import { AppSettings, CourseType, Season, Closure, Branch } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { formatDate } from '../utils/date';

type Tab = 'thresholds' | 'courseTypes' | 'seasons' | 'closures';

export default function Settings() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('thresholds');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newCourseType, setNewCourseType] = useState({ name: '', colorTag: '#B26CA1' });
  const [newSeason, setNewSeason] = useState({ label: '', startDate: '', endDate: '' });
  const [newClosure, setNewClosure] = useState({ date: '', scope: 'all' as 'all' | 'branch', branchId: '', reason: '' });

  useEffect(() => {
    Promise.all([getSettings(), getCourseTypes(), getSeasons(), getClosures(), getBranches()]).then(([s, ct, se, cl, b]) => {
      setSettings(s);
      setCourseTypes(ct);
      setSeasons(se);
      setClosures(cl);
      setBranches(b);
      setLoading(false);
    });
  }, []);

  const handleSaveThresholds = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCourseType = async () => {
    if (!newCourseType.name.trim()) return;
    const created = await createCourseType(newCourseType);
    setCourseTypes((prev) => [...prev, created]);
    setNewCourseType({ name: '', colorTag: '#B26CA1' });
  };

  const handleDeleteCourseType = async (id: string) => {
    try {
      await deleteCourseType(id);
      setCourseTypes((prev) => prev.filter((c) => c._id !== id));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'שגיאה');
    }
  };

  const handleAddSeason = async () => {
    if (!newSeason.label || !newSeason.startDate || !newSeason.endDate) return;
    const created = await createSeason(newSeason);
    setSeasons((prev) => [created, ...prev]);
    setNewSeason({ label: '', startDate: '', endDate: '' });
  };

  const handleAddClosure = async () => {
    if (!newClosure.date || !newClosure.reason) return;
    const created = await createClosure(newClosure);
    setClosures((prev) => [...prev, created].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setNewClosure({ date: '', scope: 'all', branchId: '', reason: '' });
  };

  const handleDeleteClosure = async (id: string) => {
    await deleteClosure(id);
    setClosures((prev) => prev.filter((c) => c._id !== id));
  };

  if (loading || !settings) return <Spinner />;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'thresholds', label: t('settings.thresholds') },
    { key: 'courseTypes', label: t('settings.courseTypes') },
    { key: 'seasons', label: t('settings.seasons') },
    { key: 'closures', label: t('settings.closures') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap border-b border-gray-200">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === tb.key ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'thresholds' && (
        <Card className="max-w-md space-y-4">
          <div>
            <label className="label">{t('settings.eventPrepareAlertThresholdDays')}</label>
            <input
              type="number"
              className="input"
              value={settings.eventPrepareAlertThresholdDays}
              onChange={(e) => setSettings((s) => (s ? { ...s, eventPrepareAlertThresholdDays: Number(e.target.value) } : s))}
            />
          </div>
          <div>
            <label className="label">{t('settings.taskDueAlertThresholdDays')}</label>
            <input
              type="number"
              className="input"
              value={settings.taskDueAlertThresholdDays}
              onChange={(e) => setSettings((s) => (s ? { ...s, taskDueAlertThresholdDays: Number(e.target.value) } : s))}
            />
          </div>
          <Button loading={saving} onClick={handleSaveThresholds}>
            {t('common.save')}
          </Button>
        </Card>
      )}

      {tab === 'courseTypes' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {courseTypes.map((ct) => (
              <span key={ct._id} className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full text-white" style={{ backgroundColor: ct.colorTag }}>
                {ct.name}
                <button onClick={() => handleDeleteCourseType(ct._id)} className="text-white/80 hover:text-white">
                  ×
                </button>
              </span>
            ))}
          </div>
          <Card className="max-w-md flex gap-2 items-end">
            <input className="input" placeholder={t('users.name')} value={newCourseType.name} onChange={(e) => setNewCourseType((f) => ({ ...f, name: e.target.value }))} />
            <input
              type="color"
              className="h-10 w-14"
              value={newCourseType.colorTag}
              onChange={(e) => setNewCourseType((f) => ({ ...f, colorTag: e.target.value }))}
            />
            <Button size="sm" onClick={handleAddCourseType}>
              {t('common.add')}
            </Button>
          </Card>
        </div>
      )}

      {tab === 'seasons' && (
        <div className="space-y-3">
          {seasons.map((s) => (
            <Card key={s._id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{s.label}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(s.startDate)} – {formatDate(s.endDate)}
                </p>
              </div>
              {s.isActive && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">פעילה</span>}
            </Card>
          ))}
          <Card className="max-w-lg grid sm:grid-cols-3 gap-2 items-end">
            <input className="input" placeholder="שם העונה" value={newSeason.label} onChange={(e) => setNewSeason((f) => ({ ...f, label: e.target.value }))} />
            <input type="date" className="input" value={newSeason.startDate} onChange={(e) => setNewSeason((f) => ({ ...f, startDate: e.target.value }))} />
            <input type="date" className="input" value={newSeason.endDate} onChange={(e) => setNewSeason((f) => ({ ...f, endDate: e.target.value }))} />
            <Button size="sm" onClick={handleAddSeason} className="sm:col-span-3">
              {t('common.add')}
            </Button>
          </Card>
        </div>
      )}

      {tab === 'closures' && (
        <div className="space-y-3">
          {closures.map((c) => (
            <Card key={c._id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{formatDate(c.date)} — {c.reason}</p>
                <p className="text-xs text-gray-500">
                  {c.scope === 'all' ? t('settings.closureScopeAll') : branches.find((b) => b._id === c.branchId)?.name}
                </p>
              </div>
              <button className="text-xs text-red-500" onClick={() => handleDeleteClosure(c._id)}>
                {t('common.delete')}
              </button>
            </Card>
          ))}
          <Card className="max-w-lg grid sm:grid-cols-2 gap-2 items-end">
            <input type="date" className="input" value={newClosure.date} onChange={(e) => setNewClosure((f) => ({ ...f, date: e.target.value }))} />
            <select
              className="input"
              value={newClosure.scope}
              onChange={(e) => setNewClosure((f) => ({ ...f, scope: e.target.value as 'all' | 'branch' }))}
            >
              <option value="all">{t('settings.closureScopeAll')}</option>
              <option value="branch">{t('settings.closureScopeBranch')}</option>
            </select>
            {newClosure.scope === 'branch' && (
              <select className="input" value={newClosure.branchId} onChange={(e) => setNewClosure((f) => ({ ...f, branchId: e.target.value }))}>
                <option value="">—</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <input
              className="input"
              placeholder={t('settings.reason')}
              value={newClosure.reason}
              onChange={(e) => setNewClosure((f) => ({ ...f, reason: e.target.value }))}
            />
            <Button size="sm" onClick={handleAddClosure} className="sm:col-span-2">
              {t('settings.addClosure')}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
