/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-orbitron)', 'sans-serif'],
                mono: ['var(--font-roboto-mono)', 'monospace'],
            },
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
                    cyan: "#00FFFF",
                    chrome: "#C0C0C0",
                    obsidian: "#0B0D0F",
                },
            },
            animation: {
                'scroll-left': 'scroll-left 25s linear infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
            },
            transitionDuration: {
                '400': '400ms',
                '800': '800ms',
            },
            transitionTimingFunction: {
                'out-wealth': 'cubic-bezier(0, 0, 0.2, 1)', // Linear-ease-out feel
            },
            aspectRatio: {
                '4/3': '4 / 3',
                'square': '1 / 1',
            },
            boxShadow: {
                'glow-8': '0 0 8px #00FFFF',
                'glow-16': '0 0 16px #00FFFF',
            },
            keyframes: {
                'scroll-left': {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 8px #00FFFF', opacity: 1 },
                    '50%': { boxShadow: '0 0 16px #00FFFF', opacity: 0.8 },
                },
            },
        },
    },
    plugins: [],
}
