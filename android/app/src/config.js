const HOST = 'http://192.168.0.107:80';
const CHAT = 'http://192.168.0.107:3001';


const BASE_URL = `${HOST}/db_fhomepet`;
const ADMIN_BASE = `${HOST}/admin`;
const CHAT_BASE_URL = `${CHAT}`; 

const API = {
  BASE_URL,
  CHAT_BASE_URL,
  ADMIN_BASE,

  // ---------- Users / Profile ----------
  USERS: `${BASE_URL}/users/users.php`,
  UPLOAD_PROFILE: `${BASE_URL}/users/upload.php`,
  PROFILE_PIC_PATH: `${BASE_URL}/users/uploads/profile`,

  // ---------- Posts (FH / FP) ----------
  POST_FIND_HOME: `${BASE_URL}/post/findHome.php`, 
  POST_FIND_PET: `${BASE_URL}/post/findPet.php`, 
  POST_UPDATE_STATUS: `${BASE_URL}/post/updatePostStatus.php`, 

  // อัปโหลดสื่อ/พาธไฟล์อัปโหลด
  UPLOAD_MEDIA: `${BASE_URL}/post/upload.php`,
  UPLOAD_PATH: `${BASE_URL}/post/uploads/`,

  // ค้นหาโพสต์ (ถ้ามี)
  SEARCH_POST: `${BASE_URL}/post/search_posts.php`,

  // อัปเดต/ลบ (ถ้าคุณใช้ไฟล์เดียวกันกับ POST_* ข้างบน ก็ชี้ไฟล์เดิมได้)
  POST_UPDATE_HOME: `${BASE_URL}/post/findHome.php`,
  POST_UPDATE_PET: `${BASE_URL}/post/findPet.php`,
  POST_DELETE_HOME: `${BASE_URL}/post/findHome.php`,
  POST_DELETE_PET: `${BASE_URL}/post/findPet.php`,

  // ---------- Master (Breed/Vaccine/Terms/Etc.) ----------
  MASTER_READ: `${BASE_URL}/post/master_read_api.php`,

  // ---------- Matching (ใหม่) ----------
  // ใช้แบบ:  GET  `${API.MATCH_POSTS}?mode=from_fh&id=FH_ID`
  //          GET  `${API.MATCH_POSTS}?mode=from_fp&id=FP_ID`
  MATCH_POSTS: `${BASE_URL}/post/match_posts.php`,
  GET_MATCH_HISTORY: `${BASE_URL}/post/get_match_history.php`,

  // ---------- Comments ----------
  COMMENTS_LIST: `${BASE_URL}/comments/list.php`,
  COMMENTS_CREATE: `${BASE_URL}/comments/create.php`,
  COMMENTS_LIKE: `${BASE_URL}/comments/like.php`,
  COMMENTS_REPLIES: `${BASE_URL}/comments/replies.php`,

  // ---------- Report Posts ----------
  REPORT_POST: `${BASE_URL}/report/report_post.php`,
  REPORT_REASONS: `${BASE_URL}/report/report_reasons.php`,

    // ============= Notifications (NEW) =============
  GET_NOTIFICATIONS: `${BASE_URL}/report/api_get_notifications.php`, // 👈 NEW
  MARK_NOTIFICATION_READ: `${BASE_URL}/report/api_mark_notification_as_read.php`, // 👈 NEW
  GET_UNREAD_COUNT: `${BASE_URL}/report/api_get_unread_count.php`,

  // ============= Articles (ใหม่) =============
  ARTICLES: `${BASE_URL}/article/article.php`,
  ARTICLE_IMAGE: `${ADMIN_BASE}/uploads/`,
  ARTICLE_IMAGE_PATH: `${new URL(BASE_URL).origin}/admin/uploads/`,
};

// helper สำหรับต่อ query string
export const buildQuery = (params = {}) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

export default API;
