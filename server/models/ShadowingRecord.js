const mongoose = require('mongoose');
const shadowingRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  audioURL: { type: String, required: true }, // Cloudinary / AWS S3
  shadowingText: { type: String, required: true }, // Đoạn văn đã luyện

  aiScore: { type: Number, min: 0, max: 100 }, // Tổng điểm AI
  detailedFeedback: {
    missedWords: [String],
    fluency: Number,
    pronunciation: Number,
    intonation: Number,
    speed: Number,
  },

  timestamp: { type: Date, default: Date.now },
});

shadowingRecordSchema.index({ user: 1, timestamp: -1 });
export default mongoose.model('ShadowingRecord', shadowingRecordSchema);