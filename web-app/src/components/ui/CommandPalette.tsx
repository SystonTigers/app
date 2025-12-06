'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface CommandItem {
    id: string;
    title: string;
    description?: string;
    icon: string;
    action: () => void;
    category: string;
}

interface CommandPaletteProps {
    tenant: string;
}

export function CommandPalette({ tenant }: CommandPaletteProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const commands: CommandItem[] = [
        // Navigation
        { id: 'home', title: 'Go to Dashboard', icon: '🏠', category: 'Navigation', action: () => router.push(`/${tenant}`) },
        { id: 'squad', title: 'View Squad', icon: '👥', category: 'Navigation', action: () => router.push(`/${tenant}/squad`) },
        { id: 'fixtures', title: 'View Fixtures', icon: '📅', category: 'Navigation', action: () => router.push(`/${tenant}/fixtures`) },
        { id: 'results', title: 'View Results', icon: '🏆', category: 'Navigation', action: () => router.push(`/${tenant}/results`) },
        { id: 'table', title: 'League Table', icon: '📊', category: 'Navigation', action: () => router.push(`/${tenant}/table`) },
        { id: 'stats', title: 'Team Stats', icon: '📈', category: 'Navigation', action: () => router.push(`/${tenant}/stats`) },
        { id: 'training', title: 'Training Centre', icon: '⚽', category: 'Navigation', action: () => router.push(`/${tenant}/training`) },
        { id: 'videos', title: 'Video Analysis', icon: '🎬', category: 'Navigation', action: () => router.push(`/${tenant}/videos`) },
        { id: 'shop', title: 'Club Shop', icon: '🛒', category: 'Navigation', action: () => router.push(`/${tenant}/shop`) },
        { id: 'chat', title: 'Team Chat', icon: '💬', category: 'Navigation', action: () => router.push(`/${tenant}/chat`) },
        { id: 'calendar', title: 'Team Calendar', icon: '📆', category: 'Navigation', action: () => router.push(`/${tenant}/calendar`) },

        // Actions
        { id: 'new-session', title: 'Create Training Session', icon: '➕', category: 'Actions', action: () => router.push(`/${tenant}/training?action=new`) },
        { id: 'upload-video', title: 'Upload Video', icon: '📤', category: 'Actions', action: () => router.push(`/${tenant}/videos?action=upload`) },

        // Admin
        { id: 'admin', title: 'Admin Dashboard', icon: '⚙️', category: 'Admin', action: () => router.push(`/${tenant}/admin`) },
        { id: 'coaching', title: 'AI Coaching', icon: '🤖', category: 'Admin', action: () => router.push(`/${tenant}/admin/coaching`) },
    ];

    const filteredCommands = query === ''
        ? commands
        : commands.filter((cmd) =>
            cmd.title.toLowerCase().includes(query.toLowerCase()) ||
            cmd.category.toLowerCase().includes(query.toLowerCase())
        );

    const groupedCommands = filteredCommands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = [];
        acc[cmd.category].push(cmd);
        return acc;
    }, {} as Record<string, CommandItem[]>);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Open with Cmd+K or Ctrl+K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }

            // Close with Escape
            if (e.key === 'Escape') {
                setIsOpen(false);
                setQuery('');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Handle arrow navigation and enter
    const handleKeyNavigation = useCallback((e: React.KeyboardEvent) => {
        const totalItems = filteredCommands.length;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % totalItems);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setIsOpen(false);
            setQuery('');
        }
    }, [filteredCommands, selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => { setIsOpen(false); setQuery(''); }}
            />

            {/* Dialog */}
            <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-400 text-xl">🔍</span>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search commands, pages, actions..."
                            className="flex-1 bg-transparent text-lg outline-none text-gray-900 dark:text-white placeholder-gray-400"
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                            onKeyDown={handleKeyNavigation}
                        />
                        <kbd className="hidden sm:block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded text-gray-500 font-mono">
                            ESC
                        </kbd>
                    </div>

                    {/* Results */}
                    <div className="max-h-[400px] overflow-y-auto p-2">
                        {Object.keys(groupedCommands).length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <div className="text-4xl mb-2">🔎</div>
                                <p>No results found</p>
                            </div>
                        ) : (
                            Object.entries(groupedCommands).map(([category, items]) => (
                                <div key={category} className="mb-4">
                                    <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        {category}
                                    </div>
                                    {items.map((item, idx) => {
                                        const globalIdx = filteredCommands.indexOf(item);
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    item.action();
                                                    setIsOpen(false);
                                                    setQuery('');
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${globalIdx === selectedIndex
                                                        ? 'bg-brand text-white'
                                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                                                    }`}
                                            >
                                                <span className="text-xl">{item.icon}</span>
                                                <span className="font-medium">{item.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-4">
                            <span><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono">↑↓</kbd> Navigate</span>
                            <span><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono">↵</kbd> Select</span>
                        </div>
                        <span>Powered by ⚡ Quick Search</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Trigger button component
export function CommandPaletteTrigger() {
    return (
        <button
            onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                document.dispatchEvent(event);
            }}
            className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
        >
            <span>🔍</span>
            <span>Search...</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded font-mono">⌘K</kbd>
        </button>
    );
}
