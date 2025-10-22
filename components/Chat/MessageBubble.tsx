import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

type Props = {
  message: {
    id: string;
    content: string;
    sender: string;
    timestamp: string;
    profileImage?: string;
  };
  isMe: boolean;
  timestamp: string;
};

const MessageBubble: React.FC<Props> = ({ message, isMe, timestamp }) => {
  return (
    <View style={[styles.bubbleContainer, isMe ? styles.right : styles.left]}>
      {!isMe && (
        <Image
          source={require('../../assets/default-avatar.jpg')}
          style={styles.avatar}
        />
      )}
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        <Text style={styles.text}>{message.content}</Text>
        <Text style={styles.time}>{timestamp}</Text>
      </View>
    </View>
  );
};

export default MessageBubble;

const styles = StyleSheet.create({
  bubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 3,
    paddingHorizontal: 10,
  },
  left: {
    justifyContent: 'flex-start',
  },
  right: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: '#0084ff',
    marginLeft: 50,
    borderBottomRightRadius: 0,
  },
  bubbleOther: {
    backgroundColor: '#E5E5EA',
    marginRight: 5,
    borderBottomLeftRadius: 0,
  },
  text: {
    color: '#999',
    fontSize: 16,
  },
  time: {
    fontSize: 10,
    color: '#e0e0e0',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
});
