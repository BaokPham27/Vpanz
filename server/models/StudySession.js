const mongoose = require('mongoose');
const studySessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  setUsed: { type: mongoose.Schema.Types.ObjectId, ref: 'FlashcardSet' },

  type: {
    type: String,
    enum: ['Quiz', 'SRS Review', 'Custom Test'],
    required: true,
  },
  score: { type: Number, required: true }, // 0-100
  duration: { type: Number, required: true }, // giây

  details: {
    correct: Number,
    incorrect: Number,
    totalCards: Number,
  },

  timestamp: { type: Date, default: Date.now },
});

studySessionSchema.index({ user: 1, timestamp: -1 });
export default mongoose.model('StudySession', studySessionSchema);