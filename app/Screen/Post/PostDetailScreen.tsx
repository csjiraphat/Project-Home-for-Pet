import React, {
  useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, Image, Alert, TouchableOpacity, Platform,
  StatusBar, TextInput, FlatList, ListRenderItem, ActivityIndicator, Dimensions, Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Video, ResizeMode } from 'expo-av';
import { useUser } from '../../../context/UserContext';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import API from '../../../android/app/src/config';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

dayjs.locale('th');

const PAGE_SIZE = 20;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ================= ส่วนที่แก้ไข 1: สร้าง Component สำหรับรูปภาพโดยเฉพาะ =================
const ImageCarousel = ({ media }: { media: string[] }) => {
  // ย้าย State และ Logic ที่เกี่ยวกับรูปภาพมาไว้ที่นี่
  const [activeIndex, setActiveIndex] = useState(0);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  if (!media || media.length === 0) {
    return null; // ไม่แสดงอะไรเลยถ้าไม่มีรูป
  }

  return (
    <>
      <FlatList
        data={media}
        keyExtractor={(uri, idx) => `${uri}-${idx}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToAlignment="center"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item: uri, index }) => {
          const low = uri.toLowerCase();
          const isVideo = low.endsWith('.mp4') || low.endsWith('.mov') || low.endsWith('.m4v') || low.endsWith('.webm');
          return (
            <View style={styles.carouselItem}>
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>{index + 1}/{media.length}</Text>
              </View>
              {isVideo ? (
                <Video
                  source={{ uri }}
                  style={styles.media}
                  resizeMode={ResizeMode.COVER}
                  useNativeControls
                  shouldPlay={false}
                  isLooping={false}
                />
              ) : (
                <Image source={{ uri }} style={styles.media} resizeMode="cover" />
              )}
            </View>
          );
        }}
      />
      {/* Component สำหรับแสดง Dots */}
      {media.length > 1 && (
        <View style={styles.paginationContainer}>
          {media.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                activeIndex === index && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </>
  );
};
// =================================================================================


type Post = {
  image: string[] | string;
  title: string;
  type: string;
  breed: string;
  sex: string;
  age?: string;
  min_age?: string;
  max_age?: string;
  color: string;
  steriliz: string;
  vaccine: string;
  personality: string;
  reason: string;
  adoptionTerms: string;
  user: string;
  postType: string; // 'fh' | 'fp'
  post_date: string;
  id: string | number;
  environment?: string;
  ageStartYear?: string;
  ageStartMonth?: string;
  ageEndYear?: string;
  ageEndMonth?: string;
};

type UserData = {
  id: string;
  username: string;
  email?: string;
  profilePicture?: string;
};

type RouteParams = { post: Post };

type RootStackParamList = {
  EditPost: { post: Post };
  PostDetail: { post: Post };
  UserProfile: { username: string };
  ChatRoomScreen: { selectedUsername: string };
  Login?: undefined;
  LoginScreen?: undefined;
};

type Reply = {
  id: number | string;
  parent_id?: number | string | null;
  username?: string;
  user?: string;
  name?: string;
  author?: string;
  content: string;
  created_at: string;
  profilePicture?: string;
  likes?: number;
  replies_count?: number;
};

type Comment = {
  id: number | string;
  parent_id?: number | string | null;
  username?: string;
  user?: string;
  name?: string;
  author?: string;
  content: string;
  created_at: string;
  likes: number;
  profilePicture?: string;
  replies_count?: number;
};

const formatThaiDate = (dateString: string) => {
  const date = dayjs(dateString);
  const buddhistYear = date.year() + 543;
  const thaiMonth = date.format('MMMM');
  const day = date.format('D');
  return `${day} ${thaiMonth} ${buddhistYear}`;
};
const formatPostType = (type: string) => (type === 'fh' ? 'หาบ้านให้น้อง' : type === 'fp' ? 'ต้องการอุปการะน้อง' : '-');
const formatSteriliz = (s: string) => {
  if (!s) return '-';
  const val = s.toLowerCase();
  if (val === 'yes' || val.includes('ทำหมันแล้ว')) return 'ทำหมันแล้ว';
  if (val === 'no' || val.includes('ยังไม่ได้ทำหมัน')) return 'ยังไม่ได้ทำหมัน';
  return s;
};
const formatType = (t: string) => {
  if (!t) return '-';
  const x = String(t).toLowerCase();
  if (['dog', 'หมา', 'สุนัข'].includes(x)) return 'สุนัข';
  if (['cat', 'แมว'].includes(x)) return 'แมว';
  return t;
};

const formatAge = (min?: string, max?: string, age?: string) => {
  if (age) return age;
  if (min && max) {
    if (min === max) return min; // same -> show single
    return `${min} – ${max}`;    // range with en dash
  }
  if (min) return `≥ ${min}`;
  if (max) return `≤ ${max}`;
  return '-';
};
const formatDateTime = (s: string) => dayjs(s).format('D MMM YYYY HH:mm น.');
const getDisplayName = (c: any): string => c?.username || c?.user || c?.name || c?.author || '';
const idKey = (v: { id: string | number }) => String(v?.id ?? '');
const uniqById = <T extends { id: any }>(arr: T[]): T[] => {
  const seen = new Set<string>(); const out: T[] = [];
  for (const x of arr || []) { const k = idKey(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
};

const PostDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useUser();

  const routeParams = route.params as any;

  const initialPost: Post = routeParams?.post || {
      id: routeParams?.postId || 0,
      postType: routeParams?.postType || '',
      title: 'กำลังโหลด', user: '', image: [],
      type: '', breed: '', sex: '', color: '', steriliz: '', vaccine: '',
      personality: '', reason: '', adoptionTerms: '', post_date: ''
  };

  const [post, setPost] = useState<Post>(initialPost);
  const [poster, setPoster] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const [expandedTop, setExpandedTop] = useState<Record<string, boolean>>({});
  const [childMap, setChildMap] = useState<Record<string, Reply[]>>({});
  const [parentMap, setParentMap] = useState<Record<string, string | null>>({});

  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [replyTo, setReplyTo] = useState<{ id: number | string; username: string } | null>(null);

  const listRef = useRef<FlatList>(null);
  const scrollExecutedRef = useRef(false);

  type ReasonItem = { reason_id: number; code: string; name_th?: string; name_en?: string; description?: string };
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReasons, setReportReasons] = useState<ReasonItem[]>([]);
  const [reportReasonId, setReportReasonId] = useState<number | null>(null);
  const [reportText, setReportText] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const postCtrlRef = useRef<AbortController | null>(null);
  const posterCtrlRef = useRef<AbortController | null>(null);
  const commentsCtrlRef = useRef<AbortController | null>(null);
  const repliesCtrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      postCtrlRef.current?.abort();
      posterCtrlRef.current?.abort();
      commentsCtrlRef.current?.abort();
      repliesCtrlRef.current?.abort();
    };
  }, []);

  const fetchPost = useCallback(async () => {
    if (!post.id || post.id === 0 || !post.postType) return;
    postCtrlRef.current?.abort();
    const ctrl = new AbortController();
    postCtrlRef.current = ctrl;
    try {
      setLoading(true);
      const endpoint = post.postType === 'fh' ? API.POST_FIND_HOME : API.POST_FIND_PET;
      const response = await fetch(`${endpoint}?id=${post.id}`, { signal: ctrl.signal });
      if (!response) {
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        return;
      }
      const text = await response.text();
      if (!text) return;

      const data = (() => {
        try { return JSON.parse(text); } 
        catch (e) { console.warn('Failed to parse JSON response:', e, 'Raw response:', text); return {}; }
      })();

      if (data && typeof data === 'object') {
        if (data.status === 'success' && data.post) setPost(data.post);
        else if (data.id) setPost(data as Post);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('โหลดโพสต์ล้มเหลว', err);
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลโพสต์ได้');
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [post.id, post.postType]);

  useEffect(() => {
    if (!loading && !post.id && initialPost.id === 0) {
        Alert.alert('ข้อผิดพลาด', 'ไม่พบข้อมูลโพสต์ที่ต้องการ');
    }
  }, [loading, post.id, initialPost.id]);

  const fetchPoster = useCallback(async () => {
    if (poster && poster.username === post.user) return;
    posterCtrlRef.current?.abort();
    const ctrl = new AbortController();
    posterCtrlRef.current = ctrl;
    try {
      const res = await fetch(`${API.USERS}?username=${encodeURIComponent(post.user)}`, { signal: ctrl.signal });
      const data = await res.json();
      const one = Array.isArray(data) ? data.find((u: any) => u.username === post.user) : (data?.user || data);
      setPoster(one || null);
    } catch {}
  }, [post.user, poster]);

  const buildCommentsUrl = useCallback((pageNum: number) => {
    const qs = new URLSearchParams({
      post_id: String(post.id), post_type: String(post.postType), limit: String(PAGE_SIZE), page: String(pageNum), offset: String((pageNum - 1) * PAGE_SIZE),
    });
    return `${API.COMMENTS_LIST}?${qs.toString()}`;
  }, [post.id, post.postType]);

  const mergeDedup = (prev: Comment[], next: Comment[]) => {
    const map = new Map<string, Comment>();
    for (const c of prev) map.set(idKey(c), c);
    for (const c of next) map.set(idKey(c), c);
    return Array.from(map.values());
  };

  const fetchCommentsPage = useCallback(async (pageNum: number, isRefresh = false) => {
    commentsCtrlRef.current?.abort();
    const ctrl = new AbortController();
    commentsCtrlRef.current = ctrl;
    try {
      if (isRefresh) setRefreshing(true);
      const res = await fetch(buildCommentsUrl(pageNum), { signal: ctrl.signal });
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch { json = { data: [] }; }
      const flat: any[] = json.comments || json.data || [];
      const total = json.total ?? null;

      const rootsMap = new Map<string, Comment>();
      const nextParent: Record<string, string | null> = isRefresh ? {} : { ...parentMap };
      const nextChild: Record<string, Reply[]> = isRefresh ? {} : { ...childMap };

      for (const row of flat) {
        const pid = row?.parent_id;
        const idStr = idKey(row);
        const parentStr = pid == null || pid === '' ? null : String(pid);
        if (parentStr == null) {
          rootsMap.set(idStr, row);
          nextParent[idStr] = null;
        } else {
          const current = nextChild[parentStr] || [];
          nextChild[parentStr] = uniqById<Reply>([...current, row as Reply]);
          nextParent[idStr] = parentStr;
        }
      }

      const roots = Array.from(rootsMap.values()).map((r) => ({ ...r, replies_count: (r.replies_count ?? (nextChild[idKey(r)]?.length || 0)) }));

      setChildMap(nextChild);
      setParentMap(nextParent);
      setTotalCount(total);
      setHasMore(flat.length >= PAGE_SIZE || (total ? pageNum * PAGE_SIZE < total : flat.length > 0));

      if (pageNum === 1) setComments(roots);
      else setComments((prev) => mergeDedup(prev, roots));
      setPage(pageNum + 1);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.warn('โหลดคอมเมนต์ไม่สำเร็จ', e);
        if (pageNum === 1) setComments([]);
        setHasMore(false);
      }
    } finally {
      if (isRefresh && !ctrl.signal.aborted) setRefreshing(false);
    }
  }, [buildCommentsUrl, parentMap, childMap]);

  const fetchDirectReplies = useCallback(async (commentId: string) => {
    repliesCtrlRef.current?.abort();
    const ctrl = new AbortController();
    repliesCtrlRef.current = ctrl;
    try {
      const res = await fetch(`${API.COMMENTS_REPLIES}?comment_id=${commentId}`, { signal: ctrl.signal });
      const text = await res.text();
      let json: any; try { json = JSON.parse(text); } catch { json = {}; }
      const replies: Reply[] = uniqById(json?.replies || json?.data || []);
      setChildMap(prev => {
        const merged = uniqById<Reply>([...(prev[commentId] || []), ...replies]);
        return { ...prev, [commentId]: merged };
      });
      setParentMap(prev => {
        const next = { ...prev };
        for (const r of replies) next[idKey(r)] = commentId;
        return next;
      });
      return replies;
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.warn('โหลด replies ไม่สำเร็จ', e);
      return [];
    }
  }, []);

  const fetchThread = useCallback(async (rootId: string, visited?: Set<string>) => {
    const seen = visited || new Set<string>();
    if (seen.has(rootId)) return;
    seen.add(rootId);
    const first = await fetchDirectReplies(rootId);
    for (const r of first) await fetchThread(idKey(r), seen);
  }, [fetchDirectReplies]);

  const getRootId = useCallback((anyId: string): string => {
    let cur = anyId; const guard = new Set<string>();
    while (true) {
      if (guard.has(cur)) break;
      guard.add(cur);
      const p = parentMap[cur];
      if (!p) return cur;
      cur = p;
    }
    return anyId;
  }, [parentMap]);

  const avatarUri = useMemo(() =>
    poster?.profilePicture ? `${API.PROFILE_PIC_PATH}/${poster.profilePicture}` : null,
  [poster?.profilePicture]);

  const goToLogin = useCallback(() => {
    try { navigation.navigate('Login' as any); }
    catch { try { navigation.navigate('LoginScreen' as any); } catch {} }
  }, [navigation]);

  const loadReportReasons = useCallback(async () => {
    try {
      const res = await fetch(API.REPORT_REASONS);
      const txt = await res.text();
      const json = (() => { try { return JSON.parse(txt); } catch { return {}; } })();
      const items = json.items || json.data || [];
      setReportReasons(items);
    } catch (e) {
      console.warn('โหลดเหตุผลรีพอร์ตไม่สำเร็จ', e);
    }
  }, []);

  const openReport = useCallback(() => {
    if (!user) { goToLogin(); return; }
    if (post.id === 0) return;
    setReportText('');
    setReportReasonId(null);
    setReportOpen(true);
    loadReportReasons();
  }, [user, goToLogin, loadReportReasons, post.id]);

  const submitReport = useCallback(async () => {
    if (!user || !user.id || !post || post.id === 0) return;
    if (!reportReasonId && reportText.trim() === '') {
      Alert.alert('ระบุเหตุผล', 'โปรดเลือกเหตุผลหรือพิมพ์เหตุผลเพิ่มเติม'); return;
    }
    try {
      setReportSubmitting(true);
      const form = new FormData();
      form.append('post_type', String(post.postType));
      form.append('post_id', String(post.id));
      form.append('reporter_id', String(user.id));
      if (reportReasonId) form.append('reason_id', String(reportReasonId));
      if (reportText.trim()) form.append('custom_reason', reportText.trim());

      const res = await fetch(API.REPORT_POST, { method: 'POST', body: form });
      const t = await res.text();
      const json = (() => { try { return JSON.parse(t); } catch { return { error: t }; } })();

      if (json.ok || json.success) {
        setReportOpen(false);
        Alert.alert('ขอบคุณครับ', 'เราได้รับรายงานโพสต์นี้แล้ว');
      } else {
        Alert.alert('ส่งรายงานไม่สำเร็จ', json.error || 'โปรดลองอีกครั้ง');
      }
    } catch (e) {
      console.error("Report submission failed:", e);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งรายงานได้');
    } finally {
      setReportSubmitting(false);
    }
  }, [user, post, reportReasonId, reportText]);

  useLayoutEffect(() => {
    if (!post.user || post.id === 0) return;
    navigation.setOptions({
      header: () => (
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="ย้อนกลับ">
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { username: post.user })} style={styles.headerUser} activeOpacity={0.8}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
              ) : (
                <Image source={require('../../../assets/placeholder.png')} style={styles.headerAvatar} />
              )}
              <Text style={styles.headerName}>{post.user}</Text>
            </TouchableOpacity>
          </View>
          {!user ? (
            <TouchableOpacity onPress={goToLogin} style={styles.loginBtn} activeOpacity={0.9}>
              <Text style={styles.loginText}>Login</Text>
            </TouchableOpacity>
          ) : user.username !== post.user ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => navigation.navigate('ChatRoomScreen', { selectedUsername: post.user })} style={styles.contactBtn} activeOpacity={0.9}>
                <Text style={styles.contactText}>ติดต่อ</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openReport} style={styles.reportBtn} activeOpacity={0.9}>
                <MaterialCommunityIcons name="flag-variant" size={22} color="#B91C1C" />
              </TouchableOpacity>
            </View>
          ) : ( <View style={{ width: 64 }} /> )}
        </View>
      ),
    });
  }, [navigation, user, post.user, post.id, avatarUri, goToLogin, openReport]);

  const mediaList = useMemo<string[]>(() => {
    try { return typeof post.image === 'string' ? JSON.parse(post.image) : post.image || []; } catch { return []; }
  }, [post.image]);

  const fullMediaList = useMemo<string[]>(() =>
    (mediaList || []).map((uri) => `${API.UPLOAD_PATH}${String(uri).replace(/^uploads[\\/]+/, '')}`),
  [mediaList]);

  const handleReplyPress = useCallback((comment: Comment | Reply) => {
    if (!user) { goToLogin(); return; }
    const name = getDisplayName(comment);
    setReplyTo({ id: comment.id, username: name });
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [user, goToLogin]);

  const handleSendComment = useCallback(async () => {
    if (!user) { goToLogin(); return; }
    const text = commentText.trim();
    if (!text) return;
    try {
      setSending(true);
      const form = new FormData();
      form.append('post_id', String(post.id));
      form.append('post_type', String(post.postType));
      form.append('content', text);
      form.append('username', user.username);
      if (replyTo) {
        form.append('parent_id', String(replyTo.id));
        form.append('reply_to', replyTo.username);
      }
      const res = await fetch(API.COMMENTS_CREATE, { method: 'POST', body: form });
      const respText = await res.text();
      const json = (() => { try { return JSON.parse(respText); } catch { return {}; } })();
      if (json?.status === 'success') {
        setCommentText('');
        if (replyTo) {
          const rid = String(replyTo.id);
          const root = comments.some(c => String(c.id) === rid) ? rid : getRootId(rid);
          setExpandedTop(prev => ({ ...prev, [root]: true }));
          await fetchThread(root);
        }
        setReplyTo(null);
        await fetchCommentsPage(1, true);
      } else {
        Alert.alert('ส่งคอมเมนต์ไม่สำเร็จ', json?.message || 'โปรดลองอีกครั้ง');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งคอมเมนต์ได้');
    } finally { setSending(false); }
  }, [user, commentText, post.id, post.postType, replyTo, fetchCommentsPage, goToLogin, fetchThread, comments, getRootId]);

  const endReachLockRef = useRef(false);
  const onEndReached = useCallback(async () => {
    if (endReachLockRef.current || loadingMore || !hasMore) return;
    endReachLockRef.current = true;
    setLoadingMore(true);
    await fetchCommentsPage(page, false);
    setLoadingMore(false);
    setTimeout(() => { endReachLockRef.current = false; }, 250);
  }, [loadingMore, hasMore, page, fetchCommentsPage]);
  
  const scrollToComment = useCallback(() => {
    const commentIdToScroll = route.params as any;
    const targetCommentId = commentIdToScroll?.commentIdToScroll;

    if (!targetCommentId || comments.length === 0 || !listRef.current || scrollExecutedRef.current) return;
    const targetRootId = getRootId(String(targetCommentId));
    const targetIndex = comments.findIndex(c => String(c.id) === targetRootId);

    if (targetIndex !== -1) {
        setExpandedTop(prev => ({ ...prev, [targetRootId]: true }));
        listRef.current.scrollToIndex({ index: targetIndex + 1, animated: true, viewPosition: 0.2 });
        scrollExecutedRef.current = true;
    }
  }, [comments, route.params, getRootId]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (initialPost.id) {
          fetchPost();
          fetchPoster();
          fetchCommentsPage(1, true);
          scrollExecutedRef.current = false;
      }
    });
    return unsub;
  }, [navigation, initialPost.id]);

  useEffect(() => {
      if (comments.length > 0 && !scrollExecutedRef.current) {
          const timer = setTimeout(scrollToComment, 100);
          return () => clearTimeout(timer);
      }
  }, [comments, scrollToComment]);

  const ListHeader = useMemo(() => () => (
    <View>
      {/* ================= ส่วนที่แก้ไข 2: ใช้ Component ImageCarousel ================= */}
      <ImageCarousel media={fullMediaList} />
      {/* ========================================================================= */}

      <View style={{ marginTop: 12 }}>
        <Text style={styles.title}>{post.title}</Text>
        {[
          { label: 'ประเภทสัตว์', value: formatType(post.type) },
          { label: 'สายพันธุ์', value: post.breed },
          { label: 'เพศ', value: post.sex },
          { label: 'อายุ', value: formatAge(post.min_age, post.max_age, post.age) },
          { label: 'สี', value: post.color },
          { label: 'การทำหมัน', value: formatSteriliz(post.steriliz) },
          { label: 'วัคซีน', value: post.vaccine },
          ...(post.postType === 'fp' ? [{ label: 'ประเภทที่อยู่อาศัย', value: post.environment }] : []),
          ...(post.postType === 'fh' ? [
            { label: 'นิสัย', value: post.personality },
            { label: 'เหตุผลในการหาบ้าน', value: post.reason },
            { label: 'เงื่อนไขในการรับเลี้ยง', value: post.adoptionTerms },
          ] : []),
          { label: 'โพสต์ประเภท', value: formatPostType(post.postType) },
          { label: 'วันที่โพสต์', value: formatThaiDate(post.post_date) },
        ].map((item, idx) => (
          <View key={idx} style={[styles.detailRow, { backgroundColor: idx % 2 === 0 ? '#EDEBFE' : '#ECEFFF' }]}>
            <Text style={styles.detailLabel}>{item.label}:</Text>
            <Text style={styles.detailValue}>{item.value || '-'}</Text>
          </View>
        ))}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={[styles.commentsHeader, { paddingHorizontal: 0 }]}>
            ความคิดเห็น ({totalCount ?? comments.length})
          </Text>
        </View>
      </View>
    </View>
  ), [fullMediaList, post, comments.length, totalCount]); // ลบ activeIndex ออกจาก dependency array

  const renderNested = useCallback((parentId: string, depth: number = 1): React.ReactNode => {
    const children = childMap[parentId] || [];
    const pad = Math.min(depth * 14, 56);
    return children.map((r) => {
      const rid = idKey(r);
      const grandchildren = childMap[rid] || [];
      return (
        <View key={`${parentId}-r-${rid}`}>
          <View style={[styles.replyRow, { paddingLeft: pad }]}>
            {r.profilePicture ? (
              <Image source={{ uri: `${API.PROFILE_PIC_PATH}/${r.profilePicture}` }} style={styles.replyAvatar} />
            ) : (
              <View style={[styles.replyAvatar, { backgroundColor: '#E5E7EB' }]} />
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.replyHeader}>
                <Text style={styles.replyName}>{getDisplayName(r)}</Text>
                <Text style={styles.replyTime}> • {formatDateTime(r.created_at)}</Text>
              </Text>
              <Text style={styles.replyContent}>{r.content}</Text>
              <View style={styles.replyActionsRow}>
                {user ? ( <TouchableOpacity onPress={() => handleReplyPress(r as any)} style={styles.actionBtn}><Text style={styles.actionText}>ตอบกลับ</Text></TouchableOpacity>
                ) : ( <TouchableOpacity onPress={goToLogin} style={styles.loginHintBtn}><Text style={styles.loginHintText}>ล็อคอินเพื่อตอบกลับ</Text></TouchableOpacity> )}
              </View>
              {grandchildren.length > 0 && <View>{renderNested(rid, depth + 1)}</View>}
            </View>
          </View>
        </View>
      );
    });
  }, [childMap, user, handleReplyPress, goToLogin]);

  const renderComment: ListRenderItem<Comment> = useCallback(({ item, index }) => {
    const alt = index % 2 === 0 ? '#EDEBFE' : '#ECEFFF';
    const avatar = item.profilePicture ? `${API.PROFILE_PIC_PATH}/${item.profilePicture}` : undefined;
    const idStr = idKey(item);
    const isOpen = !!expandedTop[idStr];
    const rc = (item.replies_count ?? (childMap[idStr]?.length || 0));
    const displayName = getDisplayName(item);
    return (
      <View style={[styles.commentCard, { backgroundColor: alt }]}>
        <View style={styles.commentHeader}>
          {avatar ? ( <Image source={{ uri: avatar }} style={styles.commentAvatar} /> ) : ( <View style={[styles.commentAvatar, { backgroundColor: '#E5E7EB' }]} /> )}
          <View style={{ flex: 1 }}>
            <Text style={styles.commentName}>{displayName}</Text>
            <Text style={styles.commentTime}>{formatDateTime(item.created_at)}</Text>
          </View>
        </View>
        <Text style={styles.commentContent}>{item.content}</Text>
        <View style={styles.commentActions}>
          <View style={{ flex: 1 }} />
          {user ? ( <TouchableOpacity onPress={() => handleReplyPress(item)} style={styles.actionBtn}><Text style={styles.actionText}>ตอบกลับ</Text></TouchableOpacity>
          ) : ( <TouchableOpacity onPress={goToLogin} style={styles.loginHintBtn}><Text style={styles.loginHintText}>ล็อคอินเพื่อตอบกลับ</Text></TouchableOpacity> )}
        </View>
        {!!rc && !isOpen ? (
          <TouchableOpacity onPress={async () => { setExpandedTop(prev => ({ ...prev, [idStr]: true })); await fetchThread(idStr); }} style={styles.viewRepliesBar} activeOpacity={0.9}>
            <Text style={styles.chev}>▾</Text><Text style={styles.viewRepliesText}>ดู {rc} ความเห็นย่อย</Text><Text style={styles.chev}>▾</Text>
          </TouchableOpacity>
        ) : !!rc && (
          <TouchableOpacity onPress={() => setExpandedTop(prev => ({ ...prev, [idStr]: false }))} style={[styles.viewRepliesBar, styles.viewRepliesBarOpen]} activeOpacity={0.9}>
            <Text style={styles.chev}>▴</Text><Text style={styles.viewRepliesText}>ซ่อนความเห็นย่อย</Text><Text style={styles.chev}>▴</Text>
          </TouchableOpacity>
        )}
        {isOpen && <View>{renderNested(idStr, 1)}</View>}
      </View>
    );
  }, [expandedTop, user, handleReplyPress, goToLogin, fetchThread, childMap, renderNested]);

  const ListFooter = useCallback(() => (
    <View style={{ paddingVertical: 16 }}>
      {loadingMore ? <ActivityIndicator /> : !hasMore ? (comments.length > 0 ? <Text style={{ textAlign: 'center', color: '#6B7280' }}>— ไม่มีคอมเมนต์เพิ่มเติม —</Text> : null) : null}
    </View>
  ), [loadingMore, hasMore, comments.length]);

  return (
    <View style={styles.container}>
      {loading && ( <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#3C2C91" /><Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text></View> )}
      <FlatList ref={listRef} data={comments} keyExtractor={(c, idx) => `c-${idKey(c)}-${idx}`} renderItem={renderComment} ListHeaderComponent={ListHeader} ListFooterComponent={ListFooter} contentContainerStyle={{ paddingBottom: 120 }} refreshing={refreshing} onRefresh={() => fetchCommentsPage(1, true)} onEndReached={onEndReached} onEndReachedThreshold={0.3} initialNumToRender={6} windowSize={9} maxToRenderPerBatch={6} updateCellsBatchingPeriod={50} removeClippedSubviews showsVerticalScrollIndicator={false} />
      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>รายงานโพสต์นี้</Text>
            <Text style={styles.modalLabel}>เหตุผล</Text>
            <View style={styles.pillWrap}>
              {reportReasons.map((r) => {
                const active = reportReasonId === Number(r.reason_id);
                return (
                  <TouchableOpacity key={String(r.reason_id)} style={[styles.pill, active && styles.pillActive]} onPress={() => setReportReasonId(Number(r.reason_id))} activeOpacity={0.8}>
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{r.name_th || r.name_en || r.code}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.modalLabel, { marginTop: 8 }]}>รายละเอียดเพิ่มเติม (ไม่บังคับ)</Text>
            <TextInput value={reportText} onChangeText={setReportText} placeholder="อธิบายสั้น ๆ" style={styles.modalInput} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setReportOpen(false)} style={[styles.modalBtn, styles.modalCancel]}><Text style={styles.modalCancelText}>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitReport} style={[styles.modalBtn, styles.modalSubmit]} disabled={reportSubmitting || (!reportReasonId && reportText.trim() === '')}>
                <Text style={styles.modalSubmitText}>{reportSubmitting ? 'กำลังส่ง…' : 'ส่งรายงาน'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {user ? (
        <View style={styles.bottomBar}>
          <View style={styles.inputWrapper}>
            {replyTo && (
              <View style={styles.replyingTo}>
                <Text style={styles.replyingText}>กำลังตอบกลับ <Text style={styles.replyTag}>@{replyTo.username}</Text></Text>
                <TouchableOpacity onPress={() => setReplyTo(null)}><Text style={styles.cancelReply}>ยกเลิก</Text></TouchableOpacity>
              </View>
            )}
            <TextInput ref={inputRef} style={styles.input} placeholder="เขียนความคิดเห็น..." placeholderTextColor="#9CA3AF" value={commentText} onChangeText={setCommentText} multiline />
          </View>
          <TouchableOpacity style={[styles.sendBtn, sending || !commentText.trim() ? { opacity: 0.6 } : null]} onPress={handleSendComment} disabled={sending || !commentText.trim()}>
            <Text style={styles.sendText}>{sending ? 'กำลังส่ง…' : 'ส่ง'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const HEADER_HEIGHT = 56 + (Platform.OS === 'android' ? 0 : 0);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  loadingText: { marginTop: 12, color: '#3C2C91', fontWeight: '600' },
  carouselItem: { width: SCREEN_WIDTH, height: 260, justifyContent: 'center', alignItems: 'center' },
  media: { width: SCREEN_WIDTH - 32, height: 260, borderRadius: 10, overflow: 'hidden' },
  counterBadge: { position: 'absolute', top: 18, right: 24, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, zIndex: 10 },
  counterText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  // ================= ส่วนที่แก้ไข 3: เพิ่ม Style สำหรับ Dots =================
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB', // สีเทาสำหรับ dot ที่ไม่ถูกเลือก
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#4F46E5', // สีม่วงสำหรับ dot ที่ถูกเลือก
  },
  // =====================================================================
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 16, paddingHorizontal: 16 },
  detailRow: { padding: 12, borderRadius: 12, marginBottom: 10, marginHorizontal: 16 },
  detailLabel: { fontWeight: 'bold', color: '#C09E00' },
  detailValue: { color: '#111827' },
  headerContainer: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0, height: HEADER_HEIGHT + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0), backgroundColor: '#ffffff', borderBottomColor: '#E5E7EB', borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 8, marginRight: 4 },
  backIcon: { fontSize: 28, lineHeight: 28, color: '#111827' },
  headerUser: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 34, height: 34, borderRadius: 17, marginLeft: 4, marginRight: 10, backgroundColor: '#EEE' },
  headerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  contactBtn: { backgroundColor: '#FFE066', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  contactText: { color: '#111827', fontWeight: '700' },
  loginBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  loginText: { color: '#111827', fontWeight: '700' },
  reportBtn: { backgroundColor: '#FEE2E2', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  commentsHeader: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 8, marginBottom: 8 },
  commentCard: { borderRadius: 12, padding: 12, marginHorizontal: 16, marginBottom: 8 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14 },
  commentName: { fontWeight: '700', color: '#111827' },
  commentTime: { color: '#6B7280', fontSize: 12 },
  commentContent: { color: '#111827', marginTop: 2 },
  commentActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  likeCount: { color: '#6B7280', marginRight: 8 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionText: { color: '#2563EB', fontWeight: '700' },
  viewRepliesBar: { marginTop: 10, alignSelf: 'stretch', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#EDEBFE', borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewRepliesBarOpen: { backgroundColor: '#ECEFFF' },
  chev: { color: '#6B7280', fontSize: 14 },
  viewRepliesText: { color: '#4F46E5', fontWeight: '700', fontSize: 14 },
  replyRow: { flexDirection: 'row', paddingTop: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  replyAvatar: { width: 22, height: 22, borderRadius: 11, marginTop: 2, marginRight: 10 },
  replyHeader: { marginBottom: 2 },
  replyName: { fontWeight: '700', color: '#111827' },
  replyTime: { color: '#6B7280', fontSize: 12 },
  replyContent: { color: '#111827' },
  replyActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  inputWrapper: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8, paddingHorizontal: 12, paddingVertical: 6 },
  replyingTo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  replyingText: { color: '#6B7280', fontSize: 12 },
  replyTag: { color: '#111827', fontWeight: '700' },
  cancelReply: { color: '#EF4444', fontWeight: '700', fontSize: 12 },
  input: { minHeight: 36, maxHeight: 100, fontSize: 14, color: '#111827' },
  sendBtn: { backgroundColor: '#34D399', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  sendText: { color: '#ffffff', fontWeight: '700' },
  loginHintBtn: { marginLeft: 'auto', paddingVertical: 6, paddingHorizontal: 8 },
  loginHintText: { color: '#9CA3AF', fontStyle: 'italic' },
  modalBackdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' },
  modalCard: { backgroundColor:'#fff', borderTopLeftRadius:16, borderTopRightRadius:16, padding:16 },
  modalTitle: { fontSize:18, fontWeight:'700', color:'#111827', marginBottom:8 },
  modalLabel: { fontWeight:'700', color:'#4B5563', marginBottom:6 },
  pillWrap: { flexDirection:'row', flexWrap:'wrap' },
  pill: { paddingHorizontal:12, paddingVertical:6, borderRadius:999, borderWidth:1, borderColor:'#E5E7EB', backgroundColor:'#F9FAFB', marginRight:8, marginBottom:8 },
  pillActive: { backgroundColor:'#FEF3C7', borderColor:'#F59E0B' },
  pillText: { color:'#374151' },
  pillTextActive: { fontWeight:'700', color:'#92400E' },
  modalInput: { minHeight:60, borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, padding:10, backgroundColor:'#F9FAFB', color:'#111827' },
  modalActions: { flexDirection:'row', justifyContent:'flex-end', marginTop:12 },
  modalBtn: { paddingHorizontal:14, paddingVertical:10, borderRadius:10, marginLeft:8 },
  modalCancel: { backgroundColor:'#F3F4F6' },
  modalSubmit: { backgroundColor:'#34D399' },
  modalCancelText: { color:'#111827', fontWeight:'700' },
  modalSubmitText: { color:'#fff', fontWeight:'700' },
});

export default PostDetailScreen;