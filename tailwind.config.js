/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00FF7F',
          50: '#E6FFEF',
          100: '#B3FFD9',
          200: '#80FFC2',
          300: '#4DFFAB',
          400: '#1AFF95',
          500: '#00FF7F',
          600: '#00CC66',
          700: '#00994C',
          800: '#006633',
          900: '#003319',
        },
        secondary: {
          DEFAULT: '#1E293B',
          50: '#8DA2BC',
          100: '#7D95B3',
          200: '#5D7CA1',
          300: '#46627F',
          400: '#33485D',
          500: '#1E293B',
          600: '#151E29',
          700: '#0C1218',
          800: '#030506',
          900: '#000000',
        },
        dark: {
          DEFAULT: '#121212',
          paper: '#1E1E1E',
          border: '#2C2C2C',
          light: '#3A3A3A',
        }
      },
      fontFamily: {
        sans: [
          'Inter var, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        ],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};