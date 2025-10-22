import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useUser } from '../../../context/UserContext';
import { ChatProvider, useChat } from '../../../context/ChatContext';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import ImageViewing from 'react-native-image-viewing';
import dayjs from 'dayjs';
import API from '../../../android/app/src/config';

function resolveMediaUrl(u: string): string {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return `${API.CHAT_BASE_URL}${u}`;
  const m = u.match(/^https?:\/\/[^/]+(\/.*)$/i);
  if (m) return `${API.CHAT_BASE_URL}${m[1]}`;
  return u;
}
const { width } = Dimensions.get('window');

type RootStackParamList = {
  ChatRoomScreen: { selectedUsername: string; selectedUserProfile?: string };
};

export default function ChatRoomScreenWrapper() {
  const route = useRoute<RouteProp<RootStackParamList, 'ChatRoomScreen'>>();
  const { user } = useUser();
  const selectedUsername = route.params?.selectedUsername;
  const selectedUserProfile = route.params?.selectedUserProfile || '';

  if (!selectedUsername || !user?.username) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />;
  }

  return (
    <ChatProvider currentUsername={user.username} selectedUsername={selectedUsername}>
      <ChatRoomScreen selectedUserProfile={selectedUserProfile} selectedUsername={selectedUsername} />
    </ChatProvider>
  );
}

function ChatRoomScreen({ selectedUserProfile, selectedUsername }: { selectedUserProfile: string, selectedUsername: string }) {
  const { messages, sendMessage } = useChat();
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageGallery, setImageGallery] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isViewerVisible, setViewerVisible] = useState(false);
  const { user } = useUser();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleSend = () => {
    if (text.trim()) {
      sendMessage(text);
      setText('');
    }
  };

  const handlePickMedia = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตเข้าถึงรูปภาพ');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      setUploading(true);
      const uploadedUrls: string[] = [];

      for (const asset of result.assets) {
        const uploaded = await uploadToServer(asset.uri);
        if (uploaded?.url && uploaded?.mediaType === 'image') {
          uploadedUrls.push(uploaded.url);
        } else if (uploaded?.mediaType === 'video') {
          sendMessage('', { type: 'video', url: uploaded.url });
        }
      }

      if (uploadedUrls.length > 0) {
        sendMessage('', {
          type: 'image',
          url: JSON.stringify(uploadedUrls),
        });
      }

      setUploading(false);
    } catch (e) {
      setUploading(false);
      Alert.alert('ผิดพลาด', 'อัปโหลดไฟล์ไม่สำเร็จ');
    }
  };

  const uploadToServer = async (uri: string) => {
    const filename = uri.split('/').pop() || `media_${Date.now()}`;
    const ext = /\.(\w+)$/.exec(filename)?.[1]?.toLowerCase() || 'jpg';
    const mimeType = ext === 'mp4' ? 'video/mp4' : 'image/jpeg';

    const form = new FormData();
    form.append('file', { uri, name: filename, type: mimeType } as any);

    const res = await fetch(`${API.CHAT_BASE_URL}/upload`, {
      method: 'POST',
      body: form,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error('Upload failed');
    const json = await res.json();
    return { url: json.url, mediaType: json.mediaType };
  };

  const openImageViewer = (group: string[], index: number) => {
    setImageGallery(group);
    setCurrentIndex(index);
    setViewerVisible(true);
  };

  const renderMessage = (item: any) => {
    const isMine = item.sender === user?.username;
    let images: string[] = [];

    if (item.mediaType === 'image' && item.mediaUrl) {
      try {
        images = JSON.parse(item.mediaUrl);
        if (!Array.isArray(images)) images = [item.mediaUrl];
      } catch {
        images = [item.mediaUrl];
      }
    }

    return (
      <View style={[styles.messageRow, isMine ? styles.rowReverse : styles.rowNormal]}>
        <View style={[styles.bubble, isMine ? styles.bubbleRight : styles.bubbleLeft]}>
          {!isMine && <Text style={styles.sender}>{item.sender}</Text>}

          {images.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {images.map((img, idx) => (
                <TouchableOpacity key={idx} onPress={() => openImageViewer(images, idx)}>
                  <Image source={{ uri: resolveMediaUrl(img) }} style={styles.mediaImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          ) : item.mediaType === 'video' && item.mediaUrl ? (
            <Video
              source={{ uri: resolveMediaUrl(item.mediaUrl) }}
              style={styles.mediaVideo}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
            />
          ) : (
            <Text style={styles.messageText}>{item.text}</Text>
          )}

          <Text style={styles.timeText}>{dayjs(item.timestamp).format('HH:mm')}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        {selectedUserProfile ? (
          <Image source={{ uri: selectedUserProfile }} style={styles.profilePic} />
        ) : null}
        <Text style={styles.headerTitle}>{selectedUsername}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => renderMessage(item)}
          contentContainerStyle={styles.messageList}
        />

        <View style={styles.inputRow}>
          <TouchableOpacity onPress={handlePickMedia} style={styles.mediaButton}>
            <Text style={styles.mediaButtonText}>＋</Text>
          </TouchableOpacity>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="พิมพ์ข้อความ..."
            placeholderTextColor="#666"
            style={styles.input}
          />
          <Button title="ส่ง" onPress={handleSend} />
          {uploading && <ActivityIndicator style={{ marginLeft: 8 }} />}
        </View>
      </KeyboardAvoidingView>

      <ImageViewing
        images={imageGallery.map((uri) => ({ uri }))}
        imageIndex={currentIndex}
        visible={isViewerVisible}
        onRequestClose={() => setViewerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  backButton: {
    fontSize: 24,
    color: '#333',
    marginRight: 10,
  },
  profilePic: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  messageList: { paddingVertical: 10 },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },
  rowReverse: { justifyContent: 'flex-end' },
  rowNormal: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: '#00cbfeff',
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 18,
  },
  bubbleLeft: {
    backgroundColor: '#ffadfaff',
  },
  sender: { fontSize: 10, color: '#575757ff', marginBottom: 4 },
  messageText: { color: '#000', fontSize: 16, fontWeight: '500' },
  timeText: {
    fontSize: 10,
    color: '#575757ff',
    marginTop: 4,
    textAlign: 'right',
  },
  mediaImage: {
    width: (width - 100) / 3,
    height: (width - 100) / 3,
    borderRadius: 10,
    margin: 4,
    backgroundColor: '#eaeaea',
  },
  mediaVideo: {
    width: 240,
    height: 200,
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: '#000',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 10,
    backgroundColor: '#f0f0f0',
    color: '#000',
  },
  mediaButton: {
    padding: 10,
  },
  mediaButtonText: {
    color: '#007aff',
    fontSize: 20,
  },
});