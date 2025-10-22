// app/Screen/Profile/ProfileScreen.tsx
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../../context/UserContext';
import BottomBar from '../../components/BottomBar';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/th';
import API from '../../android/app/src/config';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';

dayjs.extend(relativeTime);
dayjs.locale('th');

type UserData = {
  id: string;
  username: string;
  email?: string;
  profilePicture?: string;
};

type RootStackParamList = {
  PostDetail: { post: Post };
  EditPost: { post: Post };
};

type Post = {
  id: string | number;
  user?: string;
  title: string;
  breed: string;
  type?: string;
  sex?: string;
  age?: string;
  min_age?: string;
  max_age?: string;
  color?: string;
  steriliz?: string;
  vaccine?: string;
  personality?: string;
  reason?: string;
  adoptionTerms?: string;
  image?: string;
  post_date?: string;
  postType?: 'fh' | 'fp';
  status?: string;
  [k: string]: any;
};

const SIDE_WIDTH = 260;


const ProfileScreen = () => {
  const { user, setUser } = useUser();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const slideX = useRef(new Animated.Value(SIDE_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const openMenu = useCallback(() => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.timing(slideX, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [fade, slideX]);

  const closeMenu = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideX, { toValue: SIDE_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => finished && setMenuVisible(false));
  }, [fade, slideX]);

  const fetchData = async () => {
    if (!user?.username) return;
    setLoading(true);
    try {

      const [userRes, homeRes, petRes] = await Promise.all([
        fetch(API.USERS),
        fetch(`${API.POST_FIND_HOME}?username=${encodeURIComponent(user.username)}`),
        fetch(`${API.POST_FIND_PET}?username=${encodeURIComponent(user.username)}`),
      ]);

      const usersJson = await userRes.json();
      const homeRaw = await homeRes.json();
      const petRaw = await petRes.json();

      const homePosts: Post[] = (Array.isArray(homeRaw) ? homeRaw : []).map((p: any) => ({ ...p, postType: 'fh' }));
      const petPosts: Post[] = (Array.isArray(petRaw) ? petRaw : []).map((p: any) => ({ ...p, postType: 'fp' }));

      const thisUser = usersJson.find((u: UserData) => u.username === user.username);


      const allPosts = [...homePosts, ...petPosts];
      allPosts.sort((a, b) => dayjs(b.post_date).valueOf() - dayjs(a.post_date).valueOf());

      setUserData(thisUser || null);
      setPosts(allPosts);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation]);

  const handleSelectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      const image = result.assets[0];
      const uri = image.uri;
      const fileName = uri.split('/').pop() || 'image.jpg';
      const ext = /\.(\w+)$/.exec(fileName)?.[1] || 'jpg';
      const type = `image/${ext}`;

      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type } as any);
      if (user?.username) formData.append('username', user.username);

      try {
        const res = await fetch(API.UPLOAD_PROFILE, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.status === 'success') {
          Alert.alert('สำเร็จ', 'เปลี่ยนรูปโปรไฟล์แล้ว');
          fetchData();
        } else Alert.alert('ผิดพลาด', data.message || 'อัปโหลดไม่สำเร็จ');
      } catch {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถอัปโหลดรูปได้');
      }
    }
  };

  const handleEdit = (post: Post) => {
    navigation.navigate('EditPost', { post });
  };


  const handleTogglePostStatus = (post: Post) => {
    const isActive = post.status === 'active';
    const newStatus = isActive ? 'hidden' : 'active';
    const actionText = isActive ? 'ปิด' : 'เปิด';
    const successText = isActive ? 'ปิดการใช้งาน' : 'เปิดใช้งาน';

    Alert.alert(
      `ยืนยันการ${actionText}โพสต์`,
      `คุณต้องการ${actionText}โพสต์ "${post.title}" ใช่หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: `ใช่, ${actionText}โพสต์`,
          style: isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {

              const endpoint = API.POST_UPDATE_STATUS || `${API.BASE_URL}/post/updatePostStatus.php`;
              const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: post.id,
                  postType: post.postType,
                  status: newStatus,
                }),
              });

              const data = await res.json();

              if (data.status === 'success') {
                Alert.alert('สำเร็จ', `ได้${successText}โพสต์แล้ว`);
                fetchData();
              } else {
                Alert.alert('ผิดพลาด', data.message || `ไม่สามารถ${actionText}โพสต์ได้`);
              }
            } catch (e) {
              console.error('Failed to toggle post status:', e);
              Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (post: Post) => {
    Alert.alert('ยืนยันการลบ', 'คุณต้องการลบโพสต์นี้หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            const endpoint = post.postType === 'fh' ? API.POST_DELETE_HOME : API.POST_DELETE_PET;
            const idValue = String(post.id ?? '').trim();
            if (!idValue) {
              Alert.alert('ผิดพลาด', 'ไม่พบรหัสโพสต์ (id)');
              return;
            }

            const res = await fetch(`${endpoint}?id=${encodeURIComponent(idValue)}`, {
              method: 'DELETE',
              headers: { Accept: 'application/json' },
            });
            let data: any = null;
            try { data = await res.json(); } catch { }

            if (res.ok && data && data.status === 'success') {
              setPosts((prev) => prev.filter((p) => String(p.id) !== idValue));
              Alert.alert('ลบแล้ว', 'โพสต์ถูกลบเรียบร้อยแล้ว');
              return;
            }

            const res2 = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
              body: `action=delete&id=${encodeURIComponent(idValue)}`,
            });
            let data2: any = null;
            try { data2 = await res2.json(); } catch { }
            if (res2.ok && data2 && (data2.status === 'success' || data2.success === true)) {
              setPosts((prev) => prev.filter((p) => String(p.id) !== idValue));
              Alert.alert('ลบแล้ว', 'โพสต์ถูกลบเรียบร้อยแล้ว');
              return;
            }

            Alert.alert('ลบไม่สำเร็จ', data?.message || data2?.message || 'ไม่สามารถลบโพสต์ได้');
          } catch (e) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
          }
        },
      },
    ]);
  };

  if (!user) return <Text>กรุณาเข้าสู่ระบบ</Text>;
  if (loading && posts.length === 0) return <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#000" />;

  return (
    <View style={styles.container}>
      {menuVisible && (
        <TouchableWithoutFeedback onPress={closeMenu}>
          <Animated.View style={[styles.overlay, { opacity: fade }]} />
        </TouchableWithoutFeedback>
      )}

      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}>
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={handleSelectImage}>
            <Image
              source={
                userData?.profilePicture
                  ? { uri: `${API.PROFILE_PIC_PATH}/${userData.profilePicture}?t=${Date.now()}` }
                  : require('../../assets/default-avatar.jpg')
              }
              style={styles.avatar}
            />
            <Text style={{ color: '#007aff', marginTop: 6 }}>เปลี่ยนรูปโปรไฟล์</Text>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.username || 'ไม่พบชื่อผู้ใช้'}</Text>
          {userData?.email && <Text style={styles.email}>{userData.email}</Text>}
        </View>

        <Text style={styles.sectionTitle}>โพสต์ของฉัน</Text>

        {posts.length === 0 ? (
          <Text style={styles.noPost}>คุณยังไม่มีโพสต์</Text>
        ) : (
          posts.map((post) => (
            <TouchableOpacity
              key={`${post.postType}-${post.id}`}
              style={[styles.postItem, post.status !== 'active' && styles.postItemHidden]}
              onPress={() => navigation.navigate('PostDetail', { post })}
            >
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postInfo}>
                {post.type === 'dog' || post.type === 'หมา' ? '🐶 สุนัข' : '🐱 แมว'} | {post.breed || 'ไม่ระบุสายพันธุ์'}
              </Text>
              {post.post_date && <Text style={styles.timeText}>{dayjs(post.post_date).fromNow()}</Text>}


              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(post)}>
                  <Text style={styles.btnText}>แก้ไข</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.closeBtn, post.status !== 'active' && styles.reopenBtn]}
                  onPress={() => handleTogglePostStatus(post)}
                >
                  <Text style={styles.btnText}>
                    {post.status === 'active' ? 'ปิดโพสต์' : 'เปิดโพสต์'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(post)}>
                  <Text style={styles.btnText}>ลบ</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <BottomBar />
      {Platform.OS === 'android' && <StatusBar backgroundColor="#fff" barStyle="dark-content" />}
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 16, paddingBottom: 40 },
  profileSection: { alignItems: 'center', marginBottom: 14, paddingVertical: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 1, borderColor: '#eee' },
  name: { marginTop: 10, fontSize: 18, fontWeight: '800', color: '#111' },
  email: { color: '#666', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1f2a56', marginBottom: 8 },
  noPost: { color: '#666' },
  postItem: {
    backgroundColor: '#f7f9ff',
    borderColor: '#e6ebff',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  postItemHidden: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  postTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  postInfo: { marginTop: 4, color: '#334' },
  timeText: { marginTop: 4, color: '#7a8', fontSize: 12 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editBtn: { flex: 1, backgroundColor: '#4f46e5', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  closeBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  reopenBtn: {
    backgroundColor: '#F59E0B',
  },
  deleteBtn: { flex: 1, backgroundColor: '#ef4444', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.35)', zIndex: 5 },
  sideMenu: { position: 'absolute', right: 0, top: 0, bottom: 0, width: SIDE_WIDTH, backgroundColor: '#fff', zIndex: 6, paddingTop: 14, paddingHorizontal: 14, borderLeftWidth: 1, borderColor: '#eaeaea' },
  sideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sideTitle: { fontSize: 18, fontWeight: '800' },
  sideItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f3f3' },
  sideText: { fontSize: 16, color: '#111' },
});