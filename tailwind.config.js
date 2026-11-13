/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--accent-color)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
          border: 'var(--accent-border)'
        },
        surface: {
          bg: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          canvas: 'var(--bg-canvas)',
          border: 'var(--border-color)'
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)'
        }
      },
      fontFamily: {
        sans: ['Geist', 'Segoe UI', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        mono: ['IBM Plex Mono', 'Consolas', 'monospace'],
        display: ['Barlow Condensed', 'Arial Narrow', 'sans-serif']
      }
    }
  },
  plugins: []
}
