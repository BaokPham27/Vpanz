// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  console.log('===== PROTECT MIDDLEWARE =====');
  console.log('Authorization header:', req.headers.authorization);

  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token received (first 20 chars):', token.substring(0, 20) + '...');

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vpan_secret_2025');
      console.log('Token decoded:', decoded);

      req.user = await User.findById(decoded.id).select('-password');
      console.log('Found user:', req.user?.email, 'Role:', req.user?.role);

      if (!req.user) {
        console.log('User not found, unauthorized');
        return res.status(401).json({ message: 'User not found' });
      }

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

// Middleware kiểm tra admin
const admin = (req, res, next) => {
  console.log('===== ADMIN CHECK MIDDLEWARE =====');
  console.log('User role:', req.user?.role);
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    console.log('Not admin, redirecting...');
    return res.status(403).json({ message: 'Admin only' });
  }
};

module.exports = { protect, admin };
