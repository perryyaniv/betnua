import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import he from './he.json';

i18next.use(initReactI18next).init({
  lng: 'he',
  fallbackLng: 'he',
  resources: { he: { translation: he } },
  interpolation: { escapeValue: false },
});

export default i18next;
