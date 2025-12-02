// routes/auth.js – PHIÊN BẢN HOÀN HẢO 2025 (có gửi thông báo đăng nhập realtime)

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ==================== ĐĂNG KÝ ====================
router.get('/', (req, res) => {
  res.json({ message: "Auth router is working!" });
});
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
// routes/auth.js – GOOGLE LOGIN SIÊU ỔN ĐỊNH 2025
const axios = require('axios'); // <<< THÊM DÒNG NÀY

router.post('/google-login', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Thiếu token Google" });

    console.log('\nGOOGLE LOGIN – Nhận access_token:', token.slice(0, 20) + '...');

    // Lấy thông tin user từ Google
    const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const { sub: googleId, email, name, picture, email_verified } = data;

    if (!email_verified) {
      return res.status(400).json({ message: "Email Google chưa được xác minh" });
    }

    // Tìm hoặc tạo user
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name: name || email.split('@')[0],
        email,
        password: 'google-oauth-2025',
        avatarURL: picture,
        googleId,
      });
      await user.save();
      console.log('Tạo user mới từ Google:', email);
    } else {
      // Cập nhật avatar nếu chưa có
      if (!user.avatarURL && picture) {
        user.avatarURL = picture;
        await user.save();
      }
    }

    // Tạo JWT
    const jwtToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "vpan_secret_2025",
      { expiresIn: "7d" }
    );

    console.log('GOOGLE LOGIN THÀNH CÔNG:', user.name, `<${email}>`);

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarURL: user.avatarURL || null,
        role: user.role || 'user'
      },
    });

  } catch (err) {
    console.error('GOOGLE LOGIN LỖI:', err.response?.data || err.message);
    res.status(400).json({ message: "Token Google không hợp lệ hoặc đã hết hạn" });
  }
});
const fetch = require('node-fetch'); // Nếu chưa có thì: npm install node-fetch@2

router.post('/facebook-login', async (req, res) => {
  try {
    const { accessToken } = req.body;

    console.log('\n════════ FACEBOOK LOGIN DEBUG MODE ON ════════');
    console.log('FB_APP_ID          :', process.env.FB_APP_ID || 'CHƯA CÓ');
    console.log('FB_APP_SECRET      :', process.env.FB_APP_SECRET ? 'ĐÃ CÓ (ẩn)' : 'KHÔNG CÓ');
    console.log('AccessToken đầu vào:', accessToken ? accessToken.substring(0, 30) + '...' : 'KHÔNG CÓ');
    console.log('═══════════════════════════════════════════════\n');

    if (!accessToken) return res.status(400).json({ message: "Không nhận được access token từ Facebook" });
    if (!process.env.FB_APP_ID || !process.env.FB_APP_SECRET)
      return res.status(500).json({ message: "Server chưa cấu hình FB_APP_ID hoặc FB_APP_SECRET" });

    // DÙNG APP ACCESS TOKEN (APP_ID|APP_SECRET)
    const appAccessToken = `${process.env.FB_APP_ID}|${process.env.FB_APP_SECRET}`;
    const verifyUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appAccessToken}`;
    console.log('Gọi verifyUrl:', verifyUrl);

    const verifyRes = await fetch(verifyUrl);
    const verifyData = await verifyRes.json();

    if (verifyData.error) {
      console.log('Facebook báo lỗi:', verifyData.error.message);
      return res.status(400).json({ message: verifyData.error.message });
    }

    if (!verifyData.data?.is_valid) {
      return res.status(400).json({ message: "Token Facebook không hợp lệ hoặc đã hết hạn" });
    }

    const userID = verifyData.data.user_id;
    console.log('User ID Facebook hợp lệ:', userID);

    // Lấy thông tin user từ Graph API
    const profileUrl = `https://graph.facebook.com/${userID}?fields=id,name,email,picture.type(large)&access_token=${accessToken}`;
    const profileRes = await fetch(profileUrl);
    const profileData = await profileRes.json();

    if (profileData.error) return res.status(400).json({ message: "Không lấy được thông tin user", error: profileData.error.message });

    const { id: fbId, name, email, picture } = profileData;

    if (!email) return res.status(400).json({ message: "Bạn cần cấp quyền email khi đăng nhập Facebook" });

    // Tìm hoặc tạo user
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name: name || "Facebook User",
        email,
        password: 'facebook-oauth-2025',
        avatarURL: picture?.data?.url || `https://graph.facebook.com/${fbId}/picture?type=large`,
        facebookId: fbId,
      });
      await user.save();
      console.log('Tạo user mới từ Facebook:', email);
    } else {
      user.facebookId = fbId;
      if (picture?.data?.url && !user.avatarURL) user.avatarURL = picture.data.url;
      await user.save();
    }

    // Tạo JWT
const FB_ADMIN_IDS = [
      "100092356789012",    // ← Thay bằng Facebook ID của bạn (chính chủ)
      "100011122233344",    // ← Admin thứ 2 nếu có
      // Thêm bao nhiêu cũng được
    ];

    // Kiểm tra xem user này có phải admin của Facebook App không
    const isFacebookAdmin = FB_ADMIN_IDS.includes(userID);

    // Nếu là admin → tự động gán role = 'admin' (để lần sau login thường cũng vào được admin)

    // Tạo JWT
    const jwtToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "vpan_secret_2025",
      { expiresIn: "7d" }
    );

    console.log('FACEBOOK LOGIN THÀNH CÔNG:', user.name, `<${email}>`);
    console.log('Role:', user.role, '| Là FB Admin?', isFacebookAdmin ? 'CÓ' : 'KHÔNG');

    // TRẢ VỀ THÊM 1 FIELD: isAdmin → frontend dùng để redirect
    return res.json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarURL: user.avatarURL || null,
        role: user.role || 'user'
      },
      isAdmin: isFacebookAdmin || user.role === 'admin'   // ← Quan trọng nhất!
    });

  } catch (err) {
    console.error('LỖI KHÔNG MONG MUỐN:', err.message);
    return res.status(500).json({ message: "Lỗi server", detail: err.message });
  }
});


module.exports = router;