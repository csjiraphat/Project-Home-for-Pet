// app/Screen/Post/PostListScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator,
  FlatList, Image, RefreshControl, TextInput
} from 'react-native';
import type { ViewToken } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Video, ResizeMode } from 'expo-av';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/th';
import API from '../../../android/app/src/config';
import BottomBar from '../../../components/BottomBar';

dayjs.extend(relativeTime);
dayjs.locale('th');

type Post = {
  id?: string | number;
  _id?: string | number;
  post_id?: string | number;
  uuid?: string;
  listId?: string;
  title?: string;
  breed?: string;
  postType?: 'fh' | 'fp' | string;
  type?: string;
  age?: string;
  min_age?: string;
  max_age?: string;
  sex?: string;
  color?: string;
  steriliz?: string;
  image?: string[] | string;
  post_date?: string;
  user?: string;
  author?: string; ownerName?: string; userName?: string; createdBy?: string;
  commentsCount?: number; comment_count?: number; com_count?: number; totalComments?: number;

  _thumbUri?: string;
  _isVideo?: boolean;
  _timeAgo?: string;
};

type RouteParams = { filterType?: 'fh' | 'fp' | string[] | 'all' };
type RootStackParamList = { PostDetail: { post: Post } };

const formatAnimalType = (type?: string) => {
  if (!type) return 'ไม่ระบุประเภท';
  const t = (type || '').trim().toLowerCase();
  if (['dog', 'หมา', 'สุนัข'].includes(t)) return 'สุนัข';
  if (['cat', 'แมว'].includes(t)) return 'แมว';
  return type;
};
const getAgeDisplay = (p: Post) => p.age || (p.min_age || '-') + ' - ' + (p.max_age || '-');
const parseMediaList = (image?: string[] | string): string[] => {
  try {
    if (!image) return [];
    if (Array.isArray(image)) return image;
    const j = JSON.parse(image as string);
    if (Array.isArray(j)) return j as string[];
    if (typeof j === 'string') return [j];
    return [];
  } catch { return typeof image === 'string' ? [image as string] : []; }
};
const toFullUri = (raw: string) => `${API.UPLOAD_PATH}${(raw || '').replace(/^uploads[\\/]+/, '')}`;
const isVideo = (u: string) => /\.mp4$/i.test((u || '').split('?')[0]);
const postTypeEmoji = (t?: string) => (t || '').toLowerCase() === 'fh' ? '🏠' : '🤝';
const getAuthorName = (p: Post) => p.user || p.ownerName || p.userName || p.author || p.createdBy || 'ไม่ระบุผู้โพสต์';
const getCommentCountFromPost = (p: Post) => p.commentsCount ?? p.comment_count ?? p.com_count ?? p.totalComments ?? 0;

const COUNT_REPLIES_TOO = true;
async function fetchCommentCount(postId: string | number, postType: string, signal?: AbortSignal) {
  if (!API.COMMENTS_LIST) return null;
  const body = new URLSearchParams({
    postType, post_type: postType,
    postId: String(postId), post_id: String(postId),
    only: 'count'
  });
  try {
    const res = await fetch(API.COMMENTS_LIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal,
    });
    const data = await res.json();
    if (Array.isArray(data)) return COUNT_REPLIES_TOO ? data.length : data.filter((x: any) => !x?.parent_id).length;
    const n = Number(data?.count ?? data?.total);
    if (!Number.isNaN(n)) return n;
  } catch { }
  try {
    const res = await fetch(`${API.COMMENTS_LIST}?${body.toString()}`, { signal });
    const data = await res.json();
    if (Array.isArray(data)) return COUNT_REPLIES_TOO ? data.length : data.filter((x: any) => !x?.parent_id).length;
    const n = Number(data?.count ?? data?.total);
    if (!Number.isNaN(n)) return n;
  } catch { }
  return null;
}

const getStableId = (p: Post) =>
  String(p.id ?? p._id ?? p.post_id ?? p.uuid ?? `${p.title || 'untitled'}-${p.post_date || ''}`);

const buildListId = (p: Partial<Post>) =>
  `${String((p.postType || 'x').toLowerCase())}${String(getStableId(p as Post))}`;

const normalize = (s?: string) => (s || '').toString().trim().toLowerCase();

const thToSpecies = (raw: string) => {
  const s = raw.toLowerCase();
  if (/(หมา|สุนัข|dog)/.test(s)) return 'dog';
  if (/(แมว|cat)/.test(s)) return 'cat';
  return null;
};

const thToSex = (raw: string) => {
  const s = raw.toLowerCase();
  if (/(ผู้|ตัวผู้|male)/.test(s)) return 'male';
  if (/(เมีย|ตัวเมีย|female)/.test(s)) return 'female';
  return null;
};

const thToSteriliz = (raw: string) => {
  const s = raw.toLowerCase();
  if (/(ทำหมันแล้ว|ทำหมัน|yes|ผ่านการทำหมัน)/.test(s)) return 'yes';
  if (/(ยังไม่ได้ทำหมัน|no)/.test(s)) return 'no';
  return null;
};

const COLOR_WORDS = ['ดำ', 'ขาว', 'เทา', 'น้ำตาล', 'ส้ม', 'ครีม', 'ทอง', 'ดํา', 'ดํา-ขาว', 'ขาวดำ', 'ดำ-ขาว', 'ลายเสือ', 'ขาวส้ม', 'ส้มขาว', 'ดำเทา', 'ดําเทา'];
const extractColors = (s: string) => {
  const hits: string[] = [];
  for (const c of COLOR_WORDS) if (s.includes(c)) hits.push(c);
  return hits;
};

const KNOWN_BREEDS = [

  'ชิสุ', 'ชิห์สุ', 'shih tzu',
  'พุดเดิ้ล', 'poodle',
  'พิทบูล', 'pitbull', 'pit bull',
  'ไทยหลังอาน', 'thai ridgeback',
  'โกลเด้น', 'golden',
  'ลาบราดอร์', 'labrador', 'lab',

  'เปอร์เซีย', 'persian',
  'วิเชียรมาศ', 'siamese',
  'สก็อตติชโฟลด์', 'scottish fold',
];
const extractBreeds = (s: string) => {
  const lower = s.toLowerCase();
  const hits: string[] = [];
  for (const b of KNOWN_BREEDS) {
    if (lower.includes(b)) hits.push(b);
  }
  return Array.from(new Set(hits));
};
const fieldHasBreed = (p: { breed?: string; title?: string }, want: string[]) => {
  const breed = (p.breed || '').toLowerCase();
  const title = (p.title || '').toLowerCase();
  return want.some(b => breed.includes(b) || title.includes(b));
};

const parseAgeStringToMonths = (s?: string) => {

  const str = (s || '').toString().trim().toLowerCase();
  const mY = str.match(/(\d+)\s*ปี/);
  const mM = str.match(/(\d+)\s*เดือน/);
  const years = mY ? parseInt(mY[1], 10) : 0;
  const months = mM ? parseInt(mM[1], 10) : (mY && !mM ? 0 : NaN);
  if (Number.isNaN(months) && Number.isNaN(years)) return null;
  return years * 12 + (Number.isNaN(months) ? 0 : months);
};

const getPostAgeTargetMonths = (p: Post): { exact?: number, min?: number, max?: number } => {
  const exact = parseAgeStringToMonths(p.age);
  const min = parseAgeStringToMonths(p.min_age);
  const max = parseAgeStringToMonths(p.max_age);
  return { exact: exact ?? undefined, min: min ?? undefined, max: max ?? undefined };
};

type ParsedQuery = {
  species?: 'dog' | 'cat';
  sex?: 'male' | 'female';
  steriliz?: 'yes' | 'no';
  ageMonths?: number;
  colors: string[];
  breeds: string[];
  terms: string[];
};

const parseQuery = (q: string): ParsedQuery => {
  const s = q.trim().toLowerCase();
  const species = thToSpecies(s) || undefined;
  const sex = thToSex(s) || undefined;
  const steriliz = thToSteriliz(s) || undefined;
  const ageMonths = parseAgeStringToMonths(s) || undefined;
  const colors = extractColors(s);
  const breeds = extractBreeds(s);

  const roughAll = s.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const terms = roughAll.filter(t => !breeds.some(b => b.includes(t) || t.includes(b)));

  return { species, sex, steriliz, ageMonths, colors, breeds, terms };
};

const fieldHasColor = (field: string | undefined, want: string[]) => {
  const f = (field || '').toString().toLowerCase();
  return want.some((c) => f.includes(c));
};

const normalizeSpeciesField = (t?: string) => {
  const s = (t || '').toString().toLowerCase();
  if (['dog', 'หมา', 'สุนัข'].includes(s)) return 'dog';
  if (['cat', 'แมว'].includes(s)) return 'cat';
  return s || '';
};

const normalizeSexField = (t?: string) => {
  const s = (t || '').toString().toLowerCase();
  if (/(ผู้|ตัวผู้|male)/.test(s)) return 'male';
  if (/(เมีย|ตัวเมีย|female)/.test(s)) return 'female';
  return s || '';
};

const normalizeSterilizField = (t?: string) => {
  const s = (t || '').toString().toLowerCase();
  if (/(ทำหมันแล้ว|yes)/.test(s)) return 'yes';
  if (/(ยังไม่ได้ทำหมัน|no)/.test(s)) return 'no';
  return s || '';
};

const scorePostByQuery = (p: Post, pq: ParsedQuery): number => {
  if (!pq || (!pq.species && !pq.sex && !pq.steriliz && !pq.ageMonths && !pq.colors.length && !pq.breeds.length && pq.terms.length === 0)) {
    return 0;
  }
  let score = 0;

  const title = (p.title || '').toString().toLowerCase();
  for (const t of pq.terms) {
    if (!t) continue;
    if (title.includes(t)) score += 6;
  }

  const postSpecies = normalizeSpeciesField(p.type);
  if (pq.species && postSpecies === pq.species) score += 4;

  if (pq.breeds.length && fieldHasBreed(p, pq.breeds)) {
    score += 3;
  }

  const postSex = normalizeSexField(p.sex);
  if (pq.sex && postSex === pq.sex) score += 3;

  const postSteriliz = normalizeSterilizField(p.steriliz);
  if (pq.steriliz && postSteriliz === pq.steriliz) score += 2;

  if (pq.colors.length) {
    const colorHit =
      fieldHasColor(p.color, pq.colors) ||
      fieldHasColor(p.breed, pq.colors) ||
      fieldHasColor(p.title, pq.colors);
    if (colorHit) score += 2;
  }

  if (pq.ageMonths != null) {
    const { exact, min, max } = getPostAgeTargetMonths(p);
    if (exact != null) {
      const diff = Math.abs(exact - pq.ageMonths);
      if (diff <= 1) score += 4;
      else if (diff <= 2) score += 3;
      else if (diff <= 4) score += 2;
      else if (diff <= 6) score += 1;
    } else if (min != null || max != null) {
      const lo = (min ?? 0);
      const hi = (max ?? 9999);
      if (pq.ageMonths >= lo && pq.ageMonths <= hi) score += 3;
      else {
        const d = pq.ageMonths < lo ? lo - pq.ageMonths : pq.ageMonths - hi;
        if (d <= 2) score += 2;
        else if (d <= 4) score += 1;
      }
    }
  }

  return score;
};

export default function PostListScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { filterType } = (route.params || {}) as RouteParams;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postTypeFilter, setPostTypeFilter] =
    useState<'all' | 'fh' | 'fp'>(() => (filterType === 'fh' || filterType === 'fp') ? filterType : 'all');

  const [counts, setCounts] = useState<Record<string, number>>({});
  const loadingIdsRef = useRef<Set<string>>(new Set());
  const listAbortRef = useRef<AbortController | null>(null);
  const countsAbortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    return () => {
      listAbortRef.current?.abort();
      countsAbortRef.current?.abort();
    };
  }, []);

  const attachComputed = useCallback((p: Post): Post => {
    const arr = parseMediaList(p.image);
    const first = arr[0];
    const full = first ? toFullUri(first) : undefined;
    return {
      ...p,
      _thumbUri: full,
      _isVideo: !!full && isVideo(full),
      _timeAgo: p.post_date ? dayjs(p.post_date).fromNow() : undefined,
    };
  }, []);

  const fetchPosts = useCallback(async () => {
    listAbortRef.current?.abort();
    const ctrl = new AbortController();
    listAbortRef.current = ctrl;

    setLoading(true);
    try {
      const [resFH, resFP] = await Promise.all([
        fetch(API.POST_FIND_HOME, { signal: ctrl.signal }),
        fetch(API.POST_FIND_PET, { signal: ctrl.signal }),
      ]);
      const [rawFH, rawFP] = await Promise.all([resFH.json(), resFP.json()]);

      const arrFH: Post[] = (Array.isArray(rawFH) ? rawFH : []).map((p: any) => {
        const filled: Post = attachComputed({ ...p, postType: 'fh' });
        filled.listId = buildListId(filled);
        return filled;
      });
      const arrFP: Post[] = (Array.isArray(rawFP) ? rawFP : []).map((p: any) => {
        const filled: Post = attachComputed({ ...p, postType: 'fp' });
        filled.listId = buildListId(filled);
        return filled;
      });

      const seen = new Set<string>();
      const merged: Post[] = [];
      for (const p of [...arrFH, ...arrFP]) {
        const k = p.listId || buildListId(p);
        if (seen.has(k)) continue;
        seen.add(k);
        merged.push(p);
      }

      let result = merged;
      if (Array.isArray(filterType)) {
        const keys = filterType.map(x => String(x).toLowerCase());
        result = merged.filter(p => keys.includes(String(p.type || '').toLowerCase()));
      }
      setPosts(result);
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        console.error('โหลดโพสต์ล้มเหลว:', e);
        setPosts([]);
      }
    } finally {
      if (!listAbortRef.current?.signal.aborted) setLoading(false);
      setRefreshing(false);
    }
  }, [filterType, attachComputed]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCounts({});
    fetchPosts();
  }, [fetchPosts]);

  const displayPosts = useMemo(() => {
    if (postTypeFilter === 'all') return posts;
    return posts.filter(p => (p.postType || '').toLowerCase() === postTypeFilter);
  }, [posts, postTypeFilter]);

  const smartResults = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return displayPosts;

    const pq = parseQuery(q);

    const scored = displayPosts
      .map((p) => ({ p, s: scorePostByQuery(p, pq) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(x => x.p);

    if (scored.length === 0) {
      const lower = q.toLowerCase();
      return displayPosts.filter(p =>
        (p.title || '').toLowerCase().includes(lower) ||
        (p.breed || '').toLowerCase().includes(lower)
      );
    }
    return scored;
  }, [displayPosts, debouncedQuery]);

  const ensureCount = useCallback(async (p: Post) => {
    const listKey = p.listId || buildListId(p);
    if (counts[listKey] != null || loadingIdsRef.current.has(listKey)) return;

    loadingIdsRef.current.add(listKey);
    countsAbortRef.current ??= new AbortController();
    try {
      const c = await fetchCommentCount(String(getStableId(p)), String((p.postType || '').toLowerCase()), countsAbortRef.current.signal);
      if (c != null) setCounts(prev => ({ ...prev, [listKey]: c }));
    } catch { }
    finally {
      loadingIdsRef.current.delete(listKey);
    }
  }, [counts]);

  const onViewableItemsChanged = useRef((info: { viewableItems: ViewToken<Post>[]; changed: ViewToken<Post>[] }) => {
    info.viewableItems.forEach(v => {
      const item = v.item as unknown as Post;
      if (item) ensureCount(item);
    });
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 55 }).current;

  const renderRow = useCallback(({ item, index }: { item: Post, index: number }) => {
    const first = item._thumbUri;
    const hasMedia = !!first;
    const odd = index % 2 === 0;
    const showEmoji = postTypeFilter === 'all';
    const listKey = item.listId || buildListId(item);
    const fallback = getCommentCountFromPost(item);
    const count = counts[listKey] ?? fallback;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('PostDetail', { post: item })}
        style={[styles.rowBase, odd ? styles.rowDark : styles.rowLight]}
      >
        {showEmoji && (
          <View style={styles.typeEmojiWrap}>
            <Text style={styles.typeEmoji}>{postTypeEmoji(item.postType)}</Text>
          </View>
        )}

        {hasMedia && (
          <View style={styles.thumbWrap}>
            {item._isVideo ? (
              <Video source={{ uri: first! }} style={styles.thumb} resizeMode={ResizeMode.COVER} shouldPlay={false} isMuted />
            ) : (
              <Image source={{ uri: first! }} style={styles.thumb} resizeMode="cover" />
            )}
          </View>
        )}

        <View style={styles.content}>
          <Text numberOfLines={2} style={styles.title}>
            {item.title || (item.postType?.toLowerCase() === 'fp' ? 'ต้องการอุปการะ' : '(ไม่มีหัวข้อ)')}
          </Text>

          <Text numberOfLines={1} style={styles.metaText}>
            ประเภท: {formatAnimalType(item.type)}  •  สายพันธุ์: {item.breed || 'ไม่ระบุ'}  •  อายุ: {getAgeDisplay(item)}
          </Text>

          <View style={styles.footerLine}>
            <Text numberOfLines={1} style={styles.authorText}>{getAuthorName(item)}</Text>
            <View style={styles.footerRight}>
              {!!item._timeAgo && <Text style={styles.timeText}>{item._timeAgo}</Text>}
              <Text style={styles.commentCount}>  ·  💬 {count}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [counts, navigation, postTypeFilter]);

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>กรองตามประเภท:</Text>
        <View style={styles.filterChips}>
          <TouchableOpacity onPress={() => setPostTypeFilter('all')} style={[styles.chip, postTypeFilter === 'all' && styles.chipActive]}>
            <Text style={[styles.chipText, postTypeFilter === 'all' && styles.chipTextActive]}>ทั้งหมด</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPostTypeFilter('fh')} style={[styles.chip, postTypeFilter === 'fh' && styles.chipActive]}>
            <Text style={[styles.chipText, postTypeFilter === 'fh' && styles.chipTextActive]}>🏠 หาบ้าน</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPostTypeFilter('fp')} style={[styles.chip, postTypeFilter === 'fp' && styles.chipActive]}>
            <Text style={[styles.chipText, postTypeFilter === 'fp' && styles.chipTextActive]}>🤝 รับเลี้ยง</Text>
          </TouchableOpacity>
        </View>
      </View>


      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="กรอกคำค้นหา"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>ล้าง</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} size="small" color="#333" />
      ) : smartResults.length === 0 ? (
        <Text style={styles.noPost}>ไม่พบโพสต์ตามคำค้น</Text>
      ) : (
        <FlatList
          data={smartResults}
          key={`postlist-${postTypeFilter}-${debouncedQuery ? 'q' : 'noq'}`}
          extraData={{ counts, postTypeFilter, debouncedQuery }}
          keyExtractor={(item) => String(item.listId || buildListId(item))}
          renderItem={renderRow}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 10, paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialNumToRender={8}
          windowSize={10}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews
        />
      )}

      <BottomBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, marginBottom: 6, gap: 8 },
  filterLabel: { color: '#3C2C91', fontWeight: '700' },
  filterChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#3C2C91' },
  chipText: { color: '#111827', fontWeight: '600' },
  chipTextActive: { color: '#fff' },


  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clearBtn: { backgroundColor: '#ECEFFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  clearBtnText: { color: '#3C2C91', fontWeight: '700' },

  noPost: { textAlign: 'center', color: '#999', marginTop: 24 },

  rowBase: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  rowDark: { backgroundColor: '#F4F5FF' },
  rowLight: { backgroundColor: '#ECEFFF' },
  separator: { height: 8 },

  typeEmojiWrap: { position: 'absolute', top: 6, right: 8, zIndex: 5 },
  typeEmoji: { fontSize: 18 },

  thumbWrap: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden', backgroundColor: '#e5e7eb', marginRight: 12 },
  thumb: { width: '100%', height: '100%' },

  content: { flex: 1 },
  title: { color: '#111827', fontWeight: '800', fontSize: 16 },
  metaText: { color: '#374151', marginTop: 4, fontSize: 12 },
  footerLine: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  authorText: { flex: 1, color: '#6B7280', fontSize: 12 },
  footerRight: { flexDirection: 'row', alignItems: 'center' },
  timeText: { color: '#6B7280', fontSize: 12 },
  commentCount: { color: '#6B7280', fontSize: 12 },
});
