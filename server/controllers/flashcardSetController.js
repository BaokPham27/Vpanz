// controllers/flashcardSetController.js – MYSQL2 + JSON COLUMN (2025) – FULL HOẠT ĐỘNG

const db = require('../db');

// Hàm siêu an toàn – parse mọi giá trị JSON (string, Buffer, null, '', 'null', lỗi parse)
const safeJsonParse = (value, fallback = []) => {
  if (!value) return fallback;

  // Nếu value không phải string, ép về string (Buffer / object)
  if (typeof value !== 'string') {
    try {
      value = value.toString();
    } catch (err) {
      return fallback;
    }
  }

  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return fallback;

  try {
    return JSON.parse(trimmed);
  } catch (err) {
    console.warn('JSON parse failed, using fallback:', trimmed);
    return fallback;
  }
};

// ==================== USER: LẤY BỘ CỦA MÌNH ====================
const getMyFlashcardSets = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         s.id, s.title, s.description, s.tags, s.level, s.isPublic,
         s.flashcards, JSON_LENGTH(s.flashcards) AS flashcardsCount,
         s.createdAt, s.updatedAt,
         u.id AS ownerId, u.name AS ownerName, u.email AS ownerEmail, u.avatarURL
       FROM flashcard_sets s
       JOIN users u ON s.ownerId = u.id
       WHERE s.ownerId = ?
       ORDER BY s.updatedAt DESC`,
      [req.user.id]
    );

    const sets = rows.map(row => {
      const flashcardsArray = safeJsonParse(row.flashcards);
      return {
        id: row.id,
        title: row.title || 'Không có tiêu đề',
        description: row.description || '',
        tags: safeJsonParse(row.tags),
        level: row.level || 'N5',
        isPublic: !!row.isPublic,
        flashcards: flashcardsArray,
        flashcardsCount: flashcardsArray.length,
        owner: {
          id: row.ownerId,
          name: row.ownerName || 'Người dùng',
          email: row.ownerEmail || '',
          avatarURL: row.avatarURL || '/default-avatar.png'
        },
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };
    });

    res.json(sets);
  } catch (err) {
    console.error('Error in getMyFlashcardSets:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// ==================== LẤY BỘ CÔNG KHAI ====================
const getPublicFlashcardSets = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.id, s.title, s.description, s.tags, s.level,
              s.flashcards, JSON_LENGTH(s.flashcards) AS flashcardsCount,
              u.name AS ownerName, u.avatarURL
       FROM flashcard_sets s
       JOIN users u ON s.ownerId = u.id
       WHERE s.isPublic = 1
       ORDER BY s.createdAt DESC
       LIMIT 50`
    );

    const sets = rows.map(row => ({
      id: row.id,
      title: row.title || 'Không có tiêu đề',
      description: row.description || '',
      tags: safeJsonParse(row.tags),
      level: row.level || 'N5',
      flashcards: safeJsonParse(row.flashcards),
      flashcardsCount: safeJsonParse(row.flashcards).length,
      owner: {
        name: row.ownerName || 'Người dùng',
        avatarURL: row.avatarURL || '/default-avatar.png'
      }
    }));

    res.json(sets);
  } catch (err) {
    console.error('Error in getPublicFlashcardSets:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// ==================== LẤY CHI TIẾT 1 BỘ ====================
const getFlashcardSetById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT s.*, u.name AS ownerName, u.email, u.avatarURL,
              JSON_LENGTH(s.flashcards) AS flashcardsCount
       FROM flashcard_sets s
       JOIN users u ON s.ownerId = u.id
       WHERE s.id = ?`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy bộ flashcard' });

    const set = rows[0];
    const isOwner = set.ownerId === req.user.id;
    if (!isOwner && !set.isPublic) return res.status(403).json({ message: 'Không có quyền xem bộ này' });

    const flashcardsArray = safeJsonParse(set.flashcards);

    res.json({
      id: set.id,
      title: set.title || 'Không có tiêu đề',
      description: set.description || '',
      tags: safeJsonParse(set.tags),
      level: set.level || 'N5',
      isPublic: !!set.isPublic,
      flashcards: flashcardsArray,
      flashcardsCount: flashcardsArray.length,
      owner: {
        id: set.ownerId,
        name: set.ownerName || 'Người dùng',
        email: set.email || '',
        avatarURL: set.avatarURL || '/default-avatar.png'
      },
      createdAt: set.createdAt,
      updatedAt: set.updatedAt
    });
  } catch (err) {
    console.error('Error in getFlashcardSetById:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// ==================== TẠO BỘ MỚI ====================
const createFlashcardSet = async (req, res) => {
  const { title, description = '', tags = [], level = 'N5', isPublic = false } = req.body;

  if (!title?.trim()) return res.status(400).json({ message: 'Tiêu đề là bắt buộc' });

  try {
    const [result] = await db.query(
      `INSERT INTO flashcard_sets 
       (ownerId, title, description, tags, level, isPublic, flashcards)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title.trim(), description, JSON.stringify(tags), level, isPublic ? 1 : 0, '[]']
    );

    res.status(201).json({
      id: result.insertId,
      title: title.trim(),
      description,
      tags,
      level,
      isPublic,
      flashcards: [],
      flashcardsCount: 0
    });
  } catch (err) {
    console.error('Error in createFlashcardSet:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// ==================== CẬP NHẬT BỘ ====================
const updateFlashcardSet = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const [rows] = await db.query('SELECT ownerId FROM flashcard_sets WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy bộ' });
    if (rows[0].ownerId !== req.user.id) return res.status(403).json({ message: 'Không có quyền' });

    const fields = [];
    const values = [];
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title.trim()); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
    if (updates.level !== undefined) { fields.push('level = ?'); values.push(updates.level); }
    if (updates.isPublic !== undefined) { fields.push('isPublic = ?'); values.push(updates.isPublic ? 1 : 0); }

    if (fields.length === 0) return res.status(400).json({ message: 'Không có gì để cập nhật' });

    values.push(id);
    await db.query(`UPDATE flashcard_sets SET ${fields.join(', ')}, updatedAt = NOW() WHERE id = ?`, values);

    const [newRows] = await db.query('SELECT * FROM flashcard_sets WHERE id = ?', [id]);
    const set = newRows[0];
    const flashcardsArray = safeJsonParse(set.flashcards);

    res.json({
      id: set.id,
      title: set.title || 'Không có tiêu đề',
      description: set.description || '',
      tags: safeJsonParse(set.tags),
      level: set.level || 'N5',
      isPublic: !!set.isPublic,
      flashcards: flashcardsArray,
      flashcardsCount: flashcardsArray.length
    });
  } catch (err) {
    console.error('Error in updateFlashcardSet:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// ==================== XÓA BỘ ====================
const deleteFlashcardSet = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT ownerId FROM flashcard_sets WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Không tìm thấy bộ' });
    if (rows[0].ownerId !== req.user.id) return res.status(403).json({ message: 'Không có quyền' });

    await db.query('DELETE FROM flashcard_sets WHERE id = ?', [id]);
    res.json({ success: true, message: 'Đã xóa bộ flashcard' });
  } catch (err) {
    console.error('Error in deleteFlashcardSet:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// ==================== ADMIN: LẤY TẤT CẢ BỘ ====================
const getAllFlashcardSetsAdmin = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, u.name AS ownerName, u.email, u.avatarURL,
              JSON_LENGTH(s.flashcards) AS flashcardsCount
       FROM flashcard_sets s
       JOIN users u ON s.ownerId = u.id
       ORDER BY s.createdAt DESC`
    );

    const sets = rows.map(row => ({
      ...row,
      tags: safeJsonParse(row.tags),
      flashcards: safeJsonParse(row.flashcards),
      flashcardsCount: safeJsonParse(row.flashcards).length,
      owner: {
        name: row.ownerName || 'Người dùng',
        email: row.email || '',
        avatarURL: row.avatarURL || '/default-avatar.png'
      }
    }));

    res.json(sets);
  } catch (err) {
    console.error('Error in getAllFlashcardSetsAdmin:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const adminUpdateFlashcardSet = async (req, res) => updateFlashcardSet(req, res);
const adminDeleteFlashcardSet = async (req, res) => deleteFlashcardSet(req, res);

module.exports = {
  getMyFlashcardSets,
  getPublicFlashcardSets,
  getFlashcardSetById,
  createFlashcardSet,
  updateFlashcardSet,
  deleteFlashcardSet,
  getAllFlashcardSetsAdmin,
  adminUpdateFlashcardSet,
  adminDeleteFlashcardSet
};
