/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0B0F17',
          card: '#131B2A',
          hover: '#1B263B',
          glass: 'rgba(19, 27, 42, 0.75)'
        },
        brand: {
          primary: '#6366F1',   // Indigo
          secondary: '#8B5CF6', // Purple
          cyan: '#06B6D4',      // Vibrant Cyan
          accent: '#10B981',    // Emerald Green
          warning: '#F59E0B',   // Amber
          danger: '#EF4444'     // Rose
        },
        affect: {
          attention: '#3B82F6',
          confusion: '#F59E0B',
          boredom: '#8B5CF6',
          engagement: '#10B981',
          distraction: '#EF4444',
          cognitive: '#EC4899'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px rgba(6, 182, 212, 0.35)',
        'glow-purple': '0 0 25px rgba(139, 92, 246, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }
    },
  },
  plugins: [],
}
