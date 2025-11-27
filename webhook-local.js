// webhook-local.js  → chỉ để test local
const express = require('express');
const app = express();
app.use(express.json({ limit: '10mb' })); // NOWPayments gửi JSON lớn

// Route webhook
app.post('/nowpayments', (req, res) => {
  console.log('NHẬN WEBHOOK TỪ NOWPAYMENTS');
  console.log('Body:', req.body);

  const { payment_status, order_id, pay_amount, pay_currency } = req.body;

  if (payment_status === 'finished' || payment_status === 'confirmed') {
    const parts = order_id.split('_');
    const userId = parts[1];
    const plan = parts[2];

    console.log('THANH TOÁN THÀNH CÔNG!');
    console.log(`→ User ID: ${userId}`);
    console.log(`→ Gói: ${plan}`);
    console.log(`→ Số tiền: ${pay_amount} ${pay_currency}`);

    // Ở đây bạn sẽ gọi API thật của bạn sau này
    // Ví dụ: fetch(`http://localhost:5000/api/users/${userId}/upgrade`, ...)
  }

  // Luôn trả 200 OK để NOWPayments không retry
  res.status(200).json({ success: true });
});

// Test route để kiểm tra ngrok chạy ok chưa
app.get('/', (req, res) => {
  res.send('<h1>Webhook local đang chạy – sẵn sàng nhận từ NOWPayments</h1>');
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Webhook server chạy tại: http://localhost:${PORT}`);
  console.log(`Dùng ngrok để public: ngrok http ${PORT}`);
});