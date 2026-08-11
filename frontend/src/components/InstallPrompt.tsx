import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { enablePushNotifications, isPushSupported } from '../utils/pushNotifications';
import Button from './ui/Button';

const DISMISS_KEY = 'installPromptDismissed';

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as never as { standalone?: boolean }).standalone === true;
}

export default function InstallPrompt() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true');
  const [pushStatus, setPushStatus] = useState<'idle' | 'enabling' | 'granted' | 'denied' | 'unsupported'>('idle');
  const standalone = isStandalone();

  useEffect(() => {
    if (standalone && isPushSupported() && Notification.permission === 'granted') {
      setPushStatus('granted');
    }
  }, [standalone]);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  const handleEnablePush = async () => {
    setPushStatus('enabling');
    const result = await enablePushNotifications();
    setPushStatus(result);
  };

  if (standalone && pushStatus === 'granted') return null;

  return (
    <div className="bg-accent/30 border border-accent rounded-lg p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <p className="text-sm font-semibold text-dark">{t('settings.installApp.title')}</p>
        <p className="text-xs text-gray-600">
          {standalone
            ? 'התקינו התראות כדי לקבל עדכונים על אירועים ומשימות'
            : t('settings.installApp.body')}
        </p>
      </div>
      <div className="flex gap-2">
        {standalone ? (
          <Button size="sm" onClick={handleEnablePush} loading={pushStatus === 'enabling'}>
            הפעלת התראות
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={dismiss}>
            {t('settings.installApp.action')}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={dismiss}>
          {t('common.close')}
        </Button>
      </div>
    </div>
  );
}
