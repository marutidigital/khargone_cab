import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/config/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: '#F5B841',
        gold: {
          DEFAULT: '#F5B841',
          hover: '#E5A630',
          light: '#FFF8E7',
          dark: '#C88B18',
        },
        navy: {
          DEFAULT: '#0B1220',
          card: '#111A2E',
          border: '#1E293B',
          light: '#162238',
        },
      },
    },
  },
  plugins: [],
}

export default config
