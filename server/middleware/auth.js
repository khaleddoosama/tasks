const jwt = require('../auth/jwt');

/**
 * Middleware to verify JWT token and attach user to request
 * Required for all protected API endpoints
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Missing authorization token',
        status: 401
      });
    }

    // Extract token from "Bearer <token>" format
    const token = jwt.extractTokenFromHeader(authHeader);

    // Verify token
    const payload = jwt.verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      userId: payload.userId,
      email: payload.email
    };

    next();
  } catch (error) {
    const status = error.status || 401;
    const message = error.message || 'Unauthorized';

    res.status(status).json({
      error: message,
      status
    });
  }
}

/**
 * Optional auth middleware - doesn't fail if no token provided
 * Useful for endpoints that can work with or without auth
 */
function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = jwt.extractTokenFromHeader(authHeader);
      const payload = jwt.verifyAccessToken(token);

      req.user = {
        userId: payload.userId,
        email: payload.email
      };
    }
  } catch (error) {
    // Silently ignore auth errors - user will be undefined
    console.debug('Optional auth failed (expected):', error.message);
  }

  next();
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware
};
