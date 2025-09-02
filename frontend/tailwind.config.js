/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a'
        },
        gaming: {
          dark: '#0f0f23',
          purple: '#6366f1',
          cyan: '#06b6d4'
        },
        // 👇 add these for shadcn/ui support
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      fontFamily: {
        gaming: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
