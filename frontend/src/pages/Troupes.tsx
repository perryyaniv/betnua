import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getTroupes, createTroupe, updateTroupe, deleteTroupe, addTroupeMember, updateTroupeMember, removeTroupeMember } from '../api/troupes';
import { getBranches } from '../api/branches';
import { getStudents } from '../api/students';
import { Troupe, Branch, Student } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { hasWriteAccess } from '../utils/roles';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

export default function Troupes() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canWrite = hasWriteAccess(user?.role);

  const [troupes, setTroupes] = useState<Troupe[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Troupe | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', branchId: '' });
  const [newMemberStudentId, setNewMemberStudentId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getTroupes(), getBranches(), getStudents()]).then(([tr, b, s]) => {
      setTroupes(tr);
      setBranches(b);
      setStudents(s);
      setLoading(false);
    });
  }, []);

  const idOf = (v: string | { _id: string }) => (typeof v === 'string' ? v : v._id);
  const nameOf = <T extends { _id: string; name: string }>(list: T[], v: string | T) =>
    (typeof v === 'string' ? list.find((x) => x._id === v)?.name : v.name) ?? '—';

  const closeModal = () => {
    setAddModal(false);
    setEditing(null);
    setNewMemberStudentId('');
  };

  const openAdd = () => {
    setForm({ name: '', branchId: branches[0]?._id ?? '' });
    setAddModal(true);
  };

  const openEdit = (tr: Troupe) => {
    setEditing(tr);
    setForm({ name: tr.name, branchId: idOf(tr.branchId) });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateTroupe(editing._id, { name: form.name });
        setTroupes((prev) => prev.map((tr) => (tr._id === updated._id ? updated : tr)));
        setEditing(updated);
      } else {
        const created = await createTroupe(form);
        setTroupes((prev) => [...prev, created]);
        closeModal();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTroupe(id);
    setTroupes((prev) => prev.filter((tr) => tr._id !== id));
  };

  const handleAddMember = async () => {
    if (!editing || !newMemberStudentId) return;
    const updated = await addTroupeMember(editing._id, newMemberStudentId);
    setTroupes((prev) => prev.map((tr) => (tr._id === updated._id ? updated : tr)));
    setEditing(updated);
    setNewMemberStudentId('');
  };

  const handleToggleMember = async (memberId: string, isActive: boolean) => {
    if (!editing) return;
    const updated = await updateTroupeMember(editing._id, memberId, { isActive: !isActive });
    setTroupes((prev) => prev.map((tr) => (tr._id === updated._id ? updated : tr)));
    setEditing(updated);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!editing) return;
    const updated = await removeTroupeMember(editing._id, memberId);
    setTroupes((prev) => prev.map((tr) => (tr._id === updated._id ? updated : tr)));
    setEditing(updated);
  };

  const availableStudents = useMemo(() => {
    if (!editing) return [];
    const memberIds = new Set(editing.members.map((m) => idOf(m.studentId)));
    return students.filter((s) => !memberIds.has(s._id));
  }, [editing, students]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openAdd}>
            + {t('troupes.addTroupe')}
          </Button>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {troupes.map((tr) => (
          <Card key={tr._id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-800">{tr.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{nameOf(branches, tr.branchId)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {t('troupes.members')}: {tr.members.filter((m) => m.isActive).length}
                </p>
              </div>
              {canWrite && (
                <div className="flex flex-col gap-1 items-end">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(tr)}>
                    {t('common.edit')}
                  </Button>
                  <button className="text-xs text-red-500" onClick={() => handleDelete(tr._id)}>
                    {t('common.delete')}
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}
        {troupes.length === 0 && <p className="text-sm text-gray-400">{t('common.noData')}</p>}
      </div>

      <Modal
        open={addModal || !!editing}
        onClose={closeModal}
        title={editing ? editing.name : t('troupes.addTroupe')}
      >
        <div className="space-y-4">
          <div>
            <label className="label">{t('troupes.name')}</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          {!editing && (
            <div>
              <label className="label">{t('courses.branch')}</label>
              <select className="input" value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {editing && (
            <div>
              <label className="label">{t('troupes.members')}</label>
              <div className="space-y-1 mb-2">
                {editing.members.map((m) => (
                  <div key={m._id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                    <span className={m.isActive ? '' : 'text-gray-400 line-through'}>{nameOf(students, m.studentId)}</span>
                    <div className="flex gap-2">
                      <button className="text-xs text-primary" onClick={() => handleToggleMember(m._id, m.isActive)}>
                        {m.isActive ? t('troupes.deactivateMember') : t('troupes.reactivateMember')}
                      </button>
                      <button className="text-xs text-red-500" onClick={() => handleRemoveMember(m._id)}>
                        {t('troupes.removeMember')}
                      </button>
                    </div>
                  </div>
                ))}
                {editing.members.length === 0 && <p className="text-xs text-gray-400">{t('troupes.noMembers')}</p>}
              </div>
              <div className="flex gap-2">
                <select className="input" value={newMemberStudentId} onChange={(e) => setNewMemberStudentId(e.target.value)}>
                  <option value="">—</option>
                  {availableStudents.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="secondary" onClick={handleAddMember}>
                  {t('troupes.addMember')}
                </Button>
              </div>
            </div>
          )}

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
