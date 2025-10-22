// app/Screen/HomeScreen.tsx
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import BottomBar from '../../components/BottomBar';

type RootStackParamList = {
  Home: undefined;
  PostList: { filterType: 'fh' | 'fp' | string[] | 'all' };
  CareTips: undefined;
};

const { width } = Dimensions.get('window');
const RADIUS = 16;

// ---------- Image Assets ----------
const homeImg  = require('../../assets/home.png');
const adoptImg = require('../../assets/adopt.png');
const dogImg   = require('../../assets/dog.png');
const catImg   = require('../../assets/cat.png');
const bookImg  = require('../../assets/book.png'); // ✅ เพิ่มรูปสำหรับปุ่มคำแนะนำ

export default function HomeScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const goCareTips    = () => navigation.navigate('CareTips');
  const goAllFindHome = () => navigation.navigate('PostList', { filterType: 'fh' });
  const goAllFindPet  = () => navigation.navigate('PostList', { filterType: 'fp' });
  const goAllDogs     = () => navigation.navigate('PostList', { filterType: ['dog', 'หมา', 'สุนัข'] });
  const goAllCats     = () => navigation.navigate('PostList', { filterType: ['cat', 'แมว'] });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* ปุ่มยาวด้านบน (เพิ่มรูป book.png เป็นลายน้ำ) */}
        <MenuLong
          title="ความรู้ในการดูแลสัตว์เลี้ยง"
          subtitle="อาหาร • วัคซีน • สุขภาพ • สิ่งแวดล้อม"
          onPress={goCareTips}
          bgColor="#FDE68A"
          bgImage={bookImg}
        />

        {/* แถว 2 */}
        <View style={styles.row2}>
          <MenuCard
            title="โพสต์หาบ้าน"
            onPress={goAllFindHome}
            bgColor="#BBF7D0"
            bgImage={homeImg}
          />
          <MenuCard
            title="โพสต์ต้องการรับเลี้ยง"
            onPress={goAllFindPet}
            bgColor="#FECACA"
            bgImage={adoptImg}
          />
        </View>

        {/* แถว 3 */}
        <View style={styles.row2}>
          <MenuCard
            title="รายการสุนัขทั้งหมด"
            onPress={goAllDogs}
            bgColor="#BFDBFE"
            bgImage={dogImg}
          />
          <MenuCard
            title="รายการแมวทั้งหมด"
            onPress={goAllCats}
            bgColor="#DDD6FE"
            bgImage={catImg}
          />
        </View>
      </View>

      <BottomBar />
    </SafeAreaView>
  );
}

/* ---------- Components ---------- */

type MenuLongProps = {
  title: string;
  subtitle?: string;
  onPress: () => void;
  bgColor?: string;
  bgImage?: any; // ✅ เพิ่มรองรับรูป
};

function MenuLong({ title, subtitle, onPress, bgColor = '#E5E7EB', bgImage }: MenuLongProps) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.longWrap}>
      <View style={[styles.longCard, { backgroundColor: bgColor }]}>
        {bgImage && (
          <Image
            source={bgImage}
            style={styles.longBgImage}
            resizeMode="contain"
          />
        )}
        <View style={styles.longContent}>
          <Text style={styles.longTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.longSub}>{subtitle}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

type MenuCardProps = {
  title: string;
  onPress: () => void;
  bgColor?: string;
  bgImage?: any;
};

function MenuCard({ title, onPress, bgColor = '#E5E7EB', bgImage }: MenuCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.cardWrap}>
      <View style={[styles.card, { backgroundColor: bgColor }]}>
        {bgImage && (
          <Image
            source={bgImage}
            style={styles.cardBgImage}
            resizeMode="contain"
          />
        )}
        <View style={styles.cardInnerBottom}>
          <View style={styles.cardTitleBackdrop}>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, gap: 12 },

  // ปุ่มยาว
  longWrap: { width: '100%' },
  longCard: {
    width: '100%',
    height: width * 0.28,
    borderRadius: RADIUS,
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative',
  },
  longContent: { padding: 16 },
  longTitle: { color: '#0f172a', fontWeight: '800', fontSize: 20 },
  longSub: { marginTop: 6, color: '#0f172a', fontWeight: '600' },

  // รูปตกแต่งในปุ่มยาว
  longBgImage: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: width * 0.25,
    height: width * 0.25,
    opacity: 0.8,
  },

  // แถวละ 2 ปุ่ม
  row2: { flexDirection: 'row', gap: 12 },
  cardWrap: { flex: 1 },

  card: {
    height: width * 0.36,
    borderRadius: RADIUS,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  cardBgImage: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: width * 0.26,
    height: width * 0.26,
    opacity: 0.8,
  },
  cardInnerBottom: {
    width: '100%',
    padding: 14,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  cardTitleBackdrop: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomLeftRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
  },
  cardTitle: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 14.4,
    textAlign: 'left',
  },
});
