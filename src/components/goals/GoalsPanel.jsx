import { DEFAULT_GOAL_TARGET, GOAL_COLORS } from "../../domain/schedule/constants";

export default function GoalsPanel({ currentWeekGoals, goalHours, onUpdateGoal, onDeleteGoal }) {
  const goalList = Object.entries(currentWeekGoals).sort((left, right) => {
    if (left[1].type === "predefined" && right[1].type !== "predefined") return -1;
    if (left[1].type !== "predefined" && right[1].type === "predefined") return 1;
    return left[0].localeCompare(right[0]);
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
      {goalList.map(([goal, goalData], index) => {
        const target = goalData.target || DEFAULT_GOAL_TARGET;
        const actual = goalHours[goal] || 0;
        const percentage = target > 0 ? (actual / target) * 100 : 0;
        const isOnTrack = percentage >= 80;
        const isWarning = percentage >= 50 && percentage < 80;
        const statusColor = isOnTrack ? "#27ae60" : isWarning ? "#f39c12" : "#e74c3c";
        const statusLabel = isOnTrack ? "✅ على المسار" : isWarning ? "⚠️ تحذير" : "❌ متأخر";
        const goalColor = GOAL_COLORS[index % GOAL_COLORS.length];
        const isCustom = goalData.type === "custom";

        return (
          <div
            key={goal}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              border: `3px solid ${statusColor}`,
              transition: "all 0.3s ease",
              transform: isOnTrack ? "scale(1.02)" : "scale(1)",
              position: "relative",
            }}
          >
            {isCustom && (
              <button
                onClick={() => onDeleteGoal(goal)}
                title="حذف الهدف"
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  background: "rgba(231, 76, 60, 0.2)",
                  color: "#e74c3c",
                  border: "none",
                  borderRadius: "50%",
                  width: 24,
                  height: 24,
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingRight: isCustom ? 24 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: goalColor, boxShadow: "0 0 8px rgba(0,0,0,0.2)" }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: goalColor }}>{goal}</span>
                {isCustom && <span style={{ fontSize: 10, opacity: 0.5, color: "#999" }}>مخصص</span>}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: statusColor, padding: "4px 8px", background: `${statusColor}20`, borderRadius: 4, whiteSpace: "nowrap" }}>
                {statusLabel}
              </span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ height: 28, background: "#f0f0f0", borderRadius: 8, overflow: "hidden", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(percentage, 100)}%`,
                    background: `linear-gradient(90deg, ${statusColor}, ${statusColor}dd)`,
                    transition: "width 0.4s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {percentage > 10 && `${Math.round(percentage)}%`}
                </div>
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666" }}>
                <span>{actual.toFixed(1)}h من {target}h</span>
                <span style={{ color: statusColor, fontWeight: 700 }}>{(target - actual).toFixed(1)}h متبقية</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 8, background: "#f9f9f9", borderRadius: 6, marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#666" }}>الهدف:</label>
              <input
                type="number"
                min="0"
                max="168"
                step="1"
                value={target}
                onChange={(event) => onUpdateGoal(goal, parseFloat(event.target.value) || DEFAULT_GOAL_TARGET)}
                style={{ flex: 1, padding: "6px 8px", border: `1px solid ${statusColor}`, borderRadius: 4, fontSize: 13, fontWeight: 600, textAlign: "center" }}
              />
              <span style={{ fontSize: 12, color: "#666" }}>ساعة</span>
            </div>

            <div style={{ padding: 8, background: `${goalColor}15`, borderRadius: 6, fontSize: 11, color: "#333", textAlign: "right" }}>
              <div>📊 متوسط يومي: {(actual / 7).toFixed(1)}h</div>
              <div style={{ marginTop: 4 }}>⏱️ التقدم: {percentage > 0 ? percentage.toFixed(0) : 0}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
