// routes/books.js – PHIÊN BẢN MYSQL2 HOÀN HẢO 2025
const express = require('express');
const router = express.Router();
const db = require('../db'); // mysql2/promise connection
const { protect, admin } = require('../middleware/authMiddleware'); // Dùng middleware xác thực + admin

// ==================== 1. TẠO SÁCH MỚI (chỉ admin) ====================
router.post('/', protect, admin, async (req, res) => {
  const { title, author, level, coverImage } = req.body;

  if (!title?.trim() || !author?.trim()) {
    return res.status(400).json({ message: 'Tiêu đề và tác giả là bắt buộc' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO books (title, author, level, coverImage) 
       VALUES (?, ?, ?, ?)`,
      [title.trim(), author.trim(), level || 'N5', coverImage || null]
    );

    res.status(201).json({
      id: result.insertId,
      title: title.trim(),
      author: author.trim(),
      level: level || 'N5',
      coverImage: coverImage || null,
      chapters: 0
    });
  } catch (err) {
    console.error('Lỗi tạo sách:', err);
    res.status(500).json({ message: 'Lỗi server khi tạo sách' });
  }
});

// ==================== 2. LẤY DANH SÁCH TẤT CẢ SÁCH ====================
router.get('/', async (req, res) => {
  try {
    const [books] = await db.query(`
      SELECT 
        b.id,
        b.title,
        b.author,
        b.level,
        b.coverImage,
        COUNT(c.id) AS chaptersCount
      FROM books b
      LEFT JOIN chapters c ON c.bookId = b.id
      GROUP BY b.id
      ORDER BY b.createdAt DESC
    `);

    const formatted = books.map(book => ({
      id: book.id,
      _id: book.id.toString(),
      title: book.title,
      author: book.author,
      level: book.level || 'N5',
      coverImage: book.coverImage,
      chapters: book.chaptersCount,
      firstChapterId: null // sẽ được fill ở route chi tiết nếu cần
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Lỗi lấy danh sách sách:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== 3. LẤY CHI TIẾT SÁCH + DANH SÁCH CHƯƠNG ====================
router.get('/:bookId', async (req, res) => {
  const { bookId } = req.params;

  try {
    const [books] = await db.query(
      `SELECT id, title, author, level, coverImage FROM books WHERE id = ?`,
      [bookId]
    );

    if (books.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sách' });
    }

    const book = books[0];

    const [chapters] = await db.query(
      `SELECT id, chapterNumber, title, illustration 
       FROM chapters 
       WHERE bookId = ? 
       ORDER BY chapterNumber ASC`,
      [bookId]
    );

    res.json({
      _id: book.id,
      id: book.id,
      title: book.title,
      author: book.author,
      level: book.level || 'N5',
      coverImage: book.coverImage,
      chapters: chapters.map(ch => ({
        _id: ch.id,
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        illustration: ch.illustration
      })),
      totalChapters: chapters.length
    });
  } catch (err) {
    console.error('Lỗi lấy chi tiết sách:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== 4. LẤY NỘI DUNG CHƯƠNG + TIẾN ĐỘ ĐỌC (có đăng nhập) ====================
router.get('/:bookId/chapters/:chapterId', protect, async (req, res) => {
  const { chapterId } = req.params;
  const userId = req.user.id;

  try {
    const [chapters] = await db.query(
      `SELECT c.*, b.title AS bookTitle, b.author AS bookAuthor
       FROM chapters c
       JOIN books b ON c.bookId = b.id
       WHERE c.id = ?`,
      [chapterId]
    );

    if (chapters.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy chương' });
    }

    const chapter = chapters[0];

    // Lấy tiến độ đọc của user
    const [progress] = await db.query(
      `SELECT lastPosition, completed FROM reading_progress 
       WHERE userId = ? AND chapterId = ?`,
      [userId, chapterId]
    );

    const userProgress = progress[0] || { lastPosition: 0, completed: false };

    res.json({
      chapter: {
        _id: chapter.id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        content: chapter.content,
        illustration: chapter.illustration,
        book: {
          title: chapter.bookTitle,
          author: chapter.bookAuthor
        }
      },
      currentPosition: userProgress.lastPosition,
      completed: userProgress.completed
    });
  } catch (err) {
    console.error('Lỗi lấy chapter:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== 5. LẤY CHƯƠNG THEO SỐ THỨ TỰ (dễ dùng hơn) ====================
router.get('/:bookId/chapter/:chapterNumber', async (req, res) => {
  const { bookId, chapterNumber } = req.params;

  try {
    const [chapters] = await db.query(
      `SELECT id, chapterNumber, title, illustration, content 
       FROM chapters 
       WHERE bookId = ? AND chapterNumber = ?`,
      [bookId, parseInt(chapterNumber)]
    );

    if (chapters.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy chương' });
    }

    res.json(chapters[0]);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== 6. LƯU TIẾN ĐỘ ĐỌC ====================
router.post('/progress', protect, async (req, res) => {
  const { chapterId, position } = req.body;
  const userId = req.user.id;

  if (!chapterId || position === undefined) {
    return res.status(400).json({ message: 'Thiếu chapterId hoặc position' });
  }

  try {
    await db.query(
      `INSERT INTO reading_progress (userId, chapterId, lastPosition, completed)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         lastPosition = VALUES(lastPosition),
         completed = VALUES(completed)`,
      [userId, chapterId, position, position >= 95 ? 1 : 0]
    );

    res.json({ success: true, message: 'Đã lưu tiến độ đọc' });
  } catch (err) {
    console.error('Lỗi lưu tiến độ:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== 7. SỬA SÁCH (chỉ admin) ====================
router.patch('/:bookId', protect, admin, async (req, res) => {
  const { bookId } = req.params;
  const { title, author, level, coverImage } = req.body;

  if (!title && !author && !level && !coverImage) {
    return res.status(400).json({ message: 'Cần ít nhất 1 trường để cập nhật' });
  }

  try {
    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title.trim()); }
    if (author !== undefined) { updates.push('author = ?'); values.push(author.trim()); }
    if (level !== undefined) { updates.push('level = ?'); values.push(level); }
    if (coverImage !== undefined) { updates.push('coverImage = ?'); values.push(coverImage); }

    values.push(bookId);

    await db.query(
      `UPDATE books SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [updated] = await db.query('SELECT * FROM books WHERE id = ?', [bookId]);

    res.json({
      id: updated[0].id,
      title: updated[0].title,
      author: updated[0].author,
      level: updated[0].level,
      coverImage: updated[0].coverImage
    });
  } catch (err) {
    console.error('Lỗi sửa sách:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== 8. XÓA SÁCH (chỉ admin) ====================
router.delete('/:bookId', protect, admin, async (req, res) => {
  const { bookId } = req.params;

  try {
    // Xóa tiến độ đọc trước
    await db.query('DELETE FROM reading_progress WHERE chapterId IN (SELECT id FROM chapters WHERE bookId = ?)', [bookId]);
    // Xóa chapters
    await db.query('DELETE FROM chapters WHERE bookId = ?', [bookId]);
    // Xóa sách
    const [result] = await db.query('DELETE FROM books WHERE id = ?', [bookId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sách để xóa' });
    }

    res.json({ success: true, message: 'Đã xóa sách và tất cả dữ liệu liên quan' });
  } catch (err) {
    console.error('Lỗi xóa sách:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;