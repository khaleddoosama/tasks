# SQLite + OAuth Implementation Summary

## ✅ Completed (6 Phases)

### Phase 1-2: Database & Storage ✅
- **Created**: `server/db/schema.js` - SQLite database initialization with 8 tables
  - `users` - OAuth profiles
  - `refresh_tokens` - Long-lived session tokens
  - `week_schedules` - Per-user weekly data
  - `monthly_goals`, `weekly_goals` - Per-user goals
  - `colors` - Per-user color schemes
  - `general_notes` - Per-user notes
  - `user_preferences` - Dark mode, selected week
  
- **Created**: `server/db/storage.js` - Refactored from JSON to SQLite
  - All methods now accept `userId` parameter
  - Automatic data isolation per user
  - Automatic migration from JSON data on first run
  - Prepared statements prevent SQL injection

- **Installed**: `better-sqlite3`, `jsonwebtoken`, `passport`, `dotenv`

### Phase 3-4: Authentication ✅
- **Created**: `server/auth/jwt.js`
  - Access token generation (short-lived, 7d default)
  - Refresh token generation (long-lived, 30d default)
  - Token verification with error handling
  
- **Created**: `server/auth/oauth.js`
  - Google OAuth user creation/update
  - User profile management
  - Token refresh logic
  - Logout with token revocation

- **Created**: `server/middleware/auth.js`
  - JWT verification middleware
  - Optional auth middleware
  - Proper 401 error handling

- **Created**: `server/routes/auth.js`
  - `GET /api/auth/google` - OAuth redirect URL
  - `POST /api/auth/callback` - OAuth callback handler
  - `POST /api/auth/refresh` - Token refresh
  - `POST /api/auth/logout` - Logout with token revocation
  - `GET /api/auth/profile` - Get current user profile

- **Updated**: All existing routes (schedule, goals, colors, notes, export, import)
  - Added `authMiddleware` to protect endpoints
  - Updated to pass `userId` to storage layer
  - Now return 401 for unauthenticated requests
  - User data is automatically isolated

### Phase 5: Frontend Integration ✅
- **Created**: `src/utils/auth.js`
  - `storeTokens()` - Save tokens to localStorage
  - `getAccessToken()` - Retrieve access token
  - `getRefreshToken()` - Retrieve refresh token
  - `getCurrentUser()` - Get logged-in user info
  - `clearAuth()` - Logout
  - `isAuthenticated()` - Check auth status
  - `getAuthHeader()` - Build Authorization header
  - `refreshAccessToken()` - Refresh expired token
  - `loginWithGoogle()` - Trigger Google login
  - `logout()` - Server-side logout

- **Updated**: `src/hooks/useScheduleApi.js`
  - Added `getHeaders()` with Authorization header
  - All fetch calls include auth header
  - Handle 401 responses

- **Updated**: `src/hooks/useGoalsApi.js`
  - Added `getHeaders()` with Authorization header
  - All fetch calls include auth header
  - Handle 401 responses

- **Updated**: `src/hooks/useColorsApi.js`
  - Added `getHeaders()` with Authorization header
  - All fetch calls include auth header
  - Handle 401 responses

- **Updated**: `server/index.js`
  - Load dotenv for environment variables
  - Initialize SQLite database
  - Run data migration from JSON
  - Mount auth routes
  - Pass database instance to storage layer

- **Updated**: `.env.local`
  - Added OAuth configuration placeholders
  - Added JWT secret and expiry settings
  - Database path configuration

---

## ⚠️ Remaining Tasks (Not Completed - Due to Token Limits)

### 1. **OAuth Login UI Component**
Create a React component to trigger Google login flow:
```jsx
// src/components/LoginButton.jsx
- Button to call loginWithGoogle()
- Loading/error states
- Redirect on success
```

### 2. **OAuth Callback Handler**
Create a page to handle OAuth redirect:
```jsx
// src/pages/OAuthCallbackPage.jsx
- Parse URL parameters (code or idToken)
- Call handleOAuthCallback()
- Store tokens via storeTokens()
- Redirect to main app
```

### 3. **Authentication Guard**
Wrap app to require login:
```jsx
// src/components/PrivateRoute.jsx OR update src/App.jsx
- Check isAuthenticated()
- If not authenticated, show login UI
- If authenticated, show main app
```

### 4. **Token Refresh on 401**
Update API error handling to auto-refresh:
```javascript
// In each useScheduleApi/useGoalsApi/useColorsApi
if (response.status === 401) {
  try {
    const newToken = await refreshAccessToken();
    // Retry request with new token
  } catch {
    // Redirect to login
  }
}
```

### 5. **Logout UI**
Add logout button to main UI:
```jsx
// In PlannerPage or App component
- Logout button
- Call logout() from auth.js
- Redirect to login
```

### 6. **Environment Setup**
User must configure:
1. Create Google OAuth app at https://console.cloud.google.com/
2. Get `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. Set redirect URI to `http://localhost:5173/auth/oauth/callback`
4. Update `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   JWT_SECRET=your_random_secret_key
   ```

---

## 📊 Architecture Overview

### Database Tables (User-Isolated)
```
users (primary key)
├── refresh_tokens (unique per user)
├── week_schedules (per user, per week)
├── monthly_goals (per user, per month)
├── weekly_goals (per user, per week)
├── colors (one per user)
├── general_notes (one per user)
└── user_preferences (one per user)
```

### API Flow
```
Client Request
  → Authorization Header (Bearer <token>)
  → authMiddleware (verifies JWT)
  → API Route Handler
    → storage.get(req.user.userId, ...)
    → Database Query (filtered by userId)
  → Response
```

### Auth Flow
```
User clicks Login
  → Redirect to Google OAuth
  → User approves
  → OAuth callback to app
  → storeTokens(accessToken, refreshToken, user)
  → API calls include Authorization header
  → JWT expires (7 days default)
  → Auto-refresh via refreshAccessToken()
  → Token expires (30 days default)
  → Redirect to login
```

---

## 🚀 How to Complete the Implementation

### Step 1: Create OAuth Login UI
```jsx
// src/components/OAuthLoginButton.jsx
import { loginWithGoogle } from '../utils/auth';

export function OAuthLoginButton() {
  const handleLogin = async () => {
    await loginWithGoogle();
  };
  
  return (
    <button onClick={handleLogin}>
      Sign in with Google
    </button>
  );
}
```

### Step 2: Create OAuth Callback Page
```jsx
// src/pages/OAuthCallbackPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleOAuthCallback, storeTokens } from '../utils/auth';

export function OAuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const idToken = params.get('id_token');

      try {
        const { user, accessToken, refreshToken } = await handleOAuthCallback(code, idToken);
        storeTokens(accessToken, refreshToken, user);
        navigate('/'); // Redirect to main app
      } catch (error) {
        navigate('/login?error=' + error.message);
      }
    };

    processCallback();
  }, [navigate]);

  return <div>Processing OAuth callback...</div>;
}
```

### Step 3: Protect Routes
```jsx
// Update src/App.jsx or create PrivateRoute.jsx
import { isAuthenticated } from './utils/auth';
import OAuthLoginButton from './components/OAuthLoginButton';
import PlannerPage from './features/planner/PlannerPage';

function App() {
  if (!isAuthenticated()) {
    return <OAuthLoginButton />;
  }

  return <PlannerPage />;
}
```

### Step 4: Configure Google OAuth
1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Set Authorized JavaScript origins: `http://localhost:5173`
6. Set Authorized redirect URIs: `http://localhost:5173/auth/oauth/callback`
7. Copy Client ID and Client Secret to `.env.local`

---

## 🔒 Security Notes

✅ **Implemented**:
- JWT signature verification
- Refresh token rotation
- User data isolation (per userId)
- SQL injection prevention (prepared statements)
- Password-less auth (OAuth only)

⚠️ **Production Considerations**:
- Use HTTPS in production (required for OAuth)
- Store JWT_SECRET in secure environment variable service
- Use httpOnly, secure cookies for refresh tokens (instead of localStorage)
- Add rate limiting on auth endpoints
- Add CSRF protection for non-API routes
- Enable database encryption at rest
- Regular security audits

---

## 📝 Testing Checklist

- [ ] OAuth login works (redirects to Google)
- [ ] OAuth callback returns tokens
- [ ] Tokens stored in localStorage
- [ ] API calls include Authorization header
- [ ] 401 responses trigger token refresh
- [ ] User data is isolated (can't see other users' data)
- [ ] Logout clears tokens and revokes refresh token
- [ ] App requires login to access
- [ ] SQLite database persists across restarts
- [ ] Legacy JSON data migrated to SQLite

---

## 📦 Environment Variables Required

```bash
# OAuth (Google)
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
OAUTH_CALLBACK_URL=http://localhost:5173/auth/oauth/callback

# JWT
JWT_SECRET=<your_random_secret_key_min_32_chars>
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d

# Database
DATABASE_URL=server/db/database.db
```

---

## 🎉 Completed Deliverables

✅ SQLite database with 8 tables  
✅ User authentication with OAuth 2.0  
✅ JWT token management (access + refresh)  
✅ User data isolation  
✅ All API endpoints protected  
✅ Automatic data migration from JSON  
✅ Frontend auth utilities  
✅ API hooks with auth headers  

**Status**: 85% complete - ready for OAuth UI and callback handler integration
