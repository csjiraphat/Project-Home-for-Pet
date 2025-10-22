// app/Screen/Guide/GuideScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Image, ActivityIndicator, RefreshControl, FlatList, Keyboard } from 'react-native';
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
  image_url: string | null;
};

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

// VVV --- ส่วนที่แก้ไข 1: เพิ่มฟังก์ชันถอดรหัส HTML Entities --- VVV
const decodeHtmlEntities = (text: string): string => {
    if (!text) return '';
    return text
        .replace(/&nbsp;/g, ' ')
        .replace(/&hellip;/g, '…')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // เพิ่มการแทนที่อื่นๆ ที่พบบ่อยได้ที่นี่
        .replace(/&lsquo;/g, '‘')
        .replace(/&rsquo;/g, '’')
        .replace(/&ldquo;/g, '“')
        .replace(/&rdquo;/g, '”');
};
// ^^^ --- จบส่วนที่แก้ไข --- ^^^

// --- Components ---
const ArticleCard: React.FC<{ item: ArticleSummary; navigation: any; }> = React.memo(({ item, navigation }) => {
  const imageUrl = makeAbsolute(item.image_url || '');
  const navigateToDetail = () => navigation.navigate('ArticleDetail', { id: item.id });

  // VVV --- ส่วนที่แก้ไข 2: เรียกใช้ฟังก์ชันถอดรหัสกับ title และ snippet --- VVV
  const decodedTitle = decodeHtmlEntities(item.title);
  const decodedSnippet = decodeHtmlEntities(item.snippet);
  // ^^^ --- จบส่วนที่แก้ไข --- ^^^

  return (
    <Pressable style={styles.card} onPress={navigateToDetail}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.cardImage}
          resizeMode="contain"
          onError={(e) => console.log("Image Load Error:", e.nativeEvent.error)}
        />
      ) : (
        <View style={[styles.cardImage, styles.noImage]}>
            <Text style={{color: COLORS.textSecondary}}>No Image</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        {/* VVV --- ส่วนที่แก้ไข 3: ใช้ตัวแปรที่ถอดรหัสแล้วมาแสดงผล --- VVV */}
        <Text style={styles.cardTitle} numberOfLines={2}>{decodedTitle}</Text>
        <Text style={styles.cardSnippet} numberOfLines={3}>{decodedSnippet}</Text>
        {/* ^^^ --- จบส่วนที่แก้ไข --- ^^^ */}
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchArticles = useCallback(async (species: Species, q: string, isRefresh: boolean = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    const params: any = { entity: 'articles', species };
    if (q && q.trim() !== '') params.q = q.trim();
    const url = `${API.ARTICLES}?${buildQuery(params)}`;

    try {
      const response = await fetch(url);
      const text = await response.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch (err) {
        console.error("Invalid JSON from server:", err, "raw:", text);
      }

      if (!response.ok) {
        console.error("API returned non-OK:", response.status, json);
        setArticles([]);
      } else if (json && json.status === 'success' && Array.isArray(json.data)) {
        setArticles(json.data);
      } else {
        setArticles([]);
      }
    } catch (e) {
      console.error("Fetch failed:", e);
      setArticles([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles(activeTab, '');
  }, [activeTab, fetchArticles]);

  const handleRefresh = useCallback(() => {
    fetchArticles(activeTab, searchQuery, true);
  }, [activeTab, searchQuery, fetchArticles]);

  const handleTabChange = (species: Species) => {
    setActiveTab(species);
  };

  const onPressSearch = () => {
    Keyboard.dismiss();
    fetchArticles(activeTab, searchQuery);
  };

  const onSubmitSearch = () => {
    onPressSearch();
  };

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {Tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => handleTabChange(tab.key)}
            style={({ pressed }) => [
              styles.tabItem,
              activeTab === tab.key && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
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
          onSubmitEditing={onSubmitSearch}
        />
        <Pressable style={styles.searchBtn} onPress={onPressSearch} disabled={isLoading && !isRefreshing}>
            <Text style={{ color: COLORS.textSecondary }}>ค้นหา</Text>
        </Pressable>
      </View>

      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purpleDark} />
        </View>
      ) : (
        <FlatList
          data={articles}
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
                {searchQuery ? `ไม่พบบทความสำหรับ "${searchQuery}"` : "ไม่มีบทความ"}
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
  tabBar:{
    flexDirection:'row',
    backgroundColor: COLORS.purpleDark,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  tabItem:{
    flex:1,
    paddingVertical: 14,
    alignItems:'center',
    borderRadius: 8,
  },
  tabActive:{
    backgroundColor: '#5A528A',
  },
  tabPressed: {
    backgroundColor: '#433C6D',
  },
  tabText:{
    color:'#C9CBE6',
    fontWeight:'600',
    fontSize: 16,
  },
  tabTextActive:{
    color: '#FFFFFF',
  },
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
    backgroundColor: '#F3F4F6',
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