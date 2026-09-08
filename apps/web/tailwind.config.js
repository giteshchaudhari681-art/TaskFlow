/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        taskflow: {
          bg: '#141210',
          canvas: '#1A1714',
          surface: '#211E1A',
          'surface-hover': '#2A2621',
          elevated: '#2A2621',
          card: '#211E1A',
          'card-hover': '#2A2621',
          border: '#3A342C',
          'border-hover': '#4A4339',
          'border-subtle': '#2A2621',
          muted: '#9C948A',
          text: '#F3EDE4',
          'text-dim': '#B7AFA5',
          accent: '#C45C26',
          'accent-hover': '#A84D20',
          'accent-subtle': 'rgba(196, 92, 38, 0.12)',
          primary: '#C45C26',
          success: '#3D8B6E',
          warning: '#C4843A',
          danger: '#C44A4A',
          purple: '#8A7060',
          indigo: '#8A7060',
        },
      },
      fontFamily: {
        display: ['Newsreader', 'Georgia', 'serif'],
        sans: [
          'Source Sans 3',
          'Segoe UI',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'elevation-0': 'none',
        'elevation-1': '0 1px 2px rgba(20, 18, 16, 0.35)',
        'elevation-2': '0 6px 16px rgba(20, 18, 16, 0.4)',
        'elevation-3': '0 14px 28px rgba(20, 18, 16, 0.5)',
        'elevation-4': '0 24px 48px rgba(12, 10, 8, 0.62)',
        'accent-terracotta': '0 4px 12px rgba(196, 92, 38, 0.18)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at top, var(--tw-gradient-stops))',
      },
      borderRadius: {
        control: '4px',
        panel: '6px',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
