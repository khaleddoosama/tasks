const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { authMiddleware } = require('../middleware/auth');

// GET full data export (protected)
router.get('/', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const data = storage.exportData(userId);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
