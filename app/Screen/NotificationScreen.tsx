// app/Screen/NotificationScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity,
  Alert, RefreshControl, ListRenderItem
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useUser } from '../../context/UserContext';
import API from '../../android/app/src/config';
import dayjs from 'dayjs'; 
import 'dayjs/locale/th'; 
dayjs.locale('th'); 


type Notification = {
  id: number;
  title: string;
  message: string;
  is_read: 0 | 1;
  created_at: string;
  related_post_type: 'fh' | 'fp' | null;
  related_post_id: number | null;
  type: 'report_resolution_reporter' | 'report_resolution_poster' | 'match_found' | 'new_comment' | 'new_reply';
  related_comment_id?: number | null; 
};

// --- API FUNCTIONS (ใช้ URL จาก config.js) ---
const apiFetchNotifications = async (userId: number): Promise<Notification[]> => {
    if (!userId) throw new Error("User not logged in.");
    
    const url = `${API.GET_NOTIFICATIONS}?user_id=${userId}`;
    console.log(`[API CALL] Fetching notifications from: ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        return data.notifications || [];
    } catch (error: any) {
        throw new Error(error.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อดึงข้อมูลแจ้งเตือนได้");
    }
};

const apiMarkNotificationAsRead = async (notificationId: number) => {
    const url = API.MARK_NOTIFICATION_READ;
    console.log(`[API CALL] Marking notification as read on: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notification_id: notificationId }),
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (!response.ok) {
             throw new Error("เซิร์ฟเวอร์ปฏิเสธการอัปเดตสถานะ");
        }

        return data;
    } catch (error: any) {
        throw new Error(error.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะแจ้งเตือน");
    }
};
// ----------------------------------------------

const NotificationScreen: React.FC = () => {
  const { user } = useUser();
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetchNotifications(Number(user.id));
      setNotifications(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (e: any) {
      console.error('Failed to fetch notifications:', e);
      Alert.alert('ข้อผิดพลาด', e.message);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handlePressNotification = useCallback(async (item: Notification) => {
    if (!user) return;

    // 1. Mark as read (ถ้ายังไม่ได้อ่าน)
    if (item.is_read === 0) {
        try {
            await apiMarkNotificationAsRead(item.id);
            setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: 1 as 1 } : n));
        } catch(e: any) {
             console.error("Failed to mark as read:", e);
        }
    }
    
    // 2. Logic การนำทาง
    const { related_post_type, related_post_id } = item;

    // ตรวจสอบว่ามีข้อมูลโพสต์ที่จำเป็นสำหรับการนำทางหรือไม่
    if (!related_post_type || !related_post_id) {
        // หากไม่มีข้อมูลโพสต์ ให้แสดง Alert แจ้งเตือนทั่วไปแล้วจบ
        Alert.alert(item.title, item.message.replace(/\*\*/g, ''));
        return; 
    }

    const navParams: any = { 
        postId: related_post_id, 
        postType: related_post_type,
        customTitle: related_post_type === 'fh' ? 'โพสต์หาบ้าน' : 'โพสต์รับเลี้ยง',
        commentIdToScroll: item.related_comment_id || undefined 
    };

    switch (item.type) {
        case 'new_comment':
        case 'new_reply': // ✅ แก้ไข: รวม new_reply และนำทาง
        case 'match_found':
            navigation.navigate('PostDetail', navParams);
            break; 

        case 'report_resolution_poster':
        case 'report_resolution_reporter':
            // แจ้งเตือนเท่านั้น เพราะโพสต์ถูกดำเนินการลบแล้ว
            Alert.alert(item.title, `${item.message.replace(/\*\*/g, '')}\n\n[สถานะ: โพสต์ถูกลบออกจากระบบ]`);
            break;

        default:
            // หากเข้าถึง switch ได้ แต่เป็น type ที่ไม่รู้จักและมี post_id ก็แสดง alert แล้วจบ
            Alert.alert(item.title, item.message.replace(/\*\*/g, ''));
            break;
    }
  }, [user, navigation]);


  const renderItem: ListRenderItem<Notification> = ({ item }) => {
    const isUnread = item.is_read === 0;
    
    const formatDateTime = (dateString: string) => {
      // รูปแบบ 05 ต.ค. 2025 01:06
      return dayjs(dateString).format('D MMM YYYY HH:mm น.');
    };

    // ลบ ** ออกจากข้อความหากมี
    const messageContent = item.message.replace(/\*\*/g, '');

    return (
      <TouchableOpacity
        style={[styles.item, isUnread && styles.unreadItem]}
        onPress={() => handlePressNotification(item)}
      >
        <View style={styles.icon}>
          {item.type === 'new_comment' || item.type === 'new_reply' ? (
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={isUnread ? '#10b981' : '#888'} />
          ) : item.type.includes('report_resolution') ? (
              <Ionicons name="shield-checkmark-outline" size={24} color={isUnread ? '#10b981' : '#888'} />
          ) : (
              <Ionicons name="notifications-outline" size={24} color={isUnread ? '#10b981' : '#888'} />
          )}
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, isUnread && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {messageContent}
          </Text>
          <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noUserText}>กรุณาเข้าสู่ระบบเพื่อดูรายการแจ้งเตือน</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.emptyCentered}> 
            <Ionicons name="notifications-off-outline" size={60} color="#ccc" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>ไม่มีรายการแจ้งเตือนในขณะนี้</Text>
            <Text style={styles.emptySubText}>รายการจะปรากฏที่นี่เมื่อมีกิจกรรมใหม่</Text>
          </View>
        }
        contentContainerStyle={notifications.length === 0 && styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  listContent: { flexGrow: 1, justifyContent: 'flex-start' }, 
  item: {
    flexDirection: 'row',
    padding: 15,
    paddingRight: 30, 
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    alignItems: 'flex-start',
  },
  unreadItem: { 
    backgroundColor: '#f5fff8', // สีอ่อนมาก ๆ สำหรับรายการที่ยังไม่ได้อ่าน
  }, 
  icon: { marginRight: 15, marginTop: 2 },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  unreadTitle: { color: '#004d40' },
  message: { fontSize: 13, color: '#333', marginTop: 4, lineHeight: 18 },
  date: { fontSize: 11, color: '#999', marginTop: 4 },
  emptyText: { fontSize: 16, color: '#888', fontWeight: 'bold' },
  emptySubText: { fontSize: 14, color: '#999', marginTop: 5 },
  noUserText: { fontSize: 16, color: '#888' },
  unreadDot: {
    position: 'absolute',
    right: 15,
    top: 15,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444', // สีแดง
  }
});

export default NotificationScreen;