// สถานะข้อความ (Message Status)
export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

// ประเภทของข้อความ (Message Type)
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  SYSTEM = 'system',
}

// ข้อความระบบ (System Messages)
export const SYSTEM_MESSAGES = {
  USER_JOINED: 'ได้เข้าร่วมการแชท',
  USER_LEFT: 'ได้ออกจากห้องแชท',
  MESSAGE_DELETED: 'คุณลบข้อความนี้แล้ว',
};

// สถานะพิมพ์
export const TYPING_INDICATOR_TIMEOUT = 3000; // ms

// อีเวนต์สำหรับ Socket.io (ใช้ร่วมกับ backend)
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  TYPING: 'typing',
};
