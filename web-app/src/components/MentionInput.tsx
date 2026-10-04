'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/session';

interface Member {
    id: string;
    name: string;
}

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    onMentionsChange: (ids: string[]) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    tenant: string;
    /** For a <label htmlFor> */
    id?: string;
}

export function MentionInput({
    value,
    onChange,
    onMentionsChange,
    placeholder,
    className,
    disabled,
    id,
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
            // A name can have spaces ("Pat Player") but not run past a line or 30 characters
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
                const res = await apiFetch(`/api/v1/members/search?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.data)) {
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

        // Put the cursor back after the name
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newCursor = mentionStart + mentionText.length;
                textareaRef.current.setSelectionRange(newCursor, newCursor);
            }
        }, 0);
    };

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                id={id}
                value={value}
                onChange={handleInput}
                placeholder={placeholder}
                className={className}
                disabled={disabled}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowSuggestions(false);
                }}
            />

            {showSuggestions && (suggestions.length > 0 || loading) && (
                <div className="absolute left-0 bottom-full mb-2 w-64 max-w-full bg-surface-raised border border-border shadow-xl z-50" role="listbox" aria-label="People to mention">
                    {loading && <p className="p-3 text-sm text-muted text-center">Searching…</p>}
                    <ul className="max-h-48 overflow-y-auto">
                        {suggestions.map((member) => (
                            <li key={member.id}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={false}
                                    onClick={() => selectMember(member)}
                                    className="w-full text-left px-4 py-2 min-h-[44px] hover:bg-surface flex items-center gap-2"
                                >
                                    <span className="w-8 h-8 shrink-0 hexagon bg-brand/15 text-brand flex items-center justify-center font-bold text-xs uppercase" aria-hidden="true">
                                        {member.name[0]}
                                    </span>
                                    <span className="text-sm font-bold truncate">{member.name}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
