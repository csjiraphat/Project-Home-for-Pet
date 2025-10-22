// app/Screen/Match/MatchHistory.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl,
  StyleSheet, SafeAreaView, Alert, Image, LayoutAnimation, UIManager, Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video, ResizeMode } from 'expo-av';
import API from '../../../android/app/src/config';

type RootParams = {
  MatchHistory: { type?: 'fh' | 'fp'; sourceId?: number; title?: string };
};

type Row = {
  id: number;
  left_type: 'fh' | 'fp'; left_id: number; right_type: 'fh' | 'fp'; right_id: number;
  score: number; created_at: string;

  left_title?: string; left_user?: string;
  left_type_detail?: string; left_breed?: string; left_sex?: string;
  left_age?: string; left_image?: string | null; left_post_date?: string;

  right_title?: string; right_user?: string; right_pet_type?: string; right_breed?: string; right_sex?: string; right_color?: string;

  match_percent?: number; percent?: number; percentage?: number; percent_text?: string;
};

const BASE_URL = (API as any).BASE_URL || '';
const UPLOAD_PATH: string = ((API as any).UPLOAD_PATH || `${BASE_URL}/`).replace(/([^/])$/, '$1/');
const GET_MATCH_HISTORY = (API as any).GET_MATCH_HISTORY || `${BASE_URL}/post/get_match_history.php`;
const ROUTE_POST_DETAIL = (API as any).ROUTE_POST_DETAIL || 'PostDetail';
const ROUTE_CHAT = (API as any).ROUTE_CHAT || 'ChatRoomScreen';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const parseMediaList = (image?: string[] | string): string[] => {
  if (!image) return [];
  if (Array.isArray(image)) return image;
  try {
    const j = JSON.parse(image as string);
    if (Array.isArray(j)) return j.filter(Boolean);
    if (typeof j === 'string') return j ? [j] : [];
    return [];
  } catch {

    return String(image)
      .split(/[,|]/)
      .map(s => s.trim())
      .filter(Boolean);
  }
};

const toFullUri = (raw?: string) => {
  if (!raw) return undefined;
  let p = String(raw).trim().replace(/\\/g, '/');


  if (/^https?:\/\//i.test(p)) return p;


  p = p.replace(/^\/+/, '').replace(/^(\.\/|\.\.\/)+/, '').replace(/^db_fhomepet\//i, '');


  if (!/^uploads\//i.test(p)) p = `uploads/${p}`;


  const base = ((API as any).UPLOAD_PATH || UPLOAD_PATH).replace(/([^/])$/, '$1/');
  return base + p.replace(/^uploads[\\/]+/i, '');
};

const isVideo = (u?: string) =>
  !!u && /\.(mp4|mov|m4v|webm)$/i.test((u.split('?')[0] || ''));


const pct = (r: Partial<Row>) =>
  Number(r.percent ?? r.match_percent ?? r.percentage ?? Math.round(Number(r.score ?? 0))) || 0;
const metaJoin = (list: (string | undefined | false)[]) => list.filter(Boolean).join(' · ');
const timeText = (iso?: string) => iso ? new Date(iso.replace(' ', 'T')).toLocaleString() : '';

type Post = {
  id?: string | number; postType?: 'fh' | 'fp' | string; title?: string; type?: string; breed?: string;
  sex?: string; color?: string; age?: string; min_age?: string; max_age?: string;
  image?: string[] | string; post_date?: string; user?: string;
  _thumbUri?: string; _isVideo?: boolean;
};
const buildPostForDetailFromLeft = (g: {
  left_id: number; left_title?: string; left_type_detail?: string; left_breed?: string;
  left_age?: string; left_image?: string | null; left_post_type: 'fh' | 'fp'; left_user?: string; left_post_date?: string;
}): { post: Post } => {
  const post: Post = {
    id: g.left_id,
    postType: g.left_post_type,
    title: g.left_title,
    type: g.left_type_detail,
    breed: g.left_breed,
    age: g.left_age,
    user: g.left_user,
    post_date: g.left_post_date,
  };
  if (g.left_post_type === 'fh') {
    post.image = g.left_image ?? '[]';
    const first = parseMediaList(post.image)[0];
    post._thumbUri = toFullUri(first);
    post._isVideo = isVideo(post._thumbUri);
  }
  return { post };
};
const buildPostForDetailFromRight = (r: Row): { post: Post } => {
  const post: Post = {
    id: r.right_id,
    postType: r.right_type,
    title: r.right_title,
    user: r.right_user,
    type: r.right_pet_type,
    breed: r.right_breed,
    sex: r.right_sex,
    color: r.right_color,
  };
  return { post };
};

export default function MatchHistory() {
  const navigation: any = useNavigation();
  const { params } = useRoute<RouteProp<RootParams, 'MatchHistory'>>();

  const [username, setUsername] = useState<string>('');
  const [type, setType] = useState<'fh' | 'fp'>(params?.type || 'fp');
  const [sourceId, setSourceId] = useState<number>(params?.sourceId || 0);
  const [titleParam] = useState<string | undefined>(params?.title);
  const [rows, setRows] = useState<Row[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await AsyncStorage.getItem('username');
      const t = await AsyncStorage.getItem('userType');
      if (u) setUsername(u);

      if (!params?.type && t) {
        const tt = (t || '').toLowerCase();
        if (tt.includes('fh') || tt.includes('หาบ้าน')) setType('fh');
        else if (tt.includes('fp') || tt.includes('รับเลี้ยง') || tt.includes('หาสัตว์')) setType('fp');
      }
    })();
  }, [params?.type]);

  const headerTitle = useMemo(
    () => titleParam ? `ประวัติการจับคู่: ${titleParam}` : 'ประวัติการจับคู่',
    [titleParam]
  );

  async function fetchJSON(url: string) {
    const res = await fetch(url);
    const txt = await res.text();
    try { return { ok: res.ok, json: JSON.parse(txt) }; }
    catch { throw new Error(`Non-JSON response (${res.status})\n` + txt.slice(0, 600)); }
  }

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const url = `${GET_MATCH_HISTORY}?type=${encodeURIComponent(type)}&id=${sourceId || 0}&viewer=${encodeURIComponent(username)}&limit=300`;
      const { json } = await fetchJSON(url);
      if (json?.status === 'success') {
        setRows(Array.isArray(json.data) ? json.data : []);
        if (sourceId) setExpanded({ [sourceId]: true });

        const data: Row[] = Array.isArray(json.data) ? json.data : [];
        if (data.length > 0) {
          const count: Record<'fh' | 'fp', number> = { fh: 0, fp: 0 } as any;
          for (const r of data) count[r.left_type] = (count[r.left_type] || 0) + 1;
          const inferred: 'fh' | 'fp' = (count.fh >= count.fp ? 'fh' : 'fp');
          if (inferred !== type) setType(inferred);
        }
      } else {
        Alert.alert('ผิดพลาด', json?.message || 'โหลดข้อมูลไม่ได้');
      }
    } catch (e: any) {
      Alert.alert('ผิดพลาด', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [type, sourceId, username]);

  useEffect(() => { if (username) load(); }, [username, type, sourceId, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  const groups = useMemo(() => {
    const m = new Map<number, {
      left_id: number; left_title?: string; left_type_detail?: string; left_breed?: string; left_age?: string;
      left_image?: string | null; left_user?: string; left_post_date?: string; left_post_type: 'fh' | 'fp';
      data: Row[];
    }>();
    for (const r of rows) {
      const g = m.get(r.left_id) || {
        left_id: r.left_id,
        left_title: r.left_title,
        left_type_detail: r.left_type_detail,
        left_breed: r.left_breed,
        left_age: r.left_age,
        left_image: r.left_image,
        left_user: r.left_user,
        left_post_date: r.left_post_date,
        left_post_type: r.left_type,
        data: []
      };
      g.data.push(r);
      m.set(r.left_id, g);
    }
    return Array.from(m.values());
  }, [rows]);

  const toggleExpand = (leftId: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => ({ ...prev, [leftId]: !prev[leftId] }));
  };

  const goPostDetailLeft = (g: (typeof groups)[number]) => {
    navigation.navigate(ROUTE_POST_DETAIL, buildPostForDetailFromLeft(g));
  };
  const goPostDetailRight = (r: Row) => {
    navigation.navigate(ROUTE_POST_DETAIL, buildPostForDetailFromRight(r));
  };
  const goChat = (r: Row) => {
    if (!r.right_user) {
      Alert.alert('ไม่พบข้อมูลผู้ใช้', 'ไม่สามารถเริ่มแชทได้เนื่องจากไม่พบชื่อผู้ใช้ของอีกฝ่าย');
      return;
    }
    try {
      navigation.navigate(ROUTE_CHAT, { selectedUsername: r.right_user });
    }
    catch (e: any) {
      console.error("Navigation to chat failed:", e);
      Alert.alert('ไปหน้าแชทไม่ได้', `ไม่สามารถเปิดหน้าแชทได้ (route: ${ROUTE_CHAT})`);
    }
  };

  const MatchRow = ({ r }: { r: Row }) => (
    <View style={styles.matchRow}>
      <Text style={styles.matchTitle} numberOfLines={1}>{r.right_title || `โพสต์ #${r.right_id}`}</Text>
      <Text style={styles.matchPercent}>{pct(r)}%</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        <TouchableOpacity style={styles.btnOutline} onPress={() => goPostDetailRight(r)}>
          <Text style={styles.btnOutlineText}>รายละเอียด</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSolid} onPress={() => goChat(r)}>
          <Text style={styles.btnSolidText}>แชท</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGroup = ({ item: g }: { item: (typeof groups)[number] }) => {

    const arr = g.left_post_type === 'fh' ? parseMediaList(g.left_image || undefined) : [];
    const firstMedia = arr[0];
    const mediaUri = firstMedia ? toFullUri(firstMedia) : undefined;
    const mediaIsVideo = isVideo(mediaUri);


    const isOpen = !!expanded[g.left_id];
    const meta = metaJoin([
      g.left_type_detail && `ประเภท: ${g.left_type_detail}`,
      g.left_breed && `สายพันธุ์: ${g.left_breed}`,
      g.left_age && `อายุ: ${g.left_age}`
    ]);

    return (
      <View style={styles.card}>
        <TouchableOpacity activeOpacity={0.9} style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => goPostDetailLeft(g)}>
          {mediaUri ? (
            <View style={styles.thumbWrap}>
              {mediaIsVideo ? (
                <Video source={{ uri: mediaUri }} style={styles.thumb} resizeMode={ResizeMode.COVER} shouldPlay={false} isMuted />
              ) : (
                <Image source={{ uri: mediaUri }} style={styles.thumb} resizeMode="cover" />
              )}
            </View>
          ) : null}

          <View style={[{ flex: 1 }, mediaUri ? { marginLeft: 10 } : null]}>
            <Text style={styles.cardTitle} numberOfLines={1}>{g.left_title || `โพสต์ของฉัน #${g.left_id}`}</Text>
            <Text style={styles.cardMeta} numberOfLines={2}>{meta}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={styles.cardUser}>{g.left_user || '-'}</Text>
              <Text style={styles.cardTime}>{timeText(g.left_post_date || '')}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <Text style={{ color: '#64748B' }}>จับคู่แล้ว {g.data.length} รายการ</Text>
          <TouchableOpacity style={styles.btnShow} onPress={() => toggleExpand(g.left_id)}>
            <Text style={styles.btnShowText}>{isOpen ? 'ซ่อนรายการ' : 'ดูการจับคู่'}</Text>
          </TouchableOpacity>
        </View>

        {isOpen && (
          <View style={styles.matchesBox}>
            {g.data.map(r => <MatchRow key={r.id} r={r} />)}
          </View>
        )}
      </View>
    );
  };

  const typeLabel = type === 'fh' ? 'FH (หาบ้าน)' : 'FP (หาสัตว์เลี้ยง)';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <Text style={styles.headerSub}>
          {typeLabel} • {sourceId ? `โพสต์ #${sourceId}` : `ผู้ใช้: ${username || '-'}`}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 6, color: '#667085' }}>กำลังโหลด…</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => String(g.left_id)}
          renderItem={renderGroup}
          contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 40 }}><Text>ยังไม่มีประวัติ</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEF2FF', backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1f2a56' },
  headerSub: { marginTop: 2, color: '#667085' },

  card: { backgroundColor: '#F8FAFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E5E7FF' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  cardMeta: { color: '#344054', marginTop: 2 },
  cardUser: { color: '#6B7280', fontSize: 12 },
  cardTime: { color: '#6B7280', fontSize: 12 },

  thumbWrap: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden', backgroundColor: '#e5e7eb', marginRight: 10 },
  thumb: { width: '100%', height: '100%', borderRadius: 12 },

  btnShow: { backgroundColor: '#E0F2FE', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
  btnShowText: { color: '#0369A1', fontWeight: '700' },

  matchesBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#E5E7FF', paddingTop: 10 },
  matchRow: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7FF', borderRadius: 12, padding: 10, marginTop: 8 },
  matchTitle: { fontWeight: '700', color: '#111827', flex: 1 },
  matchPercent: { fontWeight: '800', color: '#0ea5e9', position: 'absolute', right: 10, top: 10 },

  btnOutline: { borderWidth: 1, borderColor: '#CBD5FF', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  btnOutlineText: { color: '#1f2a56', fontWeight: '700' },
  btnSolid: { backgroundColor: '#10b981', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  btnSolidText: { color: '#fff', fontWeight: '800' },
});