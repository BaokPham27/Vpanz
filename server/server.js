// server.js – MYSQL2 + PYTHON AI + SOCKET.IO HOÀN HẢO 2025
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const axios = require('axios');
const FormData = require('form-data');
const ffmpegStatic = require('ffmpeg-static');
const fluentFfmpeg = require('fluent-ffmpeg');
const multer = require('multer');

fluentFfmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
require('dotenv').config();

// ==================== MySQL2 POOL ====================
const db = require('./db'); // mysql2/promise pool
console.log('MySQL2 pool đã khởi tạo');

// ==================== Middleware ====================
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==================== Uploads folder ====================
const uploadFolder = path.join(__dirname, 'uploads');
// Dùng IIFE async để tạo thư mục
(async () => {
  try {
    await fs.mkdir(uploadFolder, { recursive: true });
  } catch (err) {
    console.error('Không tạo được folder uploads:', err.message);
  }
})();
app.use('/uploads', express.static(uploadFolder));

// ==================== Health check ====================
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'OK', server: 'running', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'ERROR', database: 'disconnected' });
  }
});

// ==================== TTS Proxy (Google TTS) ====================
app.get('/api/jishoApi/audio', async (req, res) => {
  const text = req.query.text?.trim();
  if (!text) return res.status(400).json({ error: 'Thiếu text' });

  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ja&client=tw-ob`;
    const response = await axios.get(ttsUrl, { responseType: 'stream', headers: { 'User-Agent': 'Mozilla/5.0' } });
    res.set('Content-Type', 'audio/mpeg');
    response.data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy âm thanh TTS' });
  }
});

// ==================== Spawn Python FastAPI Server ====================
const PYTHON_PORT = 8000;
const pythonProcess = spawn('python', [path.join(__dirname, 'modelAI', 'shadowAI_server.py')]);

pythonProcess.stdout.on('data', d => console.log('PY:', d.toString().trim()));
pythonProcess.stderr.on('data', d => console.error('PY ERR:', d.toString().trim()));
pythonProcess.on('close', code => console.log(`Python server exited: ${code}`));

// ==================== Shadow AI Route (FFmpeg + Python) ====================
const upload = multer({ dest: path.join(uploadFolder, 'temp') });

app.post('/api/shadow/predict', upload.single('audio'), async (req, res) => {
  if (!req.file || !req.body.text?.trim()) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ error: 'Thiếu audio hoặc text' });
  }

  const inputPath = req.file.path;
  const wavPath = inputPath + '.wav';

  // Convert to 16kHz mono WAV
  fluentFfmpeg(inputPath)
    .audioChannels(1)
    .audioFrequency(16000)
    .outputFormat('wav')
    .on('error', async (err) => {
      console.error('FFmpeg error:', err.message);
      await fs.unlink(inputPath).catch(() => {});
      if (await fs.access(wavPath).then(() => true).catch(() => false)) await fs.unlink(wavPath);
      res.status(500).json({ error: 'Chuyển đổi audio thất bại' });
    })
    .on('end', async () => {
      await fs.unlink(inputPath).catch(() => {});

      try {
        const form = new FormData();
        form.append('file', await fs.readFile(wavPath), { filename: 'audio.wav' });
        form.append('text', req.body.text);

        const aiRes = await axios.post(`http://127.0.0.1:${PYTHON_PORT}/predict`, form, {
          headers: form.getHeaders(),
          timeout: 60000
        });

        res.json(aiRes.data);
      } catch (err) {
        console.error('AI server error:', err.message);
        res.status(500).json({ error: 'AI xử lý thất bại', detail: err.message });
      } finally {
        await fs.unlink(wavPath).catch(() => {});
      }
    })
    .save(wavPath);
});

// ==================== Routes ====================
app.use('/api/admin', require('./routes/admin'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/chapters', require('./routes/chapters'));
app.use('/api/flashcard-sets', require('./routes/flashcardSets'));
app.use('/api/flashcards', require('./routes/flashcards'));
app.use('/api/shadow', require('./routes/shadowRouter'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/chat', require('./routes/chat'));

// ==================== Serve frontend ====================
const frontendPath = path.join(__dirname, 'public');
const { protect, admin } = require('./middleware/authMiddleware');

app.use('/admin', protect, admin, express.static(frontendPath));
app.get('/admin', (req, res) => res.sendFile(path.join(frontendPath, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

// ==================== Socket.IO ====================
const server = http.createServer(app);
const io = require('./socket').initSocket(server, db);
app.set('io', io);

// ==================== Start Server ====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\nSERVER RUNNING: http://localhost:${PORT}`);
  console.log(`Python AI server: http://127.0.0.1:${PYTHON_PORT}`);
});
