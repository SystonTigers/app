import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, Card, TextInput, IconButton, Avatar, Chip, List, Portal, Modal } from 'react-native-paper';
import { COLORS, TENANT_ID } from '../config';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Message {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'team' | 'direct' | 'group';
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  avatar?: string;
}

export default function ChatScreen() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUserId] = useState('user-001'); // TODO: Get from auth
  const [currentUserName] = useState('John Smith'); // TODO: Get from auth
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadChatRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
      // Auto-refresh messages every 5 seconds
      const interval = setInterval(() => {
        loadMessages(selectedRoom.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedRoom]);

  const loadChatRooms = async () => {
    try {
      // Mock data - replace with API call
      const mockRooms: ChatRoom[] = [
        {
          id: 'team-chat',
          name: 'Team Chat',
          type: 'team',
          participants: ['all'],
          unreadCount: 3,
          lastMessage: {
            id: 'msg-1',
            roomId: 'team-chat',
            userId: 'user-002',
            userName: 'Coach Mike',
            content: 'Great training session today!',
            timestamp: Date.now() - 300000,
            type: 'text',
          },
        },
        {
          id: 'parents-group',
          name: 'Parents Group',
          type: 'group',
          participants: ['parents'],
          unreadCount: 0,
          lastMessage: {
            id: 'msg-2',
            roomId: 'parents-group',
            userId: 'user-003',
            userName: 'Sarah Jones',
            content: 'What time is the match on Saturday?',
            timestamp: Date.now() - 3600000,
            type: 'text',
          },
        },
        {
          id: 'coaches',
          name: 'Coaches',
          type: 'group',
          participants: ['coaches'],
          unreadCount: 1,
          lastMessage: {
            id: 'msg-3',
            roomId: 'coaches',
            userId: 'user-004',
            userName: 'Assistant Coach',
            content: 'Training plan for next week?',
            timestamp: Date.now() - 7200000,
            type: 'text',
          },
        },
      ];

      setRooms(mockRooms);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      Alert.alert('Error', 'Failed to load chat rooms');
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      // Mock data - replace with API call
      const mockMessages: Message[] = [
        {
          id: 'msg-1',
          roomId,
          userId: 'user-002',
          userName: 'Coach Mike',
          content: 'Great training session today! Well done everyone.',
          timestamp: Date.now() - 300000,
          type: 'text',
        },
        {
          id: 'msg-2',
          roomId,
          userId: 'user-003',
          userName: 'Sarah Jones',
          content: 'Thanks coach! The kids really enjoyed it.',
          timestamp: Date.now() - 240000,
          type: 'text',
        },
        {
          id: 'msg-3',
          roomId,
          userId: 'user-001',
          userName: 'John Smith',
          content: 'Looking forward to the match on Saturday!',
          timestamp: Date.now() - 180000,
          type: 'text',
        },
        {
          id: 'msg-4',
          roomId,
          userId: 'user-004',
          userName: 'Tom Davies',
          content: 'What time is kick-off?',
          timestamp: Date.now() - 120000,
          type: 'text',
        },
        {
          id: 'msg-5',
          roomId,
          userId: 'user-002',
          userName: 'Coach Mike',
          content: 'Match starts at 10:00 AM. Please arrive by 9:30 AM.',
          timestamp: Date.now() - 60000,
          type: 'text',
        },
      ];

      setMessages(mockMessages);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedRoom) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      roomId: selectedRoom.id,
      userId: currentUserId,
      userName: currentUserName,
      content: messageText.trim(),
      timestamp: Date.now(),
      type: 'text',
    };

    try {
      // TODO: Send to backend
      // await api.post(`/api/v1/chat/${selectedRoom.id}/send`, {
      //   tenant: TENANT_ID,
      //   userId: currentUserId,
      //   userName: currentUserName,
      //   content: messageText.trim(),
      // });

      // Optimistic update
      setMessages([...messages, newMessage]);
      setMessageText('');

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const renderChatRoom = (room: ChatRoom) => {
    const getRoomIcon = () => {
      switch (room.type) {
        case 'team':
          return 'account-group';
        case 'group':
          return 'account-multiple';
        case 'direct':
          return 'account';
        default:
          return 'message';
      }
    };

    return (
      <Card key={room.id} style={styles.roomCard} onPress={() => setSelectedRoom(room)}>
        <Card.Content style={styles.roomContent}>
          <View style={styles.roomLeft}>
            <Avatar.Icon
              size={50}
              icon={getRoomIcon()}
              style={[
                styles.roomAvatar,
                { backgroundColor: room.type === 'team' ? COLORS.primary : COLORS.textLight },
              ]}
            />
            {room.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{room.unreadCount}</Text>
              </View>
            )}
          </View>

          <View style={styles.roomInfo}>
            <Text style={styles.roomName}>{room.name}</Text>
            {room.lastMessage && (
              <Text style={styles.lastMessage} numberOfLines={1}>
                {room.lastMessage.userName}: {room.lastMessage.content}
              </Text>
            )}
          </View>

          <View style={styles.roomRight}>
            {room.lastMessage && (
              <Text style={styles.timestamp}>{formatTime(room.lastMessage.timestamp)}</Text>
            )}
            <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textLight} />
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderMessage = (message: Message, index: number) => {
    const isOwnMessage = message.userId === currentUserId;
    const showAvatar = !isOwnMessage && (index === 0 || messages[index - 1]?.userId !== message.userId);

    return (
      <View
        key={message.id}
        style={[styles.messageContainer, isOwnMessage && styles.ownMessageContainer]}
      >
        {showAvatar && !isOwnMessage && (
          <Avatar.Text
            size={32}
            label={message.userName.charAt(0)}
            style={styles.messageAvatar}
          />
        )}

        {!showAvatar && !isOwnMessage && <View style={{ width: 32 }} />}

        <View style={[styles.messageBubble, isOwnMessage && styles.ownMessageBubble]}>
          {!isOwnMessage && showAvatar && (
            <Text style={styles.senderName}>{message.userName}</Text>
          )}
          <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
            {message.content}
          </Text>
          <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  // Chat room view
  if (selectedRoom) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.chatHeader}>
          <IconButton
            icon="arrow-left"
            iconColor="#000"
            size={24}
            onPress={() => setSelectedRoom(null)}
          />
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderTitle}>{selectedRoom.name}</Text>
            <Text style={styles.chatHeaderSubtitle}>
              {selectedRoom.participants.length === 1 ? 'All members' : `${selectedRoom.participants.length} participants`}
            </Text>
          </View>
          <IconButton icon="dots-vertical" iconColor="#000" size={24} onPress={() => {}} />
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message, index) => renderMessage(message, index))}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <IconButton
            icon="plus-circle"
            iconColor={COLORS.primary}
            size={28}
            onPress={() => Alert.alert('Coming Soon', 'File attachments coming soon!')}
          />
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            value={messageText}
            onChangeText={setMessageText}
            mode="outlined"
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
          />
          <IconButton
            icon="send"
            iconColor={COLORS.primary}
            size={28}
            onPress={sendMessage}
            disabled={!messageText.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Chat rooms list
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>Team communication</Text>
      </View>

      {/* Rooms */}
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {rooms.map(renderChatRoom)}

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="information" size={24} color={COLORS.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.infoTitle}>Team Communication</Text>
                <Text style={styles.infoText}>
                  Stay connected with your team. All messages are private and secure.
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Guidelines */}
        <Card style={styles.guidelinesCard}>
          <Card.Content>
            <Text style={styles.guidelinesTitle}>Chat Guidelines</Text>
            <Text style={styles.guidelineItem}>• Be respectful and supportive</Text>
            <Text style={styles.guidelineItem}>• Keep conversations family-friendly</Text>
            <Text style={styles.guidelineItem}>• No spam or inappropriate content</Text>
            <Text style={styles.guidelineItem}>• Report any issues to team admins</Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#000',
    marginTop: 4,
    opacity: 0.8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  roomCard: {
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    elevation: 2,
  },
  roomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  roomLeft: {
    position: 'relative',
  },
  roomAvatar: {
    backgroundColor: COLORS.primary,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  roomInfo: {
    flex: 1,
    marginLeft: 12,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  roomRight: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  infoCard: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: `${COLORS.primary}15`,
    elevation: 0,
  },
  infoRow: {
    flexDirection: 'row',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  guidelinesCard: {
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    elevation: 1,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  guidelineItem: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  // Chat view styles
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingRight: 8,
    paddingVertical: 4,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    color: '#000',
    opacity: 0.7,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    backgroundColor: COLORS.textLight,
  },
  messageBubble: {
    maxWidth: '70%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginLeft: 8,
    elevation: 1,
  },
  ownMessageBubble: {
    backgroundColor: COLORS.primary,
    marginLeft: 0,
    marginRight: 8,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 4,
  },
  ownMessageTime: {
    color: '#000',
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  messageInput: {
    flex: 1,
    marginHorizontal: 4,
    maxHeight: 100,
    backgroundColor: COLORS.background,
  },
});
