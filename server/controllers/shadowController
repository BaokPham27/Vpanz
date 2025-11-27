const Shadow = require('../models/shadow');
const { spawn } = require('child_process');
const path = require('path');

// 1. Lấy tất cả topic
exports.getAllTopics = async (req, res) => {
  try {
    const topics = await Shadow.find({}, 'title description'); // chỉ lấy title + description
    res.json(topics);
  } catch (err) {
    console.error('Lỗi khi lấy danh sách topic:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// 2. Lấy tất cả câu trong 1 topic theo ID
exports.getTopicById = async (req, res) => {
  try {
    const topic = await Shadow.findById(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Không tìm thấy topic' });

    res.json({
      title: topic.title,
      description: topic.description,
      sentences: topic.sentences
    });
  } catch (err) {
    console.error('Lỗi khi lấy topic:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// 3. Check audio với Shadow AI
// POST /api/shadow/check
// body: { audioPath: "path/to/audio.wav", text: "mẫu câu" }
exports.checkAudio = async (req, res) => {
  try {
    const { audioPath, text } = req.body;

    if (!audioPath || !text) {
      return res.status(400).json({ error: 'Thiếu audioPath hoặc text' });
    }

    // Gọi Python script shadowAI
    const pythonScript = path.join(__dirname, '../python/shadowAI_api.py');

    const pyProcess = spawn('python', [pythonScript, audioPath, text]);

    let dataString = '';
    pyProcess.stdout.on('data', data => {
      dataString += data.toString();
    });

    pyProcess.stderr.on('data', data => {
      console.error('Python stderr:', data.toString());
    });

    pyProcess.on('close', code => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Lỗi khi chạy Shadow AI' });
      }
      try {
        const result = JSON.parse(dataString); // python trả JSON: {score, errors, probs}
        res.json(result);
      } catch (err) {
        console.error('Lỗi parse JSON từ Python:', err);
        res.status(500).json({ error: 'Lỗi dữ liệu từ Shadow AI' });
      }
    });

  } catch (err) {
    console.error('Lỗi khi check audio:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};
