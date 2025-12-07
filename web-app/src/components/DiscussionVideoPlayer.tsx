'use client';

import { useRef, useState, useEffect } from 'react';

interface DiscussionVideoPlayerProps {
    videoUrl: string;
    videoId: string;
    onTimeUpdate?: (currentTime: number) => void;
}

export function DiscussionVideoPlayer({
    videoUrl,
    videoId,
    onTimeUpdate
}: DiscussionVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            const time = video.currentTime;
            setCurrentTime(time);
            if (onTimeUpdate) {
                onTimeUpdate(time);
            }
        };

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, [onTimeUpdate]);

    const seekTo = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = seconds;
            videoRef.current.play();
        }
    };

    const togglePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
        }
    };

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Expose seekTo function globally for timestamp links
    useEffect(() => {
        (window as any).__discussionVideoSeek = seekTo;
        return () => {
            delete (window as any).__discussionVideoSeek;
        };
    }, []);

    if (isCollapsed) {
        return (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🎬</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Match Video</span>
                </div>
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-bold hover:bg-brand/90 transition-colors"
                >
                    Show Video
                </button>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="relative aspect-video">
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full"
                    controls
                    playsInline
                />
            </div>

            <div className="p-4 bg-gray-800">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={togglePlayPause}
                            className="w-10 h-10 bg-brand rounded-full flex items-center justify-center text-white hover:bg-brand/90 transition-colors"
                        >
                            {isPlaying ? '⏸' : '▶'}
                        </button>
                        <span className="text-white font-mono text-sm">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <button
                        onClick={() => setIsCollapsed(true)}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                        Minimize
                    </button>
                </div>

                <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-brand transition-all"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

// Helper function to get current video time
export function getCurrentVideoTime(): number | null {
    const seek = (window as any).__discussionVideoSeek;
    // Video element should have currentTime
    const video = document.querySelector('video');
    return video ? video.currentTime : null;
}

// Helper to insert timestamp at current time
export function getTimestampAtCurrentTime(): string {
    const time = getCurrentVideoTime();
    if (time === null) return '';

    const seconds = Math.floor(time);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
        return `[${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
    }
    return `[${mins}:${secs.toString().padStart(2, '0')}]`;
}
