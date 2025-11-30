'use client';

import { useState } from 'react';

interface SocialPostComposerProps {
    onPost: (content: string, platforms: string[], mediaUrls: string[], scheduledFor?: number) => Promise<void>;
}

export function SocialPostComposer({ onPost }: SocialPostComposerProps) {
    const [content, setContent] = useState('');
    const [platforms, setPlatforms] = useState<string[]>(['twitter']);
    const [scheduling, setScheduling] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [posting, setPosting] = useState(false);

    const platformOptions = [
        { id: 'twitter', label: 'X (Twitter)', icon: '𝕏', color: 'bg-black text-white' },
        { id: 'facebook', label: 'Facebook', icon: 'f', color: 'bg-blue-600 text-white' },
        { id: 'instagram', label: 'Instagram', icon: '📷', color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' },
        { id: 'tiktok', label: 'TikTok', icon: '♪', color: 'bg-black text-white' },
        { id: 'youtube', label: 'YouTube', icon: '▶', color: 'bg-red-600 text-white' },
    ];

    const togglePlatform = (platformId: string) => {
        setPlatforms(prev =>
            prev.includes(platformId)
                ? prev.filter(p => p !== platformId)
                : [...prev, platformId]
        );
    };

    const handlePost = async () => {
        if (!content.trim() || platforms.length === 0) return;

        setPosting(true);
        try {
            let scheduledTimestamp: number | undefined;
            if (scheduling && scheduledDate && scheduledTime) {
                scheduledTimestamp = new Date(`${scheduledDate}T${scheduledTime}`).getTime();
            }

            await onPost(content, platforms, [], scheduledTimestamp);

            // Reset form
            setContent('');
            setPlatforms(['twitter']);
            setScheduling(false);
            setScheduledDate('');
            setScheduledTime('');
        } catch (error) {
            console.error('Post failed:', error);
        } finally {
            setPosting(false);
        }
    };

    const getCharacterLimit = () => {
        if (platforms.includes('twitter')) return 280;
        return 2000;
    };

    const charLimit = getCharacterLimit();
    const charsRemaining = charLimit - content.length;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-4">Create Post</h3>

            {/* Platform Selection */}
            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                    {platformOptions.map(platform => (
                        <button
                            key={platform.id}
                            onClick={() => togglePlatform(platform.id)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${platforms.includes(platform.id)
                                    ? platform.color
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            {platform.icon} {platform.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Content</label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's happening?"
                    rows={6}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand dark:bg-gray-700 dark:border-gray-600"
                />
                <div className="flex justify-between items-center mt-2">
                    <span className={`text-sm ${charsRemaining < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {charsRemaining} characters remaining
                    </span>
                    <button className="text-brand text-sm hover:underline">Add media</button>
                </div>
            </div>

            {/* Scheduling */}
            <div className="mb-4">
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <input
                        type="checkbox"
                        checked={scheduling}
                        onChange={(e) => setScheduling(e.target.checked)}
                        className="rounded"
                    />
                    Schedule for later
                </label>

                {scheduling && (
                    <div className="flex gap-2 mt-2">
                        <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand dark:bg-gray-700"
                        />
                        <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand dark:bg-gray-700"
                        />
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={handlePost}
                    disabled={posting || !content.trim() || platforms.length === 0 || charsRemaining < 0}
                    className="flex-1 bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                    {posting ? 'Posting...' : scheduling ? 'Schedule Post' : 'Post Now'}
                </button>
                <button
                    onClick={() => {/* Preview */ }}
                    className="px-6 py-3 border border-brand text-brand rounded-lg hover:bg-brand/10 transition-colors font-semibold"
                >
                    Preview
                </button>
            </div>
        </div>
    );
}
