/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gallery: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
      },
      fontFamily: {
        sans: [
          '"Noto Sans SC"',
          '"Inter"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        display: ['"Noto Serif SC"', 'serif'],
      },
      aspectRatio: {
        '3/2': '3 / 2',
        '2/3': '2 / 3',
        '4/3': '4 / 3',
        '3/4': '3 / 4',
        '16/9': '16 / 9',
        '1/1': '1 / 1',
      },
    },
  },
  plugins: [],
};
