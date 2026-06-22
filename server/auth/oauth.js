const { generateAccessToken, generateRefreshToken } = require('./jwt');

/**
 * Create or update user from Google OAuth profile
 * Returns { user, accessToken, refreshToken }
 */
function handleOAuthCallback(db, profile) {
  const userId = profile.id; // Google OAuth 'sub'
  const email = profile.emails?.[0]?.value;
  const name = profile.displayName;
  const pictureUrl = profile.photos?.[0]?.value;

  if (!email) {
    throw { status: 400, message: 'Email not provided by OAuth provider' };
  }

  try {
    // Check if user exists
    const existingUser = db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).get(userId);

    let user;
    if (existingUser) {
      // Update existing user
      db.prepare(`
        UPDATE users
        SET name = ?, picture_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name || existingUser.name, pictureUrl || existingUser.picture_url, userId);

      user = db.prepare(
        'SELECT id, email, name, picture_url FROM users WHERE id = ?'
      ).get(userId);
    } else {
      // Create new user
      db.prepare(`
        INSERT INTO users (id, email, name, picture_url)
        VALUES (?, ?, ?, ?)
      `).run(userId, email, name, pictureUrl);

      user = {
        id: userId,
        email,
        name,
        picture_url: pictureUrl
      };

      // Initialize user preferences
      db.prepare(`
        INSERT INTO user_preferences (user_id, dark_mode, selected_week)
        VALUES (?, FALSE, 1)
      `).run(userId);

      // Initialize empty colors with defaults
      const defaultColors = {
        header: { bg: '#1a1a2e', text: '#ffffff' },
        worship: { bg: '#6c5ce7', text: '#ffffff' },
        quran_study: { bg: '#00b894', text: '#ffffff' },
        sports_fitness: { bg: '#fd79a8', text: '#ffffff' },
        rest_nutrition: { bg: '#fdcb6e', text: '#000000' },
        education: { bg: '#0984e3', text: '#ffffff' },
        tech_projects: { bg: '#e17055', text: '#ffffff' },
        personal_projects: { bg: '#6c5ce7', text: '#ffffff' },
        relationships: { bg: '#00cec9', text: '#ffffff' },
        commute_buffer: { bg: '#dfe6e9', text: '#000000' },
        planning_review: { bg: '#95a5a6', text: '#ffffff' },
        sleep: { bg: '#2c3e50', text: '#ffffff' }
      };
      db.prepare(`
        INSERT INTO colors (user_id, data)
        VALUES (?, ?)
      `).run(userId, JSON.stringify(defaultColors));
    }

    // Generate tokens
    const accessToken = generateAccessToken(userId, email);
    const refreshToken = generateRefreshToken(userId);

    // Store refresh token in database
    db.prepare(`
      INSERT OR REPLACE INTO refresh_tokens (user_id, token, expires_at)
      VALUES (?, ?, datetime('now', '+30 days'))
    `).run(userId, refreshToken);

    return {
      user,
      accessToken,
      refreshToken
    };
  } catch (error) {
    if (error.status) throw error;
    console.error('Error in OAuth callback:', error);
    throw { status: 500, message: 'Failed to process OAuth callback' };
  }
}

/**
 * Verify refresh token is valid and return new access token
 */
function refreshAccessToken(db, refreshToken, jwtModule) {
  try {
    // Verify JWT signature
    const payload = jwtModule.verifyRefreshToken(refreshToken);
    const userId = payload.userId;

    // Verify token exists in database
    const storedToken = db.prepare(`
      SELECT token, expires_at FROM refresh_tokens
      WHERE user_id = ? AND token = ?
    `).get(userId, refreshToken);

    if (!storedToken) {
      throw { status: 401, message: 'Refresh token not found or revoked' };
    }

    // Check if token has expired
    const expiresAt = new Date(storedToken.expires_at);
    if (expiresAt < new Date()) {
      throw { status: 401, message: 'Refresh token has expired' };
    }

    // Get user info
    const user = db.prepare(
      'SELECT id, email, name FROM users WHERE id = ?'
    ).get(userId);

    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    // Generate new access token
    const newAccessToken = jwtModule.generateAccessToken(userId, user.email);

    return {
      user,
      accessToken: newAccessToken,
      refreshToken // Return same refresh token (could be renewed if expiring soon)
    };
  } catch (error) {
    if (error.status) throw error;
    console.error('Error refreshing token:', error);
    throw { status: 401, message: 'Failed to refresh token' };
  }
}

/**
 * Logout - revoke refresh token
 */
function logout(db, userId, refreshToken) {
  try {
    db.prepare(`
      DELETE FROM refresh_tokens
      WHERE user_id = ? AND token = ?
    `).run(userId, refreshToken);

    return { message: 'Logged out successfully' };
  } catch (error) {
    console.error('Error logging out:', error);
    throw { status: 500, message: 'Failed to logout' };
  }
}

/**
 * Get user profile
 */
function getUserProfile(db, userId) {
  try {
    const user = db.prepare(`
      SELECT id, email, name, picture_url, created_at, updated_at
      FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    return user;
  } catch (error) {
    if (error.status) throw error;
    console.error('Error getting user profile:', error);
    throw { status: 500, message: 'Failed to get user profile' };
  }
}

module.exports = {
  handleOAuthCallback,
  refreshAccessToken,
  logout,
  getUserProfile
};
