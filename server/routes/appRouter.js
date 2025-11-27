const express = require('express');
const router = express.Router();

// Nếu Node < 18, cần dòng này
// const fetch = require('node-fetch');

router.get('/jishoApi/search', async (req, res) => {
  const keyword = req.query.keyword;

  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ error: 'Thiếu từ khóa tìm kiếm' });
  }

  try {
    const response = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Không thể truy cập Jisho API' });
    }

    const data = await response.json();
    res.json(data.data || []);
  } catch (err) {
    console.error('Lỗi khi gọi Jisho API:', err);
    res.status(500).json({ error: 'Lỗi server khi truy cập Jisho API' });
  }
});

// Add TTS audio endpoint that proxies Google TTS and streams audio
router.get('/jishoApi/audio', async (req, res) => {
  const text = req.query.text;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Thiếu text để phát âm' });
  }

  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ja&client=tw-ob`;

  try {
    // Fetch TTS with a browser-like User-Agent to avoid being blocked
    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        // other headers if necessary
      }
    });

    if (!response.ok || !response.body) {
      return res.status(502).json({ error: 'Không thể lấy audio từ TTS' });
    }

    // Forward content-type and stream the audio body to the client
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    // If content-length present, forward it
    const contentLength = response.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    // Add explicit CORS header for web audio fetch
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Pipe the readable stream to Express response
    if (response.body && typeof response.body.pipe === 'function') {
      response.body.pipe(res);
    } else {
      // Fallback streaming for environments where response.body is a web ReadableStream
      const reader = response.body.getReader();
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
        } catch (err) {
          console.error('Error streaming TTS:', err);
        } finally {
          res.end();
        }
      })();
    }
  } catch (err) {
    console.error('Lỗi khi proxy TTS:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy audio' });
  }
});

// Route user (nếu có)
// router.use('/users', require('./userRoutes'));

module.exports = router;
