/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#F5A623',
          dark: '#E0921B',
          light: '#F8B64C',
        },
        slate: {
          750: '#253347',
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          950: '#080E1A',
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        sora: ['Sora', 'sans-serif'],
      },
      scale: {
        '98': '0.98',
      }
    },
  },
  plugins: [],
}
