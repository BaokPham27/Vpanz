// controllers/bookController.js
import Chapter from '../models/Chapter.js';
import Book from '../models/Book.js';

export const getChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId)
      .populate('book', 'title author level coverImage');

    if (!chapter) return res.status(404).json({ message: 'Không tìm thấy chương' });

    // Lấy tiến độ của user hiện tại
    const progress = chapter.readingProgress?.find(
      p => p.user && p.user.toString() === req.user.id
    );

    res.json({
      chapter,
      currentPosition: progress?.lastPosition || 0,
      completed: progress?.completed || false,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const saveReadingProgress = async (req, res) => {
  const { chapterId, position } = req.body;

  try {
    await Chapter.updateOne(
      { _id: chapterId },
      {
        $set: {
          "readingProgress.$[elem].lastPosition": position,
          "readingProgress.$[elem].completed": position >= 100
        }
      },
      {
        arrayFilters: [{ "elem.user": req.user.id }],
        upsert: true
      }
    );

    // Nếu chưa có progress → tạo mới
    const chapter = await Chapter.findById(chapterId);
    if (!chapter.readingProgress?.some(p => p.user?.toString() === req.user.id)) {
      await Chapter.updateOne(
        { _id: chapterId },
        { $push: { readingProgress: { user: req.user.id, lastPosition: position } } }
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};