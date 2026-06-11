import { useMemo, useRef, useState } from "react";

function InlineEdit({ value, onChange, placeholder, style = {} }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { if (e.key === "Enter") setEditing(false); }}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "6px 10px",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          fontFamily: "inherit",
          fontSize: "inherit",
          fontWeight: "inherit",
          background: "#f8fafc",
          ...style,
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="اضغط للتعديل"
      style={{
        cursor: "text",
        padding: "6px 2px",
        borderRadius: 6,
        display: "block",
        color: value ? "inherit" : "#94a3b8",
        borderBottom: "1px dashed #cbd5e1",
        ...style,
      }}
    >
      {value || placeholder}
    </span>
  );
}

function GoalProgressBadge({ totalTasks, doneTasks, completionRate }) {
  const color = completionRate >= 80 ? "#16a34a" : completionRate >= 40 ? "#f59e0b" : "#ef4444";
  if (!totalTasks) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        borderRadius: 999,
        background: `${color}18`,
        color,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {completionRate}% · {doneTasks}/{totalTasks}
    </span>
  );
}

function MonthProgressBar({ monthlySummary, headerColor }) {
  const { totalGoals, doneTasks, totalTasks, completionRate } = monthlySummary;
  const color = completionRate >= 80 ? "#16a34a" : completionRate >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div
      style={{
        background: headerColor.bg,
        color: headerColor.text,
        padding: "14px 18px",
        borderRadius: 12,
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, opacity: 0.8 }}>{totalGoals} أهداف شهرية · {doneTasks}/{totalTasks} مهمة</span>
        <span style={{ fontSize: 20, fontWeight: 900 }}>{completionRate}%</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 999, height: 8 }}>
        <div
          style={{
            width: `${completionRate}%`,
            height: "100%",
            borderRadius: 999,
            background: color,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

export default function GoalsTab({
  colors,
  monthLabel,
  weekRangeLabel,
  monthlySummary,
  currentMonthGoals,
  currentWeekGoals,
  onAddMonthlyGoal,
  onUpdateMonthlyGoalTitle,
  onAddWeeklyGoal,
  onUpdateWeeklyGoalTitle,
  onDeleteMonthlyGoal,
  onDeleteWeeklyGoal,
}) {
  const headerColor = colors.header;
  const [newMonthlyGoalTitle, setNewMonthlyGoalTitle] = useState("");
  const [newWeeklyGoalTitles, setNewWeeklyGoalTitles] = useState({});

  const weeklyGoalsByMonthGoalId = useMemo(
    () =>
      currentWeekGoals.reduce((result, goal) => {
        const bucketKey = goal.monthlyGoalId || "__unlinked__";
        if (!result[bucketKey]) result[bucketKey] = [];
        result[bucketKey].push(goal);
        return result;
      }, {}),
    [currentWeekGoals],
  );

  const addMonthlyGoal = () => {
    if (!newMonthlyGoalTitle.trim()) return;
    onAddMonthlyGoal(newMonthlyGoalTitle);
    setNewMonthlyGoalTitle("");
  };

  const addWeeklyGoal = (monthGoalId) => {
    const title = newWeeklyGoalTitles[monthGoalId] || "";
    if (!title.trim()) return;
    onAddWeeklyGoal(monthGoalId, title);
    setNewWeeklyGoalTitles((cur) => ({ ...cur, [monthGoalId]: "" }));
  };

  return (
    <div style={{ padding: 20, background: "#f9fafb", borderRadius: 12 }}>
      <div style={{ marginBottom: 16, textAlign: "right" }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: headerColor.bg }}>
          {monthLabel}
        </h2>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>الأسبوع الحالي: {weekRangeLabel}</div>
      </div>

      <MonthProgressBar monthlySummary={monthlySummary} headerColor={headerColor} />

      {/* Add monthly goal — at the top */}
      <div
        style={{
          background: "#fff",
          padding: 14,
          borderRadius: 12,
          border: `2px dashed ${headerColor.bg}40`,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: headerColor.bg, marginBottom: 8, textAlign: "right" }}>
          + هدف شهري جديد
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={newMonthlyGoalTitle}
            onChange={(e) => setNewMonthlyGoalTitle(e.target.value)}
            placeholder="مثال: إنهاء PLSQL Course"
            onKeyDown={(e) => { if (e.key === "Enter") addMonthlyGoal(); }}
            style={{
              flex: 1,
              padding: "9px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={addMonthlyGoal}
            style={{
              background: headerColor.bg,
              color: headerColor.text,
              border: "none",
              borderRadius: 8,
              padding: "9px 16px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            إضافة
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {currentMonthGoals.map((monthGoal) => {
          const childWeekGoals = weeklyGoalsByMonthGoalId[monthGoal.id] || [];

          return (
            <div
              key={monthGoal.id}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: 16,
                boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
                border: "1px solid #e2e8f0",
              }}
            >
              {/* Monthly goal header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: childWeekGoals.length > 0 ? 10 : 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>هدف شهري</div>
                  <InlineEdit
                    value={monthGoal.title}
                    onChange={(val) => onUpdateMonthlyGoalTitle(monthGoal.id, val)}
                    placeholder="اسم الهدف..."
                    style={{ fontSize: 15, fontWeight: 800 }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <GoalProgressBadge {...monthGoal.progress} />
                  <button
                    onClick={() => onDeleteMonthlyGoal(monthGoal.id)}
                    title="حذف الهدف الشهري"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#cbd5e1",
                      cursor: "pointer",
                      fontSize: 16,
                      padding: 4,
                      lineHeight: 1,
                      borderRadius: 6,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                  >
                    🗑
                  </button>
                </div>
              </div>

              {/* Weekly goals progress summary */}
              {childWeekGoals.length > 0 && (() => {
                const totalW = childWeekGoals.reduce((s, g) => s + (g.progress?.totalTasks || 0), 0);
                const doneW = childWeekGoals.reduce((s, g) => s + (g.progress?.doneTasks || 0), 0);
                const rateW = totalW > 0 ? Math.round((doneW / totalW) * 100) : 0;
                const color = rateW >= 80 ? "#16a34a" : rateW >= 40 ? "#f59e0b" : "#3b82f6";
                return (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                      <span style={{ color, fontWeight: 700 }}>{rateW}%</span>
                      <span>أهداف هذا الأسبوع · {doneW}/{totalW} مهمة</span>
                    </div>
                    <div style={{ background: "#f1f5f9", borderRadius: 999, height: 5 }}>
                      <div style={{ width: `${rateW}%`, height: "100%", borderRadius: 999, background: color, transition: "width 0.3s ease" }} />
                    </div>
                  </div>
                );
              })()}

              {/* Weekly goals list */}
              {childWeekGoals.length > 0 && (
                <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                  {childWeekGoals.map((weekGoal) => (
                    <div
                      key={weekGoal.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <InlineEdit
                          value={weekGoal.title}
                          onChange={(val) => onUpdateWeeklyGoalTitle(weekGoal.id, val)}
                          placeholder="هدف أسبوعي..."
                          style={{ fontSize: 13, fontWeight: 700 }}
                        />
                      </div>
                      <GoalProgressBadge {...weekGoal.progress} />
                      <button
                        onClick={() => onDeleteWeeklyGoal(weekGoal.id)}
                        title="حذف"
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#cbd5e1",
                          cursor: "pointer",
                          fontSize: 14,
                          padding: 4,
                          lineHeight: 1,
                          borderRadius: 6,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add weekly goal */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={newWeeklyGoalTitles[monthGoal.id] || ""}
                  onChange={(e) =>
                    setNewWeeklyGoalTitles((cur) => ({ ...cur, [monthGoal.id]: e.target.value }))
                  }
                  placeholder="+ هدف أسبوعي..."
                  onKeyDown={(e) => { if (e.key === "Enter") addWeeklyGoal(monthGoal.id); }}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    border: "1px dashed #cbd5e1",
                    borderRadius: 8,
                    fontFamily: "inherit",
                    fontSize: 13,
                    background: "#f8fafc",
                  }}
                />
                <button
                  onClick={() => addWeeklyGoal(monthGoal.id)}
                  style={{
                    border: "none",
                    background: headerColor.bg,
                    color: headerColor.text,
                    borderRadius: 8,
                    padding: "7px 14px",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  إضافة
                </button>
              </div>
            </div>
          );
        })}

        {currentMonthGoals.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            لا توجد أهداف شهرية بعد — أضف هدفًا من الأعلى للبدء
          </div>
        )}

        {/* Unlinked weekly goals */}
        {(weeklyGoalsByMonthGoalId.__unlinked__ || []).length > 0 && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>أهداف أسبوعية غير مربوطة</div>
            <div style={{ display: "grid", gap: 6 }}>
              {weeklyGoalsByMonthGoalId.__unlinked__.map((weekGoal) => (
                <div key={weekGoal.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <InlineEdit
                      value={weekGoal.title}
                      onChange={(val) => onUpdateWeeklyGoalTitle(weekGoal.id, val)}
                      placeholder="هدف أسبوعي..."
                      style={{ fontSize: 13, fontWeight: 700 }}
                    />
                  </div>
                  <GoalProgressBadge {...weekGoal.progress} />
                  <button
                    onClick={() => onDeleteWeeklyGoal(weekGoal.id)}
                    style={{ border: "none", background: "transparent", color: "#cbd5e1", cursor: "pointer", fontSize: 14, padding: 4 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
