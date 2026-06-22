import { useCallback, useRef } from 'react';
import { getAuthHeader } from '../utils/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useGoalsApi() {
  const debounceTimerRef = useRef({});

  const getHeaders = useCallback(() => {
    const authHeader = getAuthHeader();
    const headers = { 'Content-Type': 'application/json' };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    return headers;
  }, []);

  const getGoals = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/goals`, {
        headers: getHeaders()
      });
      if (response.status === 401) {
        throw { status: 401, message: 'Unauthorized' };
      }
      if (!response.ok) throw new Error('Failed to fetch goals');
      return await response.json();
    } catch (error) {
      console.error('Error fetching goals:', error);
      throw error;
    }
  }, [getHeaders]);

  const getMonthlyGoals = useCallback(async (monthKey) => {
    try {
      const response = await fetch(`${API_URL}/api/goals/monthly/${monthKey}`, {
        headers: getHeaders()
      });
      if (response.status === 401) {
        throw { status: 401, message: 'Unauthorized' };
      }
      if (!response.ok) throw new Error(`Failed to fetch monthly goals for ${monthKey}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching monthly goals for ${monthKey}:`, error);
      throw error;
    }
  }, [getHeaders]);

  const saveMonthlyGoals = useCallback(
    (monthKey, goalData, debounceMs = 500) => {
      return new Promise((resolve, reject) => {
        const key = `monthly-${monthKey}`;
        if (debounceTimerRef.current[key]) {
          clearTimeout(debounceTimerRef.current[key]);
        }

        debounceTimerRef.current[key] = setTimeout(async () => {
          try {
            const response = await fetch(`${API_URL}/api/goals/monthly/${monthKey}`, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(goalData)
            });
            if (response.status === 401) {
              throw { status: 401, message: 'Unauthorized' };
            }
            if (!response.ok) throw new Error('Failed to save monthly goals');
            const data = await response.json();
            resolve(data);
          } catch (error) {
            console.error(`Error saving monthly goals for ${monthKey}:`, error);
            reject(error);
          }
        }, debounceMs);
      });
    },
    []
  );

  const getWeeklyGoals = useCallback(async (weekKey) => {
    try {
      const response = await fetch(`${API_URL}/api/goals/weekly/${weekKey}`, {
        headers: getHeaders()
      });
      if (response.status === 401) {
        throw { status: 401, message: 'Unauthorized' };
      }
      if (!response.ok) throw new Error(`Failed to fetch weekly goals for ${weekKey}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching weekly goals for ${weekKey}:`, error);
      throw error;
    }
  }, [getHeaders]);

  const saveWeeklyGoals = useCallback(
    (weekKey, goalData, debounceMs = 500) => {
      return new Promise((resolve, reject) => {
        const key = `weekly-${weekKey}`;
        if (debounceTimerRef.current[key]) {
          clearTimeout(debounceTimerRef.current[key]);
        }

        debounceTimerRef.current[key] = setTimeout(async () => {
          try {
            const response = await fetch(`${API_URL}/api/goals/weekly/${weekKey}`, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(goalData)
            });
            if (response.status === 401) {
              throw { status: 401, message: 'Unauthorized' };
            }
            if (!response.ok) throw new Error('Failed to save weekly goals');
            const data = await response.json();
            resolve(data);
          } catch (error) {
            console.error(`Error saving weekly goals for ${weekKey}:`, error);
            reject(error);
          }
        }, debounceMs);
      });
    },
    [getHeaders]
  );

  return {
    getGoals,
    getMonthlyGoals,
    saveMonthlyGoals,
    getWeeklyGoals,
    saveWeeklyGoals
  };
}
