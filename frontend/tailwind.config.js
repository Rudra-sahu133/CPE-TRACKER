/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172b4d",
        muted: "#64748b",
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3478f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
      boxShadow: {
        panel: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
      },
    },
  },
  plugins: [],
};
