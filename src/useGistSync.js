import { useCallback, useEffect, useRef, useState } from "react";

export function useGistSync(syncData, onDataMerged) {
  const [syncStatus, setSyncStatus] = useState("idle");
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const debounceTimerRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const isUploadingRef = useRef(false);
  const syncDataRef = useRef(syncData);
  const onDataMergedRef = useRef(onDataMerged);

  useEffect(() => {
    syncDataRef.current = syncData;
  }, [syncData]);

  useEffect(() => {
    onDataMergedRef.current = onDataMerged;
  }, [onDataMerged]);

  const getGistConfig = useCallback(() => {
    const token = localStorage.getItem("gist_token");
    const gistId = localStorage.getItem("gist_id");
    return { token, gistId };
  }, []);

  const pushToGist = useCallback(
    async (dataToSync) => {
      const { token, gistId } = getGistConfig();
      if (!token || !gistId) return;

      // Prevent concurrent uploads
      if (isUploadingRef.current) {
        console.log("Upload already in progress, skipping");
        return;
      }

      try {
        isUploadingRef.current = true;
        setSyncStatus("syncing");
        setSyncError(null);

        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
          method: "PATCH",
          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: {
              "todo-app-data.json": {
                content: JSON.stringify(dataToSync, null, 2),
              },
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `GitHub API error: ${response.status}`);
        }

        setLastSyncTime(new Date());
        setSyncStatus("synced");
        setSyncError(null);

        setTimeout(() => {
          setSyncStatus("idle");
          isUploadingRef.current = false;
        }, 3000);
      } catch (error) {
        console.error("Gist push failed:", error);
        setSyncStatus("failed");
        setSyncError(error.message);

        setTimeout(() => {
          setSyncStatus("idle");
          isUploadingRef.current = false;
        }, 5000);
      }
    },
    [getGistConfig],
  );

  const pullFromGist = useCallback(async () => {
    const { token, gistId } = getGistConfig();
    if (!token || !gistId) return null;

    try {
      setSyncStatus("syncing");
      setSyncError(null);

      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Gist not found. Please check your Gist ID.");
        }

        const errorData = await response.json();
        throw new Error(errorData.message || `GitHub API error: ${response.status}`);
      }

      const gistData = await response.json();
      const fileContent = gistData.files["todo-app-data.json"]?.content;

      if (!fileContent) {
        throw new Error("todo-app-data.json not found in Gist. Create it first.");
      }

      const remoteData = JSON.parse(fileContent);
      setLastSyncTime(new Date());
      setSyncStatus("synced");
      setSyncError(null);

      setTimeout(() => {
        setSyncStatus("idle");
      }, 3000);

      return remoteData;
    } catch (error) {
      console.error("Gist pull failed:", error);
      setSyncStatus("failed");
      setSyncError(error.message);

      setTimeout(() => {
        setSyncStatus("idle");
      }, 5000);

      return null;
    }
  }, [getGistConfig]);

  const createNewGist = useCallback(async (token) => {
    try {
      setSyncStatus("syncing");
      setSyncError(null);

      const initialData = {
        ...syncDataRef.current,
        createdAt: new Date().toISOString(),
      };

      const response = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: "Weekly Schedule Planner Data",
          public: false,
          files: {
            "todo-app-data.json": {
              content: JSON.stringify(initialData, null, 2),
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `GitHub API error: ${response.status}`);
      }

      const gistData = await response.json();
      const newGistId = gistData.id;
      localStorage.setItem("gist_id", newGistId);

      setLastSyncTime(new Date());
      setSyncStatus("synced");
      setSyncError(null);

      setTimeout(() => {
        setSyncStatus("idle");
      }, 3000);

      return newGistId;
    } catch (error) {
      console.error("Gist creation failed:", error);
      setSyncStatus("failed");
      setSyncError(error.message);

      setTimeout(() => {
        setSyncStatus("idle");
      }, 5000);

      return null;
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!isInitialLoadRef.current) return;
      isInitialLoadRef.current = false;

      const { token, gistId } = getGistConfig();
      if (!token || !gistId) return;

      const remoteData = await pullFromGist();
      if (remoteData && onDataMergedRef.current) {
        onDataMergedRef.current(remoteData);
      }
    };

    loadInitialData();
  }, [getGistConfig, pullFromGist]);

  useEffect(() => {
    const { token, gistId } = getGistConfig();
    if (!token || !gistId || isInitialLoadRef.current) return undefined;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      pushToGist({
        ...syncDataRef.current,
        lastUpdated: new Date().toISOString(),
      });
    }, 3000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [getGistConfig, pullFromGist, pushToGist, syncData]);

  return {
    syncStatus,
    lastSyncTime,
    syncError,
    pullFromGist,
    pushToGist,
    createNewGist,
    hasCredentials: () => {
      const { token, gistId } = getGistConfig();
      return Boolean(token && gistId);
    },
  };
}

export default useGistSync;
