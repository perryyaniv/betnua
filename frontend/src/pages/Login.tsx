import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

export default function Login() {
  const { t } = useTranslation();
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await login(username, password);
      setAuth(token, user);
      navigate(user.forcePasswordChange ? '/change-password' : '/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('auth.invalidCredentials'));
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
              <h1 className="text-white font-bold text-xl leading-tight">{t('app.name')}</h1>
              <p className="text-white/80 text-sm font-medium">ניהול סטודיו</p>
            </div>
            <div className="bg-white rounded-md p-1.5 mr-auto">
              <img src="/logo.png" alt="לוגו" className="h-10 w-auto" />
            </div>
          </div>
          <div className="h-1 bg-accent -mx-6 rounded-b-none" />
        </div>

        <div className="bg-white rounded-b-lg rounded-t-none border border-gray-200 border-t-0 px-6 py-6 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.username')}</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label">{t('auth.password')}</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-md text-center">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {t('auth.loginButton')}
            </Button>
          </form>
        </div>

        <div className="flex items-center justify-center mt-4 px-1">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {t('app.name')}</p>
        </div>
      </div>
    </div>
  );
}
