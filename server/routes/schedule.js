const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { authMiddleware } = require('../middleware/auth');

// GET all schedules (protected)
router.get('/', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const weekSchedules = storage.get(userId, 'weekSchedules');
    res.json(weekSchedules || {});
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// GET single week schedule (protected)
router.get('/:weekKey', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const schedule = storage.get(userId, 'weekSchedules', req.params.weekKey);
    if (!schedule) {
      return res.status(404).json({ error: 'Week not found' });
    }
    res.json(schedule);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// POST/Save week schedule (protected)
router.post('/:weekKey', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const { weekKey } = req.params;
    const days = req.body;

    if (!Array.isArray(days)) {
      return res.status(400).json({ error: 'Schedule must be an array of days' });
    }

    storage.save(userId, 'weekSchedules', weekKey, days);

    res.status(201).json({ message: 'Schedule saved', weekKey, days });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// DELETE week schedule (protected)
router.delete('/:weekKey', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const weekKey = req.params.weekKey;

    // For now, we can't delete via storage API
    // Would need to add a delete method
    // For MVP, just return a message
    res.json({ message: 'Delete not yet implemented. Schedule data is automatically managed.' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
