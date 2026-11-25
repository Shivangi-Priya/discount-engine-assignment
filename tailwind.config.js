/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 50: '#eef2f9', 100: '#d9e1f0', 600: '#1e3a73', 700: '#142a57', 800: '#0f2147', 900: '#0b1a3a' },
        accent: { 50: '#fff4ea', 100: '#ffe3c9', 500: '#f97316', 600: '#ea6a0a' },
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
};
