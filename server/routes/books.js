// routes/books.js

const express = require('express');
const router = express.Router(); // 👈 Khắc phục lỗi ReferenceError: router is not defined
const Chapter = require('../models/Chapter'); // Cần thiết cho các route chapter/progress
const Book = require('../models/Book'); // Cần thiết cho route POST tạo sách
// LƯU Ý: Middleware xác thực người dùng (isAuthenticated) cần được áp dụng nếu cần req.user.id

// --- 1. POST: Tạo Sách Mới (POST /api/books) ---
router.post('/', async (req, res) => {
    try {
        const { title, author, level, coverImage } = req.body;

        // Kiểm tra dữ liệu bắt buộc
        if (!title || !author) {
            return res.status(400).json({ message: 'Tiêu đề và tác giả là bắt buộc.' });
        }

        // Tạo instance sách mới
        const newBook = new Book({
            title,
            author,
            level,
            coverImage,
            chapters: [] // Khởi tạo mảng chapters
        });

        const savedBook = await newBook.save();
        res.status(201).json(savedBook); // Trả về sách đã tạo, bao gồm _id

    } catch (error) {
        console.error('Lỗi khi tạo sách:', error);
        res.status(500).json({ message: 'Lỗi server khi tạo sách', error: error.message });
    }
});

// --- 2. GET: Lấy nội dung Chapter và Tiến độ đọc (GET /api/books/:bookId/chapters/:chapterId) ---
// LƯU Ý: Route này phụ thuộc vào middleware xác thực để có req.user.id
router.get('/:bookId/chapters/:chapterId', async (req, res) => {
    try {
        // Giả định req.user.id được cung cấp bởi middleware xác thực
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Chưa xác thực người dùng.' });
        }

        const chapter = await Chapter.findById(req.params.chapterId)
            .populate('book', 'title author');

        if (!chapter) {
            return res.status(404).json({ error: 'Không tìm thấy Chapter.' });
        }

        // Tìm tiến độ đọc của người dùng hiện tại
        const userProgress = chapter.readingProgress.find(
            p => p.user.toString() === req.user.id
        );

        res.json({
            chapter,
            currentPosition: userProgress?.lastPosition || 0,
            completed: userProgress?.completed || false
        });
    } catch (err) {
        console.error('Lỗi khi lấy Chapter và tiến độ:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- 3. POST: Lưu vị trí đọc (POST /api/books/progress) ---
// LƯU Ý: Route này phụ thuộc vào middleware xác thực để có req.user.id
router.post('/progress', async (req, res) => {
    try {
        // Giả định req.user.id được cung cấp bởi middleware xác thực
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Chưa xác thực người dùng.' });
        }

        const { chapterId, position } = req.body;

        if (!chapterId || position === undefined) {
            return res.status(400).json({ error: 'Thiếu chapterId hoặc position.' });
        }

        // Cập nhật hoặc tạo mới (upsert) vị trí đọc
        await Chapter.updateOne(
            { _id: chapterId, "readingProgress.user": req.user.id },
            { $set: { "readingProgress.$.lastPosition": position } },
            { upsert: true } // Quan trọng: Nếu chưa có, sẽ thêm mới (tạo mảng readingProgress nếu cần)
        );

        res.json({ success: true, message: 'Lưu tiến độ thành công.' });

    } catch (error) {
        console.error('Lỗi khi lưu tiến độ:', error);
        res.status(500).json({ error: error.message });
    }
});
// --- 4. GET: Lấy danh sách tất cả sách (GET /api/books) ---
router.get('/', async (req, res) => {
    try {
        const books = await Book.find()
            .select('title author level coverImage chapters') // Chỉ lấy những field cần thiết
            .populate({
                path: 'chapters',
                select: 'chapterNumber title', // Nếu bạn có chapterNumber
                sort: { chapterNumber: 1 } // Sắp xếp chương theo thứ tự
            });

        // Tính số lượng chương và trả về format giống frontend đang dùng
        const formattedBooks = books.map(book => ({
            _id: book._id,
            id: book._id.toString(), // Dùng để điều hướng
            title: book.title,
            author: book.author,
            level: book.level || 'Chưa xác định',
            coverImage: book.coverImage,
            chapters: book.chapters.length,
            // Nếu muốn hiển thị chương đầu tiên luôn có
            firstChapterId: book.chapters[0]?._id.toString() || null
        }));

        res.json(formattedBooks);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách sách:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});
// --- 5. GET: Lấy thông tin sách + danh sách chapters + totalChapters ---
router.get('/:bookId', async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId)
      .populate({
        path: 'chapters',
        select: 'chapterNumber title illustration',
        sort: { chapterNumber: 1 }
      });

    if (!book) {
      return res.status(404).json({ message: 'Không tìm thấy sách' });
    }

    // TRẢ VỀ ĐÚNG 1 LẦN DUY NHẤT – KHÔNG CÓ LẦN 2!!!
    res.json({
      _id: book._id,
      title: book.title,
      author: book.author,
      level: book.level,
      coverImage: book.coverImage,
      chapters: book.chapters,
      totalChapters: book.chapters.length  // ← QUAN TRỌNG NHẤT
    });
  } catch (error) {
    console.error('Lỗi lấy sách:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- 6. GET: Lấy chapter theo bookId + chapterNumber (dễ dùng hơn _id) ---
router.get('/:bookId/chapter/:chapterNumber', async (req, res) => {
    try {
        const { bookId, chapterNumber } = req.params;

        const chapter = await Chapter.findOne({
            book: bookId,
            chapterNumber: parseInt(chapterNumber)
        }).select('chapterNumber title illustration content');

        if (!chapter) {
            return res.status(404).json({ message: 'Không tìm thấy chương này' });
        }

        res.json(chapter);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;