import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#003380',
          50: '#e6edf7',
          100: '#ccdaef',
          200: '#99b5df',
          300: '#6690cf',
          400: '#336bbf',
          500: '#003380',
          600: '#002a6a',
          700: '#002053',
          800: '#00173d',
          900: '#000d26',
        },
        gold: {
          DEFAULT: '#FFD700',
          light: '#FFE55C',
          dark: '#C9A800',
        },
        accent: {
          red: '#ef4545',
          green: '#22c55e',
        },
      },
    },
  },
  plugins: [],
};

export default config;
