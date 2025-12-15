/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0067c0',
        secondary: '#8a8886',
        accent: '#0078d4',
        success: '#107c10',
        warning: '#ffb900',
        danger: '#d13438',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

