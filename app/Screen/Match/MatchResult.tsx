// app/Screen/Match/MatchResult.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function MatchResult() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const items = route.params?.items ?? [];

  // --- จุดที่แก้ไข 1 ---
  // หาประเภทของโพสต์ที่แสดงในหน้านี้จาก 'mode' ที่ส่งมาตอนเปิดหน้า
  // ถ้าเรามาจากโพสต์ 'หาสัตว์เลี้ยง' (from_fp) ผลลัพธ์ก็จะเป็นโพสต์ 'หาบ้าน' (fh) และกลับกัน
  const resultPostType = route.params?.mode === 'from_fp' ? 'fh' : 'fp';

  const handleViewDetails = (item: any) => {
    // --- จุดที่แก้ไข 2 ---
    // เปลี่ยนเงื่อนไขการตรวจสอบจาก item.right_id เป็น item.id
    if (!item || !item.id) {
      console.error("Attempted to view details for a match with no ID.", item);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถดูรายละเอียดได้ เนื่องจากไม่พบ ID ของโพสต์");
      return;
    }

    // สร้าง object post สำหรับส่งไปยังหน้า PostDetailScreen
    const postStub = {
      id: item.id,                 // ใช้ item.id
      postType: resultPostType,    // ใช้ postType ที่เราหามาได้
      title: item.title,
      // ส่งข้อมูลอื่นๆ ที่มีอยู่ไปด้วย เพื่อให้หน้าจอถัดไปแสดงผลเบื้องต้นได้
      breed: item.breed,
      sex: item.sex,
      color: item.color,
      ...item.preview,
    };
    nav.navigate('PostDetail', { post: postStub });
  };

  return (
    <View style={styles.container}>
      
      <FlatList
        data={items}
        // --- จุดที่แก้ไข 3 ---
        // อัปเดต keyExtractor ให้ใช้ key ที่ถูกต้อง เพื่อประสิทธิภาพที่ดีขึ้น
        keyExtractor={(item, idx) => `${resultPostType}-${item.id || idx}`}
        renderItem={({item})=>(
          <View style={styles.card}>
            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.score}>{item.score}%</Text>
            </View>
            <Text style={styles.preview}>
              {Object.entries(item.preview || {}).slice(0,6).map(([k,v])=> `${k}: ${String(v)}`).join(' | ')}
            </Text>
            <View style={{flexDirection:'row', gap:8, marginTop:8}}>
              <TouchableOpacity
                style={styles.btn}
                onPress={() => handleViewDetails(item)}
              >
                <Text style={styles.btnText}>ดูรายละเอียด</Text>
              </TouchableOpacity>
              
            </View>
          </View>
        )}
      />
      <TouchableOpacity style={[styles.btn,{backgroundColor:'#4f46e5', alignSelf:'center', marginTop:10}]} onPress={()=>nav.goBack()}>
        <Text style={styles.btnText}>กลับ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1, backgroundColor:'#fff', padding:16},
  title:{fontSize:18, fontWeight:'800', color:'#1f2a56', marginBottom:10},
  card:{backgroundColor:'#f1f5ff', borderRadius:14, padding:12, marginBottom:10},
  cardTitle:{fontSize:16, fontWeight:'700', color:'#111827', maxWidth:'70%'},
  score:{fontSize:16, fontWeight:'800', color:'#16a34a'},
  preview:{fontSize:12, color:'#1f2a56', marginTop:6},
  btn:{backgroundColor:'#10b981', paddingVertical:10, paddingHorizontal:14, borderRadius:12},
  btnText:{color:'#fff', fontWeight:'700'}
});