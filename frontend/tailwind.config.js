/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0F6B66',
          hover: '#0C5753',
          pressed: '#094541',
          tint: '#E6F2F1',
        },
        neutral: {
          50: '#F8F8F6',
          100: '#F0EFEC',
          200: '#E2E0DB',
          300: '#CBC8C1',
          500: '#7A766E',
          700: '#46433D',
          900: '#1E1C19',
        },
        semantic: {
          success: '#1F7A4D',
          'success-tint': '#E8F5E9',
          warning: '#B7791F',
          'warning-tint': '#FEF3C7',
          danger: '#B42318',
          'danger-tint': '#FEE4E2',
          info: '#1D5FA8',
          'info-tint': '#E0F2FE',
        }
      },
      borderRadius: {
        'control': '6px',
        'panel': '10px',
      },
      fontFamily: {
        sans: ['"Inter"', '"Source Sans 3"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}
