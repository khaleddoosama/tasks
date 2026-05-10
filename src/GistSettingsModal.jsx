import { useState } from 'react';

/**
 * Settings Modal Component for GitHub Gist Sync Configuration
 */
export function GistSettingsModal({ isOpen, onClose, onSave, syncStatus, lastSyncTime, syncError, onCreateGist }) {
  const [token, setToken] = useState(() => localStorage.getItem('gist_token') || '');
  const [gistId, setGistId] = useState(() => localStorage.getItem('gist_id') || '');
  const [isCreatingGist, setIsCreatingGist] = useState(false);
  const [createdGistId, setCreatedGistId] = useState(null);

  const handleSave = () => {
    if (!token.trim()) {
      alert('⚠️ Please enter a valid GitHub Personal Access Token');
      return;
    }
    if (!gistId.trim()) {
      alert('⚠️ Please enter a Gist ID');
      return;
    }

    localStorage.setItem('gist_token', token);
    localStorage.setItem('gist_id', gistId);

    onSave?.({ token, gistId });
    alert('✅ GitHub Gist settings saved successfully!');
    onClose();
  };

  const handleCreateGist = async () => {
    if (!token.trim()) {
      alert('⚠️ Please enter a valid GitHub Personal Access Token first');
      return;
    }

    setIsCreatingGist(true);
    try {
      const newGistId = await onCreateGist(token);
      if (newGistId) {
        setGistId(newGistId);
        setCreatedGistId(newGistId);
        alert('✅ New Gist created successfully! ID: ' + newGistId);
      }
    } finally {
      setIsCreatingGist(false);
    }
  };

  const handleClearSettings = () => {
    if (window.confirm('⚠️ Are you sure you want to clear all Gist sync settings?')) {
      localStorage.removeItem('gist_token');
      localStorage.removeItem('gist_id');
      setToken('');
      setGistId('');
      setCreatedGistId(null);
      alert('✅ Settings cleared');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      direction: 'rtl',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '90%',
        maxWidth: 500,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ margin: '0 0 20px 0', textAlign: 'right', color: '#1a1a2e' }}>
          ⚙️ إعدادات المزامنة مع GitHub
        </h2>

        {/* Sync Status */}
        <div style={{
          background: '#f9fafb',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          borderRight: '4px solid #3498db',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>
            حالة المزامنة:
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: syncStatus === 'synced' ? '#27ae60' : syncStatus === 'syncing' ? '#f39c12' : syncStatus === 'failed' ? '#e74c3c' : '#666',
          }}>
            {syncStatus === 'syncing' && '🔄 جارٍ المزامنة...'}
            {syncStatus === 'synced' && `✅ تمت المزامنة - ${lastSyncTime ? lastSyncTime.toLocaleTimeString() : ''}`}
            {syncStatus === 'failed' && `❌ فشلت المزامنة: ${syncError}`}
            {syncStatus === 'idle' && 'جاهز'}
          </div>
        </div>

        {/* Token Input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: '#1a1a2e',
            marginBottom: 6,
            textAlign: 'right',
          }}>
            GitHub Personal Access Token *
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 13,
              boxSizing: 'border-box',
              fontFamily: 'monospace',
            }}
          />
          <div style={{
            fontSize: 11,
            color: '#999',
            marginTop: 4,
            textAlign: 'right',
          }}>
            📝 يمكنك الحصول على رمز من{' '}
            <a
              href="https://github.com/settings/tokens/new?scopes=gist"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#3498db', textDecoration: 'none' }}
            >
              صفحة GitHub Tokens
            </a>
            {' '}(اختر نطاق "gist")
          </div>
        </div>

        {/* Gist ID Input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: '#1a1a2e',
            marginBottom: 6,
            textAlign: 'right',
          }}>
            Gist ID *
          </label>
          <input
            type="text"
            value={gistId}
            onChange={(e) => setGistId(e.target.value)}
            placeholder="Enter your Gist ID (e.g., abc123def456)"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 13,
              boxSizing: 'border-box',
              fontFamily: 'monospace',
            }}
          />
          <div style={{
            fontSize: 11,
            color: '#999',
            marginTop: 4,
            textAlign: 'right',
          }}>
            {createdGistId && (
              <span style={{ color: '#27ae60', fontWeight: 600 }}>
                ✅ تم إنشاء Gist جديد: {createdGistId}
              </span>
            )}
            {!createdGistId && 'معرّف Gist الخاص بك (موجود في رابط الـ Gist)'}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          flexDirection: 'column',
        }}>
          <button
            onClick={handleCreateGist}
            disabled={isCreatingGist || !token.trim()}
            style={{
              background: '#27ae60',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: isCreatingGist || !token.trim() ? 'not-allowed' : 'pointer',
              opacity: isCreatingGist || !token.trim() ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {isCreatingGist ? '⏳ جارٍ الإنشاء...' : '➕ إنشاء Gist جديد'}
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                background: '#3498db',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.background = '#2980b9'}
              onMouseLeave={(e) => e.target.style.background = '#3498db'}
            >
              💾 حفظ الإعدادات
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                background: '#95a5a6',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.background = '#7f8c8d'}
              onMouseLeave={(e) => e.target.style.background = '#95a5a6'}
            >
              ❌ إغلاق
            </button>
          </div>

          <button
            onClick={handleClearSettings}
            style={{
              background: '#e74c3c',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.background = '#c0392b'}
            onMouseLeave={(e) => e.target.style.background = '#e74c3c'}
          >
            🗑️ مسح الإعدادات
          </button>
        </div>

        {/* Help Text */}
        <div style={{
          background: '#fffbeb',
          padding: 12,
          borderRadius: 6,
          fontSize: 11,
          color: '#666',
          textAlign: 'right',
          lineHeight: '1.6',
          borderRight: '3px solid #f39c12',
        }}>
          <strong>💡 نصائح:</strong>
          <ul style={{ margin: '4px 0', paddingRight: 16 }}>
            <li>أنشئ Gist خاص جديد أو استخدم Gist موجود</li>
            <li>البيانات ستُحفظ تلقائياً مع كل تغيير (بتأخير 2 ثانية)</li>
            <li>عند تحميل التطبيق، ستُحمّل أحدث البيانات من GitHub</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default GistSettingsModal;
