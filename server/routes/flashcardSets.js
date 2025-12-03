// routes/flashcardSets.js – MYSQL2 VERSION 2025
const express = require('express');
const router = express.Router();

// ==================== CONTROLLERS ====================
const {
  getMyFlashcardSets,
  getPublicFlashcardSets,
  getFlashcardSetById,
  createFlashcardSet,
  updateFlashcardSet,
  deleteFlashcardSet,
  getAllFlashcardSetsAdmin,
  adminUpdateFlashcardSet,
  adminDeleteFlashcardSet,
} = require('../controllers/flashcardSetController');

const {
  getFlashcardsForSet,
} = require('../controllers/flashcardController');

// ==================== MIDDLEWARE ====================
const { protect, admin } = require('../middleware/authMiddleware');

// ==================== ADMIN ROUTES ====================
// Đặt trước các route dynamic để tránh conflict
router.get('/admin/all', protect, admin, getAllFlashcardSetsAdmin);
router.patch('/admin/:id', protect, admin, adminUpdateFlashcardSet);
router.delete('/admin/:id', protect, admin, adminDeleteFlashcardSet);

// ==================== USER ROUTES ====================
router.get('/my', protect, getMyFlashcardSets);
router.get('/public', getPublicFlashcardSets);
router.post('/', protect, createFlashcardSet);
router.get('/:id', protect, getFlashcardSetById);
router.patch('/:id', protect, updateFlashcardSet);
router.delete('/:id', protect, deleteFlashcardSet);

// ==================== FLASHCARD TRONG SET ====================
router.get('/:id/flashcards', protect, getFlashcardsForSet);
router.post('/:id/flashcards', protect);
router.delete('/:id/flashcards/:flashcardId', protect);

module.exports = router;
