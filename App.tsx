// App.tsx
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar';
import * as Device from 'expo-device';
import SplashScreen from './app/Screen/SplashScreen'; // 👈 เพิ่มบรรทัดนี้
import CustomHeader from './components/CustomHeader';
import { LogBox } from 'react-native';
// ✅ Providers
import { UserProvider, useUser } from './context/UserContext';
import { ChatListProvider } from './context/ChatListProvider';

// ✅ Screens
import RegisterScreen from './app/Screen/login/RegisterScreen';
import LoginScreen from './app/Screen/login/LoginScreen';
import HomeScreen from './app/Screen/HomeScreen';
import PetPostScreen from './app/Screen/Post/FH_Post';
import HomePostScreen from './app/Screen/Post/FP_Post';
import PostDetailScreen from './app/Screen/Post/PostDetailScreen';
import PostListScreen from './app/Screen/Post/PostListScreen';
import ProfileScreen from './app/Screen/ProfileScreen';
import EditPostScreen from './app/Screen/Post/EditPost/EditPostScreen';
import EditHomeForm from './app/Screen/Post/EditPost/Edit_Home';
import EditPetForm from './app/Screen/Post/EditPost/Edit_Pet';
import UserProfileScreen from './app/Screen/UserProfileScreen';
import ChatRoomScreen from './app/Screen/Chat/ChatRoomScreen';
import ChatListScreen from './app/Screen/Chat/ChatListScreen';
import GuideScreen from './app/Screen/Guide/GuideScreen';
import MatchResult from './app/Screen/Match/MatchResult';
import MatchHistory from './app/Screen/Match/MatchHistory';
import ArticleDetailScreen from './app/Screen/Guide/ArticleDetailScreen';
import NotificationScreen from './app/Screen/NotificationScreen';

// ✅ Utils
import { registerForPushNotificationsAsync } from './utils/notificationHelper';

const Stack = createStackNavigator();

const AppNavigator = ({ setSelectedUserId }: { setSelectedUserId: (id: string) => void }) => {
  const { user } = useUser();

  useEffect(() => {
    // สมัคร Push เฉพาะตอนรันบนอุปกรณ์จริงเท่านั้น (กัน Alert บน Emulator/Simulator)
    if (Platform.OS !== 'web' && Device.isDevice) {
      registerForPushNotificationsAsync().catch((e) =>
        console.warn('Push registration failed:', e)
      );
    } else {
      // ข้ามบน Emulator/Simulator
      console.log('Skip push registration on simulator/emulator');
    }

    // ตั้งค่า Navigation Bar (Android)
    const setupNavigationBar = async () => {
      try {
        await NavigationBar.setVisibilityAsync('hidden');
        await NavigationBar.setBehaviorAsync('overlay-swipe');
      } catch (error) {
        console.warn('⚠️ ตั้งค่า Navigation Bar ไม่ได้:', error);
      }
    };
    setupNavigationBar();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash" // 👈 เปลี่ยนให้เริ่มที่ Splash
        screenOptions={{
          header: ({ options, route }) => {
            const title = (route.params as any)?.customTitle || options.title || route.name;
            return <CustomHeader title={title} />;
          },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'ลงชื่อเข้าใช้' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'ลงทะเบียน' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'หน้าหลัก' }} />
        <Stack.Screen name="PetPost" component={PetPostScreen} options={{ title: 'ข้อมูลของสัตว์เลี้ยง' }} />
        <Stack.Screen name="HomePost" component={HomePostScreen} options={{ title: 'ข้อมูลสัตว์เลี้ยงที่ต้องการ' }} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'รายละเอียดโพสต์' }} />
        <Stack.Screen
          name="PostList"
          component={PostListScreen}
          options={({ route }: { route: any }) => {
            const filter = route?.params?.filterType?.toLowerCase?.() || '';
            let title = 'รายการโพสต์';
            if (filter === 'dog' || filter === 'หมา') title = 'รายการสุนัข';
            else if (filter === 'cat' || filter === 'แมว') title = 'รายการแมว';
            return { title };
          }}
        />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'โปรไฟล์' }} />
        <Stack.Screen name="EditPost" component={EditPostScreen} options={{ title: 'แก้ไขโพสต์' }} />
        <Stack.Screen name="EditHomeForm" component={EditHomeForm} options={{ title: 'แก้ไขโพสต์บ้าน' }} />
        <Stack.Screen name="EditPetForm" component={EditPetForm} options={{ title: 'แก้ไขโพสต์สัตว์' }} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'ผู้โพสต์' }} />
        <Stack.Screen name="ChatRoomScreen" component={ChatRoomScreen} options={{ title: 'ห้องแชท' }} />
        <Stack.Screen name="ChatListScreen" component={ChatListScreen} options={{ title: 'แชท' }} />
        <Stack.Screen name="CareTips" component={GuideScreen} options={{ title: 'ความรู้การดูแลสัตว์เลี้ยงเบื้องต้น' }} />
        <Stack.Screen name="MatchResult" component={MatchResult} options={{ title: 'ผลการจับคู่' }} />
        <Stack.Screen name="MatchHistory" component={MatchHistory} options={{ title: 'ประวัติการจับคู่' }} />
        <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} options={{ title: 'ความรู้สัตว์เลี้ยง' }} />
        <Stack.Screen name="Notification" component={NotificationScreen} options={{ title: 'การแจ้งเตือน' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    const loadUser = async () => {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id?.toString?.() ?? '');
      }
    };
    loadUser();
  }, []);

  return (
    <UserProvider>
      <ChatListProvider>
        <AppNavigator setSelectedUserId={setSelectedUserId} />
      </ChatListProvider>
    </UserProvider>
  );
}
LogBox.ignoreLogs([
  'Support for defaultProps will be removed',
]);
