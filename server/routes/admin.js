// routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Book = require('../models/Book');
const FlashcardSet = require('../models/FlashcardSet');
const Notification = require('../models/Notification');

// IMPORT ĐÚNG TÊN MIDDLEWARE (QUAN TRỌNG NHẤT!)
const { protect, admin } = require('../middleware/authMiddleware');  // Đảm bảo file tên là auth.js

// ==================== THỐNG KÊ DASHBOARD ====================
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30; // Hỗ trợ 7, 14, 30 ngày
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);

    // 1. Tổng số liệu
    const [totalUsers, totalBooks] = await Promise.all([
      User.countDocuments(),
      Book.countDocuments(),
    ]);

    // Tổng flashcard (dùng unwind như bạn đang làm)
    const flashcardAgg = await FlashcardSet.aggregate([
      { $unwind: { path: '$flashcards', preserveNullAndEmptyArrays: true } },
      { $count: 'total' }
    ]);
    const totalFlashcards = flashcardAgg[0]?.total || 0;

    // 2. Người dùng mới theo ngày
    const userGrowthRaw = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Flashcard được tạo theo ngày (DỮ LIỆU THẬT 100%)
    const flashcardCreationRaw = await FlashcardSet.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$flashcards' },
      {
        $group: {
          _id: { $dateToString: { format: '%m-%d', date: '$createdAt' } }, // Dùng createdAt của Set
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Tạo mảng đầy đủ các ngày (không bỏ sót)
    const labels = [];
    const userData = [];
    const flashcardData = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(endDate.getDate() - i);
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      labels.push(label);

      // Người dùng mới
      const userDay = userGrowthRaw.find(g => g._id === label);
      userData.push(userDay?.count || 0);

      // Flashcard được tạo
      const flashDay = flashcardCreationRaw.find(g => g._id === label);
      flashcardData.push(flashDay?.count || 0);
    }

    res.json({
      totalBooks,
      totalFlashcards,
      totalUsers,
      chartData: {
        labels,
        datasets: [
          { data: userData, label: 'Người dùng mới' },
          { data: flashcardData, label: 'Flashcard được tạo' } // ← DỮ LIỆU THẬT!
        ]
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});
// ==================== LẤY THÔNG BÁO HỆ THỐNG ====================
router.get('/notifications', protect, admin, async (req, res) => {
  try {
    const systemNotifs = await Notification.find({ type: 'system' })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('title message createdAt')
      .lean();

    res.json(systemNotifs);
  } catch (err) {
    console.error('Lỗi lấy thông báo:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== GỬI THÔNG BÁO HỆ THỐNG ====================
router.post('/notifications', protect, admin, async (req, res) => {
  const { title, message } = req.body;

  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ message: 'Thiếu tiêu đề hoặc nội dung' });
  }

  try {
    const users = await User.find().select('_id');
    const userIds = users.map(u => u._id);

    const notifications = userIds.map(userId => ({
      userId,
      title: title.trim(),
      message: message.trim(),
      type: 'system',
      read: false,
      data: { sentByAdmin: true }
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      title: title.trim(),
      message: message.trim(),
      totalSent: userIds.length,
      createdAt: new Date()
    });
  } catch (err) {
    console.error('Gửi thông báo lỗi:', err);
    res.status(500).json({ message: 'Gửi thất bại' });
  }
});
router.get('/flashcard-sets', protect, admin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const q = req.query.q ? String(req.query.q).trim() : null;
    const sort = req.query.sort ? String(req.query.sort) : 'newest';

    const match = {};
    if (q) match.title = { $regex: q, $options: 'i' };

    // Aggregation pipeline: filter -> add flashcardsCount -> sort -> paginate -> populate owner & sample flashcards
    const pipeline = [
      { $match: match },
      {
        $addFields: {
          flashcardsCount: { $size: { $ifNull: ['$flashcards', []] } }
        }
      },
    ];

    // sort stage
    if (sort === 'oldest') {
      pipeline.push({ $sort: { createdAt: 1 } });
    } else if (sort === 'mostCards') {
      pipeline.push({ $sort: { flashcardsCount: -1 } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } }); // newest default
    }

    // pagination
    pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });

    // Project fields to return (you can add/remove fields as needed)
    pipeline.push({
      $project: {
        title: 1,
        description: 1,
        tags: 1,
        level: 1,
        isPublic: 1,
        owner: 1,
        flashcardsCount: 1,
        createdAt: 1,
        updatedAt: 1,
        // optionally include only first N flashcards ids
        flashcards: { $slice: ['$flashcards', 5] }
      }
    });

    // run aggregate then populate owner + optionally populate flashcards fields
    const sets = await FlashcardSet.aggregate(pipeline);

    // populate owner and flashcards (if you want fields from these refs)
    // Using mongoose.populate on plain objects requires Model.populate
    const populated = await FlashcardSet.populate(sets, [
      { path: 'owner', select: 'name email avatarURL' },
      { path: 'flashcards', select: 'vocabulary meaning image createdAt' }
    ]);

    // total count for pagination (separate query)
    const totalCount = await FlashcardSet.countDocuments(match);

    res.json({
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      data: populated
    });
  } catch (err) {
    console.error('Admin get flashcard sets error:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy flashcard sets' });
  }
});
module.exports = router;