import { useState, useEffect } from "react";
import { CATEGORY_META } from "../domain/schedule/constants";

const CAT_OPTIONS = [
  { value: "", label: "بدون تصنيف" },
  ...Object.entries(CATEGORY_META).map(([key, meta]) => ({
    value: key,
    label: `${meta.icon} ${meta.label}`,
  })),
];

export default function TemplateEditModal({ isOpen, templateName, template, onClose, onSave, darkMode }) {
  const [name, setName] = useState("");
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setName(templateName || "");
      setTasks(template?.tasks ? template.tasks.map((t) => ({ ...t })) : []);
    }
  }, [isOpen, templateName, template]);

  if (!isOpen) return null;

  const bg = darkMode ? "#2a2a3e" : "#fff";
  const color = darkMode ? "#f0f0f0" : "#1a1a2e";
  const border = darkMode ? "#444" : "#ddd";
  const inputBg = darkMode ? "#1a1a2e" : "#f9f9f9";

  const updateTask = (index, field, value) => {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const deleteTask = (index) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const addTask = () => {
    setTasks((prev) => [
      ...prev,
      { id: Date.now(), time: "", task: "", cat: "", done: false },
    ]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(templateName, name.trim(), tasks);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: bg,
          color,
          borderRadius: 12,
          padding: 24,
          width: "min(680px, 95vw)",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 4px 32px rgba(0,0,0,0.35)",
          direction: "rtl",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>✏️ تعديل القالب</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color }}>
            ✕
          </button>
        </div>

        {/* Template name */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>اسم القالب</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 6,
              border: `1px solid ${border}`,
              background: inputBg,
              color,
              fontSize: 14,
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Tasks */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>المهام ({tasks.length})</label>
            <button
              onClick={addTask}
              style={{
                background: "#e8f5e9",
                color: "#388e3c",
                border: "1px solid #81c784",
                borderRadius: 6,
                padding: "5px 12px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              + إضافة مهمة
            </button>
          </div>

          {tasks.length === 0 ? (
            <p style={{ textAlign: "center", color: "#999", padding: 16, margin: 0 }}>لا توجد مهام</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks.map((task, index) => (
                <div
                  key={task.id ?? index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1.5fr auto",
                    gap: 8,
                    alignItems: "center",
                    background: darkMode ? "#1a1a2e" : "#f5f5f5",
                    borderRadius: 8,
                    padding: "8px 10px",
                    border: `1px solid ${border}`,
                  }}
                >
                  {/* Time */}
                  <input
                    value={task.time || ""}
                    onChange={(e) => updateTask(index, "time", e.target.value)}
                    placeholder="الوقت (HH:MM - HH:MM)"
                    style={{
                      padding: "6px 8px",
                      borderRadius: 5,
                      border: `1px solid ${border}`,
                      background: inputBg,
                      color,
                      fontSize: 12,
                      fontFamily: "inherit",
                    }}
                  />

                  {/* Category */}
                  <select
                    value={task.cat || ""}
                    onChange={(e) => updateTask(index, "cat", e.target.value)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 5,
                      border: `1px solid ${border}`,
                      background: inputBg,
                      color,
                      fontSize: 12,
                      fontFamily: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    {CAT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* Task name */}
                  <input
                    value={task.task || ""}
                    onChange={(e) => updateTask(index, "task", e.target.value)}
                    placeholder="اسم المهمة"
                    style={{
                      padding: "6px 8px",
                      borderRadius: 5,
                      border: `1px solid ${border}`,
                      background: inputBg,
                      color,
                      fontSize: 12,
                      fontFamily: "inherit",
                    }}
                  />

                  {/* Delete */}
                  <button
                    onClick={() => deleteTask(index)}
                    title="حذف المهمة"
                    style={{
                      background: "#ffebee",
                      color: "#c62828",
                      border: "1px solid #ef9a9a",
                      borderRadius: 5,
                      padding: "5px 8px",
                      cursor: "pointer",
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-start",
            marginTop: 20,
            paddingTop: 16,
            borderTop: `1px solid ${border}`,
          }}
        >
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            style={{
              background: name.trim() ? "#1976d2" : "#ccc",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "9px 20px",
              cursor: name.trim() ? "pointer" : "not-allowed",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            💾 حفظ التعديلات
          </button>
          <button
            onClick={onClose}
            style={{
              background: darkMode ? "#3a3a5e" : "#e8e8e8",
              color: darkMode ? "#f0f0f0" : "#333",
              border: `1px solid ${border}`,
              borderRadius: 6,
              padding: "9px 20px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
