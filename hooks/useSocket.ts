// hooks/useSocket.ts
import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
const SOCKET_URL = 'http://<IP_ADDRESS>:3000'; // ใส่ IP จริงของ backend

export const useSocket = (username: string) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    if (username) {
      socket.emit('register', username);
    }

    return () => {
      socket.disconnect();
    };
  }, [username]);

  return socketRef;
};
