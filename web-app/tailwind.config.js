/** @type {import('tailwindcss').Config} */
module.exports = {
    // The site is always dark (the Boost Huddle look, same as the app): the root
    // layout puts `dark` on <html>, so `dark:` styles always apply and the
    // phone's light/dark setting never turns club pages white.
    darkMode: 'class',
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                // Body text is the system font, as in the app
                sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
                // Headings, scores and labels: Barlow Condensed (OFL, same files as the app and match graphics)
                display: ['var(--font-display)', 'Arial Narrow', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
            },
            colors: {
                background: "var(--bg)",
                foreground: "var(--text)",
                surface: {
                    DEFAULT: "var(--surface)",
                    raised: "var(--surface-raised)",
                },
                muted: {
                    DEFAULT: "var(--text-muted)",
                    foreground: "var(--text-muted)",
                },
                border: "var(--border)",
                brand: {
                    // The club's colour (lib/brand.ts sets --brand-rgb), so opacity modifiers work: bg-brand/10
                    DEFAULT: "rgb(var(--brand-rgb) / <alpha-value>)",
                    foreground: "rgb(var(--on-brand-rgb) / <alpha-value>)",
                    cyan: "#00FFFF",
                    chrome: "#C0C0C0",
                    obsidian: "#0B0D0F",
                },
                // Neutral charcoal greys (no blue tint) so every page sits on the same ink as the app
                gray: {
                    50: '#F4F6F8',
                    100: '#E7EAEE',
                    200: '#CDD2D8',
                    300: '#AEB5BE',
                    400: '#8C949E',
                    500: '#6C747E',
                    600: '#4C535C',
                    700: '#2F343B',
                    800: '#1D2127',
                    900: '#14171C',
                    950: '#0B0D0F',
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
                'out-wealth': 'cubic-bezier(0, 0, 0.2, 1)',
            },
            aspectRatio: {
                '4/3': '4 / 3',
                'square': '1 / 1',
            },
            boxShadow: {
                'glow-8': '0 0 8px rgb(var(--brand-rgb) / 0.6)',
                'glow-16': '0 0 18px rgb(var(--brand-rgb) / 0.45)',
            },
            keyframes: {
                'scroll-left': {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 8px rgb(var(--brand-rgb) / 0.5)', opacity: 1 },
                    '50%': { boxShadow: '0 0 16px rgb(var(--brand-rgb) / 0.8)', opacity: 0.8 },
                },
            },
        },
    },
    plugins: [],
}
