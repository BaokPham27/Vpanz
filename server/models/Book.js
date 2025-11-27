// D:\Vpan\server\models\Book.js
const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  level: { type: String },
  coverImage: String,
  chapters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }],
}, { timestamps: true }); // Thêm timestamps là một practice tốt

// 💡 Sửa lỗi: Gán kết quả của mongoose.model() vào biến Book
const Book = mongoose.model('Book', bookSchema);

module.exports = Book;