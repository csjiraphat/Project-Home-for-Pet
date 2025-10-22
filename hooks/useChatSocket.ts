// ✅ hooks/useChatSocket.ts (refactor: use API.CHAT_BASE_URL, platform-safe, proper types)
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import API from '../android/app/src/config';

export type Message = {
  sender: string;
  receiver: string;
  text?: string;
  mediaType?: 'image' | 'video' | null;
  mediaUrl?: string | null;
  timestamp: string;
};

// Normalize CHAT_BASE from config (supports emulator and trims trailing slash)
const normalizeChatBase = (raw?: string) => {
  let base = (raw || '').trim();
  if (!base) return '';
  if (Platform.OS === 'android') {
    base = base.replace('http://localhost', 'http://10.0.2.2')
               .replace('http://127.0.0.1', 'http://10.0.2.2');
  }
  return base.replace(/\/+$/, '');
};

const CHAT_BASE =
  normalizeChatBase((API as any).CHAT_BASE_URL || (API as any).CHAT_SERVER || (API as any).CHAT) ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://127.0.0.1:3001');

export default function useChatSocket(currentUsername: string, selectedUsername: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  // Helper: only keep conversation between current and selected user
  const isInThisRoom = (m: Message) => {
    const a = m.sender, b = m.receiver;
    return (
      (a === currentUsername && b === selectedUsername) ||
      (a === selectedUsername && b === currentUsername)
    );
  };

  // Initial fetch of history
  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      try {
        const url = `${CHAT_BASE}/chat/${encodeURIComponent(currentUsername)}/${encodeURIComponent(selectedUsername)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Message[] = await res.json();
        if (!cancelled) setMessages(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setMessages([]);
        console.warn('(CHAT) fetch history failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (currentUsername && selectedUsername) {
      setLoading(true);
      fetchHistory();
    }

    return () => {
      cancelled = true;
    };
  }, [currentUsername, selectedUsername]);

  // Socket connection
  useEffect(() => {
    if (!currentUsername || !selectedUsername) return;

    const socket = io(CHAT_BASE, { transports: ['websocket'] });
    socketRef.current = socket;

    // join own room for direct messages
    socket.emit('join', currentUsername);

    socket.on('connect_error', (err) => {
      console.warn('(SOCKET) connect_error:', (err as any)?.message || err);
    });

    socket.on('chat-message', (msg: Message) => {
      if (isInThisRoom(msg)) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUsername, selectedUsername]);

  const sendMessage = (text: string, media?: { type: 'image' | 'video'; url: string }) => {
    if (!socketRef.current) return;
    const payload: Message = {
      sender: currentUsername,
      receiver: selectedUsername,
      text: text || '',
      mediaType: media?.type ?? null,
      mediaUrl: media?.url ?? null,
      timestamp: new Date().toISOString(),
    };
    socketRef.current.emit('chat-message', payload);
  };

  // Build absolute URL for media if given a relative path
  const absolutize = (maybeRelative: string) => {
    if (!maybeRelative) return maybeRelative;
    if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
    if (maybeRelative.startsWith('/')) return `${CHAT_BASE}${maybeRelative}`;
    // try to extract /uploads from accidental absolute host
    const m = maybeRelative.match(/^https?:\/\/[^/]+(\/.*)$/i);
    if (m) return `${CHAT_BASE}${m[1]}`;
    return maybeRelative;
  };

  return { messages, sendMessage, loading, CHAT_BASE, absolutize };
}

export type { Socket };
