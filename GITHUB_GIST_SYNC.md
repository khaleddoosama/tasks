# GitHub Gist Sync Feature 🔗

Complete GitHub Gist sync integration for your React weekly schedule planner. This feature enables automatic cloud backup and synchronization of your schedule data without any backend server.

## ✨ Features

### 🔄 Auto-Pull on App Load
- When the app starts, it automatically fetches the latest data from your GitHub Gist
- Merges remote data with local data intelligently
- Displays sync status and last sync time

### ⬆️ Auto-Push on Data Change
- Every time you add, edit, or delete a task, the changes are automatically pushed to GitHub
- Debounced by 2 seconds to avoid excessive API calls
- Happens silently in the background

### ⚙️ Settings UI
- Configure GitHub Personal Access Token and Gist ID easily
- Option to automatically create a new Gist
- View sync status and error messages
- Clear settings if needed

### 📊 Sync Status Indicator
Shows one of four states:
- **🔄 Syncing...** — Currently synchronizing with GitHub
- **✅ Synced** — Successfully synced with timestamp
- **❌ Failed** — Sync failed (shows error message)
- **⏸️ Not Connected** — No GitHub credentials configured

## 🚀 Getting Started

### Step 1: Get Your GitHub Personal Access Token

1. Go to https://github.com/settings/tokens/new
2. Select the `gist` scope
3. Copy your token (it starts with `ghp_`)
4. **Keep this token safe!** Never share it publicly

### Step 2: Configure in the App

1. Click the **🔗 GitHub** button in the toolbar
2. Enter your Personal Access Token
3. Either:
   - Click **➕ Create New Gist** (recommended for first time) — The app will create a new private Gist automatically
   - Or paste an existing Gist ID (found in the URL: `gist.github.com/username/GIST_ID`)
4. Click **💾 Save Settings**

### Step 3: Start Using!

Your schedule will now automatically:
- ✅ Sync to GitHub whenever you make changes
- 🔄 Pull latest data from GitHub when you open the app
- 📱 Sync across devices and browsers

## 📁 File Structure

The app creates/updates a single Gist file called `todo-app-data.json` containing:

```json
{
  "days": [...],           // All your weekly schedule days
  "colors": {...},         // Custom color settings
  "lastUpdated": "2024-01-01T12:00:00.000Z"
}
```

## 🔗 Components

### 1. `useGistSync.js` — Custom Hook

The main hook that handles all sync logic.

**Features:**
- Auto-pull on mount
- Auto-push on data changes (debounced)
- Merge conflict resolution
- Error handling and recovery
- Token and Gist ID management from localStorage

**Usage:**
```javascript
const {
  syncStatus,        // 'idle' | 'syncing' | 'synced' | 'failed'
  lastSyncTime,      // Date object or null
  syncError,         // Error message string or null
  pullFromGist,      // Function to manually pull data
  pushToGist,        // Function to manually push data
  createNewGist,     // Function to create a new Gist
  hasCredentials,    // Function to check if configured
} = useGistSync(days, colors, onDataMerged);
```

### 2. `GistSettingsModal.jsx` — Settings Modal

Beautiful modal for managing GitHub credentials.

**Features:**
- Token input (password field for security)
- Gist ID input with validation
- Create new Gist button
- Clear settings button
- Sync status display
- Helpful tips and links

### 3. `SyncStatusIndicator.jsx` — Status Display

Compact indicator showing current sync state.

**Features:**
- Color-coded status (orange, green, red)
- Animated spinner during sync
- Click to open settings
- Error message tooltip
- Last sync timestamp display

## 🔐 Security Notes

⚠️ **Important:**
- Tokens are stored in browser localStorage (unencrypted)
- For production apps, consider using secure storage
- Never commit `.env` files with tokens to version control
- Use a Personal Access Token with only `gist` scope (minimal permissions)
- You can revoke tokens anytime at https://github.com/settings/tokens

## 🌐 How It Works

### Push Flow (On Data Change)
```
User makes change → 2 second debounce → GitHub API PATCH
                     ↓
                Update Gist file → Sync status: ✅ Synced
```

### Pull Flow (On App Load)
```
App mounts → Check for credentials → GitHub API GET
                                       ↓
                        Parse Gist file → Merge with local data
                                       ↓
                        Update app state → Sync status: ✅ Synced
```

## 🛠️ Troubleshooting

### "❌ Gist not found"
- Check your Gist ID is correct
- Make sure the Gist is in your account
- Try creating a new Gist instead

### "❌ Invalid token"
- Token may have expired or been revoked
- Generate a new token at https://github.com/settings/tokens
- Make sure you selected the `gist` scope

### "❌ Network error"
- Check your internet connection
- GitHub API might be down (check https://www.githubstatus.com)
- Wait a moment and try again

### Changes not syncing
- Check the sync status indicator
- Make sure credentials are entered
- Try clicking the GitHub button to manually sync
- Check browser console for errors

### Want to see what's in your Gist?
Visit: `https://gist.github.com/your-username/GIST_ID/raw`

## 💾 Auto-Save vs. GitHub Sync

**Local Auto-Save** (500ms debounce):
- Saves to browser localStorage
- **Survives browser restart** ✅
- Works offline ✅
- Only on this device ⚠️

**GitHub Gist Sync** (2s debounce):
- Pushes to cloud
- **Accessible from any device** ✅
- **Accessible from any browser** ✅
- Requires internet ⚠️
- Requires GitHub account ⚠️

**Best Practice:** Use both! Local saves are fast and safe, GitHub sync is your cloud backup.

## 🔄 Manual Sync

While auto-sync happens automatically, you can manually sync:

1. **Pull latest:** Refresh the page
2. **Push now:** Make any small change and wait 2 seconds
3. **Settings modal:** Open GitHub settings to see sync status

## 📝 Implementation Notes

### Data Structure
The sync preserves your entire schedule including:
- All 7 days with tasks
- Custom colors for categories
- Task times, descriptions, categories, notes
- Day metadata (date, energy level, rating, sleep hours)

### Merge Strategy
When pulling from GitHub:
- Remote data takes precedence if valid
- Local data is fallback if remote is unavailable
- Prevents data loss on sync errors

### Error Recovery
- Sync errors don't block the app
- Local changes are preserved
- Auto-retry on next change
- Manual retry available via modal

## 🎯 Common Use Cases

### Case 1: Multi-Device Sync
1. Set up GitHub sync on your laptop
2. Open app on your phone
3. Enter same GitHub token and Gist ID
4. Changes sync instantly across devices

### Case 2: Daily Backup
1. GitHub automatically stores version history
2. Visit your Gist page to see all previous versions
3. Revert to old schedules if needed

### Case 3: Share Schedule
1. Create a public Gist (in GitHub settings)
2. Share the Gist URL with others
3. They can view your schedule online

## 🚫 Limitations

- **Rate Limited:** GitHub API has rate limits (60 requests/hour for unauthenticated, 5000 for authenticated)
- **Gist Per File Size:** Individual Gist file limit is 1 MB (more than enough for schedules)
- **No Conflict Resolution:** If edited on two devices simultaneously, last update wins
- **Sync Delay:** 2 second debounce means changes take up to 2 seconds to sync

## 📞 Support

If you encounter issues:

1. Check browser console (F12) for errors
2. Verify token has `gist` scope
3. Check GitHub API status
4. Try creating a new Gist
5. Clear settings and reconfigure

## 🔮 Future Enhancements

Possible improvements:
- Encrypt sensitive data before storing
- Multiple Gist support
- Conflict resolution UI
- Selective sync (sync specific days)
- Sync history viewer
- Scheduled backups

## 📄 Files Added

- `src/useGistSync.js` — Main sync hook
- `src/GistSettingsModal.jsx` — Settings UI
- `src/SyncStatusIndicator.jsx` — Status display
- Modified `src/App.jsx` — Integration

---

**Happy syncing! 🚀**
