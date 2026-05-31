import { useCallback } from "react";

/**
 * Hook for managing data persistence (export/import) and color/theme management
 *
 * Responsibilities:
 * - Export schedule data to files (backup, archive)
 * - Import schedule data from files with validation
 * - Update task category colors
 * - Normalize imported color data
 *
 * @param {Object} params - Hook parameters
 * @param {Array} params.days - Current week's days
 * @param {Object} params.colors - Current color palette
 * @param {Object} params.effectiveWeekSchedules - All weeks' data with current merged
 * @param {Object} params.monthlyGoalsStore - All monthly goals
 * @param {Object} params.weeklyGoalsStore - All weekly goals
 * @param {number} params.selectedWeek - Current week number (1-52)
 * @param {number} params.currentYear - Current year
 * @param {Function} params.setColors - setState for colors
 * @param {Function} params.setMonthlyGoalsStore - setState for monthly goals
 * @param {Function} params.setWeeklyGoalsStore - setState for weekly goals
 * @param {Function} params.replace - Replace days from useUndoRedo
 * @param {Function} params.updateWeekSchedules - setState for week schedules
 * @param {Function} params.applyPlannerData - Apply imported data to state
 * @param {Function} params.normalizeDaysCategories - Normalize day data
 * @param {Function} params.normalizeColors - Normalize color data
 * @param {Function} params.createMissingGoalsForImportedData - Create missing goals
 * @param {Function} params.createInitialDays - Scaffold default week
 * @param {Function} params.exportScheduleBackup - Export to file service
 * @param {Function} params.exportArchiveRange - Export archive service
 * @param {Function} params.importScheduleFromFile - Import from file service
 * @param {Function} params.weekKey - Current week key "YYYY-WNN"
 *
 * @returns {Object} Persistence and color management methods
 * @returns {Function} returns.changeColor - Update color palette
 * @returns {Function} returns.exportSchedule - Export current week backup
 * @returns {Function} returns.exportArchive - Export historical archive
 * @returns {Function} returns.importSchedule - Import schedule from file
 * @returns {Function} returns.getScheduleData - Get current schedule JSON
 * @returns {Function} returns.updateScheduleFromJSON - Update from imported JSON
 */
export function usePersistenceAndColorManagement({
  // Data state
  days,
  colors,
  effectiveWeekSchedules,
  monthlyGoalsStore,
  weeklyGoalsStore,
  selectedWeek,
  currentYear,

  // State setters
  setColors,
  setMonthlyGoalsStore,
  setWeeklyGoalsStore,
  replace,
  updateWeekSchedules,

  // Utilities
  applyPlannerData,
  normalizeDaysCategories,
  normalizeColors,
  createMissingGoalsForImportedData,
  createInitialDays,
  exportScheduleBackup,
  exportArchiveRange,
  importScheduleFromFile,
  weekKey,
}) {
  /**
   * Update a color in the task category palette
   * @param {string} section - Category name
   * @param {string} field - Color property ("bg" or "text")
   * @param {string} value - Hex color code
   */
  const changeColor = useCallback((section, field, value) => {
    setColors((currentColors) => ({
      ...currentColors,
      [section]: {
        ...currentColors[section],
        [field]: value,
      },
    }));
  }, [setColors]);

  /**
   * Export current week's schedule as a backup file
   */
  const exportSchedule = useCallback(() => {
    exportScheduleBackup({
      weekSchedules: effectiveWeekSchedules,
      days,
      colors,
      selectedWeek,
      monthlyGoals: monthlyGoalsStore,
      weeklyGoals: weeklyGoalsStore,
    });
  }, [colors, days, effectiveWeekSchedules, monthlyGoalsStore, selectedWeek, weeklyGoalsStore, exportScheduleBackup]);

  /**
   * Export schedule for a specific date range (archive)
   * @param {Date|string} fromDate - Start date
   * @param {Date|string} toDate - End date
   */
  const exportArchive = useCallback(
    (fromDate, toDate) => {
      return exportArchiveRange({
        weekSchedules: effectiveWeekSchedules,
        monthlyGoalsStore,
        weeklyGoalsStore,
        fromDate,
        toDate,
      });
    },
    [effectiveWeekSchedules, monthlyGoalsStore, weeklyGoalsStore, exportArchiveRange],
  );

  /**
   * Import schedule from a file
   * @param {File} file - HTML File object from input
   */
  const importSchedule = useCallback(
    async (file) => {
      const imported = await importScheduleFromFile(file);
      applyPlannerData(imported, selectedWeek);
    },
    [applyPlannerData, selectedWeek, importScheduleFromFile],
  );

  /**
   * Get current schedule data as JSON object
   * @returns {Object} Schedule data object
   */
  const getScheduleData = useCallback(() => {
    return {
      days: days,
      colors: colors,
      weekKey: weekKey,
    };
  }, [days, colors, weekKey]);

  /**
   * Update schedule from imported JSON data
   * Validates, normalizes, creates missing goals, updates state
   * @param {Object} newData - Imported schedule data
   */
  const updateScheduleFromJSON = useCallback(
    (newData) => {
      if (!newData.days || !Array.isArray(newData.days)) {
        throw new Error("Invalid format: missing 'days' array");
      }

      const normalizedDays = normalizeDaysCategories(newData.days);

      // Create missing goals for all weeks/months in the imported data
      const {
        monthlyGoalsStore: updatedMonthlyStore,
        weeklyGoalsStore: updatedWeeklyStore,
        hasChanges,
      } = createMissingGoalsForImportedData(
        normalizedDays,
        monthlyGoalsStore,
        weeklyGoalsStore,
        currentYear,
      );

      // Update goal stores only if there are new goals
      if (hasChanges) {
        setMonthlyGoalsStore(updatedMonthlyStore);
        setWeeklyGoalsStore(updatedWeeklyStore);
      }

      replace(normalizedDays);
      updateWeekSchedules((currentSchedules) => ({
        ...currentSchedules,
        [weekKey]: normalizedDays,
      }));

      if (newData.colors) {
        const normalizedColors = normalizeColors(newData.colors);
        setColors(normalizedColors);
      }
    },
    [
      replace,
      setColors,
      updateWeekSchedules,
      weekKey,
      currentYear,
      monthlyGoalsStore,
      weeklyGoalsStore,
      setMonthlyGoalsStore,
      setWeeklyGoalsStore,
      normalizeDaysCategories,
      normalizeColors,
      createMissingGoalsForImportedData,
    ],
  );

  return {
    changeColor,
    exportSchedule,
    exportArchive,
    importSchedule,
    getScheduleData,
    updateScheduleFromJSON,
  };
}
