import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getUsers, createUser, updateUser, resetPassword, deleteUser } from '../api/users';
import { getBranches } from '../api/branches';
import { User, UserRole, Branch } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { formatDate } from '../utils/date';
import { ROLE_LABELS } from '../utils/roles';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const ROLES: UserRole[] = ['admin', 'editor', 'viewer'];

export default function UserManagement() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [resetModal, setResetModal] = useState<User | null>(null);
  const [deleteModal, setDeleteModal] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'editor' as UserRole, branchIds: [] as string[] });
  const [tempPassword, setTempPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getUsers(), getBranches()])
      .then(([u, b]) => {
        setUsers(u);
        setBranches(b);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const user = await createUser(newUser);
      setUsers((prev) => [user, ...prev]);
      setAddModal(false);
      setNewUser({ name: '', username: '', password: '', role: 'editor', branchIds: [] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'שגיאה');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    const updated = await updateUser(u._id, { active: !u.active });
    setUsers((prev) => prev.map((x) => (x._id === u._id ? updated : x)));
  };

  const handleRoleChange = async (u: User, role: UserRole) => {
    const updated = await updateUser(u._id, { role });
    setUsers((prev) => prev.map((x) => (x._id === u._id ? updated : x)));
  };

  const handleResetPassword = async () => {
    if (!resetModal || !tempPassword.trim()) return;
    await resetPassword(resetModal._id, tempPassword.trim());
    setResetModal(null);
    setTempPassword('');
    showToast(t('common.success'));
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await deleteUser(deleteModal._id);
      setUsers((prev) => prev.filter((x) => x._id !== deleteModal._id));
      setDeleteModal(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg ?? 'שגיאה במחיקת המשתמש', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const branchNames = (u: User) => {
    if (!u.branchIds?.length) return 'כל הסניפים';
    return u.branchIds
      .map((b) => (typeof b === 'string' ? branches.find((br) => br._id === b)?.name : b.name))
      .filter(Boolean)
      .join(', ');
  };

  const toggleNewUserBranch = (id: string) => {
    setNewUser((f) => ({
      ...f,
      branchIds: f.branchIds.includes(id) ? f.branchIds.filter((b) => b !== id) : [...f.branchIds, id],
    }));
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={() => setAddModal(true)}>+ {t('users.addUser')}</Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('users.name')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('users.username')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('users.role')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('users.branches')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('users.active')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('users.createdAt')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.username}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                      className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.role === 'admin' ? 'כל הסניפים' : branchNames(u)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.active ? 'bg-primary-wash text-primary' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.active ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setResetModal(u)}>
                        {t('users.resetPassword')}
                      </Button>
                      <Button size="sm" variant={u.active ? 'danger' : 'secondary'} onClick={() => handleToggleActive(u)}>
                        {u.active ? t('users.deactivate') : t('users.activate')}
                      </Button>
                      <Button
                        size="sm"
                        variant="dangerSolid"
                        disabled={u._id === currentUser?._id}
                        title={u._id === currentUser?._id ? 'לא ניתן למחוק את המשתמש המחובר' : undefined}
                        onClick={() => setDeleteModal(u)}
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title={t('users.addUser')} size="sm">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">{t('users.name')}</label>
            <input required value={newUser.name} onChange={(e) => setNewUser((f) => ({ ...f, name: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">{t('users.username')}</label>
            <input
              required
              type="text"
              value={newUser.username}
              onChange={(e) => setNewUser((f) => ({ ...f, username: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label className="label">{t('auth.password')} (זמנית)</label>
            <input
              required
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser((f) => ({ ...f, password: e.target.value }))}
              className="input"
            />
          </div>
          <div>
            <label className="label">{t('users.role')}</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser((f) => ({ ...f, role: e.target.value as UserRole }))}
              className="input"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {newUser.role !== 'admin' && (
            <div>
              <label className="label">{t('users.branches')}</label>
              <div className="space-y-1">
                {branches.map((b) => (
                  <label key={b._id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={newUser.branchIds.includes(b._id)} onChange={() => toggleNewUserBranch(b._id)} />
                    {b.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setAddModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {t('common.add')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetModal} onClose={() => setResetModal(null)} title={t('users.resetPassword')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            הזן סיסמה זמנית למשתמש <strong>{resetModal?.name}</strong>
          </p>
          <input
            type="text"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            placeholder={t('users.tempPassword')}
            className="input"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setResetModal(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleResetPassword} disabled={!tempPassword.trim()}>
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title={t('common.areYouSure')} size="sm">
        <p className="text-sm text-gray-600 mb-4">
          האם אתה בטוח שברצונך למחוק את המשתמש <strong>{deleteModal?.name}</strong>? פעולה זו אינה הפיכה.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteModal(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="dangerSolid" loading={deleting} onClick={handleDelete}>
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
