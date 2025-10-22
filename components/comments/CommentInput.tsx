import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from "react-native";

const CommentInput: React.FC<{ onSubmit: (text: string) => Promise<void>; placeholder?: string; autoFocus?: boolean; }> = ({ onSubmit, placeholder, autoFocus }) => {
  const [text, setText] = useState("");

  const send = async () => {
    if (!text.trim()) return;
    await onSubmit(text);
    setText("");
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        placeholder={placeholder || "เขียนความคิดเห็น..."}
        value={text}
        onChangeText={setText}
        autoFocus={autoFocus}
      />
      <TouchableOpacity style={styles.btn} onPress={send}>
        <Text style={styles.btnText}>ส่ง</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10 },
  btn: { backgroundColor: "#10b981", paddingHorizontal: 16, borderRadius: 8, justifyContent: "center" },
  btnText: { color: "#fff", fontWeight: "700" }
});

export default CommentInput;
