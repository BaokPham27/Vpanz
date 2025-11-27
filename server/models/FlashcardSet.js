const mongoose = require('mongoose');

const flashcardSetSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: false },
  tags: [String],
  level: { type: String },

  flashcards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Flashcard' }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

flashcardSetSchema.index({ owner: 1, title: 1 });

module.exports = mongoose.model('FlashcardSet', flashcardSetSchema);
