import { useState } from "react";

export default function GeneralNotesTab({
  notes,
  colors,
  darkMode,
  onAddNote,
  onUpdateNote,
  onToggleActive,
  onDeleteNote,
}) {
  const [inputValue, setInputValue] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const handleAddNote = () => {
    if (inputValue.trim()) {
      onAddNote(inputValue);
      setInputValue("");
    }
  };

  const handleStartEdit = (note) => {
    setEditingId(note.id);
    setEditingText(note.text);
  };

  const handleSaveEdit = () => {
    if (editingText.trim()) {
      onUpdateNote(editingId, editingText);
      setEditingId(null);
      setEditingText("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const headerColor = colors.header;

  return (
    <div
      style={{
        background: darkMode ? "#1a1a2e" : "#f9fafb",
        borderRadius: 8,
        padding: 20,
        direction: "rtl",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: headerColor.bg }}>
          إضافة ملاحظة جديدة
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddNote()}
            placeholder="اكتب ملاحظتك هنا..."
            style={{
              flex: 1,
              padding: "10px 12px",
              border: `2px solid ${headerColor.bg}`,
              borderRadius: 6,
              fontSize: 14,
              background: darkMode ? "#2a2a3e" : "#fff",
              color: darkMode ? "#f0f0f0" : "#1a1a2e",
            }}
          />
          <button
            onClick={handleAddNote}
            style={{
              background: headerColor.bg,
              color: headerColor.text,
              border: "none",
              borderRadius: 6,
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            + إضافة
          </button>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: headerColor.bg }}>
          الملاحظات ({notes.length})
        </h3>
        {notes.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 20,
              color: darkMode ? "#aaa" : "#999",
              fontSize: 14,
            }}
          >
            لا توجد ملاحظات حتى الآن
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notes.map((note) => (
              <div
                key={note.id}
                style={{
                  background: darkMode ? "#2a2a3e" : "#fff",
                  border: `1px solid ${note.active ? headerColor.bg : "#ddd"}`,
                  borderRadius: 8,
                  padding: 12,
                  opacity: note.active ? 1 : 0.6,
                }}
              >
                {editingId === note.id ? (
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        border: `1px solid ${headerColor.bg}`,
                        borderRadius: 4,
                        fontSize: 13,
                        background: darkMode ? "#1a1a2e" : "#f9fafb",
                        color: darkMode ? "#f0f0f0" : "#1a1a2e",
                      }}
                    />
                    <button
                      onClick={handleSaveEdit}
                      style={{
                        background: "#27ae60",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✓ حفظ
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      style={{
                        background: "#e74c3c",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✕ إلغاء
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 14,
                        color: darkMode ? "#f0f0f0" : "#1a1a2e",
                        marginBottom: 8,
                        lineHeight: 1.5,
                      }}
                    >
                      {note.text}
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-start" }}>
                      <button
                        onClick={() => handleStartEdit(note)}
                        title="تعديل"
                        style={{
                          background: "#3498db",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          padding: "6px 10px",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        ✏️ تعديل
                      </button>
                      <button
                        onClick={() => onToggleActive(note.id)}
                        title={note.active ? "تعطيل" : "تفعيل"}
                        style={{
                          background: note.active ? "#f39c12" : "#27ae60",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          padding: "6px 10px",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {note.active ? "👁️ إخفاء" : "👁️‍🗨️ إظهار"}
                      </button>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        title="حذف"
                        style={{
                          background: "#e74c3c",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          padding: "6px 10px",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
