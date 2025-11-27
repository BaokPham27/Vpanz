const FlashcardSet = require('../models/FlashcardSet');

// @desc    Get all flashcard sets
// @route   GET /api/flashcard-sets
// @access  Private
const getAllFlashcardSets = async (req, res) => {
  try {
    const flashcardSets = await FlashcardSet.find({ owner: req.user.id }).populate('flashcards');
    res.json(flashcardSets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get a single flashcard set by ID
// @route   GET /api/flashcard-sets/:id
// @access  Private
const getFlashcardSetById = async (req, res) => {
  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id).populate('flashcards');

    if (!flashcardSet) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    if (flashcardSet.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(flashcardSet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Create a new flashcard set
// @route   POST /api/flashcard-sets
// @access  Private
const createFlashcardSet = async (req, res) => {
  const { title, description, tags, level, isPublic } = req.body;

  try {
    const flashcardSet = new FlashcardSet({
      title,
      description,
      tags,
      level,
      isPublic,
      owner: req.user.id,
    });

    const createdFlashcardSet = await flashcardSet.save();
    res.status(201).json(createdFlashcardSet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Update a flashcard set
// @route   PUT /api/flashcard-sets/:id
// @access  Private
const updateFlashcardSet = async (req, res) => {
  const { title, description, tags, level, isPublic } = req.body;

  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id);

    if (!flashcardSet) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    if (flashcardSet.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    flashcardSet.title = title ?? flashcardSet.title;
    flashcardSet.description = description ?? flashcardSet.description;
    flashcardSet.tags = tags ?? flashcardSet.tags;
    flashcardSet.level = level ?? flashcardSet.level;
    flashcardSet.isPublic = isPublic ?? flashcardSet.isPublic;
    flashcardSet.updatedAt = Date.now();

    const updatedFlashcardSet = await flashcardSet.save();
    res.json(updatedFlashcardSet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Delete a flashcard set
// @route   DELETE /api/flashcard-sets/:id
// @access  Private
const deleteFlashcardSet = async (req, res) => {
  try {
    const flashcardSet = await FlashcardSet.findById(req.params.id);

    if (!flashcardSet) {
      return res.status(404).json({ message: 'Flashcard set not found' });
    }

    if (flashcardSet.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await flashcardSet.deleteOne();
    res.json({ message: 'Flashcard set removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllFlashcardSets,
  getFlashcardSetById,
  createFlashcardSet,
  updateFlashcardSet,
  deleteFlashcardSet,
};
