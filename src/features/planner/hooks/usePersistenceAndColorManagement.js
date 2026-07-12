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
 * @param {Function} params.setColors - setState for colors
 * @param {Function} params.applyPlannerData - Apply imported data to state
 * @param {Function} params.exportScheduleBackup - Export to file service
 * @param {Function} params.exportArchiveRange - Export archive service
 * @param {Function} params.importScheduleFromFile - Import from file service
 *
 * @returns {Object} Persistence and color management methods
 * @returns {Function} returns.changeColor - Update color palette
 * @returns {Function} returns.exportSchedule - Export current week backup
 * @returns {Function} returns.exportArchive - Export historical archive
 * @returns {Function} returns.importSchedule - Import schedule from file
 */
export function usePersistenceAndColorManagement({
  // Data state
  days,
  colors,
  effectiveWeekSchedules,
  monthlyGoalsStore,
  weeklyGoalsStore,
  selectedWeek,

  // State setters
  setColors,

  // Utilities
  applyPlannerData,
  exportScheduleBackup,
  exportArchiveRange,
  importScheduleFromFile,
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

  return {
    changeColor,
    exportSchedule,
    exportArchive,
    importSchedule,
  };
}
