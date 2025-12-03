// routes/flashcards.js – PHIÊN BẢN HOÀN HẢO 2025 (ĐÃ FIX MULTER + PROTECT)

const express = require('express');
const router = express.Router();

// ==================== MIDDLEWARE ====================
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload'); // ← CHỈ IMPORT TỪ ĐÂY, KHÔNG ĐƯỢC IMPORT TỪ CONTROLLER!

// ==================== CONTROLLERS ====================
const {
  createFlashcard,
  getFlashcardsForSet,
  addFlashcardToSet,
  updateFlashcard,
  getFlashcardsBySetId,
  deleteFlashcard,
} = require('../controllers/flashcardController');

const {
  createFlashcardSet,
  getMyFlashcardSets,
  getPublicFlashcardSets,
  getFlashcardSetById,
  updateFlashcardSet,
  deleteFlashcardSet,
} = require('../controllers/flashcardSetController');

// ============================== FLASHCARD SET ROUTES ==============================

// Lấy danh sách bộ flashcard của mình
router.get('/my-sets', protect, getMyFlashcardSets);

// Lấy danh sách bộ flashcard công khai (không cần login)
router.get('/public-sets', getPublicFlashcardSets);

// Tạo bộ flashcard mới
router.post('/sets', protect, createFlashcardSet);

// Lấy chi tiết 1 bộ flashcard (của mình hoặc công khai)
router.get('/sets/:setId', protect, getFlashcardSetById);

// Cập nhật bộ flashcard (chỉ chủ sở hữu)
router.patch('/sets/:setId', protect, updateFlashcardSet);

// Xóa bộ flashcard (chỉ chủ sở hữu hoặc admin)
router.delete('/sets/:setId', protect, deleteFlashcardSet);

// ============================== FLASHCARD ROUTES (trong Set) ==============================

// Lấy tất cả flashcard trong 1 set
router.get('/sets/:id/flashcards', protect, getFlashcardsForSet);

// THÊM FLASHCARD MỚI VÀO SET (CÓ UPLOAD ẢNH) – ĐÃ FIX 100%
// routes/flashcards.js – DÁN NGUYÊN ĐOẠN NÀY (đã fix 100%)
router.post(
  '/sets/:setId/flashcards',
  protect,
  (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      upload.single('image')(req, res, (err) => {
        if (err) return res.status(400).json({ message: 'Lỗi upload ảnh', error: err.message });
        next();
      });
    } else {
      upload.none()(req, res, next);
    }
  },
  createFlashcard
);
// CẬP NHẬT FLASHCARD (CÓ THỂ THAY ẢNH)
router.put(
  '/sets/:setId/flashcards/:flashcardId',
  protect,
  upload.single('image'),
  updateFlashcard
);

// XÓA FLASHCARD KHỎI SET
router.delete(
  '/sets/:setId/flashcards/:flashcardId',
  protect,
  deleteFlashcard
);

// ============================== ADMIN ROUTES ==============================
// Admin xóa bất kỳ set nào
router.delete('/admin/sets/:setId', protect, admin, deleteFlashcardSet);

module.exports = router;