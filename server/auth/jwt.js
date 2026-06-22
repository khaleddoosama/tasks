const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';

/**
 * Generate an access token (short-lived, for API calls)
 */
function generateAccessToken(userId, email) {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Generate a refresh token (long-lived, for session persistence)
 */
function generateRefreshToken(userId) {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Verify an access token and return payload
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw { status: 401, message: 'Token expired' };
    }
    if (error.name === 'JsonWebTokenError') {
      throw { status: 401, message: 'Invalid token' };
    }
    throw { status: 401, message: 'Token verification failed' };
  }
}

/**
 * Verify a refresh token and return payload
 */
function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'refresh') {
      throw new Error('Not a refresh token');
    }
    return payload;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw { status: 401, message: 'Refresh token expired' };
    }
    if (error.name === 'JsonWebTokenError') {
      throw { status: 401, message: 'Invalid refresh token' };
    }
    throw { status: 401, message: 'Refresh token verification failed' };
  }
}

/**
 * Extract token from Authorization header
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw { status: 401, message: 'Invalid Authorization header format' };
  }

  return parts[1];
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader
};
