export default function EnergyLog({ energyLog = [], onChange }) {
  const energyEntries = energyLog || [];

  const addEnergyEntry = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const time = `${hours}:${minutes}`;
    const newEntry = {
      id: Date.now(),
      time,
      level: 3,
      notes: "",
    };
    onChange([...energyEntries, newEntry]);
  };

  const updateEntry = (id, patch) => {
    onChange(
      energyEntries.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      )
    );
  };

  const deleteEntry = (id) => {
    onChange(energyEntries.filter((entry) => entry.id !== id));
  };

  const averageEnergy =
    energyEntries.length > 0
      ? (
          energyEntries.reduce((sum, entry) => sum + parseInt(entry.level || 0), 0) /
          energyEntries.length
        ).toFixed(1)
      : 0;

  const getEmojiForLevel = (level) => {
    const emojis = { 1: "😴", 2: "😐", 3: "😊", 4: "😄", 5: "🔥" };
    return emojis[level] || "😐";
  };

  return (
    <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            textAlign: "right",
          }}
        >
          📊 سجل الطاقة
        </h4>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {energyEntries.length > 0 && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#666",
                padding: "4px 8px",
                background: "#f5f5f5",
                borderRadius: 4,
              }}
            >
              المتوسط: {averageEnergy} {getEmojiForLevel(Math.round(averageEnergy))}
            </span>
          )}
          <button
            onClick={addEnergyEntry}
            style={{
              background: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: 4,
              padding: "4px 12px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            + إضافة تقييم
          </button>
        </div>
      </div>

      {energyEntries.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "16px",
            color: "#999",
            fontSize: 12,
          }}
        >
          لا توجد تقييمات للطاقة بعد
        </div>
      ) : (
        <>
          <EnergyChart entries={energyEntries} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {energyEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  padding: "8px 10px",
                  background: "#fafafa",
                  borderRadius: 6,
                  border: "1px solid #e8e8e8",
                }}
              >
                <input
                  type="time"
                  value={entry.time}
                  onChange={(e) => updateEntry(entry.id, { time: e.target.value })}
                  style={{
                    flex: "0 0 auto",
                    border: "1px solid #e0e0e0",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 12,
                  }}
                />
                <select
                  value={entry.level}
                  onChange={(e) => updateEntry(entry.id, { level: e.target.value })}
                  style={{
                    flex: "0 0 auto",
                    border: "1px solid #e0e0e0",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 12,
                  }}
                >
                  <option value="1">منخفضة جدا 😴</option>
                  <option value="2">منخفضة 😐</option>
                  <option value="3">متوسطة 😊</option>
                  <option value="4">عالية 😄</option>
                  <option value="5">عالية جدا 🔥</option>
                </select>
                <input
                  type="text"
                  value={entry.notes}
                  onChange={(e) => updateEntry(entry.id, { notes: e.target.value })}
                  placeholder="ملاحظة (اختياري)"
                  style={{
                    flex: 1,
                    border: "1px solid #e0e0e0",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 12,
                  }}
                />
                <button
                  onClick={() => deleteEntry(entry.id)}
                  style={{
                    flex: "0 0 auto",
                    background: "#ff6b6b",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 12px",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EnergyChart({ entries }) {
  if (entries.length < 2) return null;

  const sorted = [...entries]
    .filter((e) => e.time && typeof e.time === "string" && e.time.includes(":"))
    .sort((a, b) => {
      try {
        const [aH, aM] = a.time.split(":").map(Number);
        const [bH, bM] = b.time.split(":").map(Number);
        return aH * 60 + aM - (bH * 60 + bM);
      } catch {
        return 0;
      }
    });

  if (sorted.length === 0) return null;

  const width = 400;
  const height = 150;
  const padding = 40;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  const maxLevel = 5;

  // Calculate points
  const points = sorted.map((entry, i) => ({
    x: padding + (i / (sorted.length - 1)) * graphWidth,
    y: padding + graphHeight - (parseInt(entry.level) / maxLevel) * graphHeight,
    level: parseInt(entry.level),
    time: entry.time,
    entry,
  }));

  // Generate smooth curve path using quadratic bezier
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const controlX = (prev.x + curr.x) / 2;
    const controlY = (prev.y + curr.y) / 2;
    pathD += ` Q ${controlX} ${controlY} ${curr.x} ${curr.y}`;
  }

  // Area fill path
  let areaD = pathD + ` L ${points[points.length - 1].x} ${padding + graphHeight} L ${points[0].x} ${padding + graphHeight} Z`;

  const getColor = (level) => {
    if (level >= 4.5) return "#4CAF50";
    if (level >= 3.5) return "#8BC34A";
    if (level >= 2.5) return "#FFC107";
    if (level >= 1.5) return "#FF9800";
    return "#F44336";
  };

  return (
    <div style={{ marginBottom: 12, padding: "8px 10px", background: "#f9f9f9", borderRadius: 6, overflowX: "auto" }}>
      <svg width={width} height={height} style={{ display: "block", margin: "0 auto" }}>
        {/* Grid lines */}
        {[1, 2, 3, 4, 5].map((level) => (
          <line
            key={`grid-${level}`}
            x1={padding}
            y1={padding + graphHeight - (level / maxLevel) * graphHeight}
            x2={width - padding}
            y2={padding + graphHeight - (level / maxLevel) * graphHeight}
            stroke="#e0e0e0"
            strokeDasharray="3,3"
            strokeWidth="1"
          />
        ))}

        {/* Area */}
        <path d={areaD} fill="url(#gradient)" opacity="0.3" />

        {/* Gradient def */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#4CAF50", stopOpacity: 0.6 }} />
            <stop offset="100%" style={{ stopColor: "#4CAF50", stopOpacity: 0.1 }} />
          </linearGradient>
        </defs>

        {/* Line */}
        <path d={pathD} stroke="#4CAF50" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {points.map((point, i) => (
          <g key={`point-${i}`}>
            <circle cx={point.x} cy={point.y} r="3.5" fill="white" stroke={getColor(point.level)} strokeWidth="2" />
            <text
              x={point.x}
              y={height - 12}
              textAnchor="middle"
              fontSize="10"
              fill="#666"
              style={{ pointerEvents: "none" }}
            >
              {point.time}
            </text>
          </g>
        ))}

        {/* Y-axis labels */}
        {[1, 2, 3, 4, 5].map((level) => (
          <text
            key={`label-${level}`}
            x={padding - 8}
            y={padding + graphHeight - (level / maxLevel) * graphHeight + 4}
            textAnchor="end"
            fontSize="11"
            fill="#999"
          >
            {level}
          </text>
        ))}
      </svg>
    </div>
  );
}
