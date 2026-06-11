/**
 * Task autocomplete suggestions.
 *
 * Scans every saved week and builds a frequency-ranked list of task names the
 * user has typed before, each mapped to the category it is most often used
 * with. Powers the task-name `<datalist>` and the "auto-fill category" behavior
 * in TaskRow, so recurring tasks (نوم، Anki، صلاة الفجر …) don't have to be
 * retyped and re-categorized every day.
 */

/**
 * @param {Object<string, Array>} weekSchedules - Map of weekKey -> days array.
 * @returns {{ list: Array<{task: string, cat: string, count: number}>, catByName: Object<string, string> }}
 *   `list` is sorted by descending usage count. `catByName` maps a task name to
 *   its most-frequent category for quick auto-fill lookups.
 */
export function buildTaskSuggestions(weekSchedules) {
  const stats = new Map(); // name -> { count, cats: Map<cat, count> }

  for (const days of Object.values(weekSchedules || {})) {
    for (const day of days || []) {
      for (const task of day?.tasks || []) {
        const name = (task?.task || "").trim();
        if (!name) continue;

        let entry = stats.get(name);
        if (!entry) {
          entry = { count: 0, cats: new Map() };
          stats.set(name, entry);
        }
        entry.count += 1;

        const cat = task?.cat || "";
        if (cat) {
          entry.cats.set(cat, (entry.cats.get(cat) || 0) + 1);
        }
      }
    }
  }

  const list = [...stats.entries()]
    .map(([task, entry]) => {
      let bestCat = "";
      let bestCount = 0;
      for (const [cat, count] of entry.cats) {
        if (count > bestCount) {
          bestCount = count;
          bestCat = cat;
        }
      }
      return { task, cat: bestCat, count: entry.count };
    })
    .sort((a, b) => b.count - a.count);

  const catByName = {};
  for (const item of list) {
    catByName[item.task] = item.cat;
  }

  return { list, catByName };
}
