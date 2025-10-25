import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0c0f10',
        surface: '#141a17',
        surface2: '#17201b',
        text: '#eaf0ea',
        muted: '#9fb2a7',
        accent: '#1c7c54',
        cardSurface: '#ffffff',
        cardText: '#111111',
      }
    },
  },
  plugins: [],
};

export default config;