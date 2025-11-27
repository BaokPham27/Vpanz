// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  avatarURL: { type: String },

  // Gamification
  studyStreak: { type: Number, default: 0 },
  lastStudyDate: { type: Date },
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],

  // Relations
  flashcardSets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FlashcardSet' }],

  role: {
  type: String,
  enum: ['user', 'teacher', 'admin'],
  default: 'user'
},

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.index({ email: 1 });

// ĐÚNG CÚ PHÁP COMMONJS — DÙNG module.exports
module.exports = mongoose.model('User', userSchema);