// middleware/authMiddleware.js – PHIÊN BẢN DÀNH RIÊNG CHO MYSQL2 (2025)
const jwt = require('jsonwebtoken');
const db = require('../db'); // mysql2 pool

const protect = async (req, res, next) => {
  console.log('===== PROTECT MIDDLEWARE (MySQL2) =====');
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token received (first 20 chars):', token.substring(0, 1000) + '...');

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vpan_secret_2025');
      console.log('Token decoded:', decoded);

      // ĐÚNG – DÙNG MYSQL2, KHÔNG DÙNG MONGOOSE
      const [rows] = await db.query('SELECT id, email, name, role FROM users WHERE id = ?', [decoded.id]);

      if (rows.length === 0) {
        console.log('User not found in DB');
        return res.status(401).json({ message: 'User not found' });
      }

      req.user = rows[0]; // ← { id: 1, email: '...', role: 'user' }
      console.log('User authenticated:', req.user.email, 'Role:', req.user.role);

      next();
    } catch (err) {
      console.error('Auth error:', err.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    console.log('No token provided');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  console.log('===== ADMIN CHECK =====');
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    console.log('Access denied – not admin');
    return res.status(403).json({ message: 'Admin only' });
  }
};

module.exports = { protect, admin };