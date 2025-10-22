// UserProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  ActivityIndicator, Alert, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';
import BottomBar from '../../components/BottomBar';
import API from '../../android/app/src/config';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/th';
import { useUser } from '../../context/UserContext';
import type { StackNavigationProp } from '@react-navigation/stack';

dayjs.extend(relativeTime);
dayjs.locale('th');

type RouteParams = {
  username: string;
};

type UserData = {
  id: string;
  username: string;
  email?: string;
  profilePicture?: string;
};

type Post = {
  id: string;
  user?: string;
  title: string;
  breed: string;
  type?: string;
  post_date?: string;
  postType?: string;
};

type RootStackParamList = {
  PostDetail: { post: Post };
  ChatRoomScreen: {
    selectedUsername: string;
  };
};

const UserProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useUser();
  const { username } = route.params as RouteParams;

  const [userData, setUserData] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userRes, homeRes, petRes] = await Promise.all([
        fetch(API.USERS),
        fetch(API.POST_FIND_HOME),
        fetch(API.POST_FIND_PET),
      ]);

      const usersJson = await userRes.json();
      const homePosts = await homeRes.json();
      const petPosts = await petRes.json();

      const thisUser = usersJson.find((u: UserData) => u.username === username);
      const allPosts = [...homePosts, ...petPosts].filter((p: Post) => p.user === username);

      setUserData(thisUser || null);
      setPosts(allPosts);
    } catch (err) {
      console.error('Error loading user profile:', err);
      Alert.alert('เกิดข้อผิดพลาด', 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchData);
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
      >
        <View style={styles.profileSection}>
          <Image
            source={
              userData?.profilePicture
                ? {
                  uri: `${API.PROFILE_PIC_PATH}/${userData.profilePicture}?t=${Date.now()}`,
                }
                : require('../../assets/default-avatar.jpg')
            }
            style={styles.avatar}
          />

          <Text style={styles.name}>{userData?.username || 'ไม่พบชื่อผู้ใช้'}</Text>
          {userData?.email && <Text style={styles.email}>{userData.email}</Text>}
          {!userData && (
            <Text style={{ color: 'red', marginTop: 8 }}>ไม่พบข้อมูลผู้ใช้งาน</Text>
          )}

          {user?.username && user.username !== username && userData?.username && (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ChatRoomScreen', {
                  selectedUsername: userData.username,
                })
              }
              style={styles.chatButton}
            >
              <Text style={styles.chatButtonText}>💬 แชทกับผู้ใช้คนนี้</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>
          รายการโพสต์ของผู้ใช้ {username}
        </Text>

        {posts.length === 0 ? (
          <Text style={styles.noPost}>ยังไม่มีโพสต์</Text>
        ) : (
          posts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.postItem}
              onPress={() => navigation.navigate('PostDetail', { post })}
            >
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postInfo}>
                {post.type === 'dog' || post.type === 'หมา'
                  ? '🐶 สุนัข'
                  : post.type === 'cat' || post.type === 'แมว'
                    ? '🐱 แมว'
                    : '🐾'}{' '}
                | {post.breed || 'ไม่ระบุสายพันธุ์'}
              </Text>
              {post.post_date && (
                <Text style={styles.timeText}>{dayjs(post.post_date).fromNow()}</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      <BottomBar />
    </View>
  );
};

export default UserProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, paddingBottom: 100 },
  profileSection: { alignItems: 'center', marginBottom: 30 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 999,
    backgroundColor: '#eee',
    marginBottom: 10,
  },
  name: { fontSize: 18, fontWeight: '600' },
  email: { fontSize: 14, color: '#555' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  noPost: { textAlign: 'center', color: '#888' },
  postItem: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  postTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  postInfo: { color: '#555', fontSize: 13 },
  timeText: { fontSize: 11, color: '#999', fontStyle: 'italic', marginTop: 4 },
  chatButton: {
    marginTop: 10,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  chatButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
});
