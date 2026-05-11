import { calculateDuration } from "../../domain/schedule/time";

export default function PreviewTab({
  colors,
  days,
  currentWeekGoals,
  monthLabel,
  monthlySummary,
  printZoom,
  onZoomOut,
  onZoomIn,
}) {
  const headerColor = colors.header;
  const enabledDays = days.filter((day) => day.enabled);

  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", minHeight: 400 }}>
      <div style={{ marginBottom: 24, padding: 16, background: headerColor.bg, color: headerColor.text, borderRadius: 8 }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>ملخص الأهداف المرتبطة</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.1)", padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>الشهر</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{monthLabel}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>الأهداف الشهرية</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{monthlySummary.totalGoals}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>المهام المنجزة</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>
              {monthlySummary.doneTasks}/{monthlySummary.totalTasks}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>نسبة الإنجاز</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{monthlySummary.completionRate}%</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24, padding: 16, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700, textAlign: "right" }}>أهداف الأسبوع الحالية</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {currentWeekGoals.length > 0 ? (
            currentWeekGoals.map((goal) => (
              <div key={goal.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", background: "#fff", borderRadius: 10, padding: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, textAlign: "right" }}>{goal.title}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {goal.progress.doneTasks}/{goal.progress.totalTasks} مهمة
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: goal.progress.completionRate >= 80 ? "#16a34a" : goal.progress.completionRate >= 40 ? "#f59e0b" : "#ef4444" }}>
                  {goal.progress.completionRate}%
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: "#64748b", fontSize: 13, textAlign: "right" }}>
              لا توجد أهداف أسبوعية في هذا الأسبوع بعد.
            </div>
          )}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: 12, background: "#f0f0f0", borderRadius: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>أدوات المعاينة:</span>
          <button onClick={onZoomOut} style={{ padding: "6px 12px", background: "#fff", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>− صغّر</button>
          <span style={{ fontSize: 12, fontWeight: 600, minWidth: "50px", textAlign: "center" }}>{printZoom}%</span>
          <button onClick={onZoomIn} style={{ padding: "6px 12px", background: "#fff", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>+ كبّر</button>
          <div style={{ marginRight: "auto", height: 1, flex: 1, background: "#ddd" }} />
          <span style={{ fontSize: 11, color: "#666" }}>{enabledDays.length} صفحات</span>
        </div>
        <h3 style={{ textAlign: "right", marginTop: 0, marginBottom: 12, fontSize: 16, fontWeight: 700 }}>أيام الأسبوع</h3>
        <div style={{ transform: `scale(${printZoom / 100})`, transformOrigin: "top right", transition: "transform 0.2s" }}>
          {enabledDays.map((day) => (
            <div key={day.id} style={{ marginBottom: 20, padding: 16, background: "#f9fafb", borderRadius: 8, border: `2px solid ${headerColor.bg}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: 12, background: headerColor.bg, color: headerColor.text, borderRadius: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 900 }}>{day.name}</span>
                <span style={{ fontSize: 12, opacity: 0.9 }}>{day.type}</span>
              </div>
              {day.notes && (
                <div style={{ marginBottom: 12, padding: 10, background: "#fff", borderRadius: 6, borderRight: `3px solid ${headerColor.bg}`, fontSize: 13 }}>
                  <strong>ملاحظات:</strong> {day.notes}
                </div>
              )}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: headerColor.bg, color: headerColor.text }}>
                    <th style={{ padding: 8, textAlign: "center", width: "8%" }}>تم</th>
                    <th style={{ padding: 8, textAlign: "right" }}>المهمة</th>
                    <th style={{ padding: 8, textAlign: "center", width: "20%" }}>الوقت</th>
                    <th style={{ padding: 8, textAlign: "center", width: "15%" }}>المدة</th>
                    <th style={{ padding: 8, textAlign: "right", width: "30%" }}>لو متمش / ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {day.tasks.map((task, index) => {
                    const categoryColor = task.cat && colors[task.cat];
                    const background = categoryColor ? categoryColor.bg : index % 2 === 1 ? "#f7f8ff" : "#fff";
                    const textColor = categoryColor ? categoryColor.text : "#1a1a2e";

                    return (
                      <tr key={task.id} style={{ background, borderBottom: "1px solid #e5e5e5" }}>
                        <td style={{ padding: 8, textAlign: "center", color: textColor }}>{task.done ? "✓" : "◻"}</td>
                        <td style={{ padding: 8, textAlign: "right", color: textColor, fontWeight: 600, textDecoration: task.done ? "line-through" : "none" }}>{task.task}</td>
                        <td style={{ padding: 8, textAlign: "center", color: textColor, whiteSpace: "nowrap", fontSize: 11 }}>{task.time}</td>
                        <td style={{ padding: 8, textAlign: "center", color: textColor, fontSize: 11 }}>{calculateDuration(task.time)}</td>
                        <td style={{ padding: 8, textAlign: "right", color: textColor, fontSize: 11 }}>{task.notes || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
