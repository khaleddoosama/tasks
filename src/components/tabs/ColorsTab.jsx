import { CATEGORY_META } from "../../domain/schedule/constants";

export default function ColorsTab({ colors, onColorChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 }}>
      {Object.entries(colors).map(([key, color]) => (
        <div
          key={key}
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid #e5e5e5",
          }}
        >
          <h3 style={{ marginTop: 0, textAlign: "right", fontWeight: 700, marginBottom: 16 }}>
            {key === "header" ? "العنوان" : `${CATEGORY_META[key]?.icon || ""} ${CATEGORY_META[key]?.label || key}`.trim()}
          </h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600 }}>لون الخلفية</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                value={color.bg}
                onChange={(event) => onColorChange(key, "bg", event.target.value)}
                style={{ width: 50, height: 40, border: "none", borderRadius: 6, cursor: "pointer" }}
              />
              <input
                type="text"
                value={color.bg}
                onChange={(event) => onColorChange(key, "bg", event.target.value)}
                style={{ flex: 1, border: "1px solid #ddd", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600 }}>لون النص</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                value={color.text}
                onChange={(event) => onColorChange(key, "text", event.target.value)}
                style={{ width: 50, height: 40, border: "none", borderRadius: 6, cursor: "pointer" }}
              />
              <input
                type="text"
                value={color.text}
                onChange={(event) => onColorChange(key, "text", event.target.value)}
                style={{ flex: 1, border: "1px solid #ddd", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
