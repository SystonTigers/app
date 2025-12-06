'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
    id: string;
    ts: number;
    userId: string;
    text: string;
    media?: string[];
}

interface ChatRoom {
    roomId: string;
    name: string;
    type: 'team' | 'group' | 'direct';
    lastTs: number;
}

interface TeamChatProps {
    tenant: string;
}

export function TeamChat({ tenant }: TeamChatProps) {
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(true);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadRooms();
    }, [tenant]);

    useEffect(() => {
        if (selectedRoom) {
            loadMessages(selectedRoom.roomId);
            // Auto-refresh messages every 5 seconds
            const interval = setInterval(() => {
                loadMessages(selectedRoom.roomId);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [selectedRoom]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadRooms = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/chat/rooms', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (data.success) {
                setRooms(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (roomId: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/chat/${roomId}/history?limit=100`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (data.success) {
                setMessages(data.data.messages.reverse() || []);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const sendMessage = async () => {
        if (!messageText.trim() || !selectedRoom) return;

        const token = localStorage.getItem('token');
        try {
            // Clear typing indicator before sending
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            await sendTypingIndicator(false);

            await fetch(`/api/v1/chat/${selectedRoom.roomId}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    text: messageText.trim(),
                }),
            });

            setMessageText('');
            // Reload messages immediately
            await loadMessages(selectedRoom.roomId);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const sendTypingIndicator = async (typing: boolean) => {
        if (!selectedRoom) return;

        const token = localStorage.getItem('token');
        try {
            await fetch(`/api/v1/chat/${selectedRoom.roomId}/typing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ typing }),
            });
        } catch (error) {
            // Silent fail for typing indicators
        }
    };

    const handleTyping = (value: string) => {
        setMessageText(value);

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (value.trim()) {
            // Send typing indicator
            sendTypingIndicator(true);

            // Stop typing after 3 seconds of inactivity
            typingTimeoutRef.current = setTimeout(() => {
                sendTypingIndicator(false);
            }, 3000);
        } else {
            sendTypingIndicator(false);
        }
    };

    const formatTime = (ts: number) => {
        const date = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;

        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return <div className="p-8">Loading chat...</div>;
    }

    // Room list view
    if (!selectedRoom) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800">
                <div className="bg-gray-900 text-white p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/assets/pattern.png')] opacity-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-brand/90 to-gray-900/90" />
                    <div className="relative z-10">
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Team Chat</h2>
                        <p className="text-gray-300 font-medium">Connect with your squad instantly.</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-950/50">
                    {rooms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-3xl">💬</div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-2">No conversations yet</h3>
                            <p className="text-gray-500 text-sm">Join a room to start chatting.</p>
                        </div>
                    ) : (
                        rooms.map((room) => (
                            <button
                                key={room.roomId}
                                onClick={() => setSelectedRoom(room)}
                                className="w-full bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 group hover:scale-[1.01]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center shadow-inner group-hover:from-brand/20 group-hover:to-brand/10 transition-colors">
                                        <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                                            {room.type === 'team' ? '🛡️' : room.type === 'group' ? '📢' : '💬'}
                                        </span>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-brand transition-colors text-lg">{room.name}</h3>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                {formatTime(room.lastTs)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 font-medium">
                                            {room.type === 'team' ? 'Official Team Channel' : 'Group Conversation'}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // Chat messages view
    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4 shadow-sm z-10">
                <button
                    onClick={() => setSelectedRoom(null)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div>
                    <h2 className="font-black text-xl text-gray-900 dark:text-white uppercase tracking-tight">{selectedRoom.name}</h2>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            {selectedRoom.type === 'team' ? 'Team Channel' : 'Group'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-black/50 scroll-smooth">
                {messages.map((msg) => {
                    const isMe = msg.userId === 'me'; // In real app, check actual user ID
                    return (
                        <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''} group`}>
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand/80 flex items-center justify-center text-white text-sm font-black shadow-lg">
                                    {msg.userId.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <span className="text-xs font-bold text-gray-500">{msg.userId}</span>
                                    <span className="text-[10px] font-bold text-gray-300 uppercase">{formatTime(msg.ts)}</span>
                                </div>
                                <div className={`
                                    p-4 rounded-2xl shadow-sm text-sm leading-relaxed
                                    ${isMe
                                        ? 'bg-brand text-white rounded-tr-none'
                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-none'}
                                `}>
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                    <div className="flex gap-3 items-center ml-14">
                        <div className="bg-gray-200 dark:bg-gray-800 rounded-full px-4 py-2 flex gap-1.5 items-center">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{typingUsers[0]} is typing...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-3 items-end bg-gray-50 dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-brand focus-within:border-transparent transition-all">
                    <button className="p-2 text-gray-400 hover:text-brand transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-800">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    </button>
                    <textarea
                        value={messageText}
                        onChange={(e) => handleTyping(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder="Type a message..."
                        rows={1}
                        className="flex-1 bg-transparent border-none focus:ring-0 py-3 px-0 resize-none max-h-32 text-gray-900 dark:text-white placeholder-gray-400"
                        style={{ minHeight: '44px' }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!messageText.trim()}
                        className="p-3 bg-brand text-white rounded-xl hover:bg-brand/90 transition-all disabled:opacity-50 disabled:grayscale hover:scale-105 active:scale-95 shadow-lg"
                    >
                        <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
