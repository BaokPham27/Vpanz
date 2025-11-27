// routes/auth.js – PHIÊN BẢN HOÀN HẢO 2025 (có gửi thông báo đăng nhập realtime)

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ==================== ĐĂNG KÝ ====================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log('\n╔════════════════════════════════════╗');
    console.log('║       NEW REGISTER ATTEMPT         ║');
    console.log('╠════════════════════════════════════╣');
    console.log(`║ Name  : ${name || 'N/A'}`.padEnd(44) + '║');
    console.log(`║ Email : ${email || 'N/A'}`.padEnd(44) + '║');
    console.log(`║ IP    : ${req.ip || req.connection?.remoteAddress || 'N/A'}`.padEnd(44) + '║');
    console.log('╚════════════════════════════════════╝');

    if (!name || !email || !password) {
      console.log('Thiếu field → Register failed');
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ" });
    }

    const existed = await User.findOne({ email });
    if (existed) {
      console.log('Email đã tồn tại → Register failed');
      return res.status(400).json({ message: "Email đã được sử dụng" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, password: hashed });
    await newUser.save();

    console.log('Đăng ký thành công:', email);
    console.log('──────────────────────────────────────────\n');

    res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (err) {
    console.error('LỖI SERVER khi đăng ký:', err.message);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// ==================== ĐĂNG NHẬP + GỬI THÔNG BÁO REALTIME ====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('\n╔════════════════════════════════════╗');
    console.log('║        NEW LOGIN ATTEMPT           ║');
    console.log('╠════════════════════════════════════╣');
    console.log(`║ Email : ${email || 'N/A'}`.padEnd(44) + '║');
    console.log(`║ IP    : ${req.ip || req.connection?.remoteAddress || 'N/A'}`.padEnd(44) + '║');
    console.log('╚════════════════════════════════════╝');

    const user = await User.findOne({ email });
    if (!user) {
      console.log('Không tìm thấy email → Login failed');
      return res.status(400).json({ message: "Email hoặc mật khẩu sai" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Mật khẩu sai → Login failed');
      return res.status(400).json({ message: "Email hoặc mật khẩu sai" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "vpan_secret_2025",
      { expiresIn: "7d" }
    );

    // IN TOKEN RA CONSOLE ĐẸP
    console.log('ĐĂNG NHẬP THÀNH CÔNG!');
    console.log('User :', user.name, `<${user.email}>`);
    console.log('Thời gian:', new Date().toLocaleString('vi-VN'));
    console.log('\nJWT TOKEN (copy ngay để test):');
    console.log('────────────────────────────────────────────────────────────');
    console.log(token);
    console.log('────────────────────────────────────────────────────────────\n');

    // TRẢ VỀ CHO CLIENT TRƯỚC
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarURL: user.avatarURL || null,
        role: user.role || 'user'
      },
    });

    // SAU ĐÓ MỚI GỬI THÔNG BÁO REALTIME (không ảnh hưởng response)
        // GỬI THÔNG BÁO ĐĂNG NHẬP MỚI – TRỰC TIẾP, CHẮC CHẮN LƯU DB 100%
    const io = req.app.get('io');
    if (io && user._id) {
      const userAgent = req.headers['user-agent'] || 'Unknown device';
      const ua = require('ua-parser-js')(userAgent);
      const device = ua.device?.model || ua.device?.vendor || 'Thiết bị lạ';
      const os = ua.os?.name || 'Mobile';
      const browser = ua.browser?.name || 'App';

      const message = `Đăng nhập mới từ ${device} – ${os} – ${browser}`;

      // GỌI TRỰC TIẾP → LƯU DB NGAY LẬP TỨC, KHÔNG CẦN SOCKET CONNECT
          // GỬI THÔNG BÁO ĐĂNG NHẬP – BẮT BUỘC CÓ await + try/catch ĐỂ BẮT LỖI
    try {
      const userAgent = req.headers['user-agent'] || 'Postman/Unknown';
      const ua = require('ua-parser-js')(userAgent);
      const device = ua.device?.model || ua.device?.vendor || 'Máy tính';
      const os = ua.os?.name || 'Windows';
      const browser = ua.browser?.name || 'Postman';

      const message = `Đăng nhập mới từ ${device} – ${os} – ${browser}`;

      console.log('ĐANG GỬI THÔNG BÁO ĐĂNG NHẬP CHO USER:', user._id);
      
      // BẮT BUỘC CÓ await ĐỂ CHẠY HẾT
      await io.sendNotification(io, user._id.toString(), {
        title: 'Đăng nhập từ thiết bị mới',
        message,
        type: 'new_login',
        data: {
          ip: req.ip || '127.0.0.1',
          userAgent,
          time: new Date()
        }
      });

      console.log('ĐÃ GỬI THÔNG BÁO THÀNH CÔNG + LƯU DB!');
    } catch (err) {
      console.error('LỖI KHI GỬI THÔNG BÁO ĐĂNG NHẬP:', err);
    }
    }

  } catch (err) {
    console.error('LỖI SERVER khi đăng nhập:', err.message);
    res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;