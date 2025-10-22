import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { getComments, addComment, toggleLike, CommentDTO } from "../../services/comments";
import CommentItem from "./CommentItem";
import CommentInput from "./CommentInput";
import { useUser } from "../../context/UserContext";

type Props = { postType: "fh" | "fp"; postId: number };

function buildTree(items: CommentDTO[]) {
  const byId: Record<number, any> = {};
  const roots: any[] = [];
  items.forEach((c) => (byId[c.id] = { ...c, children: [] }));
  items.forEach((c) => {
    if (c.parent_id) byId[c.parent_id]?.children.push(byId[c.id]);
    else roots.push(byId[c.id]);
  });
  return roots;
}

const CommentList: React.FC<Props> = ({ postType, postId }) => {
  const { user } = useUser();
  const [list, setList] = useState<CommentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<CommentDTO | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getComments(postType, postId, user?.username || "");
      console.log("DEBUG[CommentList] fetched=", data);
      setList(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [postId, postType]);

  const tree = useMemo(() => buildTree(list), [list]);

  const submitRoot = async (text: string) => {
    await addComment({ post_type: postType, post_id: postId, user: user?.username!, content: text });
    await load();
  };

  const submitReply = async (text: string) => {
    if (!replyTo) return;
    await addComment({ post_type: postType, post_id: postId, user: user?.username!, content: text, parent_id: replyTo.id });
    setReplyTo(null);
    await load();
  };

  const like = async (id: number) => { await toggleLike(id, user?.username!); };

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>ความคิดเห็น</Text>
      {loading ? (
        <ActivityIndicator />
      ) : tree.length === 0 ? (
        <View style={{ paddingVertical: 8 }}>
          <Text style={{ color: "#6b7280" }}>ยังไม่มีความคิดเห็น ลองพิมพ์อันแรกดูสิ</Text>
          <CommentInput onSubmit={submitRoot} />
        </View>
      ) : (
        <>
          {tree.map((c) => (
            <CommentItem key={c.id} item={c} onReplyPress={setReplyTo} onLikePress={like} />
          ))}
          <CommentInput onSubmit={submitRoot} />
          {replyTo && (
            <View style={styles.replyBox}>
              <Text style={styles.replyLabel}>ตอบกลับ: {replyTo.user}</Text>
              <CommentInput onSubmit={submitReply} autoFocus placeholder="ตอบกลับ..." />
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  header: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  replyBox: { marginTop: 12, padding: 10, borderWidth: 1, borderColor: "#ccc", borderRadius: 8 },
  replyLabel: { fontWeight: "700", marginBottom: 6 }
});

export default CommentList;
