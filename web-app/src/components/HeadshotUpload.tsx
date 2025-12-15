'use client';

import { useState, useRef } from 'react';

interface HeadshotUploadProps {
    playerId: string;
    currentHeadshot?: string | null;
    playerName: string;
    onUploadComplete?: (url: string) => void;
}

export function HeadshotUpload({ playerId, currentHeadshot, playerName, onUploadComplete }: HeadshotUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentHeadshot || null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setError('Please select a JPEG, PNG, or WebP image');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload
        setError(null);
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('playerId', playerId);

            const res = await fetch(`${API_BASE}/api/v1/upload/headshot`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                setPreview(data.data.url);
                onUploadComplete?.(data.data.url);
            } else {
                setError(data.error?.message || 'Upload failed');
                setPreview(currentHeadshot || null);
            }
        } catch (err) {
            setError('Upload failed. Please try again.');
            setPreview(currentHeadshot || null);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = async () => {
        if (!confirm('Remove headshot?')) return;

        setUploading(true);
        try {
            await fetch(`${API_BASE}/api/v1/upload/headshot/${playerId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            setPreview(null);
            onUploadComplete?.('');
        } catch (err) {
            setError('Failed to remove headshot');
        } finally {
            setUploading(false);
        }
    };

    const initials = playerName
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative group">
                {/* Headshot Display */}
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {preview ? (
                        <img src={preview} alt={playerName} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-white text-2xl font-bold">{initials}</span>
                    )}
                </div>

                {/* Upload overlay */}
                {!uploading && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                        <span className="text-white text-sm font-medium">📷 Change</span>
                    </button>
                )}

                {/* Loading overlay */}
                {uploading && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Remove button */}
                {preview && !uploading && (
                    <button
                        onClick={handleRemove}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors shadow-lg"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Player name */}
            <p className="text-sm font-medium text-gray-700">{playerName}</p>

            {/* Error message */}
            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}

            {/* Upload hint */}
            {!preview && !uploading && (
                <p className="text-xs text-gray-400">Click to upload photo</p>
            )}
        </div>
    );
}
