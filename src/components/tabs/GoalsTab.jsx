import { useMemo, useState } from "react";

function GoalProgressBadge({ totalTasks, doneTasks, completionRate }) {
  const color = completionRate >= 80 ? "#16a34a" : completionRate >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        background: `${color}18`,
        color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <span>{completionRate}%</span>
      <span>
        {doneTasks}/{totalTasks || 0} مهمة
      </span>
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
        if (!result[bucketKey]) {
          result[bucketKey] = [];
        }
        result[bucketKey].push(goal);
        return result;
      }, {}),
    [currentWeekGoals],
  );

  return (
    <div style={{ padding: 20, background: "#f9fafb", borderRadius: 12 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ textAlign: "right", fontSize: 24, fontWeight: 900, marginBottom: 8, color: headerColor.bg }}>
          الأهداف الشهرية والأسبوعية
        </h2>
        <p style={{ textAlign: "right", fontSize: 13, color: "#666", margin: 0 }}>
          أنشئ هدفًا شهريًا كبيرًا، ثم أضف تحته أهداف هذا الأسبوع. عند إنشاء مهمة يومية ستظهر كـ checkbox للربط.
        </p>
      </div>

      <div
        style={{
          background: headerColor.bg,
          color: headerColor.text,
          padding: 16,
          borderRadius: 12,
          marginBottom: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>الشهر الحالي</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{monthLabel}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>أهداف شهرية</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{monthlySummary.totalGoals}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>إجمالي المهام</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{monthlySummary.totalTasks}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>المهام المنجزة</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{monthlySummary.doneTasks}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>التقدم</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{monthlySummary.completionRate}%</div>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          padding: 16,
          borderRadius: 12,
          marginBottom: 24,
          border: `2px dashed ${headerColor.bg}`,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, color: headerColor.bg, marginBottom: 10, textAlign: "right" }}>
          إضافة هدف شهري
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
          <input
            type="text"
            value={newMonthlyGoalTitle}
            onChange={(event) => setNewMonthlyGoalTitle(event.target.value)}
            placeholder="مثال: إنهاء PLSQL Course"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onAddMonthlyGoal(newMonthlyGoalTitle);
                setNewMonthlyGoalTitle("");
              }
            }}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontFamily: "inherit" }}
          />
          <button
            onClick={() => {
              onAddMonthlyGoal(newMonthlyGoalTitle);
              setNewMonthlyGoalTitle("");
            }}
            style={{ background: headerColor.bg, color: headerColor.text, border: "none", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontWeight: 700 }}
          >
            إضافة
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 14, textAlign: "right", fontSize: 12, color: "#64748b" }}>
        الأسبوع الحالي: {weekRangeLabel}
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {currentMonthGoals.map((monthGoal) => {
          const childWeekGoals = weeklyGoalsByMonthGoalId[monthGoal.id] || [];

          return (
            <div
              key={monthGoal.id}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 18,
                boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>هدف شهري</div>
                  <input
                    type="text"
                    value={monthGoal.title}
                    onChange={(event) => onUpdateMonthlyGoalTitle(monthGoal.id, event.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 15, fontWeight: 800, fontFamily: "inherit" }}
                  />
                </div>
                <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                  <GoalProgressBadge {...monthGoal.progress} />
                  <button
                    onClick={() => onDeleteMonthlyGoal(monthGoal.id)}
                    style={{ border: "none", background: "#fee2e2", color: "#b91c1c", borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontWeight: 700 }}
                  >
                    حذف الهدف الشهري
                  </button>
                </div>
              </div>

              <div style={{ padding: 14, background: "#f8fafc", borderRadius: 12, marginBottom: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                  <input
                    type="text"
                    value={newWeeklyGoalTitles[monthGoal.id] || ""}
                    onChange={(event) =>
                      setNewWeeklyGoalTitles((current) => ({ ...current, [monthGoal.id]: event.target.value }))
                    }
                    placeholder="مثال: إنهاء Module 1 هذا الأسبوع"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        onAddWeeklyGoal(monthGoal.id, newWeeklyGoalTitles[monthGoal.id] || "");
                        setNewWeeklyGoalTitles((current) => ({ ...current, [monthGoal.id]: "" }));
                      }
                    }}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontFamily: "inherit" }}
                  />
                  <button
                    onClick={() => {
                      onAddWeeklyGoal(monthGoal.id, newWeeklyGoalTitles[monthGoal.id] || "");
                      setNewWeeklyGoalTitles((current) => ({ ...current, [monthGoal.id]: "" }));
                    }}
                    style={{ border: "none", background: "#1d4ed8", color: "#fff", borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontWeight: 700 }}
                  >
                    + هدف أسبوعي
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {childWeekGoals.length > 0 ? (
                  childWeekGoals.map((weekGoal) => (
                    <div
                      key={weekGoal.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto",
                        gap: 12,
                        alignItems: "center",
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                      }}
                    >
                      <input
                        type="text"
                        value={weekGoal.title}
                        onChange={(event) => onUpdateWeeklyGoalTitle(weekGoal.id, event.target.value)}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontFamily: "inherit", fontWeight: 700 }}
                      />
                      <GoalProgressBadge {...weekGoal.progress} />
                      <button
                        onClick={() => onDeleteWeeklyGoal(weekGoal.id)}
                        style={{ border: "none", background: "#fff1f2", color: "#be123c", borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontWeight: 700 }}
                      >
                        حذف
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 12, color: "#64748b", background: "#f8fafc", borderRadius: 10, padding: 12 }}>
                    لا توجد أهداف أسبوعية لهذا الهدف بعد. إذا تركته بدون أهداف أسبوعية سيظهر مباشرة عند ربط المهام اليومية.
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {currentMonthGoals.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, textAlign: "center", color: "#64748b" }}>
            ابدأ بإضافة هدف شهري مثل: إنهاء PLSQL Course
          </div>
        )}

        {(weeklyGoalsByMonthGoalId.__unlinked__ || []).length > 0 && (
          <div style={{ background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#9a3412", marginBottom: 10 }}>
              أهداف أسبوعية غير مربوطة بهدف شهري
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {weeklyGoalsByMonthGoalId.__unlinked__.map((weekGoal) => (
                <div key={weekGoal.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center" }}>
                  <input
                    type="text"
                    value={weekGoal.title}
                    onChange={(event) => onUpdateWeeklyGoalTitle(weekGoal.id, event.target.value)}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #fdba74", borderRadius: 8, fontFamily: "inherit", fontWeight: 700 }}
                  />
                  <GoalProgressBadge {...weekGoal.progress} />
                  <button
                    onClick={() => onDeleteWeeklyGoal(weekGoal.id)}
                    style={{ border: "none", background: "#fff1f2", color: "#be123c", borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontWeight: 700 }}
                  >
                    حذف
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
