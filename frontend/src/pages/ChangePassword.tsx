import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { changePassword } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

export default function ChangePassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (newPassword !== confirm) {
      setError(t('auth.passwordsNoMatch'));
      return;
    }
    setLoading(true);
    try {
      await changePassword(newPassword);
      updateUser({ forcePasswordChange: false });
      navigate('/');
    } catch {
      setError('שגיאה בשינוי הסיסמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-primary rounded-lg shadow-nav px-6 pt-5 pb-0 mb-0">
          <div className="flex items-center gap-3 mb-4">
            <div>
              <h1 className="text-white font-bold text-lg">{t('auth.changePasswordTitle')}</h1>
              <p className="text-white/60 text-xs">{t('auth.changePasswordSubtitle')}</p>
            </div>
            <div className="bg-white rounded-md p-1.5 mr-auto">
              <img src="/logo.png" alt="לוגו" className="h-10 w-auto" />
            </div>
          </div>
          <div className="h-1 bg-accent -mx-6" />
        </div>

        <div className="bg-white rounded-b-lg border border-gray-200 border-t-0 px-6 py-6 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.newPassword')}</label>
              <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">{t('auth.confirmPassword')}</label>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" />
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-md text-center">{error}</div>}
            <Button type="submit" loading={loading} className="w-full" size="lg">
              {t('auth.changePassword')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
