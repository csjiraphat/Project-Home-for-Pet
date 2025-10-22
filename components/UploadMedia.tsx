import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Alert,
  FlatList,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import API from '../android/app/src/config';

const UploadMedia = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ต้องอนุญาตให้เข้าถึงรูปภาพและวิดีโอ');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setFiles(result.assets);
    }
  };

  const upload = async () => {
    if (files.length === 0) {
      Alert.alert('ยังไม่ได้เลือกรูปหรือวิดีโอ');
      return;
    }

    const formData = new FormData();
    files.forEach((file, index) => {
      const uri = file.uri;
      const name = file.fileName || `media_${index}`;
      const ext = uri.split('.').pop()?.toLowerCase();
      const type =
        ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'png'
          ? 'image/png'
          : ext === 'mp4'
          ? 'video/mp4'
          : 'application/octet-stream';

      formData.append('media[]', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name,
        type,
      } as any);
    });

    try {
      setIsUploading(true);
      const res = await fetch(`${API}/post/upload.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        },
        body: formData,
      });

      const data = await res.json();
      setIsUploading(false);

      if (data.status === 'success') {
        setUploadedUrls(data.files);
        Alert.alert('อัปโหลดสำเร็จ', 'อัปโหลดไฟล์เรียบร้อยแล้ว');
      } else {
        Alert.alert('ล้มเหลว', data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      setIsUploading(false);
      console.error(error);
      Alert.alert('ล้มเหลว', 'ไม่สามารถอัปโหลดไฟล์ได้');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.btn} onPress={pickMedia}>
        <Text style={styles.btnText}>เลือกรูป / วิดีโอ</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#4ade80' }]} onPress={upload}>
        <Text style={styles.btnText}>อัปโหลด</Text>
      </TouchableOpacity>

      {isUploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ marginTop: 10 }}>กำลังอัปโหลด...</Text>
        </View>
      )}

      {uploadedUrls.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>
          ยังไม่มีไฟล์ที่อัปโหลด
        </Text>
      ) : (
        <FlatList
          data={uploadedUrls}
          keyExtractor={(item, index) => item + index}
          numColumns={3}
          contentContainerStyle={{ marginTop: 20 }}
          renderItem={({ item }) =>
            item.endsWith('.mp4') ? (
              <View style={{ padding: 5 }}>
                <Text style={{ fontSize: 12 }}>🎞️ วิดีโอ</Text>
                <Text numberOfLines={1} style={{ fontSize: 10, color: '#555' }}>
                  {item}
                </Text>
              </View>
            ) : (
              <Image source={{ uri: item }} style={styles.preview} />
            )
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  btn: {
    backgroundColor: '#60a5fa',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  preview: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 10,
  },
  uploadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
});

export default UploadMedia;
