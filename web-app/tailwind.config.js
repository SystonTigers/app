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
            animation: {
                'scroll-left': 'scroll-left 25s linear infinite',
            },
            keyframes: {
                'scroll-left': {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
            },
        },
    },
    plugins: [],
}
