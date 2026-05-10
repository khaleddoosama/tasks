/**
 * Sync Status Indicator Component
 * Shows the current sync state with visual feedback
 */
export function SyncStatusIndicator({ syncStatus, lastSyncTime, syncError, onSettingsClick }) {
  const getIndicatorStyle = () => {
    switch (syncStatus) {
      case 'syncing':
        return {
          background: '#f39c12',
          color: '#fff',
          message: '🔄 جارٍ المزامنة...',
          animation: 'spin 1s linear infinite',
        };
      case 'synced':
        return {
          background: '#27ae60',
          color: '#fff',
          message: `✅ متزامن - ${lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'للتو'}`,
        };
      case 'failed':
        return {
          background: '#e74c3c',
          color: '#fff',
          message: `❌ فشلت المزامنة`,
        };
      default:
        return {
          background: '#95a5a6',
          color: '#fff',
          message: '⏸️ لم يتم الربط',
        };
    }
  };

  const style = getIndicatorStyle();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: style.background,
        color: style.color,
        padding: '8px 12px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.3s',
        position: 'relative',
      }}
      onClick={onSettingsClick}
      title="اضغط لفتح إعدادات المزامنة"
    >
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sync-indicator:hover {
          opacity: 0.9;
          transform: scale(1.05);
        }
      `}</style>

      <span style={{ animation: syncStatus === 'syncing' ? 'spin 1s linear infinite' : 'none' }}>
        {syncStatus === 'syncing' ? '⚙️' : syncStatus === 'synced' ? '✅' : syncStatus === 'failed' ? '❌' : '⏸️'}
      </span>

      <span>{style.message}</span>

      {syncError && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#e74c3c',
            color: '#fff',
            padding: 8,
            borderRadius: '0 0 6px 6px',
            fontSize: 11,
            marginTop: 4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            zIndex: 1000,
          }}
          title={syncError}
        >
          {syncError}
        </div>
      )}

      <span style={{ fontSize: 10, opacity: 0.8 }}>⚙️</span>
    </div>
  );
}

export default SyncStatusIndicator;
