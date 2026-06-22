const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { authMiddleware } = require('../middleware/auth');

// GET color scheme (protected)
router.get('/', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const colors = storage.get(userId, 'colors');
    res.json(colors);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// POST/Update color scheme (protected)
router.post('/', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const colors = req.body;

    if (typeof colors !== 'object' || Array.isArray(colors)) {
      return res.status(400).json({ error: 'Colors must be an object' });
    }

    storage.save(userId, 'colors', null, colors);
    res.status(201).json({ message: 'Colors saved', colors });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
