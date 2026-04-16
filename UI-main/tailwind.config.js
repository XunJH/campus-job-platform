/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic aliases aligned with UI-main visual language
        primary: {
          DEFAULT: '#111827', // gray-900
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f3f4f6', // gray-100
          foreground: '#1f2937', // gray-800
        },
        muted: {
          DEFAULT: '#f9fafb', // gray-50
          foreground: '#6b7280', // gray-500
        },
        accent: {
          DEFAULT: '#eff6ff', // blue-50
          foreground: '#1d4ed8', // blue-700
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        border: '#e5e7eb', // gray-200
        input: '#e5e7eb',
        ring: '#9ca3af', // gray-400
        background: '#ffffff',
        foreground: '#111827',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0,0,0,0.06)',
        'card': '0 1px 2px rgba(0,0,0,0.04)',
        'float': '0 4px 12px rgba(0,0,0,0.06)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
