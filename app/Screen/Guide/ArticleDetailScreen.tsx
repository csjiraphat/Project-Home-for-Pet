// app/Screen/Guide/ArticleDetailScreen.tsx
// VVV --- This is the line to fix --- VVV
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, Dimensions, useWindowDimensions, Linking, TouchableOpacity, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import API from "../../../android/app/src/config";
import RenderHTML from 'react-native-render-html';

// --- Types ---
type ArticleDetail = {
    id: number;
    title: string;
    content: string;
    published_at: string;
    tags?: string;
    reference_url?: string;
    images: { id: number; url: string; position: 'top' | 'inline' | 'bottom'; caption: string }[];
};

const COLORS = {
    background: '#F8F9FA',
    card: '#FFFFFF',
    purpleDark: '#2D2754',
    purpleLight: '#EBEAF3',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    link: '#007AFF',
};
const screenWidth = Dimensions.get('window').width;

const makeAbsolute = (u?: string): string => {
    if (!u || u.startsWith('http')) return u || '';
    try {
        const origin = new URL(API.BASE_URL).origin;
        const cleanPath = u.startsWith('/') ? u.substring(1) : u;
        return `${origin}/${cleanPath}`;
    } catch (error) {
        console.error("Could not create absolute URL from:", API.BASE_URL, u);
        return '';
    }
};

// --- Component ---
export default function ArticleDetailScreen() {
    const route = useRoute();
    const { id } = route.params as { id: number };

    const [article, setArticle] = useState<ArticleDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { width } = useWindowDimensions();

    useEffect(() => {
        const fetchDetail = async () => {
            setIsLoading(true);
            try {
                const url = `${API.ARTICLES}?entity=articles&id=${id}`;
                const response = await fetch(url);
                const json = await response.json();
                if (json.status === 'success' && json.data) {
                    setArticle(json.data as ArticleDetail);
                } else {
                    console.error("API Error:", json.message);
                    setArticle(null);
                }
            } catch (e) {
                console.error("Fetch Detail failed:", e);
                setArticle(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    const processedContent = useMemo(() => {
        if (!article?.content) return '';
        const origin = new URL(API.BASE_URL).origin;
        return article.content.replace(/src="(\/admin\/[^"]+)"/g, `src="${origin}$1"`);
    }, [article?.content]);

    const handleLinkPress = useCallback(async (url: string) => {
        const isUrl = url.startsWith('http://') || url.startsWith('https://');
        if (isUrl) {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert(`ไม่สามารถเปิด URL นี้ได้: ${url}`);
            }
        }
    }, []);
    
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.purpleDark} />
                <Text style={styles.loadingText}>กำลังโหลดบทความ...</Text>
            </View>
        );
    }

    if (!article) {
        return <Text style={styles.errorText}>ไม่พบบทความ หรือบทความนี้ไม่พร้อมใช้งาน</Text>;
    }

    const topImage = article.images.find(img => img.position === 'top');
    const topImageUrl = topImage ? makeAbsolute(topImage.url) : null;

    const renderTags = (tagsString?: string) => {
        if (!tagsString) return null;
        const tagsArray = tagsString.split(',').map(tag => tag.trim());
        return (
            <View style={styles.tagContainer}>
                {tagsArray.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <ScrollView style={styles.container}>
            {topImage && (
                <Image
                    key={topImage.id}
                    source={{ uri: topImageUrl! }}
                    style={styles.topImage}
                    resizeMode="cover"
                />
            )}
            <View style={styles.mainContentCard}>
                <Text style={styles.title}>{article.title}</Text>

                <View style={styles.metaContainer}>
                    <Text style={styles.metaText}>เผยแพร่เมื่อ: {article.published_at}</Text>
                    {renderTags(article.tags)}
                </View>

                <View style={styles.separator} />

                <View style={styles.contentBody}>
                    <RenderHTML
                        contentWidth={width - 32}
                        source={{ html: processedContent }}
                        baseStyle={styles.paragraph}
                        tagsStyles={{
                            p: styles.paragraph,
                            strong: { fontWeight: 'bold' },
                        }}
                    />

                    {article.reference_url && (
                        <View style={styles.referenceContainer}>
                            <Text style={styles.referenceTitle}>แหล่งอ้างอิง</Text>
                            <TouchableOpacity onPress={() => handleLinkPress(article.reference_url!)}>
                                <Text style={styles.referenceText}>
                                    {article.reference_url}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 16 },
    errorText: { padding: 20, color: 'red', textAlign: 'center' },
    container: { flex: 1, backgroundColor: COLORS.background },
    topImage: {
        width: screenWidth,
        height: screenWidth * 0.65,
    },
    mainContentCard: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -20,
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        lineHeight: 36,
        marginBottom: 12,
    },
    metaContainer: {
        marginBottom: 16,
    },
    metaText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: COLORS.purpleLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
    },
    tagText: {
        color: COLORS.purpleDark,
        fontSize: 12,
        fontWeight: '600',
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 16,
    },
    contentBody: {
        paddingBottom: 50,
    },
    paragraph: {
        fontSize: 17,
        lineHeight: 28,
        color: COLORS.textPrimary,
    },
    referenceContainer: {
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    referenceTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    referenceText: {
        fontSize: 16,
        lineHeight: 24,
        color: COLORS.link,
        textDecorationLine: 'underline',
    },
});