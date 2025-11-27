const express = require('express');
const router = express.Router();
const {
  getAllFlashcardSets,
  getFlashcardSetById,
  createFlashcardSet,
  updateFlashcardSet,
  deleteFlashcardSet,
} = require('../controllers/flashcardSetController');
const {
  getFlashcardsForSet,
  addFlashcardToSet,
  removeFlashcardFromSet,
} = require('../controllers/flashcardController');
const { protect } = require('../middleware/authMiddleware');

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

module.exports = router;
