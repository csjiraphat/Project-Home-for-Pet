// app/Screen/Guide/GuideScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Image, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import API, { buildQuery } from "../../../android/app/src/config"; 
import { useNavigation } from '@react-navigation/native'; 

// --- Types ---
type Species = 'dog' | 'cat';
type ArticleSummary = { 
  id: number;
  species: Species;
  title: string;
  tags?: string;
  published_at: string;
  snippet: string; 
  image_url: string;
};

// --- (เพิ่ม) ส่วนตรรกะการค้นหาอัจฉริยะ ---
type ParsedQuery = {
  terms: string[];
};

const normalize = (s?: string): string => (s || '').toString().trim().toLowerCase();

// ฟังก์ชันแยกคำค้นหา (ง่ายกว่าของ PostList เพราะเราสนแค่คำทั่วไป)
const parseQuery = (q: string): ParsedQuery => {
  const s = normalize(q);
  // แยกคำด้วยช่องว่าง และลบอักขระพิเศษที่ไม่ใช่ตัวอักษรหรือตัวเลข
  const terms = s.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  return { terms };
};

// ฟังก์ชันให้คะแนนบทความ
const scoreArticleByQuery = (article: ArticleSummary, pq: ParsedQuery): number => {
  if (pq.terms.length === 0) return 0;
  let score = 0;
  const title = normalize(article.title);
  const tags = normalize(article.tags);

  for (const term of pq.terms) {
    // ให้คะแนนสูงกว่าถ้าเจอใน title
    if (title.includes(term)) {
      score += 5;
    }
    // ให้คะแนนน้อยกว่าถ้าเจอใน tags
    if (tags.includes(term)) {
      score += 2;
    }
  }
  return score;
};
// --- สิ้นสุดส่วนตรรกะการค้นหา ---


// --- Config / Constants ---
const COLORS = {
  bg: '#FFFFFF',
  purpleDark: '#2D2754',
  accent: '#FFE066',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  secondary: '#374151',
};

const Tabs: ReadonlyArray<{ key: Species; label: string }> = [
  { key: 'dog', label: 'สุนัข' },
  { key: 'cat', label: 'แมว' },
];

const makeAbsolute = (u?: string): string => {
  if (!u) return '';
  if (u.startsWith('http')) return u;
  try {
    const origin = new URL(API.BASE_URL).origin;
    const cleanPath = u.startsWith('/') ? u.substring(1) : u;
    return `${origin}/${cleanPath}`;
  } catch (error) {
    console.error("Could not create absolute URL from:", API.BASE_URL, u);
    return '';
  }
};

// --- Components ---
const ArticleCard: React.FC<{ item: ArticleSummary; navigation: any; }> = React.memo(({ item, navigation }) => {
  const imageUrl = makeAbsolute(item.image_url);
  const navigateToDetail = () => navigation.navigate('ArticleDetail', { id: item.id });

  return (
    <Pressable style={styles.card} onPress={navigateToDetail}>
      {imageUrl ? (
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.cardImage} 
          onError={(e) => console.log("Image Load Error:", e.nativeEvent.error)}
        />
      ) : (
        <View style={[styles.cardImage, styles.noImage]}>
            <Text style={{color: COLORS.textSecondary}}>No Image</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardSnippet} numberOfLines={3}>{item.snippet}</Text>
        <View style={styles.cardFooter}>
            <Text style={styles.cardTags} numberOfLines={1}>{item.tags || '—'}</Text>
            <Text style={styles.cardDate}>เผยแพร่: {item.published_at}</Text>
        </View>
      </View>
    </Pressable>
  );
});

// --- Main Screen ---
export default function GuideScreen() {
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState<Species>('dog');
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true); // <<-- เริ่มต้นให้เป็น true เพื่อให้โหลดครั้งแรก
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debounce query เพื่อไม่ให้ค้นหาทุกครั้งที่พิมพ์
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchArticles = useCallback(async (species: Species, isRefresh: boolean = false) => {
    // Guard clause: ไม่ต้องเช็ค isLoading ที่นี่แล้ว เพราะเราควบคุมการเรียกใช้จาก useEffect
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    const params = { entity: 'articles', species: species };
    const url = `${API.ARTICLES}?${buildQuery(params)}`;

    try {
      const response = await fetch(url);
      const json = await response.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setArticles(json.data);
      } else {
        console.error("API Error:", json.message || "Invalid response format");
        setArticles([]);
      }
    } catch (e) {
      console.error("Fetch failed:", e);
      setArticles([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []); // <--- (แก้ไข) แก้ไข dependency array เป็น [] เพื่อให้ฟังก์ชันเสถียร

  useEffect(() => {
    fetchArticles(activeTab);
  }, [activeTab, fetchArticles]);

  const handleRefresh = useCallback(() => {
    fetchArticles(activeTab, true);
  }, [activeTab, fetchArticles]);
  
  const handleTabChange = (species: Species) => {
    setActiveTab(species);
    setSearchQuery(''); // ล้างคำค้นหาเมื่อเปลี่ยนแท็บ
  };

  const smartResults = useMemo(() => {
    const q = debouncedQuery;
    if (!q) return articles; 

    const pq = parseQuery(q);

    const scored = articles
      .map((article) => ({
        article,
        score: scoreArticleByQuery(article, pq),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.article);
    
    if (scored.length === 0) {
      const lowerQ = normalize(q);
      return articles.filter(article => 
        normalize(article.title).includes(lowerQ) || 
        normalize(article.tags).includes(lowerQ)
      );
    }

    return scored;
  }, [articles, debouncedQuery]);

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {Tabs.map((tab) => (
          <Pressable 
            key={tab.key} 
            style={[styles.tabItem, activeTab === tab.key && styles.tabActive]}
            onPress={() => handleTabChange(tab.key)}
            disabled={isLoading && activeTab !== tab.key}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search Box */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหาชื่อบทความ หรือแท็ก..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        <Pressable style={styles.searchBtn} disabled={true}>
            <Text style={{ color: COLORS.textSecondary }}>ค้นหา</Text>
        </Pressable>
      </View>
      
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purpleDark} />
        </View>
      ) : (
        <FlatList
          data={smartResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ArticleCard item={item} navigation={navigation} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
                refreshing={isRefreshing} 
                onRefresh={handleRefresh} 
                tintColor={COLORS.purpleDark}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {debouncedQuery ? `ไม่พบบทความสำหรับ "${debouncedQuery}"` : "ไม่มีบทความ"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor: COLORS.bg },
  searchBox:{ flexDirection:'row', gap:8, padding:12, borderBottomWidth:1, borderColor: COLORS.border },
  searchInput:{ flex:1, backgroundColor:'#F3F4F6', borderRadius:8, paddingHorizontal:12, height:42, color: COLORS.textPrimary },
  searchBtn:{ backgroundColor:'#FFF', borderWidth:1, borderColor:COLORS.border, borderRadius:8, paddingHorizontal:12, alignItems:'center', justifyContent:'center' },
  tabBar:{ flexDirection:'row', backgroundColor: COLORS.purpleDark },
  tabItem:{ flex:1, paddingVertical:12, alignItems:'center' },
  tabActive:{ borderBottomWidth:3, borderBottomColor: COLORS.accent },
  tabText:{ color:'#C9CBE6', fontWeight:'800' },
  tabTextActive:{ color: COLORS.accent },
  listContent: { paddingHorizontal: 12, paddingVertical: 16 },
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    marginBottom: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3, 
    overflow: 'hidden', 
  },
  cardImage: { 
    width: '100%', 
    height: 180, 
    backgroundColor: COLORS.border,
    justifyContent: 'center', 
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  noImage: { backgroundColor: COLORS.border },
  cardBody: { padding: 12 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardSnippet: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cardTags: {
    fontSize: 12,
    color: COLORS.secondary,
    flexShrink: 1,
    marginRight: 8,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
  },
});