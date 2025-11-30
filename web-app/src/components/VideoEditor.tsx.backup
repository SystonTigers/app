'use client';

import { useState, useRef, useEffect } from 'react';

interface Video {
    id: string;
    filename: string;
    uploadTimestamp: number;
    size: number;
    status: 'queued' | 'processing' | 'ready' | 'failed';
    processingProgress?: number;
    duration?: number;
    r2Key: string;
    streamUrl?: string;
}

interface VideoEditorProps {
    tenant: string;
}

export function VideoEditor({ tenant }: VideoEditorProps) {
    const [videos, setVideos] = useState<Video[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadVideos();
    }, [tenant]);

    const loadVideos = async () => {
        try {
            const response = await fetch(`/api/v1/videos?tenant=${tenant}`);
            const data = await response.json();
            if (data.success) {
                setVideos(data.data.videos || []);
            }
        } catch (error) {
            console.error('Failed to load videos:', error);
        }
    };

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const file = files[0];

        // Create a local preview immediately
        const localId = `local-${Date.now()}`;
        const localUrl = URL.createObjectURL(file);
        const localVideo: Video = {
            id: localId,
            filename: file.name,
            uploadTimestamp: Date.now(),
            size: file.size,
            status: 'processing', // Show as processing/uploading
            r2Key: '',
            processingProgress: 0
        };
        // Attach localUrl to the video object (we'll need to cast it or update type)
        (localVideo as any).localUrl = localUrl;

        setVideos(prev => [localVideo, ...prev]);
        setSelectedVideo(localVideo); // Auto-select the new video

        setUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('video', file);

            const response = await fetch('/api/v1/videos/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                // Replace local video with real one
                await loadVideos();
                setUploadProgress(100);
                setTimeout(() => {
                    setUploading(false);
                    setUploadProgress(0);
                }, 1000);
            } else {
                // Handle error
                console.error('Upload failed', data.error);
                setVideos(prev => prev.map(v => v.id === localId ? { ...v, status: 'failed' } : v));
                setUploading(false);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            setVideos(prev => prev.map(v => v.id === localId ? { ...v, status: 'failed' } : v));
            setUploading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ready': return 'bg-green-500';
            case 'processing': return 'bg-yellow-500';
            case 'queued': return 'bg-blue-500';
            case 'failed': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b border-border bg-surface">
                <div className="container py-6">
                    <h1 className="text-4xl font-bold mb-2">Video Editor</h1>
                    <p className="text-muted">Create highlight clips from your match videos</p>
                </div>
            </div>

            <div className="container py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold">Video Library</h2>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="btn btn-primary text-sm px-4 py-2"
                                >
                                    Upload
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={(e) => handleUpload(e.target.files)}
                                />
                            </div>

                            {uploading && (
                                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">Uploading...</span>
                                        <span className="text-sm text-muted">{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {videos.length === 0 && !uploading && (
                                    <div className="text-center py-12 text-muted">
                                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        <p>No videos yet</p>
                                        <p className="text-sm mt-1">Upload your first video to get started</p>
                                    </div>
                                )}

                                {videos.map((video) => (
                                    <div
                                        key={video.id}
                                        onClick={() => setSelectedVideo(video)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${selectedVideo?.id === video.id
                                            ? 'border-brand bg-brand/10'
                                            : 'border-border hover:border-brand/50 hover:bg-surface/50'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="font-medium text-sm truncate flex-1">{video.filename}</h3>
                                            <div className={`w-2 h-2 rounded-full ${getStatusColor(video.status)} ml-2`} />
                                        </div>
                                        <div className="text-xs text-muted space-y-1">
                                            <div>{formatFileSize(video.size)}</div>
                                            <div>{formatDate(video.uploadTimestamp)}</div>
                                            {video.status === 'processing' && video.processingProgress && (
                                                <div className="text-yellow-600 dark:text-yellow-400">
                                                    Processing: {video.processingProgress}%
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        {selectedVideo ? (
                            <VideoEditorCanvas
                                video={selectedVideo}
                                tenant={tenant}
                                localUrl={selectedVideo.id.startsWith('local-') ? (selectedVideo as any).localUrl : undefined}
                            />
                        ) : (
                            <div className="card h-full flex items-center justify-center min-h-[500px]">
                                <div className="text-center text-muted">
                                    <svg className="w-24 h-24 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-lg mb-2">Select a video to start editing</p>
                                    <p className="text-sm">Choose from your library or upload a new video</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function VideoEditorCanvas({ video, tenant, localUrl }: { video: Video; tenant: string; localUrl?: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [inPoint, setInPoint] = useState<number | null>(null);
    const [outPoint, setOutPoint] = useState<number | null>(null);
    const [clips, setClips] = useState<any[]>([]);
    const [creatingClip, setCreatingClip] = useState(false);

    useEffect(() => {
        loadClips();
    }, [video.id]);

    const loadClips = async () => {
        try {
            const response = await fetch(`/api/v1/videos/${video.id}/clips`);
            const data = await response.json();
            if (data.success) {
                setClips(data.data.clips || []);
            }
        } catch (error) {
            console.error('Failed to load clips:', error);
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (playing) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setPlaying(!playing);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const seekTo = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const setIn = () => {
        setInPoint(currentTime);
    };

    const setOut = () => {
        setOutPoint(currentTime);
    };

    const createClip = async () => {
        if (inPoint === null || outPoint === null) {
            alert('Please set both in and out points');
            return;
        }

        setCreatingClip(true);
        try {
            const response = await fetch(`/api/v1/videos/${video.id}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startTime: inPoint,
                    endTime: outPoint,
                }),
            });

            const data = await response.json();
            if (data.success) {
                await loadClips();
                setInPoint(null);
                setOutPoint(null);
            }
        } catch (error) {
            console.error('Failed to create clip:', error);
        } finally {
            setCreatingClip(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const videoUrl = localUrl || video.streamUrl || `/api/v1/videos/${video.id}/stream`;

    return (
        <div className="card space-y-6">
            <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setPlaying(false)}
                />

                {!playing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <button
                            onClick={togglePlay}
                            className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-all"
                        >
                            <svg className="w-10 h-10 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={togglePlay}
                        className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center hover:opacity-90 transition-all"
                    >
                        {playing ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>

                    <div className="flex-1">
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={(e) => seekTo(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <div className="flex justify-between text-sm text-muted mt-1">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={setIn} className="btn btn-secondary text-sm px-4 py-2">
                        Set In [{inPoint !== null ? formatTime(inPoint) : '--:--'}]
                    </button>
                    <button onClick={setOut} className="btn btn-secondary text-sm px-4 py-2">
                        Set Out [{outPoint !== null ? formatTime(outPoint) : '--:--'}]
                    </button>
                    <button
                        onClick={createClip}
                        disabled={creatingClip || inPoint === null || outPoint === null}
                        className="btn btn-primary text-sm px-6 py-2 disabled:opacity-50"
                    >
                        {creatingClip ? 'Creating...' : 'Create Clip'}
                    </button>
                </div>

                {(inPoint !== null || outPoint !== null) && duration > 0 && (
                    <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                        {inPoint !== null && outPoint !== null && (
                            <div
                                className="absolute h-full bg-brand/30"
                                style={{
                                    left: `${(inPoint / duration) * 100}%`,
                                    width: `${((outPoint - inPoint) / duration) * 100}%`,
                                }}
                            />
                        )}
                        {inPoint !== null && (
                            <div
                                className="absolute w-1 h-full bg-green-500"
                                style={{ left: `${(inPoint / duration) * 100}%` }}
                            />
                        )}
                        {outPoint !== null && (
                            <div
                                className="absolute w-1 h-full bg-red-500"
                                style={{ left: `${(outPoint / duration) * 100}%` }}
                            />
                        )}
                    </div>
                )}
            </div>

            {clips.length > 0 && (
                <div className="border-t border-border pt-6">
                    <h3 className="font-bold mb-4">Clips ({clips.length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {clips.map((clip: any) => (
                            <div key={clip.id} className="p-3 border border-border rounded-lg">
                                <div className="text-sm font-medium mb-1">
                                    {formatTime(clip.startTime)} → {formatTime(clip.endTime)}
                                </div>
                                <div className="text-xs text-muted">
                                    Duration: {formatTime(clip.endTime - clip.startTime)}
                                </div>
                                <div className="text-xs text-muted mt-1">
                                    Status: <span className={`font-medium ${clip.status === 'ready' ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {clip.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
