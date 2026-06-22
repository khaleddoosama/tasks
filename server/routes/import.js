const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { authMiddleware } = require('../middleware/auth');

// POST import data (protected)
router.post('/', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const importedData = req.body;

    if (typeof importedData !== 'object' || Array.isArray(importedData)) {
      return res.status(400).json({ error: 'Import data must be an object' });
    }

    const data = storage.importData(userId, importedData);
    res.status(201).json({ message: 'Data imported successfully', data });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
