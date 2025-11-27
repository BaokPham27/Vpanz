// server/routes/shadowRouter.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { spawn } = require('child_process');
const Shadow = require('../models/shadow');

const router = express.Router();

// ====== Tạo thư mục uploads/shadow (nếu chưa có) ======
const uploadDir = path.join(__dirname, '..', 'uploads', 'shadow');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ====== Multer upload cho file audio ======
const upload = multer({
  dest: uploadDir,
});

// ================================
// 1. Lấy tất cả topic
//    GET /api/shadow
// ================================
router.get('/', async (req, res) => {
  try {
    const topics = await Shadow.find({}, 'title description');
    res.json(topics);
  } catch (err) {
    console.error('Lỗi khi lấy danh sách topic:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ================================
// 2. Lấy chi tiết 1 topic + tất cả câu
//    GET /api/shadow/:id
// ================================
router.get('/:id', async (req, res) => {
  try {
    const topic = await Shadow.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({ error: 'Không tìm thấy topic' });
    }

    res.json({
      _id: topic._id,
      title: topic.title,
      description: topic.description,
      sentences: topic.sentences,
    });
  } catch (err) {
    console.error('Lỗi khi lấy topic:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// ================================
// 3. API chấm điểm thật với Python
//    POST /api/shadow/predict
//    body: FormData { audio: file, text: string }
// ================================
router.post('/predict', upload.single('audio'), (req, res) => {
  if (!req.file || !req.body.text) {
    return res.status(400).json({ error: 'Thiếu audio hoặc text' });
  }

  const audioPath = req.file.path;
  const text = req.body.text;

  // ⚠️ Đường dẫn đúng tới shadowAI_api.py
  const scriptPath = path.join(__dirname, '..', 'modelAI', 'shadowAI_api.py');
  console.log('>>> CALL PYTHON:', scriptPath);
  console.log('>>> audio =', audioPath);
  console.log('>>> text  =', text);

  // Python nhận 2 tham số positional: audio_path, text
  const py = spawn('python', [scriptPath, audioPath, text]);

  let stdout = '';
  let stderr = '';

  py.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  py.stderr.on('data', (data) => {
    const msg = data.toString();
    stderr += msg;
    console.error('>>> PYTHON STDERR:', msg);
  });

  py.on('close', (code) => {
    // Xoá file audio sau khi xử lý
    fs.unlink(audioPath, () => {});

    console.log('>>> PYTHON EXIT CODE:', code);

    if (code !== 0) {
      return res.status(500).json({
        error: 'Lỗi khi xử lý AI',
        detail: stderr || stdout,
      });
    }

    try {
      const result = JSON.parse(stdout); // shadowAI_api.py phải print JSON
      return res.json(result);
    } catch (e) {
      console.error('Không parse được JSON từ model:', e, 'RAW =', stdout);
      return res.status(500).json({
        error: 'Output model không đúng JSON',
        raw: stdout,
      });
    }
  });
});

module.exports = router;
