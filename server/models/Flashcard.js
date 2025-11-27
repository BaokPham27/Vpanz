const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
  vocabulary: { type: String, required: true },        // The word/term
  phonetic: { type: String, default: '' },            // Phonetic transcription (e.g., /həˈləʊ/)
  meaning: { type: String, required: true },          // Definition/meaning
  image: { type: String, default: null },             // Image URL/path
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Legacy SRS Fields (SuperMemo 2+ algorithm) - optional for future use
  nextReviewDate: { type: Date, default: Date.now },
  interval: { type: Number, default: 1 },            // days
  easeFactor: { type: Number, default: 2.5 },
  timesReviewed: { type: Number, default: 0 },
  isLearned: { type: Boolean, default: false },      // If user marks as "learned"

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

flashcardSchema.index({ createdBy: 1 });
flashcardSchema.index({ nextReviewDate: 1 });

module.exports = mongoose.model('Flashcard', flashcardSchema);