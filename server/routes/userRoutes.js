// routes/userRoutes.js – MYSQL2 HOÀN HẢO 2025
const express = require('express');
const router = express.Router();
const db = require('../db'); // mysql2/promise
const bcrypt = require('bcryptjs');
const { protect, admin } = require('../middleware/authMiddleware');

// ==================== 1. TÌM KIẾM NGƯỜI DÙNG ====================
router.get('/search', protect, async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const limit = q ? 30 : 100;

  try {
    const whereClause = q
      ? `WHERE (u.name LIKE ? OR u.email LIKE ?) AND u.id != ?`
      : `WHERE u.id != ?`;

    const searchParam = q ? `%${q}%` : null;
    const params = q ? [searchParam, searchParam, req.user.id] : [req.user.id];

    const [users] = await db.query(
      `SELECT u.id, u.name, u.email, u.avatarURL, u.role 
       FROM users u
       ${whereClause}
       ORDER BY u.name ASC
       LIMIT ?`,
      [...params, limit]
    );

    const formatted = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatarURL: u.avatarURL && u.avatarURL.trim() !== '' ? u.avatarURL : null,
      role: u.role
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Lỗi tìm kiếm người dùng:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== 2. CẬP NHẬT HỒ SƠ CỦA CHÍNH MÌNH ====================
router.patch('/me', protect, async (req, res) => {
  const { name, avatarURL, password, role } = req.body;
  const updates = [];
  const values = [];

  if (name !== undefined && name.trim()) {
    updates.push('name = ?');
    values.push(name.trim());
  }
  if (avatarURL !== undefined) {
    updates.push('avatarURL = ?');
    values.push(avatarURL || null);
  }
  if (role && ['student', 'teacher'].includes(role)) {
    updates.push('role = ?');
    values.push(role);
  }

  // Đổi mật khẩu
  if (password) {
    if (password.trim().length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải từ 6 ký tự' });
    }
    const hashed = await bcrypt.hash(password.trim(), 10);
    updates.push('password = ?');
    values.push(hashed);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
  }

  values.push(req.user.id);

  try {
    await db.query(
      `UPDATE users SET ${updates.join(', ')}, updatedAt = NOW() WHERE id = ?`,
      values
    );

    const [rows] = await db.query(
      `SELECT id, name, email, avatarURL, role FROM users WHERE id = ?`,
      [req.user.id]
    );

    const user = rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarURL: user.avatarURL || null,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Lỗi cập nhật profile:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== 3. ADMIN: SỬA USER KHÁC ====================
router.patch('/:id', protect, admin, async (req, res) => {
  const { id } = req.params;
  const { name, email, role, password } = req.body;
  const updates = [];
  const values = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name?.trim() || null); }
  if (email !== undefined) { updates.push('email = ?'); values.push(email?.toLowerCase().trim() || null); }
  if (role && ['student', 'teacher', 'admin'].includes(role)) {
    updates.push('role = ?');
    values.push(role);
  }

  if (password && password.length >= 6) {
    const hashed = await bcrypt.hash(password, 10);
    updates.push('password = ?');
    values.push(hashed);
  } else if (password && password.length < 6) {
    return res.status(400).json({ message: 'Mật khẩu phải từ 6 ký tự' });
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'Không có dữ liệu để cập nhật' });
  }

  values.push(id);

  try {
    const [result] = await db.query(
      `UPDATE users SET ${updates.join(', ')}, updatedAt = NOW() WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    const [rows] = await db.query(
      `SELECT id, name, email, avatarURL, role FROM users WHERE id = ?`,
      [id]
    );

    const user = rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarURL: user.avatarURL || null,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Lỗi admin sửa user:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== 4. ADMIN: XÓA USER ====================
router.delete('/:id', protect, admin, async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id.toString()) {
    return res.status(400).json({ message: 'Không thể tự xóa chính mình' });
  }

  try {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    // Xóa dữ liệu liên quan (nếu cần)
    await Promise.all([
      db.query('DELETE FROM flashcard_sets WHERE ownerId = ?', [id]),
      db.query('DELETE FROM reading_progress WHERE userId = ?', [id]),
      db.query('DELETE FROM notifications WHERE userId = ?', [id]),
    ]);

    res.json({ success: true, message: 'Đã xóa user và dữ liệu liên quan' });
  } catch (err) {
    console.error('Lỗi xóa user:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;