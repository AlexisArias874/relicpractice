/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#050b14',
        panel: '#0a1524',
        panel2: '#0e1c2f',
        line: '#1b2c44',
        aqua: '#2dd4bf',
        azure: '#38bdf8',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(45,212,191,.18), 0 18px 50px -24px rgba(56,189,248,.35)',
      },
    },
  },
  plugins: [],
};
