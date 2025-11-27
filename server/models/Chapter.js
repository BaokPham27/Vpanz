// models/Chapter.js
const mongoose = require('mongoose');

const lineSchema = new mongoose.Schema({
  text: { type: String, required: true },     // 文: やっと引っ越してきたね！
  ruby: { type: String, required: true },     // ふりがな: やっとひっこしてきたね
  meaning: { type: String, required: true },  // Dịch: Cuối cùng cũng chuyển nhà xong rồi!
});

const chapterSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
  },

  chapterNumber: {
    type: Number,
    required: true,
  },

  title: {
    type: String,
    required: true,
    trim: true,
  },

  // Minh họa của chương (bìa hoặc ảnh chính)
  illustration: {
    type: String,
    required: true,
    // URL ảnh: https://...jpg hoặc Cloudinary URL
  },

  // Mảng các dòng nội dung – chính xác như frontend bạn đang dùng
  content: {
    type: [lineSchema],
    required: true,
    validate: [arrayLimit, 'Chương phải có ít nhất 1 dòng nội dung'],
  },

  // Tiến độ đọc của từng user (tùy chọn)
  readingProgress: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      lastLineIndex: { type: Number, default: 0 }, // dòng đang đọc (index trong mảng content)
      completed: { type: Boolean, default: false },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
}, {
  timestamps: true, // tự động thêm createdAt, updatedAt
});

// Validator: ít nhất 1 dòng
function arrayLimit(val) {
  return val.length > 0;
}

// Index để tìm nhanh theo book + chapterNumber
chapterSchema.index({ book: 1, chapterNumber: 1 }, { unique: true });

const Chapter = mongoose.models.Chapter || mongoose.model('Chapter', chapterSchema);

module.exports = Chapter;