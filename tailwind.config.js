module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121212",
        paper: "#ffffff",
        canvas: "#efede8",
        line: "#e4e2dd",
        muted: "#6f6c66",
        accent: "#d9461a",
        live: "#c81e1e",
        win: "#1f7a3a"
      },
      fontFamily: {
        sans: ["Archivo", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"]
      }
    }
  },
  plugins: []
};
