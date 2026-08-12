import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLeads, createLead, updateLeadStatus, deleteLead, convertLead } from '../api/leads';
import { getBranches } from '../api/branches';
import { getCourses } from '../api/courses';
import { getSettings } from '../api/settings';
import { Lead, Branch, Course, LeadSource, LEAD_SOURCES, LEAD_STATUSES } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { hasWriteAccess } from '../utils/roles';
import { isPastSlaHours } from '../utils/alerts';
import { formatDateTime } from '../utils/date';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

const emptyForm = { name: '', phone: '', branchId: '', source: 'אחר' as LeadSource, notes: '' };

export default function Leads() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canWrite = hasWriteAccess(user?.role);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [slaHours, setSlaHours] = useState(4);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ branchId: '', status: '', source: '' });
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [convertLeadTarget, setConvertLeadTarget] = useState<Lead | null>(null);
  const [convertCourseId, setConvertCourseId] = useState('');

  useEffect(() => {
    Promise.all([getLeads(), getBranches(), getCourses({ isActive: true }), getSettings()]).then(([l, b, c, s]) => {
      setLeads(l);
      setBranches(b);
      setCourses(c);
      setSlaHours(s.leadSlaThresholdHours);
      setLoading(false);
    });
  }, []);

  const idOf = (v: string | { _id: string }) => (typeof v === 'string' ? v : v._id);

  const filtered = useMemo(
    () =>
      leads.filter(
        (l) =>
          (!filters.branchId || idOf(l.branchId) === filters.branchId) &&
          (!filters.status || l.status === filters.status) &&
          (!filters.source || l.source === filters.source)
      ),
    [leads, filters]
  );

  const branchName = (l: Lead) => (typeof l.branchId === 'string' ? branches.find((b) => b._id === l.branchId)?.name : l.branchId.name);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const created = await createLead(form);
      setLeads((prev) => [created, ...prev]);
      setAddModal(false);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (lead: Lead, status: string) => {
    const updated = await updateLeadStatus(lead._id, status);
    setLeads((prev) => prev.map((l) => (l._id === lead._id ? updated : l)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('leads.deleteConfirm'))) return;
    await deleteLead(id);
    setLeads((prev) => prev.filter((l) => l._id !== id));
  };

  const openConvert = (lead: Lead) => {
    setConvertLeadTarget(lead);
    setConvertCourseId('');
  };

  const handleConvert = async () => {
    if (!convertLeadTarget || !convertCourseId) return;
    const { lead } = await convertLead(convertLeadTarget._id, convertCourseId);
    setLeads((prev) => prev.map((l) => (l._id === lead._id ? lead : l)));
    setConvertLeadTarget(null);
  };

  const coursesForConvert = convertLeadTarget
    ? courses.filter((c) => idOf(c.branchId) === idOf(convertLeadTarget.branchId))
    : [];

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-2">
          <select className="input max-w-[160px]" value={filters.branchId} onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}>
            <option value="">{t('leads.filterAllBranches')}</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
          <select className="input max-w-[160px]" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">{t('leads.filterAllStatuses')}</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`leadStatus.${s}`)}
              </option>
            ))}
          </select>
          <select className="input max-w-[160px]" value={filters.source} onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}>
            <option value="">{t('leads.filterAllSources')}</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {t(`leadSources.${s}`)}
              </option>
            ))}
          </select>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => setAddModal(true)}>
            + {t('leads.addLead')}
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('leads.name')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('leads.phone')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('leads.branch')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('leads.source')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('leads.status')}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('leads.createdAt')}</th>
              {canWrite && <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((lead) => {
              const overdue = lead.status === 'חדש' && isPastSlaHours(lead.createdAt, slaHours);
              return (
                <tr key={lead._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {lead.name}
                    {overdue && <Badge label={t('leads.slaOverdue')} color="#EF4444" />}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{lead.phone}</td>
                  <td className="px-3 py-2 text-gray-600">{branchName(lead)}</td>
                  <td className="px-3 py-2 text-gray-600">{t(`leadSources.${lead.source}`)}</td>
                  <td className="px-3 py-2">
                    {canWrite ? (
                      <select className="input max-w-[130px]" value={lead.status} onChange={(e) => handleStatusChange(lead, e.target.value)}>
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {t(`leadStatus.${s}`)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      t(`leadStatus.${lead.status}`)
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{formatDateTime(lead.createdAt)}</td>
                  {canWrite && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {lead.status !== 'נרשם' && lead.status !== 'לא_רלוונטי' && (
                          <button className="text-xs text-primary" onClick={() => openConvert(lead)}>
                            {t('leads.convert')}
                          </button>
                        )}
                        <button className="text-xs text-red-500" onClick={() => handleDelete(lead._id)}>
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  {t('common.noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title={t('leads.addLead')}>
        <div className="space-y-4">
          <div>
            <label className="label">{t('leads.name')}</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t('leads.phone')}</label>
            <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('leads.branch')}</label>
              <select className="input" value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}>
                <option value="">—</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('leads.source')}</label>
              <select className="input" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as LeadSource }))}>
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {t(`leadSources.${s}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">{t('leads.notes')}</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setAddModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button loading={saving} onClick={handleCreate} disabled={!form.name || !form.phone || !form.branchId}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!convertLeadTarget} onClose={() => setConvertLeadTarget(null)} title={t('leads.convertTitle')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {convertLeadTarget?.name} → {t('leads.chooseCourse')}
          </p>
          <select className="input" value={convertCourseId} onChange={(e) => setConvertCourseId(e.target.value)}>
            <option value="">—</option>
            {coursesForConvert.map((c) => (
              <option key={c._id} value={c._id}>
                {typeof c.courseTypeId !== 'string' ? c.courseTypeId.name : c.courseTypeId} · {c.startTime}–{c.endTime}
              </option>
            ))}
          </select>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setConvertLeadTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConvert} disabled={!convertCourseId}>
              {t('leads.convert')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
