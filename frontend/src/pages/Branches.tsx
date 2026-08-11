import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getBranches, createBranch, updateBranch, addRoom, deleteRoom } from '../api/branches';
import { Branch } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

export default function Branches() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phone: '', hoursOpen: '15:00', hoursClose: '22:00' });
  const [newRoomName, setNewRoomName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => getBranches().then(setBranches).finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);

  const openEdit = (b: Branch) => {
    setEditing(b);
    setForm({ name: b.name, address: b.address, phone: b.phone, hoursOpen: b.hoursOpen, hoursClose: b.hoursClose });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateBranch(editing._id, form);
        setBranches((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
        setEditing(null);
      } else {
        const created = await createBranch(form);
        setBranches((prev) => [...prev, created]);
        setAddModal(false);
      }
      setForm({ name: '', address: '', phone: '', hoursOpen: '15:00', hoursClose: '22:00' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddRoom = async () => {
    if (!editing || !newRoomName.trim()) return;
    const updated = await addRoom(editing._id, newRoomName.trim());
    setBranches((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
    setEditing(updated);
    setNewRoomName('');
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!editing) return;
    const updated = await deleteRoom(editing._id, roomId);
    setBranches((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
    setEditing(updated);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAddModal(true)}>
            + {t('branches.addBranch')}
          </Button>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b) => (
          <Card key={b._id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-800">{b.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{b.address}</p>
                <p className="text-sm text-gray-500">{b.phone}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {b.hoursOpen}–{b.hoursClose}
                </p>
              </div>
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>
                  {t('common.edit')}
                </Button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {b.rooms.map((r) => (
                <span key={r._id} className="text-xs bg-accent/40 text-dark px-2 py-0.5 rounded-full">
                  {r.name}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={addModal || !!editing} onClose={() => (editing ? setEditing(null) : setAddModal(false))} title={editing ? editing.name : t('branches.addBranch')}>
        <div className="space-y-4">
          <div>
            <label className="label">{t('branches.name')}</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t('branches.address')}</label>
            <input className="input" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t('branches.phone')}</label>
            <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">שעת פתיחה</label>
              <input type="time" className="input" value={form.hoursOpen} onChange={(e) => setForm((f) => ({ ...f, hoursOpen: e.target.value }))} />
            </div>
            <div>
              <label className="label">שעת סגירה</label>
              <input type="time" className="input" value={form.hoursClose} onChange={(e) => setForm((f) => ({ ...f, hoursClose: e.target.value }))} />
            </div>
          </div>

          {editing && (
            <div>
              <label className="label">{t('branches.rooms')}</label>
              <div className="space-y-1 mb-2">
                {editing.rooms.map((r) => (
                  <div key={r._id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                    <span>{r.name}</span>
                    <button className="text-red-500 text-xs" onClick={() => handleDeleteRoom(r._id)}>
                      {t('common.delete')}
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder={t('branches.roomName')}
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
                <Button size="sm" variant="secondary" onClick={handleAddRoom}>
                  {t('branches.addRoom')}
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => (editing ? setEditing(null) : setAddModal(false))}>
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
