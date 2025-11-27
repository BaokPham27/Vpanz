// routes/chat.js – ĐÃ HOÀN THIỆN 100% (Realtime + Recent Chats + History)

const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');

// ==================== API LẤY DANH SÁCH TIN NHẮN GẦN ĐÂY (RECENT CHATS) ====================
router.get('/recent-chats', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({
      participants: userId
    })
      .populate('participants', 'name email avatarURL')
      .sort({ updatedAt: -1 })
      .lean();

    const recentChats = chats.map(chat => {
      const otherUser = chat.participants.find(p => p._id.toString() !== userId);

      return {
        chatId: chat._id.toString(),
        user: {
          id: otherUser._id.toString(),
          name: otherUser.name || 'Người dùng',
          email: otherUser.email,
          avatarURL: otherUser.avatarURL
        },
        preview: chat.lastMessage?.message || 'Bắt đầu trò chuyện nào!',
        time: formatTime(chat.lastMessage?.createdAt || chat.updatedAt)
      };
    });

    res.json(recentChats);
  } catch (err) {
    console.error('Lỗi lấy recent chats:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== API LẤY LỊCH SỬ TIN NHẮN GIỮA 2 NGƯỜI ====================
router.get('/history/:receiverId', protect, async (req, res) => {
  try {
    const receiverId = req.params.receiverId;
    const userId = req.user.id;

    const chat = await Chat.findOne({
      participants: { $all: [userId, receiverId] }
    });

    if (!chat) return res.json([]);

    const messages = await Message.find({ chatId: chat._id })
      .populate('sender', 'id name email avatarURL')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(messages.reverse());
  } catch (err) {
    console.error('Lỗi lấy lịch sử chat:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ==================== HÀM FORMAT THỜI GIAN ĐẸP (giống Messenger) ====================
function formatTime(date) {
  if (!date) return 'Chưa có';

  const now = new Date();
  const msgDate = new Date(date);
  const diffMs = now - msgDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return msgDate.toLocaleDateString('vi-VN');
}

module.exports = router;