import { useMemo, useState } from "react";
import { createEmptyTask } from "../../domain/schedule/ids";
import { calculateDurationMin, detectConflicts, sortTasksByStartTime } from "../../domain/schedule/time";
import TaskRow from "./TaskRow";

export default function DayCard({ day, colors, goalOptions, onChange, onCopyDay, createTaskId, isCurrentDay }) {
  const [collapsed, setCollapsed] = useState(isCurrentDay ? false : true);
  
  // Debug logging
  if (day.id === 1) {
    console.log('DayCard Debug:', {
      dayName: day.name,
      dayDate: day.التاريخ,
      isCurrentDay,
      collapsed: isCurrentDay ? false : true
    });
  }
  const [draggedId, setDraggedId] = useState(null);
  const conflicts = useMemo(() => detectConflicts(day.tasks), [day.tasks]);
  const totalMinutes = useMemo(
    () => day.tasks.reduce((sum, task) => sum + calculateDurationMin(task.time), 0),
    [day.tasks],
  );
  const headerColor = colors.header;
  const totalHours = Math.floor(totalMinutes / 60);
  const totalRemainderMinutes = totalMinutes % 60;

  const updateTasks = (updater) => {
    const nextTasks = typeof updater === "function" ? updater(day.tasks) : updater;
    onChange({ tasks: nextTasks });
  };

  const updateTask = (taskId, patch) => {
    updateTasks((tasks) => tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  };

  const deleteTask = (taskId) => {
    updateTasks((tasks) => tasks.filter((task) => task.id !== taskId));
  };

  const moveTask = (taskId, direction) => {
    updateTasks((tasks) => {
      const index = tasks.findIndex((task) => task.id === taskId);
      if ((direction === -1 && index === 0) || (direction === 1 && index === tasks.length - 1)) {
        return tasks;
      }

      const nextTasks = [...tasks];
      [nextTasks[index], nextTasks[index + direction]] = [nextTasks[index + direction], nextTasks[index]];
      return nextTasks;
    });
  };

  const handleDrop = (targetTaskId) => {
    if (!draggedId || draggedId === targetTaskId) {
      setDraggedId(null);
      return;
    }

    updateTasks((tasks) => {
      const fromIndex = tasks.findIndex((task) => task.id === draggedId);
      const toIndex = tasks.findIndex((task) => task.id === targetTaskId);
      const nextTasks = [...tasks];
      [nextTasks[fromIndex], nextTasks[toIndex]] = [nextTasks[toIndex], nextTasks[fromIndex]];
      return nextTasks;
    });

    setDraggedId(null);
  };

  const sortCurrentDayTasks = () => {
    updateTasks(sortTasksByStartTime(day.tasks));
  };

  return (
    <div
      style={{
        marginBottom: 24,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        border: "1px solid #e5e5e5",
        opacity: day.enabled ? 1 : 0.5,
        transition: "opacity 0.3s",
      }}
    >
      <div
        style={{
          background: headerColor.bg,
          color: headerColor.text,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        onClick={() => setCollapsed((value) => !value)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 900 }}>{day.name}</span>
          <span style={{ fontSize: 12, opacity: 0.8 }}>{day.type}</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            {totalHours > 0 ? `${totalHours} س ` : ""}
            {totalRemainderMinutes > 0 ? `${totalRemainderMinutes} د` : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label
            onClick={(event) => event.stopPropagation()}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={day.enabled}
              onChange={(event) => onChange({ enabled: event.target.checked })}
            />
            مفعّل
          </label>
          <button
            onClick={(event) => {
              event.stopPropagation();
              sortCurrentDayTasks();
            }}
            title="ترتيب المهام حسب الوقت"
            style={{
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: headerColor.text,
              borderRadius: 4,
              padding: "2px 8px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            ⏱️ ترتيب
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onCopyDay(day.id);
            }}
            title="نسخ جدول اليوم"
            style={{
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: headerColor.text,
              borderRadius: 4,
              padding: "2px 8px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            نسخ
          </button>
          <span
            style={{
              fontSize: 18,
              transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          >
            &#9660;
          </span>
        </div>
      </div>
      {!collapsed && day.enabled && (
        <div style={{ padding: "0 0 12px 0" }}>
          <div style={{ padding: "8px 16px" }}>
            <textarea
              value={day.notes || ""}
              onChange={(event) => onChange({ notes: event.target.value })}
              placeholder="ملاحظات اليوم..."
              style={{
                width: "100%",
                minHeight: 40,
                border: "1px solid #e0e0e0",
                borderRadius: 6,
                padding: "6px 10px",
                fontFamily: "inherit",
                fontSize: 13,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ padding: "8px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, textAlign: "right" }}>التاريخ:</label>
              <input
                type="date"
                value={day.التاريخ || ""}
                onChange={(event) => onChange({ التاريخ: event.target.value })}
                style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: 6, padding: "6px 10px", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, textAlign: "right" }}>مستوى الطاقة:</label>
              <select
                value={day.مستوى_الطاقة || ""}
                onChange={(event) => onChange({ مستوى_الطاقة: event.target.value })}
                style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: 6, padding: "6px 10px", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }}
              >
                <option value="">--</option>
                <option value="1">منخفضة جدا 😴</option>
                <option value="2">منخفضة 😐</option>
                <option value="3">متوسطة 😊</option>
                <option value="4">عالية 😄</option>
                <option value="5">عالية جدا 🔥</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, textAlign: "right" }}>تقييم اليوم:</label>
              <select
                value={day.تقييم_اليوم || ""}
                onChange={(event) => onChange({ تقييم_اليوم: event.target.value })}
                style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: 6, padding: "6px 10px", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }}
              >
                <option value="">--</option>
                <option value="1">سيء جدا 😞</option>
                <option value="2">سيء 😕</option>
                <option value="3">جيد 😐</option>
                <option value="4">جيد جدا 😊</option>
                <option value="5">ممتاز 🌟</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, textAlign: "right" }}>عدد ساعات النوم:</label>
              <input
                type="text"
                value={day.عدد_ساعات_النوم || ""}
                onChange={(event) => onChange({ عدد_ساعات_النوم: event.target.value })}
                placeholder="مثال: 7 ساعات"
                style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: 6, padding: "6px 10px", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: headerColor.bg, color: headerColor.text }}>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 55 }}>تم</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>المهمة</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 70 }}>البداية</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 70 }}>النهاية</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 60 }}>المدة</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 180 }}>التصنيف</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", width: 260 }}>الهدف المرتبط</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", width: 150 }}>لو متمش / ملاحظة</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 80 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {day.tasks.map((task, index) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    index={index}
                    colors={colors}
                    conflict={conflicts.has(task.id)}
                    goalOptions={goalOptions}
                    onUpdate={(patch) => updateTask(task.id, patch)}
                    onDelete={() => deleteTask(task.id)}
                    onMoveUp={() => moveTask(task.id, -1)}
                    onMoveDown={() => moveTask(task.id, 1)}
                    isFirst={index === 0}
                    isLast={index === day.tasks.length - 1}
                    onDragStart={setDraggedId}
                    onDragOver={() => undefined}
                    onDrop={handleDrop}
                    isDragging={draggedId === task.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "8px 16px", display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={sortCurrentDayTasks}
              style={{
                background: "#eef4ff",
                color: headerColor.bg,
                border: `1px solid ${headerColor.bg}`,
                borderRadius: 6,
                padding: "6px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ترتيب
            </button>
            <button
              onClick={() => updateTasks((tasks) => [...tasks, createEmptyTask(createTaskId())])}
              style={{
                background: headerColor.bg,
                color: headerColor.text,
                border: "none",
                borderRadius: 6,
                padding: "6px 20px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              + إضافة مهمة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
