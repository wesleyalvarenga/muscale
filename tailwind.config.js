/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#181D27',
          light: '#717680',
          lighter: '#D5D7DA',
        }
      }
    },
  },
  plugins: [],
};