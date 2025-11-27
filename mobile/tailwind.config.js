// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1",    // indigo-500
        primaryDark: "#4f46e5",
        background: "#0f172a", // slate-900
        surface: "#1e293b",    // slate-800
      },
    },
  },
  plugins: [],
};