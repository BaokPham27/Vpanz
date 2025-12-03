// routes/shadowRouter.js – MYSQL2 + PYTHON AI HOÀN HẢO 2025
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const multer = require('multer');
const db = require('../db');
const { protect, admin } = require('../middleware/authMiddleware');

// ==================== THƯ MỤC UPLOAD ====================
const uploadDir = path.join(__dirname, '../uploads/shadow');

// Tạo thư mục upload nếu chưa tồn tại
(async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (err) {
    console.error('Không thể tạo thư mục upload:', err);
  }
})();

// ==================== MULTER CONFIG (chỉ nhận audio) ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `shadow-${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/webm'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file âm thanh (wav, mp3, ogg, webm)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ==================== 1. LẤY TẤT CẢ TOPIC ====================
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, description, createdAt 
       FROM shadow_topics 
       ORDER BY createdAt DESC`
    );

    res.json(rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      createdAt: row.createdAt
    })));
  } catch (err) {
    console.error('Lỗi lấy danh sách shadow topic:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== 2. LẤY CHI TIẾT 1 TOPIC + TẤT CẢ CÂU ====================
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [topics] = await db.query(
      `SELECT id, title, description FROM shadow_topics WHERE id = ?`,
      [id]
    );

    if (topics.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy topic' });
    }

    const [sentences] = await db.query(
      `SELECT id, sentenceText, translation, audioURL 
       FROM shadow_sentences 
       WHERE topicId = ? 
       ORDER BY ordering ASC`,
      [id]
    );

    res.json({
      id: topics[0].id,
      title: topics[0].title,
      description: topics[0].description,
      sentences: sentences.map(s => ({
        id: s.id,
        text: s.sentenceText,
        translation: s.translation,
        audioURL: s.audioURL
      }))
    });
  } catch (err) {
    console.error('Lỗi lấy chi tiết topic:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==================== 3. CHẤM ĐIỂM ÂM THANH VỚI PYTHON AI ====================
router.post('/predict', upload.single('audio'), async (req, res) => {
  if (!req.file || !req.body.text?.trim()) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ message: 'Thiếu file audio hoặc text' });
  }

  const audioPath = req.file.path;
  const text = req.body.text.trim();
  const scriptPath = path.join(__dirname, '../modelAI/shadowAI_api.py');

  try {
    await fs.access(scriptPath);
  } catch {
    await fs.unlink(audioPath).catch(() => {});
    return res.status(500).json({ message: 'Không tìm thấy file AI model (shadowAI_api.py)' });
  }

  console.log(`\nSHADOW AI CALL`);
  console.log(`Text: ${text}`);
  console.log(`Audio: ${audioPath}`);

  const py = spawn('python', [scriptPath, audioPath, text]);

  let stdout = '';
  let stderr = '';

  py.stdout.on('data', (data) => {
    stdout += data.toString();
    process.stdout.write('PY: ' + data.toString());
  });

  py.stderr.on('data', (data) => {
    stderr += data.toString();
    console.error('PY ERR:', data.toString());
  });

  py.on('close', async (code) => {
    await fs.unlink(audioPath).catch(() => {});
    console.log(`Python exit code: ${code}`);

    if (code !== 0) {
      return res.status(500).json({ message: 'AI xử lý thất bại', detail: stderr || 'No stderr' });
    }

    try {
      const result = JSON.parse(stdout);
      res.json({
        success: true,
        score: result.score || 0,
        accuracy: result.accuracy || 0,
        fluency: result.fluency || 0,
        pronunciation: result.pronunciation || 0,
        feedback: result.feedback || 'Tốt!',
        words: result.words || []
      });
    } catch (e) {
      console.error('Không parse được JSON từ Python:', stdout);
      res.status(500).json({ message: 'Kết quả AI không đúng định dạng', raw: stdout });
    }
  });

  // Timeout 15 giây
  setTimeout(() => {
    if (!py.killed) {
      py.kill();
      fs.unlink(audioPath).catch(() => {});
      res.status(504).json({ message: 'AI xử lý quá thời gian (timeout 15s)' });
    }
  }, 15000);
});

// ==================== ADMIN: TẠO TOPIC MỚI ====================
router.post('/topics', protect, admin, async (req, res) => {
  const { title, description, sentences } = req.body;

  if (!title?.trim() || !Array.isArray(sentences) || sentences.length === 0) {
    return res.status(400).json({ message: 'Thiếu tiêu đề hoặc danh sách câu' });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    const [topicRes] = await conn.query(
      `INSERT INTO shadow_topics (title, description) VALUES (?, ?)`,
      [title.trim(), description || '']
    );
    const topicId = topicRes.insertId;

    const sentenceValues = sentences.map((s, i) => [
      topicId,
      s.text?.trim() || '',
      s.translation?.trim() || '',
      s.audioURL || null,
      i + 1
    ]);

    await conn.query(
      `INSERT INTO shadow_sentences 
       (topicId, sentenceText, translation, audioURL, ordering) 
       VALUES ?`,
      [sentenceValues]
    );

    await conn.commit();
    res.status(201).json({ id: topicId, title, sentenceCount: sentences.length });
  } catch (err) {
    await conn.rollback();
    console.error('Lỗi tạo shadow topic:', err);
    res.status(500).json({ message: 'Lỗi server' });
  } finally {
    conn.release();
  }
});

module.exports = router;
