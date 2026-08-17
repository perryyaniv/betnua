import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeName = 'brand' | 'green' | 'coral' | 'ocean' | 'dark';

export interface ThemeOption {
  id: ThemeName;
  label: string;
  swatch: string;
}

export const THEMES: ThemeOption[] = [
  { id: 'brand', label: 'בתנועה (מותג)', swatch: '#9C5389' },
  { id: 'green', label: 'ירוק ולבן', swatch: '#1F6F5C' },
  { id: 'coral', label: 'קורל חם', swatch: '#C1502E' },
  { id: 'ocean', label: 'אוקיינוס', swatch: '#285A8C' },
  { id: 'dark', label: 'כהה', swatch: '#241C22' },
];

export const FONT_SCALES = [0.875, 1, 1.125, 1.25, 1.375];
export const DEFAULT_FONT_SCALE_INDEX = FONT_SCALES.length - 1;

const THEME_KEY = 'betnua-theme';
const FONT_KEY = 'betnua-font-scale-index';

interface AppearanceContextType {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  fontScaleIndex: number;
  fontScale: number;
  increaseFontScale: () => void;
  decreaseFontScale: () => void;
  resetFontScale: () => void;
}

const AppearanceContext = createContext<AppearanceContextType>({} as AppearanceContextType);

function readInitialTheme(): ThemeName {
  const saved = localStorage.getItem(THEME_KEY);
  return THEMES.some((t) => t.id === saved) ? (saved as ThemeName) : 'brand';
}

function readInitialFontScaleIndex(): number {
  const raw = localStorage.getItem(FONT_KEY);
  if (raw === null) return DEFAULT_FONT_SCALE_INDEX;
  const saved = Number(raw);
  return Number.isInteger(saved) && saved >= 0 && saved < FONT_SCALES.length ? saved : DEFAULT_FONT_SCALE_INDEX;
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(readInitialTheme);
  const [fontScaleIndex, setFontScaleIndex] = useState<number>(readInitialFontScaleIndex);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(FONT_SCALES[fontScaleIndex]));
    localStorage.setItem(FONT_KEY, String(fontScaleIndex));
  }, [fontScaleIndex]);

  const increaseFontScale = () => setFontScaleIndex((i) => Math.min(i + 1, FONT_SCALES.length - 1));
  const decreaseFontScale = () => setFontScaleIndex((i) => Math.max(i - 1, 0));
  const resetFontScale = () => setFontScaleIndex(DEFAULT_FONT_SCALE_INDEX);

  return (
    <AppearanceContext.Provider
      value={{
        theme,
        setTheme,
        fontScaleIndex,
        fontScale: FONT_SCALES[fontScaleIndex],
        increaseFontScale,
        decreaseFontScale,
        resetFontScale,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export const useAppearance = () => useContext(AppearanceContext);
