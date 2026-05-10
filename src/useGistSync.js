import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for syncing schedule data with GitHub Gist
 * 
 * Features:
 * - Auto-pull on app load
 * - Auto-push on data changes (debounced)
 * - Merge conflicts with localStorage
 * - Error handling and recovery
 */
export function useGistSync(days, colors, onDataMerged) {
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, synced, failed
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const debounceTimerRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // Get Gist credentials from localStorage
  const getGistConfig = useCallback(() => {
    const token = localStorage.getItem('gist_token');
    const gistId = localStorage.getItem('gist_id');
    return { token, gistId };
  }, []);

  // Push data to Gist
  const pushToGist = useCallback(async (dataToSync) => {
    const { token, gistId } = getGistConfig();
    if (!token || !gistId) return;

    try {
      setSyncStatus('syncing');
      setSyncError(null);

      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            'todo-app-data.json': {
              content: JSON.stringify(dataToSync, null, 2),
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `GitHub API error: ${response.status}`
        );
      }

      setLastSyncTime(new Date());
      setSyncStatus('synced');
      setSyncError(null);

      // Reset status after 3 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Gist push failed:', error);
      setSyncStatus('failed');
      setSyncError(error.message);

      // Reset error status after 5 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 5000);
    }
  }, [getGistConfig]);

  // Pull data from Gist
  const pullFromGist = useCallback(async () => {
    const { token, gistId } = getGistConfig();
    if (!token || !gistId) return null;

    try {
      setSyncStatus('syncing');
      setSyncError(null);

      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Gist not found. Please check your Gist ID.');
        }
        const errorData = await response.json();
        throw new Error(
          errorData.message || `GitHub API error: ${response.status}`
        );
      }

      const gistData = await response.json();
      const fileContent = gistData.files['todo-app-data.json']?.content;

      if (!fileContent) {
        throw new Error(
          'todo-app-data.json not found in Gist. Create it first.'
        );
      }

      const remoteData = JSON.parse(fileContent);
      setLastSyncTime(new Date());
      setSyncStatus('synced');
      setSyncError(null);

      // Reset status after 3 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);

      return remoteData;
    } catch (error) {
      console.error('Gist pull failed:', error);
      setSyncStatus('failed');
      setSyncError(error.message);

      // Reset error status after 5 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 5000);

      return null;
    }
  }, [getGistConfig]);

  // Create new Gist
  const createNewGist = useCallback(async (token) => {
    try {
      setSyncStatus('syncing');
      setSyncError(null);

      const initialData = { days, colors, createdAt: new Date().toISOString() };

      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: 'Weekly Schedule Planner Data',
          public: false,
          files: {
            'todo-app-data.json': {
              content: JSON.stringify(initialData, null, 2),
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `GitHub API error: ${response.status}`
        );
      }

      const gistData = await response.json();
      const newGistId = gistData.id;

      // Save Gist ID to localStorage
      localStorage.setItem('gist_id', newGistId);

      setLastSyncTime(new Date());
      setSyncStatus('synced');
      setSyncError(null);

      // Reset status after 3 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);

      return newGistId;
    } catch (error) {
      console.error('Gist creation failed:', error);
      setSyncStatus('failed');
      setSyncError(error.message);

      // Reset error status after 5 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 5000);

      return null;
    }
  }, [days, colors]);

  // Merge remote data with local data (simple strategy: remote wins)
  const mergeData = useCallback((remoteData, localDays, localColors) => {
    if (!remoteData) return { days: localDays, colors: localColors };

    // Simple merge: prefer remote data if it exists and is valid
    const mergedDays = remoteData.days && Array.isArray(remoteData.days)
      ? remoteData.days
      : localDays;

    const mergedColors = remoteData.colors && typeof remoteData.colors === 'object'
      ? remoteData.colors
      : localColors;

    return { days: mergedDays, colors: mergedColors };
  }, []);

  // Auto-pull on mount (if credentials exist)
  useEffect(() => {
    const loadInitialData = async () => {
      if (!isInitialLoadRef.current) return;
      isInitialLoadRef.current = false;

      const { token, gistId } = getGistConfig();
      if (!token || !gistId) return; // Skip if no credentials

      const remoteData = await pullFromGist();
      if (remoteData && onDataMerged) {
        const merged = mergeData(remoteData, days, colors);
        onDataMerged(merged);
      }
    };

    loadInitialData();
  }, []); // Run once on mount

  // Auto-push on data changes (debounced)
  useEffect(() => {
    const { token, gistId } = getGistConfig();
    if (!token || !gistId || isInitialLoadRef.current) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for debounced push
    debounceTimerRef.current = setTimeout(() => {
      const dataToSync = { days, colors, lastUpdated: new Date().toISOString() };
      pushToGist(dataToSync);
    }, 2000); // 2 second debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [days, colors, getGistConfig, pushToGist]);

  return {
    syncStatus,
    lastSyncTime,
    syncError,
    pullFromGist,
    pushToGist,
    createNewGist,
    hasCredentials: () => {
      const { token, gistId } = getGistConfig();
      return !!(token && gistId);
    },
  };
}

export default useGistSync;
