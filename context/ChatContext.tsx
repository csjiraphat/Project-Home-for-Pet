// ✅ context/ChatContext.tsx
import React, { createContext, useContext } from 'react';
import useChatSocket, { Message } from '../hooks/useChatSocket';

type ChatContextType = {
  messages: Message[];
  sendMessage: (text: string, media?: { type: 'image' | 'video'; url: string }) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{
  children: React.ReactNode;
  currentUsername: string;
  selectedUsername: string;
}> = ({ children, currentUsername, selectedUsername }) => {
  const { messages, sendMessage } = useChatSocket(currentUsername, selectedUsername);

  return (
    <ChatContext.Provider value={{ messages, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('ต้องใช้ useChat ภายใน <ChatProvider>');
  return context;
};
