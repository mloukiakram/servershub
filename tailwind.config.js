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
        'enter': 'enter 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'spring-up': 'springUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      },
      keyframes: {
        enter: {
          'from': { opacity: '0', transform: 'scale(0.98)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translate(-50%, 40px)' },
          'to': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        springUp: {
          '0%': { opacity: '0', transform: 'translate(-50%, 40px) scale(0.9)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0) scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
