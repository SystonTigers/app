'use client';

import { useState, useEffect, useRef } from 'react';

interface Member {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
}

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    onMentionsChange: (ids: string[]) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    tenant: string; // Needed for API calls
}

export function MentionInput({
    value,
    onChange,
    onMentionsChange,
    placeholder,
    className,
    disabled,
    tenant
}: MentionInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<Member[]>([]);
    const [query, setQuery] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const [mentionStart, setMentionStart] = useState(0);
    const [loading, setLoading] = useState(false);
    const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set());

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Track cursor and detect @
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const pos = e.target.selectionStart;
        onChange(val);
        setCursorPosition(pos);

        // Check for mentions
        const textBeforeCursor = val.slice(0, pos);
        const lastAt = textBeforeCursor.lastIndexOf('@');

        if (lastAt !== -1) {
            // content between @ and cursor
            const potentialName = textBeforeCursor.slice(lastAt + 1);
            // Valid mention query: no spaces (or limited spaces), no newlines
            // Simplified: allow spaces for "John Doe" but stop at some length or special chars
            if (!potentialName.includes('\n') && potentialName.length < 30) {
                setMentionStart(lastAt);
                setQuery(potentialName);
                setShowSuggestions(true);
                return;
            }
        }
        setShowSuggestions(false);
    };

    // Debounced search
    useEffect(() => {
        if (!showSuggestions || !query) {
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const baseUrl = process.env.NEXT_PUBLIC_API_BASE || '';
                const res = await fetch(`${baseUrl}/api/v1/members/search?q=${encodeURIComponent(query)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setSuggestions(data.data);
                    }
                }
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, showSuggestions]);

    const selectMember = (member: Member) => {
        const before = value.slice(0, mentionStart);
        const after = value.slice(cursorPosition);
        const mentionText = ` @${member.name} `;
        const newValue = before + mentionText.trim() + ' ' + after;

        onChange(newValue);

        // Add ID to tracked mentions
        const newIds = new Set(mentionedIds);
        newIds.add(member.id);
        setMentionedIds(newIds);
        onMentionsChange(Array.from(newIds));

        setShowSuggestions(false);

        // Restore focus and update cursor (approximate)
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newCursor = mentionStart + mentionText.length; // +1 for space
                textareaRef.current.setSelectionRange(newCursor, newCursor);
            }
        }, 0);
    };

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleInput}
                placeholder={placeholder}
                className={className}
                disabled={disabled}
                onKeyDown={(e) => {
                    if (showSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
                        // TODO: Keyboard navigation
                    }
                    // Close on Escape
                    if (e.key === 'Escape') setShowSuggestions(false);
                }}
            />

            {showSuggestions && (suggestions.length > 0 || loading) && (
                <div className="absolute left-0 bottom-full mb-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    {loading && (
                        <div className="p-3 text-sm text-gray-500 text-center">Searching...</div>
                    )}
                    {!loading && suggestions.length === 0 && (
                        <div className="p-3 text-sm text-gray-500 text-center">No members found</div>
                    )}
                    <ul className="max-h-48 overflow-y-auto">
                        {suggestions.map(member => (
                            <li key={member.id}>
                                <button
                                    type="button"
                                    onClick={() => selectMember(member)}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                    <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs uppercase">
                                        {member.avatar ? 'Img' : member.name[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                            {member.name}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                            {member.email}
                                        </div>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
