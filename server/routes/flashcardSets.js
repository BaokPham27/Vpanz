const express = require('express');
const router = express.Router();
const {
  getAllFlashcardSets,
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
  addFlashcardToSet,
  removeFlashcardFromSet,
} = require('../controllers/flashcardController');
const { protect, admin } = require('../middleware/authMiddleware');

// Root route: GET and POST for flashcard sets
router.get('/', protect, getAllFlashcardSets);
router.post('/', protect, createFlashcardSet);

// Flashcard association routes (must come before /:id routes)
router.get('/:id/flashcards', protect, getFlashcardsForSet);
router.post('/:id/flashcards', protect, addFlashcardToSet);
router.delete('/:id/flashcards/:flashcardId', protect, removeFlashcardFromSet);

// Single FlashcardSet CRUD routes
router.get('/:id', protect, getFlashcardSetById);
router.put('/:id', protect, updateFlashcardSet);
router.delete('/:id', protect, deleteFlashcardSet);

router.get('/admin/all', protect, admin, getAllFlashcardSetsAdmin); // admin middleware kiểm tra role
// Admin có thể sửa/xóa bất kỳ bộ nào
router.put('/admin/:id', protect, admin, adminUpdateFlashcardSet);
router.delete('/admin/:id', protect, admin, adminDeleteFlashcardSet);
module.exports = router;
