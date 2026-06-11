import { useState } from "react";

export default function TemplateSelectionModal({
  isOpen,
  templates,
  onClose,
  onConfirm,
  darkMode,
}) {
  const [selectedTemplate, setSelectedTemplate] = useState("");

  if (!isOpen) return null;

  const templateNames = Object.keys(templates);

  const handleConfirm = () => {
    if (selectedTemplate) {
      onConfirm(selectedTemplate);
      setSelectedTemplate("");
    }
  };

  const handleClose = () => {
    setSelectedTemplate("");
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
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1001,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: darkMode ? "#2a2a3e" : "#fff",
          color: darkMode ? "#f0f0f0" : "#1a1a2e",
          borderRadius: 12,
          padding: 24,
          maxWidth: 400,
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          direction: "rtl",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            margin: "0 0 16px 0",
            fontSize: 18,
            fontWeight: 700,
            textAlign: "right",
          }}
        >
          اختر قالباً
        </h2>

        <div style={{ marginBottom: 20 }}>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: `1px solid ${darkMode ? "#444" : "#ddd"}`,
              background: darkMode ? "#1a1a2e" : "#fff",
              color: darkMode ? "#f0f0f0" : "#1a1a2e",
              fontSize: 14,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
            autoFocus
          >
            <option value="">-- اختر من القائمة --</option>
            {templateNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={handleClose}
            style={{
              background: "#e8e8e8",
              color: "#333",
              border: "1px solid #ccc",
              borderRadius: 6,
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedTemplate}
            style={{
              background: selectedTemplate ? "#2196F3" : "#ccc",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              cursor: selectedTemplate ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            تطبيق
          </button>
        </div>
      </div>
    </div>
  );
}
