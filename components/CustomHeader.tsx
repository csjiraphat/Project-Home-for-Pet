// components/CustomHeader.tsx
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'; 
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  Platform, StatusBar, Animated, Easing,
  TouchableWithoutFeedback, Modal
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import API from '../android/app/src/config';

type Props = { title: string; hideRight?: boolean; rightElement?: React.ReactNode };

type UserLike = { username?: string; userType?: string; [k: string]: any };

const typeMeta = (t?: string) => {
  const key = (t ?? '').toString().trim().toLowerCase();
  if (key === 'fh' || key === 'fhome') return { icon: '🏠', label: 'หาบ้าน' };
  if (key === 'fp' || key === 'fpet')  return { icon: '🤝', label: 'รับเลี้ยง' };
  return { icon: '🐾', label: 'ไม่ระบุ' };
};

const SIDE_WIDTH = 260;

// ฟังก์ชันสำหรับดึงจำนวนแจ้งเตือนที่ยังไม่ได้อ่าน
const fetchUnreadCount = async (userId: string): Promise<number> => {
    if (!userId) return 0;
    try {
        const url = `${API.BASE_URL}/report/api_get_unread_count.php?user_id=${userId}`; 
        const response = await fetch(url);
        const data = await response.json();
        if (data.ok) {
            return data.unread_count || 0;
        }
    } catch (error) {
        console.error("Failed to fetch unread count:", error);
    }
    return 0;
};

const CustomHeader: React.FC<Props> = ({ title, hideRight, rightElement }) => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { user, setUser } = useUser();
  const u = (user || {}) as UserLike;

  const [menuVisible, setMenuVisible] = useState(false);
  const slideX = useRef(new Animated.Value(SIDE_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [unreadCount, setUnreadCount] = useState(0);

  const canGoBack = navigation.canGoBack() && route.name !== 'Home';
  const onBack = () => canGoBack && navigation.goBack();
  
  const goToLogin = useCallback(() => {
    try { navigation.navigate('Login' as any); }
    catch { try { navigation.navigate('LoginScreen' as any); } catch {} }
  }, [navigation]);


  // Effect สำหรับดึงจำนวนแจ้งเตือนที่ยังไม่ได้อ่านเมื่อหน้าจอโฟกัส
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadUnreadCount = async () => {
        if (user?.id) {
          const count = await fetchUnreadCount(user.id.toString());
          if (isActive) {
            setUnreadCount(count);
          }
        } else {
          setUnreadCount(0);
        }
      };

      loadUnreadCount();
      const intervalId = setInterval(loadUnreadCount, 60000); 
      
      return () => { 
        isActive = false; 
        clearInterval(intervalId);
      };
    }, [user?.id])
  );
  
  const goMatchHistory = useCallback(() => {
    closeMenu();
    try {
      const rParams: any = (route as any)?.params || {};
      const rawType = ((rParams.postType ?? rParams.type ?? u.userType) || '').toString().toLowerCase();
      const histType: 'fh' | 'fp' | undefined = rawType.startsWith('fh') ? 'fh' : rawType.startsWith('fp') ? 'fp' : undefined;
      const sourceIdGuess = Number(rParams.id ?? rParams.postId ?? rParams.sourceId ?? 0);
      const postTitleGuess = rParams.title ?? rParams.postTitle ?? undefined;

      if (histType && sourceIdGuess) {
        navigation.navigate('MatchHistory', {
          type: histType,
          sourceId: sourceIdGuess,
          title: postTitleGuess,
        });
      } else {
        navigation.navigate('MatchHistory');
      }
    } catch (e: any) {
      Alert.alert('ไปหน้า “รายการจับคู่” ไม่ได้', String(e?.message || e));
    }
  }, [navigation, route, user?.userType]);
  
  // Go Notifications (และเคลียร์จุดแดงชั่วคราว)
  const goNotifications = useCallback(() => {
    closeMenu();
    navigation.navigate('Notification');
    setUnreadCount(0); // Clear dot optimistically
  }, [navigation]);
  
  const handleLogout = useCallback(() => {
    Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ยืนยัน',
        onPress: () => {
          setUser?.(null);
          closeMenu();
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        },
      },
    ]);
  }, [navigation, setUser]);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.timing(slideX, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade,   { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };
  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(slideX, { toValue: SIDE_WIDTH, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade,   { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(({ finished }) => finished && setMenuVisible(false));
  };

  const info = useMemo(() => typeMeta(u.userType), [u.userType]);
  const isAuthScreen = route.name === 'Login' || route.name === 'Register';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {/* ซ้าย: ปุ่มย้อนกลับ */}
        {canGoBack ? (
          <TouchableOpacity style={styles.leftBox} onPress={onBack} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        ) : (
          <View style={styles.leftBox} />
        )}
        
        {/* กลาง: ชื่อหน้า */}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>

        {/* ขวา: ปุ่ม 3 ขีด / Login */}
        {rightElement ? (
          <View style={styles.rightBox}>{rightElement}</View>
        ) : hideRight || isAuthScreen ? (
          <View style={styles.rightBox} />
        ) : !user ? (
          <TouchableOpacity style={styles.rightBox} onPress={goToLogin}>
            <Text style={styles.rightText}>Login</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.rightBox} onPress={openMenu} accessibilityLabel="เปิดเมนู">
            <Text style={styles.burger}>☰</Text>
            {/* ✅ จุดแดงแจ้งเตือนบน Hamburger (ปรับตำแหน่ง) */}
            {unreadCount > 0 && <View style={styles.dotIndicator} />}
          </TouchableOpacity>
        )}
      </View>

      {/* ===== เมนูด้านขวาแบบ Modal ===== */}
      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={closeMenu} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={closeMenu}>
          <Animated.View style={[styles.backdrop, { opacity: fade }]} />
        </TouchableWithoutFeedback>

        <Animated.View pointerEvents="auto" style={[styles.sideSheet, { transform: [{ translateX: slideX }] }]}>
          {/* หัวเมนู */}
          {!!u.username && <Text style={styles.sideHeader}>{info.icon}  {u.username}</Text>}
          {u.userType ? (
            <Text style={styles.sideSub}>ผู้ใช้ประเภท: {info.label}</Text>
          ) : null}

          <View style={styles.separator} />

          {/* ✅ รายการแจ้งเตือน */}
          <TouchableOpacity style={styles.sideItem} onPress={goNotifications}>
            <Text style={styles.sideText}>รายการแจ้งเตือน</Text>
            {/* ✅ Badge แสดงจำนวน */}
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideItem} onPress={goMatchHistory}>
            <Text style={styles.sideText}>ประวัติการจับคู่</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sideItem} onPress={handleLogout}>
            <Text style={[styles.sideText, { color: '#ef4444' }]}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

const HEADER_HEIGHT = 56;

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0 },
  header: {
    height: HEADER_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff',
  },
  leftBox:  { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  rightBox: { width: 64, alignItems: 'flex-end',   justifyContent: 'center', position: 'relative' }, 
  title:    { flex: 1, fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#000' },
  rightText:{ fontSize: 14, fontWeight: 'bold', color: '#000' },
  burger:   { fontSize: 22, fontWeight: '700' },

  // overlay
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
  sideSheet: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + HEADER_HEIGHT : HEADER_HEIGHT,
    right: 0,
    width: SIDE_WIDTH,
    bottom: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  sideHeader: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sideSub:    { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  separator:  { height: StyleSheet.hairlineWidth, backgroundColor: '#eee', marginVertical: 8 },
  sideItem:   { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sideText:   { fontSize: 16, color: '#111' },

  // ✅ Styles สำหรับจุดแดงบน Hamburger Icon
  dotIndicator: {
    position: 'absolute',
    top: 10,  // ระยะห่างจากขอบบนของ Header
    right: 18, // ระยะห่างจากขอบขวาของ Header
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
  // Styles สำหรับ Badge ใน Modal
  badge: {
    backgroundColor: '#E53935',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default CustomHeader;