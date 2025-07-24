/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'persian': ['Vazirmatn', 'Tahoma', 'Arial', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdecd3',
          200: '#fbd5a5',
          300: '#f7b96d',
          400: '#f29432',
          500: '#ef7611',
          600: '#e05d07',
          700: '#b94708',
          800: '#94380e',
          900: '#7a2f0f',
          950: '#421505',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
  // RTL support
  corePlugins: {
    // Enable RTL support
    textAlign: true,
    float: true,
    clear: true,
  },
  // Custom RTL utilities
  safelist: [
    'rtl',
    'ltr',
    'text-right',
    'text-left',
    'float-right',
    'float-left',
    'clear-right',
    'clear-left',
    'mr-auto',
    'ml-auto',
    'pr-4',
    'pl-4',
    'border-r',
    'border-l',
  ],
};