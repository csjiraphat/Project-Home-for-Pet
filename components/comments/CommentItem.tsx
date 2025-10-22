import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import type { CommentDTO } from "../../services/comments";
import API from "../../android/app/src/config";

type Props = {
  item: CommentDTO & { children?: CommentDTO[] };
  depth?: number;
  onReplyPress: (c: CommentDTO) => void;
  onLikePress: (id: number) => Promise<void>;
};

function toAvatarUri(raw?: string | null) {
  if (!raw) return null;
  // ถ้าเป็น URL เต็มอยู่แล้ว ใช้ได้เลย
  if (/^https?:\/\//i.test(raw)) return `${raw}?t=${Date.now()}`;
  // กรณีเป็นแค่ไฟล์เนม เช่น "profile_xxx.jpeg" → ต่อด้วย API.PROFILE_PIC_PATH
  const base = API.PROFILE_PIC_PATH?.replace(/\/$/, "") || "";
  return `${base}/${raw}?t=${Date.now()}`;
}

const CommentItem: React.FC<Props> = ({ item, depth = 0, onReplyPress, onLikePress }) => {
  const [optimisticLiked, setOptimisticLiked] = useState(item.liked_by_me);
  const [optimisticCount, setOptimisticCount] = useState(item.like_count);

  const avatarUri = useMemo(() => toAvatarUri(item.profilePicture), [item.profilePicture]);

  const handleLike = async () => {
    setOptimisticLiked((v) => !v);
    setOptimisticCount((n) => (optimisticLiked ? n - 1 : n + 1));
    await onLikePress(item.id).catch(() => {
      setOptimisticLiked(item.liked_by_me);
      setOptimisticCount(item.like_count);
    });
  };

  return (
    <View style={[styles.container, { marginLeft: depth * 16 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <Image source={require("../../assets/default-avatar.jpg")} style={styles.avatar} />
        )}
        <Text style={styles.user}>{item.user}</Text>
      </View>
      <Text style={styles.content}>{item.content}</Text>
      <View style={styles.row}>
        <TouchableOpacity onPress={handleLike}>
          <Text style={styles.action}>{optimisticLiked ? "♥" : "♡"} {optimisticCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onReplyPress(item)}>
          <Text style={styles.action}>ตอบกลับ</Text>
        </TouchableOpacity>
        <Text style={styles.time}>{new Date(item.created_at).toLocaleString("th-TH")}</Text>
      </View>
      {item.children?.map((child) => (
        <CommentItem key={child.id} item={child} depth={depth + 1} onReplyPress={onReplyPress} onLikePress={onLikePress}/>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: 8, borderBottomWidth: 1, borderColor: "#eee" },
  user: { fontWeight: "700", marginLeft: 8 },
  content: { marginVertical: 6, color: "#111" },
  row: { flexDirection: "row", gap: 16, alignItems: "center" },
  action: { color: "#2563eb", fontWeight: "600" },
  time: { marginLeft: "auto", color: "#666", fontSize: 12 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#e5e7eb" }
});

export default CommentItem;
