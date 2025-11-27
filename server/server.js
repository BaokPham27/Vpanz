const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const { spawn } = require('child_process');
const axios = require('axios');
const FormData = require('form-data');
const http = require('http');                    // THÊM DÒNG NÀY (bạn thiếu import http)

const app = express();
dotenv.config();

app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ======================
// FFmpeg path (tạm tắt cảnh báo nếu chưa có)
// ======================
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'C:\\ffmpeg\\bin\\ffmpeg.exe'; // khuyến khích dùng .env
if (!fs.existsSync(FFMPEG_PATH)) {
  console.error('Không tìm thấy ffmpeg.exe tại đường dẫn:', FFMPEG_PATH);
  console.log('   → Tính năng shadow audio sẽ không hoạt động cho đến khi cài FFmpeg');
} else {
  console.log('Đã tìm thấy ffmpeg.exe:', FFMPEG_PATH);
}

// ======================
// Upload folder
// ======================
const uploadFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// ======================
// Static folder
// ======================
app.use('/uploads', express.static(uploadFolder));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbConnected = dbState === 1;
  
  res.json({
    status: 'OK',
    server: 'running',
    database: dbConnected ? 'connected' : 'disconnected',
    dbState: dbState, // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    timestamp: new Date().toISOString()
  });
});

// ======================
// TTS proxy (Google TTS)
// ======================
app.get('/api/jishoApi/audio', async (req, res) => {
  const text = req.query.text;
  if (!text || !String(text).trim()) return res.status(400).json({ error: 'Thiếu text để phát âm' });

  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ja&client=tw-ob`;
  const fetch = global.fetch || require('node-fetch');

  try {
    const response = await fetch(ttsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) return res.status(502).json({ error: 'Không thể lấy audio từ TTS' });

    res.set('Content-Type', 'audio/mpeg');
    res.set('Access-Control-Allow-Origin', '*');
    response.body.pipe(res);
  } catch (err) {
    console.error('Lỗi khi proxy TTS:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy audio' });
  }
});

// ======================
// Spawn Python FastAPI server
// ======================
const PYTHON_SERVER_PORT = 8000;
const pythonProcess = spawn('python', [path.join(__dirname, 'modelAI', 'shadowAI_server.py')]);

pythonProcess.stdout.on('data', (data) => console.log('>>> PYTHON:', data.toString().trim()));
pythonProcess.stderr.on('data', (data) => console.error('>>> PYTHON ERR:', data.toString().trim()));
pythonProcess.on('close', (code) => console.log(`>>> PYTHON EXIT CODE: ${code}`));

// ======================
// Helper: chờ Python server sẵn sàng
// ======================
async function waitPythonServerReady(timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await axios.get(`http://127.0.0.1:${PYTHON_SERVER_PORT}/health`);
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  console.warn('Python server chưa sẵn sàng – vẫn tiếp tục chạy (có thể shadow chậm lần đầu)');
}

// ======================
// Shadow AI: nhận file audio và câu
// ======================
app.post('/api/shadow/predict', upload.single('audio'), async (req, res) => {
  if (!req.file || !req.body.text) return res.status(400).json({ error: 'Thiếu audio hoặc text' });

  const audioPath = req.file.path;
  const wavPath = audioPath + '.wav';

  if (!fs.existsSync(FFMPEG_PATH)) {
    fs.unlinkSync(audioPath);
    return res.status(500).json({ error: 'FFmpeg không khả dụng trên server' });
  }

  const ffmpeg = spawn(FFMPEG_PATH, ['-y', '-i', audioPath, '-ac', '1', '-ar', '16000', '-f', 'wav', wavPath]);

  let ffmpegError = '';
  ffmpeg.stderr.on('data', (d) => ffmpegError += d.toString());

  ffmpeg.on('close', async (code) => {
    fs.unlinkSync(audioPath); // xóa file gốc

    if (code !== 0) {
      console.error('FFMPEG lỗi:', ffmpegError);
      if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
      return res.status(500).json({ error: 'Convert audio thất bại' });
    }

    try {
      await waitPythonServerReady();

      const formData = new FormData();
      formData.append('file', fs.createReadStream(wavPath));
      formData.append('text', req.body.text);

      const aiResponse = await axios.post(
        `http://127.0.0.1:${PYTHON_SERVER_PORT}/predict`,
        formData,
        { headers: formData.getHeaders(), timeout: 60000 }
      );

      res.json(aiResponse.data);
    } catch (err) {
      console.error('Lỗi gọi Python AI:', err.message);
      res.status(500).json({ error: 'AI server lỗi', detail: err.message });
    } finally {
      if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
    }
  });
});

// ======================
// Import tất cả router
// ======================
const shadowRouter       = require('./routes/shadowRouter');
const chapterRoutes      = require('./routes/chapters');
const appRouter          = require('./routes/appRouter');
const authRouter         = require('./routes/auth');
const bookRoutes         = require('./routes/books');
const flashcardSetRoutes = require('./routes/flashcardSets');
const flashcardRoutes = require('./routes/flashcards');
const userRoutes         = require('./routes/userRoutes');
const chatRoutes         = require('./routes/chat');

// Gắn router
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRouter);
app.use('/api', appRouter);
app.use('/api/chapters', chapterRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/flashcard-sets', flashcardSetRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/shadow', shadowRouter);
app.use('/api/users', userRoutes);

// ======================
// Tạo server + Socket.IO
// ======================
const httpServer = http.createServer(app);                 // ĐÚNG
const { initSocket } = require('./socket');
const io = initSocket(httpServer);
app.set('io', io);

// ======================
// Kết nối MongoDB
// ======================
console.log('\n=== MONGODB CONNECTION ===');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'CONFIGURED' : 'NOT CONFIGURED');

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vpan')
  .then(() => {
    console.log('MongoDB connected successfully');
    console.log('Database name: vpan_app_db');
    console.log('Connection state:', mongoose.connection.readyState);
    console.log('=== CONNECTION READY ===\n');
  })
  .catch(err => {
    console.error('MongoDB connection lỗi:', err.message);
    console.log('Error code:', err.code);
    console.log('=== CONNECTION FAILED ===\n');
  });

// Log connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose disconnected from MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.log('❌ Mongoose connection error:', err.message);
});

// ======================
// Khởi động server
// ======================
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\nServer đang chạy tại http://localhost:${PORT}`);
  console.log(`Từ điện thoại kết nối: http://26.94.144.5:${PORT}   (thay IP máy bạn nếu khác)`);
  console.log(`Socket.IO đã sẵn sàng – Shadow, Chat, Flashcard 100% hoạt động!\n`);
});