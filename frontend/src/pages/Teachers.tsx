import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTeachers, createTeacher, updateTeacher } from '../api/teachers';
import { getBranches } from '../api/branches';
import { getCourseTypes } from '../api/courseTypes';
import { Teacher, Branch, CourseType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { hasWriteAccess } from '../utils/roles';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

const emptyForm = { name: '', phone: '', email: '', bio: '', branchIds: [] as string[], specialtyCourseTypeIds: [] as string[] };

export default function Teachers() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canWrite = hasWriteAccess(user?.role);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getTeachers(), getBranches(), getCourseTypes()])
      .then(([te, b, ct]) => {
        setTeachers(te);
        setBranches(b);
        setCourseTypes(ct);
      })
      .finally(() => setLoading(false));
  }, []);

  const branchNames = (te: Teacher) =>
    te.branchIds
      .map((b) => (typeof b === 'string' ? branches.find((br) => br._id === b)?.name : b.name))
      .filter(Boolean)
      .join(', ');

  const specialtyNames = (te: Teacher) =>
    te.specialtyCourseTypeIds
      .map((c) => (typeof c === 'string' ? courseTypes.find((ct) => ct._id === c)?.name : c.name))
      .filter(Boolean)
      .join(', ');

  const openEdit = (te: Teacher) => {
    setEditing(te);
    setForm({
      name: te.name,
      phone: te.phone,
      email: te.email || '',
      bio: te.bio || '',
      branchIds: te.branchIds.map((b) => (typeof b === 'string' ? b : b._id)),
      specialtyCourseTypeIds: te.specialtyCourseTypeIds.map((c) => (typeof c === 'string' ? c : c._id)),
    });
  };

  const toggle = (field: 'branchIds' | 'specialtyCourseTypeIds', id: string) => {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(id) ? f[field].filter((x) => x !== id) : [...f[field], id],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateTeacher(editing._id, form);
        setTeachers((prev) => prev.map((te) => (te._id === updated._id ? updated : te)));
        setEditing(null);
      } else {
        const created = await createTeacher(form);
        setTeachers((prev) => [...prev, created]);
        setAddModal(false);
      }
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  const closeModal = () => (editing ? setEditing(null) : setAddModal(false));

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAddModal(true)}>
            + {t('teachers.addTeacher')}
          </Button>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((te) => (
          <Card key={te._id} className="flex gap-3">
            <div className="w-14 h-14 rounded-full bg-accent-wash flex-shrink-0 overflow-hidden flex items-center justify-center text-lg font-bold text-primary">
              {te.photoUrl ? <img src={te.photoUrl} alt={te.name} className="w-full h-full object-cover" /> : te.name[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <Link to={`/teachers/${te._id}`} className="font-bold text-gray-800 hover:text-primary">
                  {te.name}
                </Link>
                {!te.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t('teachers.inactive')}</span>}
              </div>
              <p className="text-xs text-gray-500 mt-1">{specialtyNames(te) || '—'}</p>
              <p className="text-xs text-gray-400">{branchNames(te) || '—'}</p>
              {canWrite && (
                <button className="text-xs text-primary mt-1" onClick={() => openEdit(te)}>
                  {t('common.edit')}
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={addModal || !!editing} onClose={closeModal} title={editing ? editing.name : t('teachers.addTeacher')}>
        <div className="space-y-4">
          <div>
            <label className="label">{t('teachers.name')}</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('teachers.phone')}</label>
              <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('teachers.email')}</label>
              <input className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">{t('teachers.bio')}</label>
            <textarea className="input" rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t('teachers.branches')}</label>
            <div className="space-y-1">
              {branches.map((b) => (
                <label key={b._id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.branchIds.includes(b._id)} onChange={() => toggle('branchIds', b._id)} />
                  {b.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">{t('teachers.specialties')}</label>
            <div className="flex flex-wrap gap-2">
              {courseTypes.map((ct) => (
                <label
                  key={ct._id}
                  className={`text-xs px-2 py-1 rounded-full cursor-pointer border ${
                    form.specialtyCourseTypeIds.includes(ct._id) ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600'
                  }`}
                >
                  <input type="checkbox" className="hidden" checked={form.specialtyCourseTypeIds.includes(ct._id)} onChange={() => toggle('specialtyCourseTypeIds', ct._id)} />
                  {ct.name}
                </label>
              ))}
            </div>
          </div>
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
