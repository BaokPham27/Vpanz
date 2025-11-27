// routes/chapters.js
const express = require('express');
const router = express.Router();
const Chapter = require('../models/Chapter');
const Book = require('../models/Book'); // để kiểm tra book có tồn tại không

// POST: Thêm chapter mới
router.post('/', async (req, res) => {
  try {
    const { bookId, chapterNumber, title, illustration, content } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!bookId || !chapterNumber || !title || !illustration || !content || content.length === 0) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc!' });
    }

    // Kiểm tra book có tồn tại không
    const bookExists = await Book.findById(bookId);
    if (!bookExists) {
      return res.status(404).json({ message: 'Không tìm thấy sách (Book ID sai)' });
    }

    // Kiểm tra chapterNumber đã tồn tại trong sách này chưa
    const existingChapter = await Chapter.findOne({ book: bookId, chapterNumber });
    if (existingChapter) {
      return res.status(400).json({ message: `Chương ${chapterNumber} đã tồn tại trong sách này!` });
    }

    // Tạo chapter mới
    const newChapter = new Chapter({
      book: bookId,
      chapterNumber,
      title,
      illustration,
      content, // mảng các dòng { text, ruby, meaning }
    });

    await newChapter.save();

    // Trả về chapter vừa tạo (đã populate tên sách)
    const populatedChapter = await Chapter.findById(newChapter._id).populate('book', 'title');

    res.status(201).json({
      message: 'Thêm chapter thành công!',
      chapter: populatedChapter
    });

  } catch (error) {
    console.error('Lỗi khi thêm chapter:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

module.exports = router;