const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwtModule = require('../auth/jwt');
const { authMiddleware } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Login with username and password
 * Expected body: { username: "...", password: "..." }
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password required',
        status: 400
      });
    }

    const db = req.app.locals.db;

    // Find user by username
    const user = db.prepare(
      'SELECT id, username, password_hash FROM users WHERE username = ?'
    ).get(username);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid username or password',
        status: 401
      });
    }

    // Verify password
    const passwordValid = bcrypt.compareSync(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        error: 'Invalid username or password',
        status: 401
      });
    }

    // Generate tokens
    const accessToken = jwtModule.generateAccessToken(user.id, user.username);
    const refreshToken = jwtModule.generateRefreshToken(user.id);

    // Return user and tokens
    res.json({
      user: {
        id: user.id,
        username: user.username
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      status: 500
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh an expired access token
 * Expected body: { refreshToken: "..." }
 */
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Missing refresh token',
        status: 400
      });
    }

    const db = req.app.locals.db;

    // Verify refresh token
    const payload = jwtModule.verifyRefreshToken(refreshToken);
    const userId = payload.userId;

    // Get user
    const user = db.prepare(
      'SELECT id, username FROM users WHERE id = ?'
    ).get(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        status: 404
      });
    }

    // Generate new access token
    const newAccessToken = jwtModule.generateAccessToken(userId, user.username);

    res.json({
      user,
      accessToken: newAccessToken,
      refreshToken
    });
  } catch (error) {
    const status = error.status || 500;
    const message = error.message || 'Token refresh failed';

    res.status(status).json({
      error: message,
      status
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (just for frontend coordination, no server-side tracking needed)
 */
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/profile
 * Get current user's profile
 * Requires: valid access token
 */
router.get('/profile', authMiddleware, (req, res) => {
  try {
    const userId = req.user.userId;
    const db = req.app.locals.db;

    const user = db.prepare(
      'SELECT id, username, created_at, updated_at FROM users WHERE id = ?'
    ).get(userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        status: 404
      });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get profile',
      status: 500
    });
  }
});

module.exports = router;
