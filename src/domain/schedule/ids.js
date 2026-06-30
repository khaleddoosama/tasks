export function getNextTaskIdSeed(days) {
  return days.reduce((maxTaskId, day) => {
    const dayMax = day.tasks.reduce((taskMax, task) => Math.max(taskMax, Number(task.id) || 0), 0);
    return Math.max(maxTaskId, dayMax);
  }, 0);
}

export function createEmptyTask(id) {
  return {
    id,
    time: "",
    task: "",
    cat: "",
    done: false,
    recurring: false,
    notes: "",
    linkedWeeklyGoalId: "",
    linkedMonthlyGoalId: "",
    linkedGoalType: "",
    linkedGoalId: "",
  };
}

export function cloneTasksWithNewIds(tasks, createTaskId) {
  return tasks.map((task) => ({
    ...task,
    id: createTaskId(),
  }));
}

export function cloneTasksForNewWeek(tasks, createTaskId) {
  return tasks.map((task) => ({
    ...task,
    id: createTaskId(),
    done: false,
  }));
}
