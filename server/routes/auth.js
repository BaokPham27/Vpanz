// routes/auth.js – PHIÊN BẢN HOÀN HẢO 2025 (MySQL2 + Socket.IO + Google/FB Login)

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const fetch = require('node-fetch'); // npm i node-fetch@2
const UAParser = require('ua-parser-js'); // npm i ua-parser-js
const db = require('../db'); // mysql2/promise connection

// ==================== TEST ROUTE ====================
router.get('/', (req, res) => {
  res.json({ message: "Auth route đang chạy ngon lành!" });
});

// ==================== ĐĂNG KÝ ====================
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email đã được sử dụng" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), hashed, 'student']
    );

    console.log(`\nĐĂNG KÝ THÀNH CÔNG: ${name} <${email}> (ID: ${result.insertId})`);

    res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (err) {
    console.error('Lỗi đăng ký:', err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// ==================== ĐĂNG NHẬP + THÔNG BÁO REALTIME ====================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu" });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // Tạo JWT
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || "vpan_secret_2025",
      { expiresIn: "7d" }
    );

    console.log(`\nĐĂNG NHẬP THÀNH CÔNG: ${user.name} <${email}>`);
    console.log(`JWT: ${token}\n`);

    // Trả về ngay cho client
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarURL: user.avatarURL || null,
        role: user.role || 'student'
      }
    });

    // === GỬI THÔNG BÁO REALTIME (không block response) ===
    const io = req.app.get('io');
    if (!io) return;

    const userAgent = req.headers['user-agent'] || 'Unknown';
    const parser = new UAParser(userAgent);
    const { os, browser, device } = parser.getResult();

    const deviceName = device.model || device.vendor || 'Máy tính';
    const message = `Đăng nhập từ ${deviceName} – ${os.name || 'Unknown'} – ${browser.name || 'Trình duyệt lạ'}`;

    try {
      await db.query(
        `INSERT INTO notifications (userId, title, message, type, data, createdAt) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          user.id,
          'Đăng nhập từ thiết bị mới',
          message,
          'new_login',
          JSON.stringify({
            ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
            userAgent,
            time: new Date().toISOString()
          })
        ]
      );

      // Gửi realtime qua Socket.IO
      io.to(user.id.toString()).emit('notification', {
        title: 'Đăng nhập từ thiết bị mới',
        message,
        type: 'new_login',
        createdAt: new Date()
      });

      console.log('Đã gửi thông báo đăng nhập realtime cho user:', user.id);
    } catch (err) {
      console.error('Lỗi gửi thông báo đăng nhập:', err);
    }

  } catch (err) {
    console.error('Lỗi đăng nhập:', err);
    if (!res.headersSent) res.status(500).json({ message: "Lỗi server" });
  }
});

// ==================== GOOGLE LOGIN ====================
router.post('/google-login', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Thiếu token Google" });

  try {
    const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!data.email_verified) {
      return res.status(400).json({ message: "Email Google chưa được xác minh" });
    }

    const { sub: googleId, email, name, picture } = data;

    let [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    let user = users[0];

    if (!user) {
      const [result] = await db.query(
        `INSERT INTO users (name, email, password, avatarURL, googleId, role) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name || email.split('@')[0], email, 'google-oauth', picture || null, googleId, 'student']
      );
      user = { id: result.insertId, name, email, avatarURL: picture, role: 'user' };
      console.log('Tạo user mới từ Google:', email);
    } else if (!user.avatarURL && picture) {
      await db.query('UPDATE users SET avatarURL = ? WHERE id = ?', [picture, user.id]);
      user.avatarURL = picture;
    }

    const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "vpan_secret_2025", { expiresIn: "7d" });

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarURL: user.avatarURL || null,
        role: user.role || 'student'
      }
    });

  } catch (err) {
    console.error('Google login lỗi:', err.response?.data || err.message);
    res.status(400).json({ message: "Token Google không hợp lệ hoặc đã hết hạn" });
  }
});

// ==================== FACEBOOK LOGIN (SIÊU ỔN ĐỊNH) ====================
const FB_ADMIN_IDS = [
  "100092356789012", // ← Thay bằng Facebook ID của bạn (lấy tại: https://lookup-id.com)
  // Thêm ID admin khác nếu cần
];

router.post('/facebook-login', async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ message: "Thiếu access token Facebook" });

  try {
    const appToken = `${process.env.FB_APP_ID}|${process.env.FB_APP_SECRET}`;
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appToken}`;
    const debugRes = await fetch(debugUrl);
    const debugData = await debugRes.json();

    if (debugData.error || !debugData.data?.is_valid) {
      return res.status(400).json({ message: "Token Facebook không hợp lệ" });
    }

    const userID = debugData.data.user_id;
    const profileUrl = `https://graph.facebook.com/${userID}?fields=name,email,picture.type(large)&access_token=${accessToken}`;
    const profileRes = await fetch(profileUrl);
    const profile = await profileRes.json();

    if (profile.error || !profile.email) {
      return res.status(400).json({ message: "Không lấy được email từ Facebook" });
    }

    const { name, email, picture } = profile;
    const avatarURL = picture?.data?.url;

    let [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    let user = users[0];

    const isFBAdmin = FB_ADMIN_IDS.includes(userID);

    if (!user) {
      const [result] = await db.query(
        `INSERT INTO users (name, email, password, avatarURL, facebookId, role) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, email, 'facebook-oauth', avatarURL || null, userID, isFBAdmin ? 'student' : 'student']
      );
      user = { id: result.insertId, name, email, avatarURL, role: isFBAdmin ? 'admin' : 'user' };
      console.log('Tạo user mới từ Facebook:', email, '| Admin:', isFBAdmin);
    } else {
      // Cập nhật nếu cần
      await db.query(
        'UPDATE users SET facebookId = ?, avatarURL = COALESCE(?, avatarURL), role = ? WHERE id = ?',
        [userID, avatarURL, isFBAdmin ? 'admin' : user.role, user.id]
      );
      user.role = isFBAdmin ? 'admin' : user.role;
      user.avatarURL = avatarURL || user.avatarURL;
    }

    const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "vpan_secret_2025", { expiresIn: "7d" });

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarURL: user.avatarURL || null,
        role: user.role
      },
      isAdmin: user.role === 'admin'
    });

  } catch (err) {
    console.error('Facebook login lỗi:', err.message);
    res.status(500).json({ message: "Lỗi server khi đăng nhập Facebook" });
  }
});

module.exports = router;