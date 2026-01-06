/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aviation: {
          blue: '#1E3A8A',
          sky: '#38BDF8',
          cloud: '#F0F9FF',
          danger: '#DC2626',
          warning: '#F59E0B'
        }
      },
      fontFamily: {
        'aviation': ['Arial', 'Helvetica', 'sans-serif'],
        'title': ['Impact', 'Arial Black', 'sans-serif']
      },
      backgroundImage: {
        'sky-gradient': 'linear-gradient(to bottom, #38BDF8, #1E3A8A)',
        'clouds': 'url("/src/assets/clouds.jpg")'
      }
    },
  },
  plugins: [],
}