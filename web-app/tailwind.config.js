/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--bg)",
                foreground: "var(--text)",
                muted: {
                    DEFAULT: "var(--text-muted)",
                    foreground: "var(--text-muted)",
                },
                border: "var(--border)",
                brand: {
                    DEFAULT: "var(--brand)",
                    foreground: "var(--on-brand)",
                },
            },
        },
    },
    plugins: [],
}
