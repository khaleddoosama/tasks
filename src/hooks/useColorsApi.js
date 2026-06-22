import { useCallback, useRef } from 'react';
import { getAuthHeader } from '../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useColorsApi() {
  const debounceTimerRef = useRef(null);

  const getHeaders = useCallback(() => {
    const authHeader = getAuthHeader();
    const headers = { 'Content-Type': 'application/json' };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    return headers;
  }, []);

  const getColors = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/colors`, {
        headers: getHeaders()
      });
      if (response.status === 401) {
        throw { status: 401, message: 'Unauthorized' };
      }
      if (!response.ok) throw new Error('Failed to fetch colors');
      return await response.json();
    } catch (error) {
      console.error('Error fetching colors:', error);
      throw error;
    }
  }, [getHeaders]);

  const saveColors = useCallback(
    (colorData, debounceMs = 500) => {
      return new Promise((resolve, reject) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
          try {
            const response = await fetch(`${API_URL}/api/colors`, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(colorData)
            });
            if (response.status === 401) {
              throw { status: 401, message: 'Unauthorized' };
            }
            if (!response.ok) throw new Error('Failed to save colors');
            const data = await response.json();
            resolve(data);
          } catch (error) {
            console.error('Error saving colors:', error);
            reject(error);
          }
        }, debounceMs);
      });
    },
    [getHeaders]
  );

  return {
    getColors,
    saveColors
  };
}
