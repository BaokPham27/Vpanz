// routes/userRoutes.js – FILE DUY NHẤT CHO USER, ĐÃ GỘP + HOÀN HẢN
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect: auth } = require('../middleware/authMiddleware'); // ← GIỮ NGUYÊN, ĐANG CHẠY TỐT

// 1. TÌM KIẾM NGƯỜI DÙNG + LẤY DANH SÁCH (giữ nguyên code bạn đang dùng – rất tốt!)
router.get('/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();

    const searchQuery = q
      ? {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } }
        ],
        _id: { $ne: req.user._id }
      }
      : { _id: { $ne: req.user._id } };

    const users = await User.find(searchQuery)
      .select('name email avatarURL _id')
      .sort({ name: 1 })
      .limit(q ? 30 : 100)
      .lean();

    const formatted = users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      avatarURL: u.avatarURL && u.avatarURL.trim() !== '' ? u.avatarURL : null
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Lỗi tìm kiếm người dùng:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. THÊM MỚI: CẬP NHẬT HỒ SƠ (TÊN + AVATAR)
router.patch('/me', auth, async (req, res) => {
  try {
    const { name, avatarURL, password, role } = req.body;
    const updates = {};

    if (name !== undefined && name.trim()) updates.name = name.trim();
    if (avatarURL !== undefined) updates.avatarURL = avatarURL || null;
    if (role && ['student', 'teacher'].includes(role)) updates.role = role;

    // Đổi mật khẩu
    if (password && password.trim().length >= 6) {
      const bcrypt = require('bcryptjs');
      updates.password = await bcrypt.hash(password.trim(), 10);
    } else if (password && password.trim().length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải từ 6 ký tự' });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarURL: user.avatarURL || null,
        role: user.role,
      }
    });
  } catch (err) {
    console.error('Lỗi cập nhật profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
