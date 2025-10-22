import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChatList } from '../../../context/ChatListProvider';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { SafeAreaView, Platform, StatusBar } from 'react-native';
import BottomBar from '../../../components/BottomBar';
import { useFocusEffect } from '@react-navigation/native';

dayjs.locale('th');





type RootStackParamList = {
  ChatRoomScreen: { selectedUsername: string; selectedUserProfile?: string };
};

const ChatListScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { chatUsers } = useChatList();
  const { setHasNewMessage } = useChatList();

  useFocusEffect(
    React.useCallback(() => {
      setHasNewMessage(false);
    }, [])
  );

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() =>
        navigation.navigate('ChatRoomScreen', {
          selectedUsername: item.username,
          selectedUserProfile: item.profileUrl,
        })
      }
    >
      <Image
        source={
          item.profileUrl
            ? { uri: item.profileUrl }
            : require('../../../assets/default-avatar.jpg')
        }
        style={styles.avatar}
      />

      <View style={styles.contentWrapper}>
        <View style={styles.headerRow}>
          <Text style={styles.username} numberOfLines={1}>
            {item.username}
          </Text>
          <Text style={styles.timeText}>
            {item.lastMessageTime ? dayjs(item.lastMessageTime).format('HH:mm') : ''}
          </Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage || 'เริ่มต้นแชทเลย'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        data={chatUsers}
        keyExtractor={(item) => item.username}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <BottomBar />
    </SafeAreaView>
  );
};

export default ChatListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  itemContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    maxWidth: '80%',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 84,
  },
});
