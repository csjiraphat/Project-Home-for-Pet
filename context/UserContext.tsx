import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserData {
  id: string;
  username: string;
  email: string;
  userType: string;
  profilePicture?: string | null; // ✅ เพิ่มฟิลด์รองรับรูปโปรไฟล์
}

interface UserContextType {
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  loadingUser: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.warn('โหลดข้อมูลผู้ใช้ล้มเหลว:', error);
      } finally {
        setLoadingUser(false);
      }
    };
    loadUserFromStorage();
  }, []);

  if (loadingUser) return null;

  return (
    <UserContext.Provider value={{ user, setUser, loadingUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser ต้องอยู่ภายใน <UserProvider>');
  }
  return context;
};
