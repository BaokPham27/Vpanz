// routes/chat.js – PHIÊN BẢN MYSQL2 2025 (2025) – CHẠY NGON TRÊN HOSTING
const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat'); // ← model MySQL2 mình đã gửi trước đó
const { protect } = require('../middleware/authMiddleware');

// ==================== 1. LẤY DANH SÁCH CHAT GẦN ĐÂY (RECENT CHATS) ====================
router.get('/recent-chats', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const recentChats = await Chat.getUserChats(userId); // ← hàm MySQL2

    // Format thời gian đẹp như Messenger
    const formatted = recentChats.map(chat => ({
      chatId: chat.chatId.toString(),
      user: {
        id: chat.otherUser.id.toString(),
        name: chat.otherUser.name || 'Người dùng',
        email: chat.otherUser.email || '',
        avatarURL: chat.otherUser.avatarURL || '/default-avatar.png'
      },
      preview: chat.lastMessage ? chat.lastMessage.text : 'Bắt đầu trò chuyện nào!',
      time: formatTime(chat.lastMessage ? chat.lastMessage.sentAt : chat.updatedAt),
      unreadCount: chat.unreadCount || 0
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Lỗi lấy recent chats:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== 2. LẤY LỊCH SỬ TIN NHẮN GIỮA 2 NGƯỜI ====================
router.get('/history/:receiverId', protect, async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.receiverId;

    // 1. Tìm hoặc tạo chat 1-1
    const chatId = await Chat.findOrCreateOneOnOne(senderId, receiverId);

    // 2. Lấy tin nhắn (mới nhất trước)
    const messages = await Chat.getMessages(chatId, senderId, 50);

    // Format lại cho frontend dễ dùng
    const formattedMessages = messages.map(msg => ({
      _id: msg.id.toString(),
      chatId: msg.chatId.toString(),
      sender: {
        id: msg.senderId.toString(),
        name: msg.senderName,
        avatarURL: msg.avatarURL
      },
      message: msg.message,
      messageType: msg.messageType,
      createdAt: msg.createdAt,
      isMine: msg.senderId === senderId
    }));

    res.json(formattedMessages);
  } catch (err) {
    console.error('Lỗi lấy lịch sử chat:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== 3. GỬI TIN NHẮN MỚI ====================
router.post('/send', protect, async (req, res) => {
  {
  try {
    const { receiverId, message, messageType = 'text' } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !message?.trim()) {
      return res.status(400).json({ message: 'Thiếu thông tin' });
    }

    // Tìm hoặc tạo chat
    const chatId = await Chat.findOrCreateOneOnOne(senderId, receiverId);

    // Gửi tin nhắn
    const newMsg = await Chat.sendMessage(chatId, senderId, message.trim(), messageType);

    // Trả về tin nhắn vừa gửi (dùng cho Socket.IO broadcast luôn)
    res.json({
      success: true,
      message: {
        ...newMsg,
        chatId: chatId.toString(),
        senderId: senderId.toString(),
        isMine: true
      }
    });
  } catch (err) {
    {
    console.error('Lỗi gửi tin nhắn:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
}});

// ==================== HÀM FORMAT THỜI GIAN ĐẸP (giống Messenger) ====================
function formatTime(dateStr) {
  if (!dateStr) return 'Chưa có';

  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

module.exports = router;