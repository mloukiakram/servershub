/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'enter': 'enter 0.1s ease-out',
        'slide-up': 'slideUp 0.15s ease-out forwards',
        'spring-up': 'springUp 0.15s ease-out forwards',
      },
      keyframes: {
        enter: {
          'from': { opacity: '0', transform: 'scale(0.99)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translate(-50%, 10px)' },
          'to': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        springUp: {
          '0%': { opacity: '0', transform: 'translate(-50%, 10px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0) scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
