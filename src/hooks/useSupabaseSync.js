import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { fetchAllWeeks, fetchUserData, flushPushKeepalive, hasAnyData, upsertUserData, upsertWeek } from "../services/cloudStore";

function safeParseJSON(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function useSupabaseSync(syncData, onDataMerged) {
  const [syncStatus, setSyncStatus] = useState("idle");
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [user, setUser] = useState(null);
  const [needsMigration, setNeedsMigration] = useState(false);

  const isInitialLoadRef = useRef(true);
  const isPushingRef = useRef(false);
  const isRequestInFlightRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const syncDataRef = useRef(syncData);
  const onDataMergedRef = useRef(onDataMerged);
  const userRef = useRef(null);
  const accessTokenRef = useRef(null);
  // Tracks the exact daysArray reference last pushed per week — lets pushToCloud
  // skip re-uploading weeks that haven't changed since the previous push.
  const lastPushedWeeksRef = useRef({});

  useEffect(() => {
    syncDataRef.current = syncData;
  }, [syncData]);

  useEffect(() => {
    onDataMergedRef.current = onDataMerged;
  }, [onDataMerged]);

  const pullFromCloud = useCallback(async (currentUser) => {
    const uid = (currentUser || userRef.current)?.id;
    if (!uid) return;

    setSyncStatus("syncing");
    setSyncError(null);

    try {
      const [weeksResult, userDataResult] = await Promise.all([
        fetchAllWeeks(uid),
        fetchUserData(uid),
      ]);

      if (weeksResult.error) throw weeksResult.error;
      if (userDataResult.error) throw userDataResult.error;

      const weekSchedules = weeksResult.data || {};
      const ud = userDataResult.data;

      const merged = {
        weekSchedules,
        colors: ud?.colors || null,
        selectedWeek: ud?.selected_week || null,
        monthlyGoals: ud?.monthly_goals || {},
        weeklyGoals: ud?.weekly_goals || {},
        templates: ud?.templates || {},
        generalNotes: ud?.general_notes || [],
        darkMode: ud?.dark_mode ?? false,
        featureUsage: ud?.feature_usage || {},
      };

      if (onDataMergedRef.current) {
        // The merge callback returns the week arrays actually stored in state
        // (post-normalization). Seed lastPushedWeeksRef with those references
        // so the next push/flush only uploads weeks the user really edited.
        const applied = onDataMergedRef.current(merged);
        if (applied?.appliedWeekSchedules) {
          lastPushedWeeksRef.current = { ...applied.appliedWeekSchedules };
        }
      }

      setSyncStatus("synced");
      setLastSyncTime(new Date());
      setTimeout(() => setSyncStatus("idle"), 3000);

      return merged;
    } catch (err) {
      console.error("Supabase pull failed:", err);
      setSyncStatus("failed");
      setSyncError(err.message || "فشل تحميل البيانات");
      setTimeout(() => setSyncStatus("idle"), 5000);
      return null;
    }
  }, []);

  const pushToCloud = useCallback(async (data) => {
    const uid = userRef.current?.id;
    if (!uid) return;
    if (isPushingRef.current) return;

    isPushingRef.current = true;
    isRequestInFlightRef.current = true;
    setSyncStatus("syncing");
    setSyncError(null);

    try {
      // Only push weeks whose daysArray reference actually changed since the
      // last successful push — avoids re-uploading every week in history on
      // every small edit (updateDay/copyDay/etc. only ever replace the array
      // for the week being edited; untouched weeks keep the same reference).
      const changedWeekEntries = Object.entries(data.weekSchedules || {}).filter(
        ([weekKey, daysArray]) => lastPushedWeeksRef.current[weekKey] !== daysArray,
      );
      const weekOps = changedWeekEntries.map(([weekKey, daysArray]) =>
        upsertWeek(uid, weekKey, daysArray),
      );

      const userDataOp = upsertUserData(uid, {
        colors: data.colors,
        darkMode: data.darkMode,
        selectedWeek: data.selectedWeek,
        monthlyGoals: data.monthlyGoals,
        weeklyGoals: data.weeklyGoals,
        templates: data.templates,
        generalNotes: data.generalNotes,
        featureUsage: data.featureUsage,
      });

      const results = await Promise.all([...weekOps, userDataOp]);
      isRequestInFlightRef.current = false;
      const failed = results.find((r) => r.error);
      if (failed) throw failed.error;

      for (const [weekKey, daysArray] of changedWeekEntries) {
        lastPushedWeeksRef.current[weekKey] = daysArray;
      }

      setSyncStatus("synced");
      setLastSyncTime(new Date());
      setTimeout(() => {
        setSyncStatus("idle");
        isPushingRef.current = false;
      }, 3000);
    } catch (err) {
      isRequestInFlightRef.current = false;
      console.error("Supabase push failed:", err);
      setSyncStatus("failed");
      setSyncError(err.message || "فشل حفظ البيانات");
      setTimeout(() => {
        setSyncStatus("idle");
        isPushingRef.current = false;
      }, 5000);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    userRef.current = null;
    accessTokenRef.current = null;
    setNeedsMigration(false);
    setSyncStatus("idle");
    lastPushedWeeksRef.current = {};
  }, []);

  // Import all data from localStorage into Supabase (one-time migration)
  const importFromLocal = useCallback(async () => {
    const uid = userRef.current?.id;
    if (!uid) return;

    setSyncStatus("syncing");
    setSyncError(null);

    try {
      const persisted = safeParseJSON(localStorage.getItem("weekScheduleV2"));
      const weekSchedules = persisted?.weekSchedules || {};
      const colors = persisted?.colors || null;

      const monthlyGoals = safeParseJSON(localStorage.getItem("monthlyGoals")) || {};
      const weeklyGoals = safeParseJSON(localStorage.getItem("weeklyGoals")) || {};
      const templates = safeParseJSON(localStorage.getItem("dayTemplatesV1")) || {};
      const generalNotes = safeParseJSON(localStorage.getItem("generalNotes")) || [];
      const darkMode = safeParseJSON(localStorage.getItem("darkMode")) || false;
      const featureUsage = safeParseJSON(localStorage.getItem("featureUsageV1")) || {};

      const weekOps = Object.entries(weekSchedules).map(([weekKey, daysArray]) =>
        upsertWeek(uid, weekKey, daysArray),
      );

      const userDataOp = upsertUserData(uid, {
        colors,
        darkMode,
        selectedWeek: null,
        monthlyGoals,
        weeklyGoals,
        templates,
        generalNotes,
        featureUsage,
      });

      const results = await Promise.all([...weekOps, userDataOp]);
      const failed = results.find((r) => r.error);
      if (failed) throw failed.error;

      setNeedsMigration(false);
      await pullFromCloud();
    } catch (err) {
      console.error("Migration failed:", err);
      setSyncStatus("failed");
      setSyncError(err.message || "فشل الاستيراد");
      setTimeout(() => setSyncStatus("idle"), 5000);
    }
  }, [pullFromCloud]);

  // Handle auth state changes (login / logout)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      userRef.current = currentUser;
      accessTokenRef.current = session?.access_token || null;

      if (currentUser && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        isInitialLoadRef.current = true;
        const isEmpty = !(await hasAnyData(currentUser.id));
        setNeedsMigration(isEmpty);
        await pullFromCloud(currentUser);
        isInitialLoadRef.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, [pullFromCloud]);

  // Flush pending debounced push before the tab closes. A normal pushToCloud
  // would be aborted mid-flight with the page, so this fires keepalive fetch
  // requests instead — the browser completes those after unload.
  useEffect(() => {
    const flushPending = () => {
      if (!debounceTimerRef.current) return;
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;

      const uid = userRef.current?.id;
      const data = syncDataRef.current;
      if (!uid || !accessTokenRef.current || !data) return;

      const changedWeekKeys = Object.entries(data.weekSchedules || {})
        .filter(([weekKey, daysArray]) => lastPushedWeeksRef.current[weekKey] !== daysArray)
        .map(([weekKey]) => weekKey);

      flushPushKeepalive({
        userId: uid,
        accessToken: accessTokenRef.current,
        weekSchedules: data.weekSchedules,
        changedWeekKeys,
        userData: data,
      });
    };

    const beforeUnloadHandler = (e) => {
      flushPending();
      // Warn if a push is currently in flight
      if (isRequestInFlightRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    // pagehide also covers mobile Safari/Chrome, where beforeunload is unreliable
    window.addEventListener("beforeunload", beforeUnloadHandler);
    window.addEventListener("pagehide", flushPending);
    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      window.removeEventListener("pagehide", flushPending);
    };
  }, []);

  // Debounced auto-push on data change
  useEffect(() => {
    if (!userRef.current || isInitialLoadRef.current) return undefined;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      // Clear the ref before pushing so the unload flush doesn't treat an
      // already-fired debounce as still pending.
      debounceTimerRef.current = null;
      pushToCloud(syncDataRef.current);
    }, 1500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [pushToCloud, syncData]);

  return {
    syncStatus,
    lastSyncTime,
    syncError,
    pullFromCloud,
    pushToCloud,
    signOut,
    user,
    isAuthenticated: Boolean(user),
    needsMigration,
    importFromLocal,
  };
}

export default useSupabaseSync;
