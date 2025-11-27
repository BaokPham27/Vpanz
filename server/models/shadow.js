const mongoose = require("mongoose");

const SentenceSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: true
  },
  text: {
    type: String,
    required: true
  }
});

const ShadowSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  sentences: {
    type: [SentenceSchema],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model("Shadow", ShadowSchema);
