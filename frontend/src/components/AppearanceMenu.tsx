import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppearance, THEMES, FONT_SCALES } from '../contexts/AppearanceContext';

export default function AppearanceMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { theme, setTheme, fontScaleIndex, increaseFontScale, decreaseFontScale } = useAppearance();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10"
        aria-label={t('appearance.title')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h10a2 2 0 002-2v-4a2 2 0 00-2-2h-2.5M7 21V9"
          />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-64 bg-surface border border-gray-200 rounded-lg shadow-xl z-50 p-4 space-y-4 text-dark">
            <div>
              <p className="label mb-2">{t('appearance.fontSize')}</p>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={decreaseFontScale}
                  disabled={fontScaleIndex === 0}
                  className="w-9 h-9 rounded-md border border-gray-300 text-sm font-bold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={t('appearance.decreaseFont')}
                >
                  א-
                </button>
                <span className="text-sm text-gray-500 tabular-nums">
                  {Math.round(FONT_SCALES[fontScaleIndex] * 100)}%
                </span>
                <button
                  onClick={increaseFontScale}
                  disabled={fontScaleIndex === FONT_SCALES.length - 1}
                  className="w-9 h-9 rounded-md border border-gray-300 text-base font-bold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={t('appearance.increaseFont')}
                >
                  א+
                </button>
              </div>
            </div>

            <div>
              <p className="label mb-2">{t('appearance.theme')}</p>
              <div className="grid grid-cols-1 gap-1.5">
                {THEMES.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setTheme(opt.id);
                      setOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                      theme === opt.id ? 'bg-primary-wash text-primary font-semibold' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: opt.swatch }}
                    />
                    {opt.label}
                    {theme === opt.id && (
                      <svg className="w-4 h-4 mr-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
