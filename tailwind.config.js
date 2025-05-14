/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./components/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        GeistRegular: ['Geist-Regular', 'sans-serif'],
        GeistBold: ['Geist-Bold', 'sans-serif'], 
        GeistLight: ['Geist-Light', 'sans-serif'],
        GeistSemiBold: ['Geist-SemiBold', 'sans-serif']
      } 
    },
  },
  plugins: [],
}