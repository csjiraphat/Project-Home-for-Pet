import API from "../android/app/src/config";

export type CommentDTO = {
  id: number;
  post_id: number;
  post_type: "fh" | "fp";
  parent_id: number | null;
  user: string;
  content: string;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
  profilePicture?: string | null;
};

function pickComments(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.comments)) return payload.comments;
  if (payload.data && Array.isArray(payload.data.comments)) return payload.data.comments;
  return [];
}

export async function getComments(postType: "fh" | "fp", postId: number, username: string): Promise<CommentDTO[]> {
  const url = `${API.COMMENTS_LIST}?post_type=${postType}&post_id=${postId}&username=${encodeURIComponent(username || "")}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { comments: [] }; }
    console.log("DEBUG[getComments] url=", url, "resp=", data);
    const list = pickComments(data);
    return list as CommentDTO[];
  } catch (err) {
    console.error("getComments error:", err);
    return [];
  }
}

export async function addComment(params: {
  post_type: "fh" | "fp";
  post_id: number;
  parent_id?: number | null;
  user: string;
  content: string;
}) {
  const body = JSON.stringify(params);
  console.log("DEBUG[addComment] body=", body);
  const res = await fetch(API.COMMENTS_CREATE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = {}; }
  console.log("DEBUG[addComment] resp=", data);
  return data;
}

export async function toggleLike(commentId: number, username: string) {
  const res = await fetch(`${API.COMMENTS_LIKE}?id=${commentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = {}; }
  console.log("DEBUG[toggleLike] id=", commentId, "resp=", data);
  return data;
}
