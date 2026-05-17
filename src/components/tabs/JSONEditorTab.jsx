import { useState } from "react";

export default function JSONEditorTab({ schedule, onScheduleUpdate, colors, darkMode }) {
  const [jsonText, setJsonText] = useState(JSON.stringify(schedule, null, 2));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const generateNewId = (existingIds) => {
    let newId = Math.max(...existingIds, 0) + 1;
    while (existingIds.includes(newId)) {
      newId++;
    }
    return newId;
  };

  const resolveIdConflicts = (data) => {
    const usedDayIds = new Set();
    const usedTaskIds = new Set();

    // First pass: collect all existing IDs
    data.days?.forEach((day) => {
      if (day.id !== undefined) usedDayIds.add(day.id);
      day.tasks?.forEach((task) => {
        if (task.id !== undefined) usedTaskIds.add(task.id);
      });
    });

    // Second pass: fix conflicts and auto-generate new IDs
    data.days?.forEach((day) => {
      if (!day.id || usedDayIds.has(day.id)) {
        const newDayId = generateNewId(Array.from(usedDayIds));
        usedDayIds.delete(day.id);
        usedDayIds.add(newDayId);
        day.id = newDayId;
      }

      day.tasks?.forEach((task) => {
        if (!task.id || usedTaskIds.has(task.id)) {
          const newTaskId = generateNewId(Array.from(usedTaskIds));
          usedTaskIds.delete(task.id);
          usedTaskIds.add(newTaskId);
          task.id = newTaskId;
        }
      });
    });

    return data;
  };

  const handleApply = () => {
    setError("");
    setSuccess("");

    try {
      const parsed = JSON.parse(jsonText);

      if (!parsed.days || !Array.isArray(parsed.days)) {
        throw new Error("Invalid format: missing 'days' array");
      }

      // Resolve ID conflicts and auto-generate new IDs
      const resolvedData = resolveIdConflicts(parsed);

      onScheduleUpdate(resolvedData);
      setSuccess("✅ تم تطبيق البيانات بنجاح!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(`❌ ${err.message}`);
    }
  };

  const handleReset = () => {
    setJsonText(JSON.stringify(schedule, null, 2));
    setError("");
    setSuccess("");
  };

  const headerColor = colors.header;

  return (
    <div
      style={{
        background: darkMode ? "#1a1a2e" : "#f9fafb",
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, textAlign: "right" }}>📝 محرّر JSON</h2>

      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: darkMode ? "#aaa" : "#666", marginBottom: 12, textAlign: "right" }}>
          عدّل بيانات الجدول مباشرة بصيغة JSON. إذا كان لديك معرّفات (IDs) مكررة، سيتم استبدالها تلقائياً برقم جديد.
        </p>

        <textarea
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setError("");
            setSuccess("");
          }}
          style={{
            width: "100%",
            minHeight: "400px",
            padding: 12,
            fontSize: 12,
            fontFamily: "monospace",
            border: `2px solid ${headerColor.bg}`,
            borderRadius: 6,
            background: darkMode ? "#0f0f1e" : "#fff",
            color: darkMode ? "#f0f0f0" : "#1a1a2e",
            resize: "vertical",
            direction: "ltr",
            textAlign: "left",
          }}
        />
      </div>

      {error && (
        <div
          style={{
            background: "#ffebee",
            color: "#c62828",
            padding: 12,
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 13,
            borderRight: "4px solid #c62828",
            textAlign: "right",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: "#e8f5e9",
            color: "#2e7d32",
            padding: 12,
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 13,
            borderRight: "4px solid #2e7d32",
            textAlign: "right",
          }}
        >
          {success}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-start", flexWrap: "wrap" }}>
        <button
          onClick={handleApply}
          style={{
            background: headerColor.bg,
            color: headerColor.text,
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ✅ تطبيق التغييرات
        </button>
        <button
          onClick={handleReset}
          style={{
            background: darkMode ? "#2a2a3e" : "#f0f0f0",
            color: darkMode ? "#f0f0f0" : "#333",
            border: `1px solid ${darkMode ? "#444" : "#ddd"}`,
            borderRadius: 6,
            padding: "10px 20px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          🔄 استرجاع
        </button>
      </div>

      <div
        style={{
          background: darkMode ? "#0f0f1e" : "#f5f5f5",
          padding: 12,
          borderRadius: 6,
          marginTop: 16,
          fontSize: 12,
          color: darkMode ? "#aaa" : "#666",
          lineHeight: 1.6,
          textAlign: "right",
          borderRight: `3px solid ${headerColor.bg}`,
        }}
      >
        <strong>💡 ملاحظات:</strong>
        <ul style={{ margin: "8px 0 0 0", paddingRight: 20 }}>
          <li>تأكد من أن صيغة JSON صحيحة</li>
          <li>المعرّفات المكررة ستُستبدل تلقائياً برقم جديد فريد</li>
          <li>جميع التغييرات يتم حفظها في السجل (تراجع/إعادة متاح)</li>
        </ul>
      </div>
    </div>
  );
}
