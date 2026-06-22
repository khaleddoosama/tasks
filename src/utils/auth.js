/**
 * Auth token management utilities for frontend (Basic Auth)
 */

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER: 'auth_user'
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Store tokens after successful login
 */
export function storeTokens(accessToken, refreshToken, user) {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

/**
 * Get the current access token
 */
export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Get the refresh token
 */
export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

/**
 * Get the current user
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem(STORAGE_KEYS.USER);
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Clear all auth data (logout)
 */
export function clearAuth() {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getAccessToken();
}

/**
 * Build Authorization header value
 */
export function getAuthHeader() {
  const token = getAccessToken();
  return token ? `Bearer ${token}` : null;
}

/**
 * Login with username and password
 */
export async function login(username, password) {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const { user, accessToken, refreshToken } = await response.json();
    storeTokens(accessToken, refreshToken, user);
    return { user, accessToken, refreshToken };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Try to refresh the access token
 */
export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearAuth();
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuth();
        throw new Error('Refresh token expired, please login again');
      }
      throw new Error('Failed to refresh token');
    }

    const { accessToken, refreshToken: newRefreshToken, user } = await response.json();
    storeTokens(accessToken, newRefreshToken, user);
    return accessToken;
  } catch (error) {
    clearAuth();
    throw error;
  }
}

/**
 * Logout user
 */
export async function logout() {
  const authHeader = getAuthHeader();

  try {
    if (authHeader) {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        }
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  }

  clearAuth();
}
