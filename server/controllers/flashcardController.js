// controllers/flashcardController.js – MYSQL2, flashcards riêng, setId riêng, easeFactor cho SM-2

const db = require('../db'); // mysql2/promise
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

// ==================== MULTER CONFIG ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/flashcards');
    fs.mkdir(uploadDir, { recursive: true }).catch(() => {});
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `flashcard-${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Chỉ chấp nhận ảnh JPEG/PNG/GIF/WebP'));
};

const upload = multer({ storage, fileFilter });

// ==================== TẠO FLASHCARD MỚI ====================
const createFlashcard = async (req, res) => {
  const { vocabulary, phonetic, meaning } = req.body;
  const setIdRaw = req.body.setId || req.params.setId;
  const setId = parseInt(setIdRaw, 10);
  const imagePath = req.file ? `/uploads/flashcards/${req.file.filename}` : null;

  if (!setIdRaw || isNaN(setId)) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ message: 'Set ID không hợp lệ' });
  }

  if (!vocabulary?.trim() || !meaning?.trim()) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ message: 'Thiếu từ vựng hoặc nghĩa' });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    // Kiểm tra quyền sở hữu set
    const [sets] = await conn.query(
      `SELECT ownerId FROM flashcard_sets WHERE id = ? FOR UPDATE`,
      [setId]
    );
    if (sets.length === 0) {
      await conn.rollback();
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ message: 'Không tìm thấy bộ flashcard' });
    }
    if (sets[0].ownerId !== req.user.id) {
      await conn.rollback();
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(403).json({ message: 'Không có quyền' });
    }

    // Tạo flashcard mới với setId và easeFactor mặc định 2.5
    const [result] = await conn.query(
      `INSERT INTO flashcards (vocabulary, phonetic, meaning, image, createdBy, createdAt, setId, easeFactor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [vocabulary.trim(), phonetic?.trim() || '', meaning.trim(), imagePath, req.user.id, new Date(), setId, 2.5]
    );

    await conn.commit();
    res.status(201).json({
      id: result.insertId,
      vocabulary,
      phonetic,
      meaning,
      image: imagePath,
      createdBy: req.user.id,
      createdAt: new Date(),
      setId,
      easeFactor: 2.5
    });
  } catch (err) {
    await conn.rollback();
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    console.error('Lỗi tạo flashcard:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  } finally {
    conn.release();
  }
};

// ==================== LẤY FLASHCARD TRONG SET ====================
const getFlashcardsForSet = async (req, res) => {
  const setIdRaw = req.params.id;
  const setId = parseInt(setIdRaw, 10);
  if (isNaN(setId)) {
    console.log('Set ID không hợp lệ:', setIdRaw);
    return res.status(400).json({ message: 'Set ID không hợp lệ' });
  }

  try {
    // Kiểm tra quyền truy cập set
    const querySet = `SELECT ownerId, isPublic FROM flashcard_sets WHERE id = ?`;
    console.log('[SQL] Kiểm tra set:', querySet, 'Params:', [setId]);
    const [sets] = await db.query(querySet, [setId]);

    if (sets.length === 0) {
      console.log('Không tìm thấy bộ flashcard với setId:', setId);
      return res.status(404).json({ message: 'Không tìm thấy bộ flashcard' });
    }

    const set = sets[0];
    const isOwner = set.ownerId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin && !set.isPublic) {
      console.log('Không có quyền xem set:', setId, 'userId:', req.user.id);
      return res.status(403).json({ message: 'Không có quyền xem' });
    }

    // Lấy flashcards theo setId
    const queryFlashcards = `SELECT * FROM flashcards WHERE setId = ?`;
    console.log('[SQL] Lấy flashcards:', queryFlashcards, 'Params:', [setId]);
    const [flashcards] = await db.query(queryFlashcards, [setId]);

    console.log(`Lấy được ${flashcards.length} flashcards cho setId=${setId}`);
    res.json({ ...set, flashcards });
  } catch (err) {
    console.error('Lỗi server khi lấy flashcards:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};


// ==================== CẬP NHẬT FLASHCARD ====================
const updateFlashcard = async (req, res) => {
  const { flashcardId } = req.params;
  const { vocabulary, phonetic, meaning } = req.body;
  const newImage = req.file ? `/uploads/flashcards/${req.file.filename}` : null;

  try {
    const [cards] = await db.query(`SELECT * FROM flashcards WHERE id = ?`, [flashcardId]);
    if (cards.length === 0) return res.status(404).json({ message: 'Không tìm thấy flashcard' });
    const card = cards[0];
    if (card.createdBy !== req.user.id) return res.status(403).json({ message: 'Không có quyền' });

    if (newImage && card.image) await fs.unlink(path.join(__dirname, '..', card.image)).catch(() => {});

    await db.query(
      `UPDATE flashcards SET vocabulary = ?, phonetic = ?, meaning = ?, image = ? WHERE id = ?`,
      [
        vocabulary?.trim() || card.vocabulary,
        phonetic?.trim() || card.phonetic,
        meaning?.trim() || card.meaning,
        newImage || card.image,
        flashcardId
      ]
    );

    res.json({ ...card, vocabulary, phonetic, meaning, image: newImage || card.image });
  } catch (err) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    console.error(err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ==================== XÓA FLASHCARD ====================
const deleteFlashcard = async (req, res) => {
  const { flashcardId } = req.params;

  try {
    const [cards] = await db.query(`SELECT * FROM flashcards WHERE id = ?`, [flashcardId]);
    if (cards.length === 0) return res.status(404).json({ message: 'Không tìm thấy flashcard' });
    const card = cards[0];
    if (card.createdBy !== req.user.id) return res.status(403).json({ message: 'Không có quyền' });

    if (card.image) await fs.unlink(path.join(__dirname, '..', card.image)).catch(() => {});
    await db.query(`DELETE FROM flashcards WHERE id = ?`, [flashcardId]);

    res.json({ success: true, message: 'Đã xóa flashcard' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ==================== LẤY FLASHCARDS THEO SET ID (CHO POSTMAN / API) ====================
const getFlashcardsBySetId = async (req, res) => {
  const setIdRaw = req.params.id;
  const setId = parseInt(setIdRaw, 10);
  if (isNaN(setId)) return res.status(400).json({ message: 'Set ID không hợp lệ' });

  try {
    const [flashcards] = await db.query(
      `SELECT * FROM flashcards WHERE setId = ?`,
      [setId]
    );

    res.json(flashcards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  createFlashcard,
  getFlashcardsForSet,
  updateFlashcard,
  deleteFlashcard,
  getFlashcardsBySetId,
  upload // xuất để dùng middleware upload trong route
};
