import { useState } from "react";

function ProgressRing({ rate, size = 56, stroke = 5, color = "#6366f1" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (rate / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.4s" }}
      />
      <text
        x={size / 2}
        y={size / 2 + 5}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill={color}
      >
        {rate}%
      </text>
    </svg>
  );
}

function WeeklyGoalRow({ goal }) {
  const rate = goal.progress?.completionRate ?? 0;
  const done = goal.progress?.doneTasks ?? 0;
  const total = goal.progress?.totalTasks ?? 0;
  const color = rate >= 80 ? "#16a34a" : rate >= 40 ? "#f59e0b" : "#6366f1";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #f1f5f9", direction: "rtl" }}>
      <div style={{ flex: 1, fontSize: 13, color: "#374151" }}>{goal.title}</div>
      <div style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>
        {total > 0 ? `${done}/${total} مهمة` : "لا مهام"}
      </div>
      <div style={{ width: 80, flexShrink: 0 }}>
        <div style={{ background: "#f1f5f9", borderRadius: 999, height: 6, overflow: "hidden" }}>
          <div style={{ width: `${rate}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.3s" }} />
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color, width: 32, textAlign: "left", flexShrink: 0 }}>{rate}%</div>
    </div>
  );
}

function MonthlyGoalCard({ goal, weeklyGoals, isOpen, onToggle }) {
  const rate = goal.progress?.completionRate ?? 0;
  const done = goal.progress?.doneTasks ?? 0;
  const total = goal.progress?.totalTasks ?? 0;
  const linked = weeklyGoals.filter((w) => w.monthlyGoalId === goal.id);
  const color = rate >= 80 ? "#16a34a" : rate >= 40 ? "#f59e0b" : "#6366f1";

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer", direction: "rtl" }}
      >
        <ProgressRing rate={rate} color={color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{goal.title}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {total > 0 ? `${done} من ${total} مهمة مكتملة` : "لا توجد مهام مرتبطة بعد"}
            {linked.length > 0 && ` · ${linked.length} هدف أسبوعي`}
          </div>
        </div>
        <span style={{ fontSize: 14, color: "#9ca3af", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
      </div>

      {isOpen && linked.length > 0 && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 12, color: "#9ca3af", margin: "10px 0 6px", fontWeight: 600 }}>الأهداف الأسبوعية الفرعية</div>
          {linked.map((w) => (
            <WeeklyGoalRow key={w.id} goal={w} />
          ))}
        </div>
      )}

      {isOpen && linked.length === 0 && (
        <div style={{ padding: "10px 16px 14px", borderTop: "1px solid #f1f5f9", fontSize: 13, color: "#9ca3af", direction: "rtl" }}>
          لا توجد أهداف أسبوعية مرتبطة بهذا الهدف.
        </div>
      )}
    </div>
  );
}

export default function GoalStatsTab({ monthLabel, currentMonthGoals, currentWeekGoals, monthlySummary }) {
  const [openId, setOpenId] = useState(null);

  const summaryColor =
    monthlySummary.completionRate >= 80 ? "#16a34a" : monthlySummary.completionRate >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ padding: 20, background: "#f9fafb", borderRadius: 12, direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🎯 إحصائيات الأهداف</h2>
        <span style={{ fontSize: 12, color: "#6b7280" }}>{monthLabel}</span>
      </div>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {[
          { label: "نسبة الإنجاز الكلية", value: `${monthlySummary.completionRate}%`, accent: summaryColor },
          { label: "الأهداف المكتملة", value: `${monthlySummary.completedGoals} / ${monthlySummary.totalGoals}` },
          { label: "المهام المنجزة", value: `${monthlySummary.doneTasks} / ${monthlySummary.totalTasks}` },
        ].map(({ label, value, accent }) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", flex: "1 1 140px", minWidth: 140 }}>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: accent || "#111827" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Monthly goals list */}
      {currentMonthGoals.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
          لا توجد أهداف شهرية لهذا الشهر بعد.
        </div>
      ) : (
        currentMonthGoals.map((goal) => (
          <MonthlyGoalCard
            key={goal.id}
            goal={goal}
            weeklyGoals={currentWeekGoals}
            isOpen={openId === goal.id}
            onToggle={() => setOpenId(openId === goal.id ? null : goal.id)}
          />
        ))
      )}
    </div>
  );
}
