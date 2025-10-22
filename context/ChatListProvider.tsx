// แก้ ChatListProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from './UserContext';
import API from '../android/app/src/config';
import { io } from 'socket.io-client';

interface ChatUser {
  username: string;
  profileUrl?: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface ChatListContextType {
  chatUsers: ChatUser[];
  refreshChatList: () => void;
  hasNewMessage: boolean;
  setHasNewMessage: (val: boolean) => void;
}

const ChatListContext = createContext<ChatListContextType | undefined>(undefined);

export const ChatListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    if (!user?.username) return;
    const socket = io(API.CHAT_BASE_URL);
    socket.emit('join', user.username);

    socket.on('chat-message', (msg) => {
      if (msg.receiver === user.username) {
        setHasNewMessage(true);
        refreshChatList();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const refreshChatList = async () => {
    if (!user?.username) return;

    try {
      const res = await fetch(`${API.CHAT_BASE_URL}/api/chat-users?username=${encodeURIComponent(user.username)}`);
      const chatListData = await res.json();

      const userRes = await fetch(API.USERS);
      const allUsers = await userRes.json();

      const merged = chatListData.map((entry: any) => {
        const userData = allUsers.find((u: any) => u.username === entry.username);
        return {
          username: entry.username,
          lastMessage: entry.lastMessage,
          lastMessageTime: entry.lastMessageTime,
          profileUrl: userData?.profilePicture
            ? `${API.PROFILE_PIC_PATH}/${userData.profilePicture}?t=${Date.now()}`
            : '',
        };
      });

      setChatUsers(merged);
    } catch (err) {
      console.error('❌ ดึงข้อมูลแชทล้มเหลว:', err);
    }
  };

  useEffect(() => {
    refreshChatList();
  }, [user]);

  return (
    <ChatListContext.Provider value={{ chatUsers, refreshChatList, hasNewMessage, setHasNewMessage }}>
      {children}
    </ChatListContext.Provider>
  );
};

export const useChatList = (): ChatListContextType => {
  const context = useContext(ChatListContext);
  if (!context) throw new Error('useChatList ต้องใช้ภายใน <ChatListProvider>');
  return context;
};
