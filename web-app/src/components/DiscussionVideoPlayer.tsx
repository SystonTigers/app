'use client';

import { useRef, useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';

/** Comment timestamps ("[12:34]") call this to jump the video. */
declare global {
    interface Window {
        __discussionVideoSeek?: (seconds: number) => void;
    }
}

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
        window.__discussionVideoSeek = seekTo;
        return () => {
            delete window.__discussionVideoSeek;
        };
    }, []);

    if (isCollapsed) {
        return (
            <div className="card p-4 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 font-display font-bold uppercase">
                    <Icon name="video" className="w-5 h-5 text-brand" /> Match video
                </span>
                <button type="button" onClick={() => setIsCollapsed(false)} className="btn btn-secondary btn-sm min-h-[40px]">
                    Show video
                </button>
            </div>
        );
    }

    return (
        <div className="card p-0 overflow-hidden">
            <div className="relative aspect-video bg-background">
                <video ref={videoRef} src={videoUrl} className="w-full h-full" controls playsInline />
            </div>

            <div className="p-3 border-t border-border">
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={togglePlayPause}
                            className="btn btn-primary btn-sm min-h-[40px]"
                            aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                            {isPlaying ? 'Pause' : <><Icon name="play" className="w-4 h-4" /> Play</>}
                        </button>
                        <span className="font-mono text-sm text-muted tabular-nums">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>
                    <button type="button" onClick={() => setIsCollapsed(true)} className="btn btn-ghost btn-sm min-h-[40px]">
                        Hide
                    </button>
                </div>
                <div className="w-full h-1 bg-surface-raised overflow-hidden">
                    <div className="h-full bg-brand transition-all" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
                </div>
            </div>
        </div>
    );
}

// Helper function to get current video time
export function getCurrentVideoTime(): number | null {
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
