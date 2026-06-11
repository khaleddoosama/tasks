import { useMemo } from "react";

/**
 * Goal-link dropdown for a task.
 *
 * Renders three grouped sections:
 *  - monthly goals that have weekly children (the monthly goal + its children)
 *  - weekly goals not already shown as a child of some monthly goal
 *  - monthly goals without any weekly children
 *
 * The flattened "child ids" set is memoized so the O(goals) filtering work
 * isn't repeated inline on every render of every task row.
 *
 * @param {Object} props
 * @param {Object} props.goalOptions - { weeklyGoals, monthlyGoals, weeklyGoalsByMonthly, allMonthlyGoals }
 * @param {string} props.value - current selection ("type:id" or "")
 * @param {(type: string, goalId: string) => void} props.onLink - called with ("weekly"|"monthly", id)
 * @param {() => void} props.onClear - called when the selection is cleared
 */
export default function GoalSelector({ goalOptions, value, onLink, onClear }) {
  const weeklyGoals = goalOptions?.weeklyGoals || [];
  const monthlyGoalsNoChildren = goalOptions?.monthlyGoals || [];
  const weeklyGoalsByMonthly = goalOptions?.weeklyGoalsByMonthly || {};
  const allMonthlyGoals = goalOptions?.allMonthlyGoals || [];

  // Monthly goals that actually have weekly children to display as groups.
  const monthlyWithChildren = useMemo(
    () => allMonthlyGoals.filter((m) => (weeklyGoalsByMonthly[m.id] || []).length > 0),
    [allMonthlyGoals, weeklyGoalsByMonthly],
  );

  // Ids of weekly goals already shown as children, so we don't list them twice.
  const childGoalIds = useMemo(
    () => new Set(Object.values(weeklyGoalsByMonthly).flatMap((arr) => arr.map((x) => x.id))),
    [weeklyGoalsByMonthly],
  );

  const orphanWeeklyGoals = useMemo(
    () => weeklyGoals.filter((g) => !childGoalIds.has(g.id)),
    [weeklyGoals, childGoalIds],
  );

  const handleChange = (event) => {
    const { value: nextValue } = event.target;
    if (!nextValue) {
      onClear();
      return;
    }
    const [type, goalId] = nextValue.split(":");
    onLink(type, goalId);
  };

  if (weeklyGoals.length === 0 && monthlyGoalsNoChildren.length === 0 && allMonthlyGoals.length === 0) {
    return <span style={{ fontSize: 11, color: "#94a3b8" }}>لا توجد أهداف متاحة للربط</span>;
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      style={{
        width: "100%",
        border: "1px solid #ddd",
        borderRadius: 4,
        padding: "6px 8px",
        fontSize: 12,
        background: "#fff",
      }}
    >
      <option value="">بدون ربط</option>

      {/* Monthly goals that have weekly children: render a group per monthly goal */}
      {monthlyWithChildren.map((monthly) => (
        <optgroup key={`m-${monthly.id}`} label={monthly.title}>
          <option value={`monthly:${monthly.id}`}>{monthly.title} (كـ هدف شهري)</option>
          {(weeklyGoalsByMonthly[monthly.id] || []).map((child) => (
            <option key={child.id} value={`weekly:${child.id}`}>
              {"— " + child.title}
            </option>
          ))}
        </optgroup>
      ))}

      {/* Weekly goals not attached to a monthly parent */}
      {orphanWeeklyGoals.length > 0 && (
        <optgroup label="الأهداف الأسبوعية">
          {orphanWeeklyGoals.map((goal) => (
            <option key={goal.id} value={`weekly:${goal.id}`}>
              {goal.title}
            </option>
          ))}
        </optgroup>
      )}

      {/* Monthly goals without weekly children */}
      {monthlyGoalsNoChildren.length > 0 && (
        <optgroup label="أهداف شهرية بدون تقسيم أسبوعي">
          {monthlyGoalsNoChildren.map((goal) => (
            <option key={goal.id} value={`monthly:${goal.id}`}>
              {goal.title}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
