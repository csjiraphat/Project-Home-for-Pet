// 📂 components/Chat/InputBar.tsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useChat } from '../../context/ChatContext';

type InputBarProps = {
  onSend: (text: string) => void;
  onImageSend?: (uri: string) => void;
  onTyping?: (typing: boolean) => void;
};

const InputBar: React.FC<InputBarProps> = ({
  onSend,
  onImageSend,
  onTyping,
}) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0 && onImageSend) {
      onImageSend(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickImage} style={styles.mediaButton}>
        <Text style={styles.icon}>📎</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="พิมพ์ข้อความ..."
        value={text}
        onChangeText={(value) => {
          setText(value);
          if (onTyping) onTyping(true);
        }}
        onBlur={() => onTyping?.(false)}
        multiline
      />
      <TouchableOpacity style={styles.button} onPress={handleSend}>
        <Text style={styles.buttonText}>ส่ง</Text>
      </TouchableOpacity>
    </View>
  );
};

export default InputBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
  },
  button: {
    marginLeft: 10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    borderRadius: 20,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  mediaButton: {
    marginRight: 10,
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
});