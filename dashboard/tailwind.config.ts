import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#22313F',
        accent: '#FECC00',
        muted: '#F0F0F0',
        border: '#E8EAED',
      },
      fontFamily: {
        display: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(34,49,63,0.05), 0 4px 16px rgba(34,49,63,0.06)',
        'card-hover': '0 4px 12px rgba(34,49,63,0.10), 0 8px 24px rgba(34,49,63,0.08)',
        premium: '0 24px 64px rgba(0,0,0,0.30), 0 8px 24px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
