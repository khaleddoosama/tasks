# GitHub Gist Sync - Quick Setup Guide

## 📋 What Was Added

Your React app now has complete GitHub Gist sync functionality with:

✅ **3 New Files:**
- `src/useGistSync.js` — Custom React hook for all sync logic
- `src/GistSettingsModal.jsx` — Settings modal component
- `src/SyncStatusIndicator.jsx` — Status indicator component

✅ **1 Modified File:**
- `src/App.jsx` — Integrated the components and hook

✅ **Features Enabled:**
- ⬆️ Auto-push on data changes (2 second debounce)
- 🔄 Auto-pull on app load
- ⚙️ Settings modal for GitHub token/Gist ID
- 📊 Real-time sync status indicator

## 🚀 How to Use

### 1. Get GitHub Token
Visit: https://github.com/settings/tokens/new
- Select: `gist` scope only
- Generate token (starts with `ghp_`)

### 2. Configure in App
1. Click **🔗 GitHub** button (top toolbar)
2. Paste your token
3. Click **➕ Create New Gist** (or enter existing Gist ID)
4. Click **💾 Save Settings**

### 3. Done! 🎉
Your schedule automatically syncs with GitHub:
- Changes sync every 2 seconds
- Latest data loads on app start
- Status shows in toolbar

## 📊 Sync Status Meanings

| Icon | Status | Meaning |
|------|--------|---------|
| 🔄 | Syncing... | Currently uploading to GitHub |
| ✅ | Synced | Successfully synced (shows time) |
| ❌ | Failed | Error occurred (hover for details) |
| ⏸️ | Not Connected | No GitHub credentials set |

## 🔑 Key Implementation Details

### useGistSync Hook
```javascript
const {
  syncStatus,       // 'idle' | 'syncing' | 'synced' | 'failed'
  lastSyncTime,     // Date of last sync
  syncError,        // Error message if failed
  pullFromGist,     // Manually pull from GitHub
  pushToGist,       // Manually push to GitHub
  createNewGist,    // Create new Gist
  hasCredentials,   // Check if configured
} = useGistSync(days, colors, onDataMerged);
```

### Auto-Save Still Works
- Local: 500ms debounce → localStorage
- GitHub: 2000ms debounce → GitHub Gist
- Both run independently
- Data survives offline and app restarts

### Credentials Storage
- GitHub Token: `localStorage.gist_token`
- Gist ID: `localStorage.gist_id`
- Stored in browser (unencrypted)

## 🐛 Troubleshooting

**Not syncing?**
- Check if token is valid (not expired)
- Check internet connection
- Look for red "Failed" status in toolbar
- Hover over error for details

**Can't find my Gist ID?**
- Go to your Gist: https://gist.github.com/username
- ID is in the URL: `gist.github.com/username/[ID]`

**Want to clear settings?**
- Click 🔗 GitHub button
- Scroll to bottom of modal
- Click 🗑️ Clear Settings

## 💡 Tips

1. **Multi-Device:** Use same token/Gist ID on multiple devices
2. **Backup:** All versions saved automatically on GitHub
3. **Public Share:** Make Gist public to share schedule with others
4. **Manual Sync:** Refresh page to pull, make any change to push

## 🔐 Security

⚠️ **Remember:**
- Token gives full Gist access
- Only select `gist` scope when creating
- Store token securely (consider encrypted password manager)
- Can revoke anytime at GitHub settings

## 📞 Support

Check the full guide: [GITHUB_GIST_SYNC.md](./GITHUB_GIST_SYNC.md)

---

That's it! Your schedule is now backed up to the cloud. 🎉
