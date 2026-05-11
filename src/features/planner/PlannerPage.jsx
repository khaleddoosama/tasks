import GistSettingsModal from "../../GistSettingsModal";
import SyncStatusIndicator from "../../SyncStatusIndicator";
import DayCard from "../../components/schedule/DayCard";
import ColorsTab from "../../components/tabs/ColorsTab";
import GoalsTab from "../../components/tabs/GoalsTab";
import PreviewTab from "../../components/tabs/PreviewTab";
import { usePlannerState } from "./usePlannerState";

const TAB_LABELS = {
  editor: "✏️ محرّر",
  goals: "🎯 الأهداف",
  colors: "🎨 الألوان",
  preview: "👁️ معاينة",
};

export default function PlannerPage() {
  const planner = usePlannerState();
  const headerColor = planner.colors.header;

  const handleImportChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await planner.importSchedule(file);
      alert("✅ تم استيراد البيانات بنجاح!");
    } catch (error) {
      alert(`❌ خطأ في قراءة الملف: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        direction: "rtl",
        background: planner.darkMode ? "#1a1a2e" : "#f9fafb",
        minHeight: "100vh",
        padding: "20px",
        color: planner.darkMode ? "#f0f0f0" : "#1a1a2e",
        transition: "background 0.3s, color 0.3s",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: planner.saveColor, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              {planner.saveIndicator}
            </span>
            <SyncStatusIndicator
              syncStatus={planner.syncStatus}
              lastSyncTime={planner.lastSyncTime}
              syncError={planner.syncError}
              onSettingsClick={() => planner.setShowGistSettings(true)}
            />
          </div>
          <button
            onClick={() => planner.setDarkMode((value) => !value)}
            title="Dark Mode"
            style={{
              background: planner.darkMode ? "#2a2a3e" : "#e0e0e0",
              color: planner.darkMode ? "#ffd700" : "#ff9800",
              border: "none",
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {planner.darkMode ? "🌙" : "☀️"}
          </button>
        </div>

        <h1 style={{ textAlign: "center", fontSize: 32, fontWeight: 900, marginBottom: 24, color: headerColor.bg }}>جدول الأسبوع 📆</h1>

        <div
          style={{
            background: planner.darkMode ? "#2a2a3e" : "#f0f5ff",
            border: `2px solid ${headerColor.bg}`,
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <label style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>📆 اختر الأسبوع:</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={planner.decrementWeek} title="Previous Week" style={{ background: headerColor.bg, color: headerColor.text, border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>←</button>
            <input
              type="number"
              value={planner.selectedWeek}
              onChange={(event) => {
                const nextValue = parseInt(event.target.value, 10);
                if (nextValue >= 1 && nextValue <= 52) {
                  planner.setSelectedWeek(nextValue);
                }
              }}
              min="1"
              max="52"
              style={{ width: 60, padding: "6px 8px", border: `2px solid ${headerColor.bg}`, borderRadius: 4, textAlign: "center", fontSize: 14, fontWeight: 600 }}
              title="Week Number (1-52)"
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: planner.darkMode ? "#aaa" : "#666" }}>w</span>
            <button onClick={planner.incrementWeek} title="Next Week" style={{ background: headerColor.bg, color: headerColor.text, border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>→</button>
            <select
              value={planner.selectedWeek}
              onChange={(event) => planner.setSelectedWeek(parseInt(event.target.value, 10))}
              style={{ padding: "6px 8px", border: `1px solid ${headerColor.bg}`, borderRadius: 4, fontSize: 13, background: planner.darkMode ? "#1a1a2e" : "#fff", color: planner.darkMode ? "#f0f0f0" : "#1a1a2e", cursor: "pointer" }}
            >
              {Array.from({ length: 52 }, (_, index) => index + 1).map((week) => (
                <option key={week} value={week}>
                  الأسبوع {week}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "#999", marginLeft: 12, whiteSpace: "nowrap" }}>{planner.weekRangeLabel}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 24, borderBottom: "2px solid #e0e0e0", flexWrap: "wrap", alignItems: "center" }}>
          {Object.entries(TAB_LABELS).map(([tabKey, label]) => (
            <button
              key={tabKey}
              onClick={() => planner.setTab(tabKey)}
              style={{
                background: planner.tab === tabKey ? headerColor.bg : "transparent",
                color: planner.tab === tabKey ? headerColor.text : "#666",
                border: "none",
                borderRadius: "8px 8px 0 0",
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {label}
            </button>
          ))}

          <div style={{ marginRight: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={planner.undoRedo.undo} disabled={!planner.undoRedo.canUndo} title="Ctrl+Z" style={{ background: "#e3f2fd", color: "#1976d2", border: "1px solid #90caf9", borderRadius: 6, padding: "8px 12px", cursor: planner.undoRedo.canUndo ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600, opacity: planner.undoRedo.canUndo ? 1 : 0.5 }}>↶ تراجع</button>
            <button onClick={planner.undoRedo.redo} disabled={!planner.undoRedo.canRedo} title="Ctrl+Y" style={{ background: "#f3e5f5", color: "#7b1fa2", border: "1px solid #ce93d8", borderRadius: 6, padding: "8px 12px", cursor: planner.undoRedo.canRedo ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600, opacity: planner.undoRedo.canRedo ? 1 : 0.5 }}>↷ إعادة</button>
            <button onClick={planner.resetPlanner} title="Reset planner" style={{ background: "#fff3e0", color: "#ef6c00", border: "1px solid #ffb74d", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>↺ إعادة ضبط</button>
            <button onClick={() => planner.setShowGistSettings(true)} title="GitHub Gist Sync" style={{ background: planner.hasCredentials() ? "#9b59b6" : "#bdc3c7", color: "#fff", border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🔗 GitHub</button>
            <button onClick={planner.exportSchedule} title="Export as JSON" style={{ background: "#e8f5e9", color: "#388e3c", border: "1px solid #81c784", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>⬇️ تصدير</button>
            <label title="Import JSON" style={{ background: "#fce4ec", color: "#c2185b", border: "1px solid #f48fb1", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "inline-block" }}>
              ⬆️ استيراد
              <input type="file" accept=".json" onChange={handleImportChange} style={{ display: "none" }} />
            </label>
            <button onClick={() => window.print()} title="Ctrl+P" style={{ background: "#27ae60", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>🖨️ طباعة</button>
          </div>
        </div>

        {planner.tab === "editor" && (
          <div style={{ marginBottom: 24 }}>
            {planner.days.map((day) => (
              <DayCard
                key={day.id}
                day={day}
                colors={planner.colors}
                onChange={(patch) => planner.updateDay(day.id, patch)}
                onCopyDay={planner.copyDay}
                createTaskId={planner.createTaskId}
              />
            ))}
          </div>
        )}

        {planner.tab === "goals" && (
          <GoalsTab
            colors={planner.colors}
            goalHours={planner.goalHours}
            currentWeekGoals={planner.currentWeekGoals}
            goalsSummary={planner.goalsSummary}
            days={planner.days}
            newGoalName={planner.newGoalName}
            newGoalTarget={planner.newGoalTarget}
            onNewGoalNameChange={planner.setNewGoalName}
            onNewGoalTargetChange={planner.setNewGoalTarget}
            onAddGoal={planner.addGoal}
            onUpdateGoal={planner.updateGoalTarget}
            onDeleteGoal={planner.deleteGoal}
          />
        )}

        {planner.tab === "colors" && <ColorsTab colors={planner.colors} onColorChange={planner.changeColor} />}

        {planner.tab === "preview" && (
          <PreviewTab
            colors={planner.colors}
            days={planner.days}
            goalHours={planner.goalHours}
            printZoom={planner.printZoom}
            onZoomOut={planner.zoomOut}
            onZoomIn={planner.zoomIn}
          />
        )}

        <GistSettingsModal
          isOpen={planner.showGistSettings}
          onClose={() => planner.setShowGistSettings(false)}
          syncStatus={planner.syncStatus}
          lastSyncTime={planner.lastSyncTime}
          syncError={planner.syncError}
          onCreateGist={planner.createNewGist}
          onSave={() => undefined}
        />
      </div>
    </div>
  );
}
