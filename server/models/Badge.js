const badgeSchema = new mongoose.Schema({
  name: String,        // "30 ngày liên tiếp"
  description: String,
  icon: String,
  condition: String,   // "studyStreak >= 30"
});

export default mongoose.model('Badge', badgeSchema);