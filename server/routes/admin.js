// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // mysql2/promise connection của bạn
const { protect, admin } = require('../middleware/authMiddleware');

// ==================== THỐNG KÊ DASHBOARD ====================
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days) || 30);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);

    // Format ngày cho SQL
    const formatDate = (date) => date.toISOString().slice(0, 10);
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    const [rows] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) AS totalUsers,
        (SELECT COUNT(*) FROM books) AS totalBooks,
        (SELECT COUNT(*) FROM flashcard_sets) AS totalSets,
        (SELECT COALESCE(SUM(JSON_LENGTH(flashcards)), 0) FROM flashcard_sets) AS totalFlashcards
    `);

    const { totalUsers, totalBooks, totalSets, totalFlashcards } = rows[0];

    // Người dùng mới theo ngày
    const [userGrowth] = await db.query(`
      SELECT 
        DATE_FORMAT(createdAt, '%m-%d') AS date,
        COUNT(*) AS count
      FROM users 
      WHERE createdAt >= ? AND createdAt <= ?
      GROUP BY DATE(createdAt)
      ORDER BY DATE(createdAt) ASC
    `, [startDate, endDate]);

    // Flashcard được tạo theo ngày (dựa vào createdAt của Set)
    const [flashcardGrowth] = await db.query(`
      SELECT 
        DATE_FORMAT(fs.createdAt, '%m-%d') AS date,
        COALESCE(SUM(JSON_LENGTH(fs.flashcards)), 0) AS count
      FROM flashcard_sets fs
      WHERE fs.createdAt >= ? AND fs.createdAt <= ?
      GROUP BY DATE(fs.createdAt)
      ORDER BY DATE(fs.createdAt) ASC
    `, [startDate, endDate]);

    // Tạo mảng đầy đủ các ngày
    const labels = [];
    const userData = [];
    const flashcardData = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(endDate.getDate() - i);
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      labels.push(label);

      const u = userGrowth.find(x => x.date === label);
      userData.push(u?.count || 0);

      const f = flashcardGrowth.find(x => x.date === label);
      flashcardData.push(Number(f?.count) || 0);
    }

    res.json({
      totalUsers,
      totalBooks,
      totalFlashcardSets: totalSets,
      totalFlashcards,
      chartData: {
        labels,
        datasets: [
          { label: 'Người dùng mới', data: userData },
          { label: 'Flashcard được tạo', data: flashcardData }
        ]
      }
    });

  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== LẤY THÔNG BÁO HỆ THỐNG ====================
router.get('/notifications', protect, admin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT title, message, createdAt 
      FROM notifications 
      WHERE type = 'system' 
      ORDER BY createdAt DESC 
      LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    console.error('Lỗi lấy thông báo:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== GỬI THÔNG BÁO HỆ THỐNG ====================
router.post('/notifications', protect, admin, async (req, res) => {
  const { title, message } = req.body;
  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ message: 'Thiếu tiêu đề hoặc nội dung' });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    const [users] = await conn.query(`SELECT id FROM users`);
    const values = users.map(u => [u.id, title.trim(), message.trim(), 'system', false, JSON.stringify({ sentByAdmin: true })]);

    if (values.length > 0) {
      await conn.query(`
        INSERT INTO notifications (userId, title, message, type, read, data)
        VALUES ?
      `, [values]);
    }

    await conn.commit();
    res.status(201).json({
      success: true,
      totalSent: users.length,
      title: title.trim(),
      message: message.trim()
    });
  } catch (err) {
    await conn.rollback();
    console.error('Gửi thông báo lỗi:', err);
    res.status(500).json({ message: 'Gửi thất bại' });
  } finally {
    conn.release();
  }
});

// ==================== DANH SÁCH FLASHCARD SET (ADMIN) ====================
router.get('/flashcard-sets', protect, admin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const q = req.query.q ? `%${req.query.q.trim()}%` : null;
    const sort = req.query.sort || 'newest';

    let orderBy = 'fs.createdAt DESC';
    if (sort === 'oldest') orderBy = 'fs.createdAt ASC';
    if (sort === 'mostCards') orderBy = 'flashcardsCount DESC';

    const whereClause = q ? `WHERE fs.title LIKE ?` : '';
    const params = q ? [q] : [];

    const [sets] = await db.query(`
      SELECT 
        fs.id,
        fs.title,
        fs.description,
        fs.tags,
        fs.level,
        fs.isPublic,
        fs.createdAt,
        fs.updatedAt,
        fs.ownerId,
        u.name AS ownerName,
        u.email AS ownerEmail,
        u.avatarURL,
        COALESCE(JSON_LENGTH(fs.flashcards), 0) AS flashcardsCount,
        JSON_EXTRACT(fs.flashcards, '$[0]') AS sample1,
        JSON_EXTRACT(fs.flashcards, '$[1]') AS sample2,
        JSON_EXTRACT(fs.flashcards, '$[2]') AS sample3,
        JSON_EXTRACT(fs.flashcards, '$[3]') AS sample4,
        JSON_EXTRACT(fs.flashcards, '$[4]') AS sample5
      FROM flashcard_sets fs
      LEFT JOIN users u ON fs.ownerId = u.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const [totalRows] = await db.query(`
      SELECT COUNT(*) AS total 
      FROM flashcard_sets fs
      ${whereClause}
    `, params);

    // Lấy 5 flashcard mẫu (nếu cần hiển thị chi tiết)
    const formatted = sets.map(set => ({
      ...set,
      owner: {
        name: set.ownerName,
        email: set.ownerEmail,
        avatarURL: set.avatarURL
      },
      flashcardsCount: set.flashcardsCount,
      flashcards: [set.sample1, set.sample2, set.sample3, set.sample4, set.sample5]
        .filter(Boolean)
        .map(item => JSON.parse(item || '{}'))
    }));

    res.json({
      page,
      limit,
      totalCount: totalRows[0].total,
      totalPages: Math.ceil(totalRows[0].total / limit),
      data: formatted
    });

  } catch (err) {
    console.error('Admin get flashcard sets error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;