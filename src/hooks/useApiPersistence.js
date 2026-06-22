import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useApiPersistence() {
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState(null);
  const debounceTimersRef = useRef({});

  // Load all data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/export`);
        if (!response.ok) throw new Error('Failed to load data');
        const data = await response.json();
        setLoadingInitial(false);
        return data;
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError(err.message);
        setLoadingInitial(false);
      }
    };

    loadData();
  }, []);

  // Generic save function with debounce
  const saveData = useCallback((endpoint, data, debounceMs = 500) => {
    return new Promise((resolve, reject) => {
      if (debounceTimersRef.current[endpoint]) {
        clearTimeout(debounceTimersRef.current[endpoint]);
      }

      debounceTimersRef.current[endpoint] = setTimeout(async () => {
        try {
          const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          if (!response.ok) throw new Error(`Failed to save to ${endpoint}`);
          const result = await response.json();
          resolve(result);
        } catch (err) {
          console.error(`Error saving to ${endpoint}:`, err);
          setError(err.message);
          reject(err);
        }
      }, debounceMs);
    });
  }, []);

  // Full data export
  const exportData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/export`);
      if (!response.ok) throw new Error('Failed to export data');
      return await response.json();
    } catch (err) {
      console.error('Error exporting data:', err);
      throw err;
    }
  }, []);

  // Full data import
  const importData = useCallback(async (data) => {
    try {
      const response = await fetch(`${API_URL}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to import data');
      return await response.json();
    } catch (err) {
      console.error('Error importing data:', err);
      throw err;
    }
  }, []);

  return {
    loadingInitial,
    error,
    saveData,
    exportData,
    importData
  };
}
