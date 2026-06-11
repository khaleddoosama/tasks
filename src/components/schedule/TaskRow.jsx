import { CAT_LABELS } from "../../domain/schedule/constants";
import { buildTimeRange, calculateDuration, splitTimeRange } from "../../domain/schedule/time";
import TimePickerField from "./TimePickerField";
import GoalSelector from "./GoalSelector";

export default function TaskRow({
  task,
  index,
  colors,
  conflict,
  goalOptions,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}) {
  const categoryColor = task.cat && colors[task.cat];
  const background = categoryColor ? categoryColor.bg : index % 2 === 1 ? "#f7f8ff" : "#fff";
  const textColor = categoryColor ? categoryColor.text : "#1a1a2e";
  const duration = calculateDuration(task.time);
  const { start, end } = splitTimeRange(task.time);
  const linkedGoalValue =
    task.linkedGoalType && task.linkedGoalId ? `${task.linkedGoalType}:${task.linkedGoalId}` : "";

  const updateTime = (nextStart, nextEnd) => {
    const startValue = nextStart ?? start;
    const endValue = nextEnd ?? end;

    onUpdate({
      time: buildTimeRange(startValue, endValue),
    });
  };

  const applyGoalLink = (type, goalId) => {
    onUpdate({
      linkedWeeklyGoalId: type === "weekly" ? goalId : "",
      linkedMonthlyGoalId: type === "monthly" ? goalId : "",
      linkedGoalType: type,
      linkedGoalId: goalId,
    });
  };

  const clearGoalLink = () => {
    onUpdate({
      linkedWeeklyGoalId: "",
      linkedMonthlyGoalId: "",
      linkedGoalType: "",
      linkedGoalId: "",
    });
  };

  return (
    <tr
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(task.id);
      }}
      onDrop={() => onDrop(task.id)}
      style={{
        background: isDragging ? "rgba(100, 150, 255, 0.2)" : background,
        borderBottom: "1px solid #e5e5e5",
        transition: "background 0.2s, opacity 0.2s",
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <td style={{ padding: "6px 8px", textAlign: "center" }}>
        <input
          type="checkbox"
          checked={Boolean(task.done)}
          onChange={(event) => onUpdate({ done: event.target.checked })}
          title="تم التنفيذ"
        />
      </td>
      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: textColor }}>
        {conflict && (
          <span title="تعارض في الوقت" style={{ color: "#e74c3c", marginLeft: 4, fontSize: 14 }}>
            &#9888;
          </span>
        )}
        <input
          value={task.task}
          onChange={(event) => onUpdate({ task: event.target.value })}
          style={{
            border: "none",
            background: "transparent",
            color: textColor,
            fontWeight: 700,
            width: "100%",
            fontFamily: "inherit",
            fontSize: "inherit",
            outline: "none",
            textDecoration: task.done ? "line-through" : "none",
            opacity: task.done ? 0.75 : 1,
          }}
        />
      </td>
      <td style={{ padding: "6px 10px", textAlign: "center", fontSize: 13, color: textColor, whiteSpace: "nowrap" }}>
        <TimePickerField value={start} onChange={(value) => updateTime(value, end)} label="البداية" />
      </td>
      <td style={{ padding: "6px 10px", textAlign: "center", fontSize: 13, color: textColor, whiteSpace: "nowrap" }}>
        <TimePickerField value={end} onChange={(value) => updateTime(start, value)} label="النهاية" />
      </td>
      <td style={{ padding: "6px 10px", textAlign: "center", fontSize: 12, color: textColor }}>{duration}</td>
      <td style={{ padding: "6px 10px", textAlign: "center" }}>
        <select
          value={task.cat}
          onChange={(event) => onUpdate({ cat: event.target.value })}
          style={{
            border: "1px solid #ddd",
            borderRadius: 4,
            padding: "2px 4px",
            fontSize: 12,
            background: "#fff",
            cursor: "pointer",
            minWidth: 170,
          }}
        >
          {Object.entries(CAT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td style={{ padding: "6px 10px", textAlign: "right", width: 260 }}>
        <GoalSelector
          goalOptions={goalOptions}
          value={linkedGoalValue}
          onLink={applyGoalLink}
          onClear={clearGoalLink}
        />
      </td>
      <td style={{ padding: "6px 10px", textAlign: "right", fontSize: 12, color: textColor }}>
        <input
          value={task.notes || ""}
          onChange={(event) => onUpdate({ notes: event.target.value })}
          placeholder="لو متمش / ملاحظة..."
          style={{
            border: "1px solid #ddd",
            background: "transparent",
            color: textColor,
            width: "100%",
            fontFamily: "inherit",
            fontSize: "inherit",
            outline: "none",
            borderRadius: 4,
            padding: "4px 6px",
            boxSizing: "border-box",
          }}
        />
      </td>
      <td style={{ padding: "6px 4px", textAlign: "center", whiteSpace: "nowrap" }}>
        <span
          draggable
          onDragStart={() => onDragStart(task.id)}
          title="اسحب لإعادة الترتيب"
          style={{
            display: "inline-block",
            cursor: "grab",
            fontSize: 14,
            color: "#64748b",
            marginLeft: 4,
            userSelect: "none",
          }}
        >
          ⋮⋮
        </span>
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          title="لأعلى"
          style={{
            border: "none",
            background: "none",
            cursor: isFirst ? "default" : "pointer",
            opacity: isFirst ? 0.3 : 1,
            fontSize: 14,
          }}
        >
          &#9650;
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          title="لأسفل"
          style={{
            border: "none",
            background: "none",
            cursor: isLast ? "default" : "pointer",
            opacity: isLast ? 0.3 : 1,
            fontSize: 14,
          }}
        >
          &#9660;
        </button>
        <button
          onClick={onDelete}
          title="حذف"
          style={{ border: "none", background: "none", cursor: "pointer", color: "#e74c3c", fontSize: 14, marginRight: 4 }}
        >
          &#10005;
        </button>
      </td>
    </tr>
  );
}
