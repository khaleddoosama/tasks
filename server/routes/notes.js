const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { authMiddleware } = require('../middleware/auth');

// GET general notes (protected)
router.get('/', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const notes = storage.get(userId, 'generalNotes') || [];
    res.json(notes);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// POST/Update general notes (protected)
router.post('/', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const notes = req.body;

    if (!Array.isArray(notes)) {
      return res.status(400).json({ error: 'Notes must be an array' });
    }

    storage.save(userId, 'generalNotes', null, notes);
    res.status(201).json({ message: 'Notes saved', notes });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
