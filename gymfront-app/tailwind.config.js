/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        animation: {
          'float-slow': 'float 6s ease-in-out infinite',
          'float-delayed': 'float 6s ease-in-out 3s infinite',
          'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'spin-slow': 'spin 20s linear infinite',
          'shimmer': 'shimmer 2.5s linear infinite',
          'scan': 'scan 2s ease-in-out infinite',
        },
        keyframes: {
          float: {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-12px)' },
          },
          shimmer: {
            '0%': { backgroundPosition: '-200% 0' },
            '100%': { backgroundPosition: '200% 0' },
          },
          scan: {
            '0%, 100%': { top: '0%' },
            '50%': { top: '90%' },
          },
        },
      },
    },
    plugins: [],
  }