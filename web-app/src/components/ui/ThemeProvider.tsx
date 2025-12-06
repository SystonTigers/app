'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('system');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem('theme') as Theme | null;
        if (stored) {
            setThemeState(stored);
        }
    }, []);

    useEffect(() => {
        const updateResolvedTheme = () => {
            let resolved: 'light' | 'dark';

            if (theme === 'system') {
                resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            } else {
                resolved = theme;
            }

            setResolvedTheme(resolved);

            // Update document class with transition
            const root = document.documentElement;
            root.style.setProperty('--theme-transition', 'background-color 0.3s ease, color 0.3s ease');

            if (resolved === 'dark') {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }

            // Remove transition after it completes
            setTimeout(() => {
                root.style.removeProperty('--theme-transition');
            }, 300);
        };

        updateResolvedTheme();

        // Listen for system preference changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if (theme === 'system') {
                updateResolvedTheme();
            }
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const toggleTheme = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    };

    if (!mounted) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        return {
            theme: 'system' as Theme,
            resolvedTheme: 'light' as const,
            setTheme: () => { },
            toggleTheme: () => { },
        };
    }
    return context;
}

// Theme toggle button with smooth animation
export function ThemeToggle() {
    const { resolvedTheme, toggleTheme } = useTheme();
    const [isAnimating, setIsAnimating] = useState(false);

    const handleClick = () => {
        setIsAnimating(true);
        toggleTheme();
        setTimeout(() => setIsAnimating(false), 300);
    };

    return (
        <button
            onClick={handleClick}
            className={`relative p-2 rounded-xl transition-all duration-300 overflow-hidden ${resolvedTheme === 'dark'
                    ? 'bg-gray-800 text-yellow-400'
                    : 'bg-blue-100 text-blue-600'
                }`}
            aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
            <span
                className={`text-xl block transition-transform duration-300 ${isAnimating ? 'scale-0 rotate-180' : 'scale-100 rotate-0'
                    }`}
            >
                {resolvedTheme === 'dark' ? '🌙' : '☀️'}
            </span>
        </button>
    );
}

// Full theme selector dropdown
export function ThemeSelector() {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const options: { value: Theme; label: string; icon: string }[] = [
        { value: 'light', label: 'Light', icon: '☀️' },
        { value: 'dark', label: 'Dark', icon: '🌙' },
        { value: 'system', label: 'System', icon: '💻' },
    ];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
                <span>{options.find(o => o.value === theme)?.icon}</span>
                <span className="text-sm font-medium">{options.find(o => o.value === theme)?.label}</span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    setTheme(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${theme === option.value ? 'bg-brand/10 text-brand' : ''
                                    }`}
                            >
                                <span>{option.icon}</span>
                                <span className="font-medium">{option.label}</span>
                                {theme === option.value && <span className="ml-auto">✓</span>}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
