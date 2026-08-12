/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
          light: 'var(--color-primary-light)',
          wash: 'var(--color-primary-wash)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          dark: 'var(--color-accent-dark)',
          light: 'var(--color-accent-light)',
          wash: 'var(--color-accent-wash)',
        },
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        dark: 'var(--color-ink)',
        status: {
          // Event lifecycle — semantic colors stay constant across themes
          planned: '#9CA3AF',
          inPrep: '#F59E0B',
          done: '#16A34A',
          cancelled: '#EF4444',
          // Task lifecycle
          todo: '#9CA3AF',
          inProgress: '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['Assistant', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.07)',
        nav: '0 2px 8px 0 rgba(156,83,137,0.15)',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
      },
      animation: {
        breathe: 'breathe 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
