// middleware/auth.js – HOÀN HẢO, KHÔNG CẦN SỬA GÌ NHIỀU
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token received (first 20 chars):', token.substring(0, 20) + '...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vpan_secret_2025');
      console.log('Token decoded. User ID:', decoded.id);

      req.user = await User.findById(decoded.id).select('-password');
      console.log('User found:', req.user ? req.user.email : 'NOT FOUND');
      if (!req.user) return res.status(401).json({ message: 'User not found' });

      next();
    } catch (error) {
      console.error('Auth error:', 'Token error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    console.log('No token provided');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };