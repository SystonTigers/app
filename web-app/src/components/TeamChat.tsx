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
            <div className="flex flex-col h-full">
                <div className="bg-gradient-to-r from-brand to-brand/80 text-white p-6">
                    <h2 className="text-2xl font-bold">Team Chat</h2>
                    <p className="text-sm opacity-90">Stay connected with your team</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {rooms.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No chat rooms available
                        </div>
                    ) : (
                        rooms.map((room) => (
                            <button
                                key={room.roomId}
                                onClick={() => setSelectedRoom(room)}
                                className="w-full bg-white dark:bg-gray-800 rounded-lg p-4 shadow hover:shadow-md transition-shadow text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center">
                                            {room.type === 'team' ? '👥' : room.type === 'group' ? '👨‍👩‍👧‍👦' : '💬'}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{room.name}</h3>
                                            <p className="text-sm text-gray-500">
                                                {room.type === 'team' ? 'Team Chat' : 'Group Chat'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {formatTime(room.lastTs)}
                                    </span>
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
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand to-brand/80 text-white p-4 flex items-center gap-3">
                <button
                    onClick={() => setSelectedRoom(null)}
                    className="hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                    ← Back
                </button>
                <div>
                    <h2 className="font-bold">{selectedRoom.name}</h2>
                    <p className="text-xs opacity-90">
                        {selectedRoom.type === 'team' ? 'Team Chat' : 'Group Chat'}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                {messages.map((msg) => (
                    <div key={msg.id} className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand/20 flex-shrink-0 flex items-center justify-center text-sm font-bold">
                            {msg.userId.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold">{msg.userId}</span>
                                <span className="text-xs text-gray-500">{formatTime(msg.ts)}</span>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                                <p className="text-sm">{msg.text}</p>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                    <div className="flex gap-2 items-center px-4 py-2 text-sm text-gray-500">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span>{typingUsers[0]} is typing...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4 bg-white dark:bg-gray-800">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={messageText}
                        onChange={(e) => handleTyping(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand dark:bg-gray-700"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!messageText.trim()}
                        className="bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}
