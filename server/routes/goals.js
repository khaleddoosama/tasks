const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { authMiddleware } = require('../middleware/auth');

// GET all goals (monthly and weekly) (protected)
router.get('/', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const allData = storage.getAll(userId);
    res.json({
      monthlyGoals: allData.monthlyGoals,
      weeklyGoals: allData.weeklyGoals
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// GET monthly goals for a specific month (protected)
router.get('/monthly/:monthKey', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const goals = storage.get(userId, 'monthlyGoals', req.params.monthKey);
    res.json(goals || {});
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// POST monthly goal (protected)
router.post('/monthly/:monthKey', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const { monthKey } = req.params;
    const goalData = req.body;

    storage.save(userId, 'monthlyGoals', monthKey, goalData);

    res.status(201).json({ message: 'Monthly goal saved', monthKey, goals: goalData });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// GET weekly goals for a specific week (protected)
router.get('/weekly/:weekKey', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const goals = storage.get(userId, 'weeklyGoals', req.params.weekKey);
    res.json(goals || {});
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// POST weekly goal (protected)
router.post('/weekly/:weekKey', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const { weekKey } = req.params;
    const goalData = req.body;

    storage.save(userId, 'weeklyGoals', weekKey, goalData);

    res.status(201).json({ message: 'Weekly goal saved', weekKey, goals: goalData });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
