/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        taskflow: {
          bg: '#070b14',
          surface: '#0d1322',
          card: '#121a2d',
          'card-hover': '#162038',
          border: '#1e293b',
          'border-subtle': '#152033',
          muted: '#64748b',
          text: '#f1f5f9',
          'text-dim': '#94a3b8',
          accent: '#38bdf8',
          'accent-glow': 'rgba(56, 189, 248, 0.15)',
          primary: '#6366f1',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          purple: '#a855f7',
        },
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 24px -4px rgba(56, 189, 248, 0.3)',
        'glow-indigo': '0 0 24px -4px rgba(99, 102, 241, 0.3)',
        'surface-elevated':
          '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
};
