const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const CHAT_HISTORY_FILE = path.join(__dirname, 'chat-history.json');

if (!fs.existsSync(CHAT_HISTORY_FILE)) {
  fs.writeFileSync(CHAT_HISTORY_FILE, '{}');
  console.log('✅ สร้างไฟล์ chat-history.json ใหม่');
}

let chatHistory = {};
try {
  const fileData = fs.readFileSync(CHAT_HISTORY_FILE, 'utf-8');
  chatHistory = JSON.parse(fileData || '{}');
  console.log('✅ โหลดประวัติแชทสำเร็จ');
} catch (err) {
  console.error('❌ โหลดไฟล์แชทล้มเหลว:', err);
  chatHistory = {};
}

// ---------- Helpers for media URL normalization ----------
const UPLOAD_BASE_PATH = '/uploads';

function toRelativeUrl(u) {
  if (!u) return u;
  try {
    // If it's a JSON array string of urls, map each one
    if (typeof u === 'string' && u.trim().startsWith('[')) {
      const arr = JSON.parse(u);
      if (Array.isArray(arr)) {
        const mapped = arr.map(x => toRelativeUrl(x));
        return JSON.stringify(mapped);
      }
    }
  } catch (_) {
    // Not a JSON array - fall through
  }

  if (typeof u !== 'string') return u;

  // Already relative
  if (u.startsWith('/')) return u;

  // Absolute -> strip scheme+host, keep from /uploads onward (if present)
  try {
    const urlObj = new URL(u);
    const idx = urlObj.pathname.indexOf('/uploads/');
    if (idx >= 0) {
      return urlObj.pathname.substring(idx);
    }
  } catch (_) {
    // Not a valid URL - try simple contains
    const i = u.indexOf('/uploads/');
    if (i >= 0) return u.substring(i);
  }

  // Fall back to return as-is
  return u;
}

function normalizeMessageMedia(payload) {
  if (!payload) return payload;
  if (payload.mediaUrl) {
    payload.mediaUrl = toRelativeUrl(payload.mediaUrl);
  }
  return payload;
}

function persistHistory() {
  try {
    fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
  } catch (err) {
    console.error('❌ เขียนไฟล์ล้มเหลว:', err);
  }
}

function saveChatMessage(msg) {
  const key = [msg.sender, msg.receiver].sort().join('__');
  if (!chatHistory[key]) chatHistory[key] = [];
  chatHistory[key].push(msg);
  persistHistory();
  console.log(`✅ บันทึกข้อความสำเร็จใน key: ${key}`);
}

// ---------- One-time migration on startup ----------
(function migrateHistory() {
  let changed = false;
  for (const [key, messages] of Object.entries(chatHistory)) {
    for (const m of messages) {
      const before = m.mediaUrl;
      const after = toRelativeUrl(before);
      if (before !== after) {
        m.mediaUrl = after;
        changed = true;
      }
    }
  }
  if (changed) {
    persistHistory();
    console.log('🔧 Migrated chat-history mediaUrl to relative paths.');
  } else {
    console.log('ℹ️ No migration needed for chat-history.');
  }
})();

// ✅ ดึงประวัติแชทระหว่าง 2 คน
app.get('/chat/:user1/:user2', (req, res) => {
  const { user1, user2 } = req.params;
  const key = [user1, user2].sort().join('__');
  console.log(`📥 API GET: ดึงประวัติ ${key}`);
  res.json(chatHistory[key] || []);
});

// ✅ ระบบอัปโหลดไฟล์ภาพ/วิดีโอ
const storage = multer.diskStorage({
  destination: (_, file, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /^image\/|^video\//.test(file.mimetype);
    cb(ok ? null : new Error('Only image/video allowed'), ok);
  },
});
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
  const url = `${UPLOAD_BASE_PATH}/${req.file.filename}`; // Return relative path
  console.log('📤 Uploaded:', req.file.filename, mediaType);
  res.json({ url, mediaType });
});

// Healthcheck
app.get('/health', (_, res) => res.json({ ok: true }));

// ✅ WebSocket: socket.io
io.on('connection', (socket) => {
  socket.on('join', (username) => {
    socket.join(username);
    console.log(`✅ ${username} joined`);
  });

  socket.on('chat-message', (msg) => {
    console.log('📨 ได้รับข้อความ:', msg);
    const { sender, receiver, text, mediaType, mediaUrl, timestamp } = msg;

    if (!sender || !receiver) return;

    const isTextValid = !!(text && String(text).trim());
    const isMediaValid = mediaType && mediaUrl;

    if (isTextValid || isMediaValid) {
      const payload = normalizeMessageMedia({
        sender,
        receiver,
        text: text || '',
        mediaType: mediaType || null,
        mediaUrl: mediaUrl || null,
        timestamp: timestamp || new Date().toISOString(),
      });
      saveChatMessage(payload);
      io.to(receiver).emit('chat-message', payload);
      io.to(sender).emit('chat-message', payload);
    }
  });
});

// ✅ API: ดึงรายชื่อคนที่เคยแชทกับผู้ใช้ (ไม่รวมตัวเอง)
app.get('/api/chat-users', (req, res) => {
  const currentUser = req.query.username;
  if (!currentUser) {
    return res.status(400).json({ error: 'Missing username' });
  }

  try {
    const result = [];

    for (const [key, messages] of Object.entries(chatHistory)) {
      if (!key.includes(currentUser)) continue;

      const lastMsg = messages[messages.length - 1];
      const otherUser =
        lastMsg.sender === currentUser ? lastMsg.receiver : lastMsg.sender;

      if (otherUser === currentUser) continue;
      if (result.find((entry) => entry.username === otherUser)) continue;

      result.push({
        username: otherUser,
        profileUrl: `/uploads/${otherUser}.jpg`, // placeholder; client can override
        lastMessage:
          lastMsg.text ||
          (lastMsg.mediaType === 'image'
            ? 'ส่งรูปภาพ'
            : lastMsg.mediaType === 'video'
            ? 'ส่งวิดีโอ'
            : ''),
        lastMessageTime: lastMsg.timestamp,
      });
    }

    res.json(result);
  } catch (err) {
    console.error('❌ ดึงรายชื่อแชทล้มเหลว:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงรายชื่อแชท' });
  }
});

// ✅ เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Chat server running on http://localhost:${PORT}`);
});
