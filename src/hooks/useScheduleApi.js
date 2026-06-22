import { useCallback, useRef } from 'react';
import { getAuthHeader, refreshAccessToken } from '../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useScheduleApi() {
  const debounceTimerRef = useRef({});

  const getHeaders = useCallback(() => {
    const authHeader = getAuthHeader();
    const headers = { 'Content-Type': 'application/json' };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    return headers;
  }, []);

  const getAllSchedules = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/schedule`, {
        headers: getHeaders()
      });
      if (response.status === 401) {
        throw { status: 401, message: 'Unauthorized' };
      }
      if (!response.ok) throw new Error('Failed to fetch schedules');
      return await response.json();
    } catch (error) {
      console.error('Error fetching schedules:', error);
      throw error;
    }
  }, [getHeaders]);

  const getSchedule = useCallback(async (weekKey) => {
    try {
      const response = await fetch(`${API_URL}/api/schedule/${weekKey}`, {
        headers: getHeaders()
      });
      if (response.status === 401) {
        throw { status: 401, message: 'Unauthorized' };
      }
      if (!response.ok) throw new Error(`Failed to fetch schedule for ${weekKey}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching schedule for ${weekKey}:`, error);
      throw error;
    }
  }, [getHeaders]);

  const saveSchedule = useCallback(
    (weekKey, days, debounceMs = 500) => {
      return new Promise((resolve, reject) => {
        // Clear existing debounce timer for this week
        if (debounceTimerRef.current[weekKey]) {
          clearTimeout(debounceTimerRef.current[weekKey]);
        }

        // Set new debounce timer
        debounceTimerRef.current[weekKey] = setTimeout(async () => {
          try {
            const response = await fetch(`${API_URL}/api/schedule/${weekKey}`, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(days)
            });
            if (response.status === 401) {
              throw { status: 401, message: 'Unauthorized' };
            }
            if (!response.ok) throw new Error('Failed to save schedule');
            const data = await response.json();
            resolve(data);
          } catch (error) {
            console.error(`Error saving schedule for ${weekKey}:`, error);
            reject(error);
          }
        }, debounceMs);
      });
    },
    [getHeaders]
  );

  const deleteSchedule = useCallback(async (weekKey) => {
    try {
      const response = await fetch(`${API_URL}/api/schedule/${weekKey}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (response.status === 401) {
        throw { status: 401, message: 'Unauthorized' };
      }
      if (!response.ok) throw new Error('Failed to delete schedule');
      return await response.json();
    } catch (error) {
      console.error(`Error deleting schedule for ${weekKey}:`, error);
      throw error;
    }
  }, [getHeaders]);

  return {
    getAllSchedules,
    getSchedule,
    saveSchedule,
    deleteSchedule
  };
}
