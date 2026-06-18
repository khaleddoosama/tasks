import { useState } from "react";
import TemplateEditModal from "./TemplateEditModal";

export default function TemplateManager({ isOpen, onClose, darkMode, templates = {}, onDeleteTemplate, onUpdateTemplate, onToast }) {
  const [editingTemplate, setEditingTemplate] = useState(null);

  const handleDeleteTemplate = (templateName) => {
    const confirmed = window.confirm(`هل تريد حذف القالب "${templateName}"؟`);
    if (!confirmed) return;
    onDeleteTemplate?.(templateName);
    onToast?.("✅ تم حذف القالب بنجاح!");
  };

  const handleSaveEdit = (oldName, newName, newTasks) => {
    onUpdateTemplate?.(oldName, newName, newTasks);
    onToast?.("✅ تم حفظ التعديلات!");
    setEditingTemplate(null);
  };

  if (!isOpen) return null;

  const templateNames = Object.keys(templates);
  const border = darkMode ? "#444" : "#ddd";

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: darkMode ? "#2a2a3e" : "#fff",
            color: darkMode ? "#f0f0f0" : "#1a1a2e",
            borderRadius: 12,
            padding: 24,
            maxWidth: 500,
            maxHeight: "80vh",
            overflow: "auto",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
            direction: "rtl",
            minWidth: 300,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>⚙️ إدارة قوالب الأيام</h2>
            <button
              onClick={onClose}
              style={{ background: "transparent", border: "none", fontSize: 24, cursor: "pointer", padding: 0 }}
            >
              ✕
            </button>
          </div>

          {templateNames.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "#999" }}>
              <p>📭 لا توجد قوالب محفوظة</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>اضغط على زر "💾 حفظ" في أي يوم لحفظ قالب</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {templateNames.map((templateName) => (
                <div
                  key={templateName}
                  style={{
                    background: darkMode ? "#1a1a2e" : "#f5f5f5",
                    border: `1px solid ${border}`,
                    borderRadius: 8,
                    padding: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{templateName}</p>
                    <p style={{ margin: "4px 0 0 0", fontSize: 12, opacity: 0.7 }}>
                      {templates[templateName].type} • {templates[templateName].tasks?.length || 0} مهام
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => setEditingTemplate(templateName)}
                      style={{
                        background: "#e3f2fd",
                        color: "#1565c0",
                        border: "1px solid #90caf9",
                        borderRadius: 6,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✏️ تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(templateName)}
                      style={{
                        background: "#ffebee",
                        color: "#c2185b",
                        border: "1px solid #f48fb1",
                        borderRadius: 6,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${border}` }}>
            <button
              onClick={onClose}
              style={{
                background: "#e8f5e9",
                color: "#388e3c",
                border: "1px solid #81c784",
                borderRadius: 6,
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                width: "100%",
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      <TemplateEditModal
        isOpen={editingTemplate !== null}
        templateName={editingTemplate}
        template={editingTemplate ? templates[editingTemplate] : null}
        onClose={() => setEditingTemplate(null)}
        onSave={handleSaveEdit}
        darkMode={darkMode}
      />
    </>
  );
}
