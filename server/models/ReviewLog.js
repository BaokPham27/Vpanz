const reviewLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  flashcard: { type: mongoose.Schema.Types.ObjectId, ref: 'Flashcard', required: true },

  rating: {
    type: String,
    enum: ['again', 'hard', 'good', 'easy'],
    required: true,
  },
  timestamp: { type: Date, default: Date.now },

  // Tự động cập nhật sau khi tính SRS
  previousInterval: Number,
  previousEaseFactor: Number,
});

reviewLogSchema.index({ user: 1, flashcard: 1 });
reviewLogSchema.index({ timestamp: -1 });
export default mongoose.model('ReviewLog', reviewLogSchema);