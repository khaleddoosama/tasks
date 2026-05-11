import { GOALS, GOAL_COLORS } from "../../domain/schedule/constants";
import { calculateDuration } from "../../domain/schedule/time";

export default function PreviewTab({ colors, days, goalHours, printZoom, onZoomOut, onZoomIn }) {
  const headerColor = colors.header;
  const enabledDays = days.filter((day) => day.enabled);
  const totalHours = Object.values(goalHours).reduce((sum, value) => sum + value, 0);

  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", minHeight: 400 }}>
      <div style={{ marginBottom: 24, padding: 16, background: headerColor.bg, color: headerColor.text, borderRadius: 8 }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>📈 إحصائيات متقدمة</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
          <svg viewBox="0 0 120 120" style={{ width: "100%", maxWidth: 200 }}>
            {GOALS.map((goal, index) => {
              if (totalHours === 0) return null;

              const percentage = totalHours > 0 ? (goalHours[goal] / totalHours) * 100 : 0;
              const startAngle = (GOALS.slice(0, index).reduce((sum, item) => sum + (goalHours[item] || 0), 0) / totalHours) * 360;
              const endAngle = startAngle + (percentage * 360) / 100;
              const largeArc = percentage > 50 ? 1 : 0;
              const radius = 40;
              const centerX = 60;
              const centerY = 60;
              const start = {
                x: centerX + radius * Math.cos(((startAngle - 90) * Math.PI) / 180),
                y: centerY + radius * Math.sin(((startAngle - 90) * Math.PI) / 180),
              };
              const end = {
                x: centerX + radius * Math.cos(((endAngle - 90) * Math.PI) / 180),
                y: centerY + radius * Math.sin(((endAngle - 90) * Math.PI) / 180),
              };
              const pathData = `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;

              return <path key={goal} d={pathData} fill={GOAL_COLORS[index]} />;
            })}
          </svg>

          <div>
            <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>ملخص الأهداف:</div>
            {GOALS.map((goal, index) => {
              const percentage = totalHours > 0 ? (goalHours[goal] / totalHours) * 100 : 0;
              return (
                <div key={goal} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 4 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: GOAL_COLORS[index] }} />
                  <span style={{ flex: 1 }}>{goal}</span>
                  <span style={{ fontWeight: 700 }}>{goalHours[goal]}h ({Math.round(percentage)}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24, padding: 16, background: headerColor.bg, color: headerColor.text, borderRadius: 8 }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>ملخص الأهداف الأسبوعية 📊</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {GOALS.map((goal) => {
            const maxHours = 20;
            const percentage = Math.min((goalHours[goal] / maxHours) * 100, 100);
            const barColor = percentage < 33 ? "#e74c3c" : percentage < 66 ? "#f39c12" : "#27ae60";

            return (
              <div key={goal} style={{ background: "rgba(255,255,255,0.1)", padding: 12, borderRadius: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, textAlign: "right" }}>{goal}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 20, background: "rgba(255,255,255,0.2)", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${percentage}%`, background: barColor, transition: "width 0.3s ease" }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, minWidth: "40px", textAlign: "center" }}>{goalHours[goal]}h</div>
                </div>
                <div style={{ fontSize: 10, marginTop: 4, opacity: 0.8 }}>{Math.round(percentage)}%</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, padding: 12, background: "rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 12 }}>
          <strong>الإجمالي:</strong> {totalHours.toFixed(1)} ساعة من {GOALS.length * 20} ساعة مستهدفة
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: 12, background: "#f0f0f0", borderRadius: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>🔍 أدوات المعاينة:</span>
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
                        <td style={{ padding: 8, textAlign: "right", color: textColor, fontWeight: 600 }}>{task.task}</td>
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
