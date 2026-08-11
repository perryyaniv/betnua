/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#9C5389',
          dark: '#7A3D6B',
          light: '#B26CA1',
        },
        accent: {
          DEFAULT: '#DCBABC',
          dark: '#C79BA0',
          light: '#ECD8DA',
        },
        bg: '#FAF7F8',
        surface: '#FFFFFF',
        dark: '#2A2230',
        status: {
          // Event lifecycle
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
