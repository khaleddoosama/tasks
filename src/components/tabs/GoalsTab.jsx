import GoalsPanel from "../goals/GoalsPanel";

export default function GoalsTab({
  colors,
  goalHours,
  currentWeekGoals,
  goalsSummary,
  days,
  newGoalName,
  newGoalTarget,
  onNewGoalNameChange,
  onNewGoalTargetChange,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
}) {
  const headerColor = colors.header;

  return (
    <div style={{ padding: 20, background: "#f9fafb", borderRadius: 12 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ textAlign: "right", fontSize: 24, fontWeight: 900, marginBottom: 8, color: headerColor.bg }}>الأهداف الأسبوعية 🎯</h2>
        <p style={{ textAlign: "right", fontSize: 13, color: "#666", margin: 0 }}>
          تتبع تقدمك نحو أهدافك الأسبوعية. عدّل الأهداف حسب احتياجاتك.
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
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 16,
        }}
      >
        <div style={{ textAlign: "center", padding: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>إجمالي الساعات</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{goalsSummary.trackedHours.toFixed(1)}</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>ساعة مسجلة</div>
        </div>
        <div style={{ textAlign: "center", padding: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>إجمالي الأهداف</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{goalsSummary.targetHours}</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>ساعة مستهدفة</div>
        </div>
        <div style={{ textAlign: "center", padding: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>معدل الإنجاز</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{goalsSummary.completionRate}%</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>نسبة التقدم</div>
        </div>
        <div style={{ textAlign: "center", padding: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>عدد الأيام</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{days.filter((day) => day.enabled).length}</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>أيام نشطة</div>
        </div>
      </div>

      <div style={{ background: "#fff", padding: 16, borderRadius: 12, marginBottom: 24, border: `2px dashed ${headerColor.bg}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <h3 style={{ textAlign: "right", marginTop: 0, marginBottom: 12, fontSize: 14, fontWeight: 700, color: headerColor.bg }}>➕ إضافة هدف جديد</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px", gap: 12, alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, textAlign: "right" }}>اسم الهدف</label>
            <input
              type="text"
              value={newGoalName}
              onChange={(event) => onNewGoalNameChange(event.target.value)}
              placeholder="مثال: دراسة لغة جديدة"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onAddGoal();
                }
              }}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, textAlign: "right" }}>الهدف (ساعة)</label>
            <input
              type="number"
              value={newGoalTarget}
              onChange={(event) => onNewGoalTargetChange(parseFloat(event.target.value) || 20)}
              min="1"
              max="168"
              style={{ width: "100%", padding: "8px 6px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, textAlign: "center", boxSizing: "border-box" }}
            />
          </div>
          <button
            onClick={onAddGoal}
            style={{ background: headerColor.bg, color: headerColor.text, border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            إضافة
          </button>
        </div>
      </div>

      <GoalsPanel currentWeekGoals={currentWeekGoals} goalHours={goalHours} onUpdateGoal={onUpdateGoal} onDeleteGoal={onDeleteGoal} />
    </div>
  );
}
