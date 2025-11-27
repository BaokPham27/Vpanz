const express = require('express');
const router = express.Router();
const {
  upload,
  createFlashcard,
  getFlashcardsForSet,
  addFlashcardToSet,
  updateFlashcard,
  deleteFlashcard,
  removeFlashcardFromSet,
} = require('../controllers/flashcardController');
const { protect } = require('../middleware/authMiddleware');

// Flashcard Set - Flashcard association routes (define specific routes first)
router.get('/sets/:setId/flashcards', protect, getFlashcardsForSet);
router.post('/sets/:setId/flashcards', protect, addFlashcardToSet);
router.delete('/sets/:setId/flashcards/:flashcardId', protect, removeFlashcardFromSet);

// Flashcard CRUD routes (define parameterized routes after specific ones)
router.post('/', protect, upload.single('image'), createFlashcard);
router.put('/:id', protect, upload.single('image'), updateFlashcard);
router.delete('/:id', protect, deleteFlashcard);

// Alternative routes for flashcard-sets path (for convenience)
router.get('/:setId/flashcards', protect, getFlashcardsForSet);
router.post('/:setId/flashcards', protect, addFlashcardToSet);
router.delete('/:setId/flashcards/:flashcardId', protect, removeFlashcardFromSet);

module.exports = router;
