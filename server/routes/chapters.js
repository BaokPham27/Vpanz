// routes/chapters.js – PHIÊN BẢN MYSQL2 HOÀN HẢO 2025
const express = require('express');
const router = express.Router();
const db = require('../db'); // mysql2/promise connection
const { protect, admin } = require('../middleware/authMiddleware'); // Chỉ admin được thêm/sửa/xóa chapter

// ==================== THÊM CHAPTER MỚI (chỉ admin) ====================
router.post('/', protect, admin, async (req, res) => {
  const { bookId, chapterNumber, title, illustration, content } = req.body;

  // Kiểm tra đầy đủ dữ liệu
  if (!bookId || !chapterNumber || !title?.trim() || !illustration || !content || !Array.isArray(content) || content.length === 0) {
    return res.status(400).json({
      message: 'Thiếu hoặc sai định dạng: bookId, chapterNumber, title, illustration, content (phải là mảng)'
    });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // 1. Kiểm tra book có tồn tại không
    const [books] = await conn.query('SELECT id, title FROM books WHERE id = ?', [bookId]);
    if (books.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Không tìm thấy sách với bookId này!' });
    }
    const book = books[0];

    // 2. Kiểm tra chapterNumber đã tồn tại chưa
    const [existing] = await conn.query(
      'SELECT id FROM chapters WHERE bookId = ? AND chapterNumber = ?',
      [bookId, chapterNumber]
    );
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(400).json({
        message: `Chương ${chapterNumber} đã tồn tại trong sách "${book.title}"!`
      });
    }

    // 3. Lưu content dưới dạng JSON
    const contentJSON = JSON.stringify(content);

    // 4. Tạo chapter mới
    const [result] = await conn.query(
      `INSERT INTO chapters 
       (bookId, chapterNumber, title, illustration, content, createdAt) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [bookId, chapterNumber, title.trim(), illustration, contentJSON]
    );

    await conn.commit();

    // 5. Trả về chapter vừa tạo (đã có thông tin book)
    res.status(201).json({
      message: 'Thêm chương thành công!',
      chapter: {
        id: result.insertId,
        bookId: bookId,
        book: {
          id: book.id,
          title: book.title
        },
        chapterNumber,
        title: title.trim(),
        illustration,
        content: content, // trả về mảng JS (không phải JSON string)
        createdAt: new Date()
      }
    });

  } catch (err) {
    await conn.rollback();
    console.error('Lỗi khi thêm chapter:', err);
    res.status(500).json({ message: 'Lỗi server khi thêm chương', error: err.message });
  } finally {
    conn.release();
  }
});

// ==================== SỬA CHAPTER (chỉ admin) ====================
router.patch('/:chapterId', protect, admin, async (req, res) => {
  const { chapterId } = req.params;
  const { chapterNumber, title, illustration, content } = req.body;

  if (!chapterNumber && !title && !illustration && !content) {
    return res.status(400).json({ message: 'Cần ít nhất 1 trường để cập nhật' });
  }

  try {
    const [chapters] = await db.query(
      'SELECT c.*, b.title AS bookTitle FROM chapters c JOIN books b ON c.bookId = b.id WHERE c.id = ?',
      [chapterId]
    );

    if (chapters.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy chương này' });
    }

    const chapter = chapters[0];

    // Nếu sửa chapterNumber → kiểm tra trùng
    if (chapterNumber && chapterNumber !== chapter.chapterNumber) {
      const [dup] = await db.query(
        'SELECT id FROM chapters WHERE bookId = ? AND chapterNumber = ? AND id != ?',
        [chapter.bookId, chapterNumber, chapterId]
      );
      if (dup.length > 0) {
        return res.status(400).json({ message: `Chương ${chapterNumber} đã tồn tại trong sách này!` });
      }
    }

    const updates = [];
    const values = [];

    if (chapterNumber !== undefined) { updates.push('chapterNumber = ?'); values.push(chapterNumber); }
    if (title !== undefined) { updates.push('title = ?'); values.push(title.trim()); }
    if (illustration !== undefined) { updates.push('illustration = ?'); values.push(illustration); }
    if (content !== undefined) {
      if (!Array.isArray(content)) {
        return res.status(400).json({ message: 'Content phải là mảng!' });
      }
      updates.push('content = ?');
      values.push(JSON.stringify(content));
    }

    values.push(chapterId);

    await db.query(
      `UPDATE chapters SET ${updates.join(', ')}, updatedAt = NOW() WHERE id = ?`,
      values
    );

    // Trả về chapter đã cập nhật
    const [updated] = await db.query(
      'SELECT c.*, b.title AS bookTitle FROM chapters c JOIN books b ON c.bookId = b.id WHERE c.id = ?',
      [chapterId]
    );

    const newChapter = updated[0];
    res.json({
      message: 'Cập nhật chương thành công!',
      chapter: {
        id: newChapter.id,
        book: { title: newChapter.bookTitle },
        chapterNumber: newChapter.chapterNumber,
        title: newChapter.title,
        illustration: newChapter.illustration,
        content: JSON.parse(newChapter.content || '[]'),
        updatedAt: newChapter.updatedAt
      }
    });

  } catch (err) {
    console.error('Lỗi sửa chapter:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== XÓA CHAPTER (chỉ admin) ====================
router.delete('/:chapterId', protect, admin, async (req, res) => {
  const { chapterId } = req.params;

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // Xóa tiến độ đọc của user trước
    await conn.query('DELETE FROM reading_progress WHERE chapterId = ?', [chapterId]);

    // Xóa chapter
    const [result] = await conn.query('DELETE FROM chapters WHERE id = ?', [chapterId]);

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Không tìm thấy chương để xóa' });
    }

    await conn.commit();
    res.json({ success: true, message: 'Đã xóa chương và tiến độ đọc liên quan' });
  } catch (err) {
    await conn.rollback();
    console.error('Lỗi xóa chapter:', err);
    res.status(500).json({ message: 'Lỗi server khi xóa chương' });
  } finally {
    conn.release();
  }
});

module.exports = router;