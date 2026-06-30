import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        floatY: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        floatX: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(20px)' },
        },
      },
      animation: {
        'float-y-soft': 'floatY 6s ease-in-out infinite',
        'float-y-soft-delayed': 'floatY 8s ease-in-out infinite',
        'float-x-soft': 'floatX 5s ease-in-out infinite',
        'float-x-soft-delayed': 'floatX 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
