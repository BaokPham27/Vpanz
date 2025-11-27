// socket.js – CHAT + NOTIFICATION REALTIME – PHIÊN BẢN HOÀN HẢO
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Chat = require('./models/Chat');
const Message = require('./models/Message');
const Notification = require('./models/Notification'); // notifications
const uaParser = require('ua-parser-js'); // optional, nếu cần phân tích UA

// ==================== HỖ TRỢ FORMAT TIME ====================
function formatTimeAgo(date) {
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 172800) return 'Hôm qua';
  return `${Math.floor(diff / 86400)} ngày trước`;
}

// ==================== SEND NOTIFICATION ====================
async function sendNotification(io, userId, { title, message, type = 'system', data = {} }) {
  try {
    const notif = await Notification.create({
      userId,
      title,
      message,
      type,
      data
    });

    const payload = {
      _id: notif._id,
      title,
      message,
      type,
      data,
      read: false,
      time: formatTimeAgo(notif.createdAt)
    };

    // Gửi realtime nếu user online
    io.to(userId.toString()).emit('newNotification', payload);
  } catch (err) {
    console.error('Lỗi gửi thông báo:', err);
  }
}

// ==================== INIT SOCKET ====================
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  const onlineUsers = new Map(); // userId → socket

  // Middleware xác thực token
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vpan_secret_2025');
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id.toString();
    console.log('User connected:', userId);

    onlineUsers.set(userId, socket);
    socket.join(userId); // room riêng cho notification

    // ==================== JOIN TẤT CẢ CHAT ROOM ====================
    const chats = await Chat.find({ participants: userId }).select('_id');
    chats.forEach(chat => socket.join(chat._id.toString()));

    // ==================== SEND ONLINE USERS ====================
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));

// ==================== RECENT CHATS – ĐÃ FIX LỖI 100% ====================
const sendRecentChats = async () => {
  try {
    const chats = await Chat.find({ participants: userId })
      .populate('participants', 'name email avatarURL')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean(); // QUAN TRỌNG: dùng .lean() để tránh lỗi proxy

    const formatted = chats
      .filter(chat => chat && chat.participants && chat.participants.length > 0) // lọc chat hỏng
      .map(chat => {
        // Tìm người còn lại (trong 1-1 chat)
        const other = chat.participants.find(p =>
          p && p._id && p._id.toString() !== userId
        );

        // Nếu không tìm thấy (chat nhóm hoặc lỗi) → lấy người đầu tiên
        const fallbackUser = chat.participants.find(p => p && p._id) || {};

        const targetUser = other || fallbackUser;

        return {
          chatId: chat._id.toString(),
          user: {
            id: targetUser._id?.toString() || 'unknown',
            name: targetUser.name || 'Người dùng đã xóa',
            email: targetUser.email || '',
            avatarURL: targetUser.avatarURL && targetUser.avatarURL.trim() !== ''
              ? targetUser.avatarURL
              : null
          },
          preview: chat.lastMessage?.message || 'Đã gửi một tin nhắn',
          lastMessageAt: chat.lastMessage?.createdAt || chat.updatedAt || new Date()
        };
      })
      // LOẠI BỎ chat của chính mình (self-chat)
      .filter(item => item.user.id !== userId);

    socket.emit('recentChats', formatted);
  } catch (err) {
    console.error('Lỗi load recent chats:', err);
    socket.emit('recentChats', []); // gửi mảng rỗng nếu lỗi
  }
};

    sendRecentChats();
    socket.on('getRecentChats', sendRecentChats);

    // ==================== SEND MESSAGE ====================
    socket.on('sendMessage', async ({ receiverId, message }) => {
      if (!message?.trim()) return;
      try {
        // 1. Tìm hoặc tạo chat
        let chat = await Chat.findOne({ participants: { $all: [userId, receiverId] } });
        if (!chat) chat = await Chat.create({ participants: [userId, receiverId] });

        chat.lastMessage = { message: message.trim(), createdAt: new Date() };
        chat.updatedAt = new Date();
        await chat.save();

        // 2. Tạo message
        const newMsg = await Message.create({
          chatId: chat._id,
          sender: userId,
          message: message.trim()
        });

        const populated = await Message.findById(newMsg._id)
          .populate('sender', 'name email')
          .lean();

        const payload = {
          _id: populated._id.toString(),
          message: populated.message,
          createdAt: populated.createdAt,
          sender: {
            id: populated.sender._id.toString(),
            name: populated.sender.name || 'User',
            email: populated.sender.email
          },
          chatId: chat._id.toString()
        };

        // Emit cho cả room chat
        io.to(chat._id.toString()).emit('newMessage', payload);

        // Update recent chats cho cả 2 user
        [userId, receiverId].forEach(id => {
          const sock = onlineUsers.get(id);
          if (sock) sock.emit('getRecentChats');
        });

      } catch (err) {
        console.error('Lỗi gửi tin nhắn:', err);
      }
    });

    // ==================== NOTIFICATIONS ====================
    socket.on('getNotifications', async () => {
      try {
        const notifs = await Notification.find({ userId })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();

        const formatted = notifs.map(n => ({
          _id: n._id,
          title: n.title,
          message: n.message,
          type: n.type,
          data: n.data,
          read: n.read,
          time: formatTimeAgo(n.createdAt)
        }));

        socket.emit('notificationsList', formatted);
      } catch (err) {
        console.error('Lỗi load notifications:', err);
      }
    });

    // ==================== DISCONNECT ====================
    socket.on('disconnect', () => {
      console.log('User disconnected:', userId);
      onlineUsers.delete(userId);
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    });
  });

  // Export function sendNotification để dùng ở route khác
  io.sendNotification = sendNotification;
  return io;
}

module.exports = { initSocket };
