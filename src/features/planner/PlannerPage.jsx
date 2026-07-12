import AuthModal from "../../components/AuthModal";
import SyncStatusIndicator from "../../SyncStatusIndicator";
import DayCard from "../../components/schedule/DayCard";
import GeneralNotesReadonly from "../../components/schedule/GeneralNotesReadonly";
import ColorsTab from "../../components/tabs/ColorsTab";
import GoalsTab from "../../components/tabs/GoalsTab";
import PreviewTab from "../../components/tabs/PreviewTab";
import JSONEditorTab from "../../components/tabs/JSONEditorTab";
import GeneralNotesTab from "../../components/tabs/GeneralNotesTab";
import StatsTab from "../../components/tabs/StatsTab";
import GoalStatsTab from "../../components/tabs/GoalStatsTab";
import TemplateManager from "../../components/TemplateManager";
import { useCallback, useEffect, useState } from "react";
import { usePlannerState } from "./usePlannerState";
import { getTodayDate } from "../../domain/schedule/week";

function getDefaultFromDate() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: t.type === "error" ? "#ef4444" : t.type === "warn" ? "#f59e0b" : "#22c55e",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            direction: "rtl",
            whiteSpace: "nowrap",
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return { toasts, showToast };
}

const TAB_LABELS = {
  editor: "✏️ محرّر",
  notes: "📝 ملاحظات",
  goals: "🎯 الأهداف",
  goalStats: "📊 إحصائيات الأهداف",
  colors: "🎨 الألوان",
  preview: "👁️ معاينة",
};

export default function PlannerPage() {
  const { ui, theme, week, tasks, goals, notes, sync, persistence, undoRedo } = usePlannerState();
  const { colors } = theme;
  const headerColor = colors.header;
  const { darkMode } = ui;
  const todayDate = getTodayDate();
  const { toasts, showToast } = useToast();

  const [archiveFrom, setArchiveFrom] = useState(getDefaultFromDate);
  const [archiveTo, setArchiveTo] = useState(todayDate);
  const [showArchive, setShowArchive] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const handleArchiveExport = () => {
    if (!archiveFrom || !archiveTo) {
      showToast("❌ اختر تاريخ البداية والنهاية أولاً", "error");
      return;
    }
    if (archiveFrom > archiveTo) {
      showToast("❌ تاريخ البداية يجب أن يكون قبل تاريخ النهاية", "error");
      return;
    }
    const result = persistence.exportArchive(archiveFrom, archiveTo);
    if (result?.totalDays === 0) {
      showToast("⚠️ لا توجد أيام محفوظة في هذا النطاق الزمني", "warn");
    }
  };

  const handleImportChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await persistence.importSchedule(file);
      showToast("✅ تم استيراد البيانات بنجاح!");
    } catch (error) {
      showToast(`❌ خطأ في قراءة الملف: ${error.message}`, "error");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        direction: "rtl",
        background: darkMode ? "#1a1a2e" : "#f9fafb",
        minHeight: "100vh",
        padding: "20px",
        color: darkMode ? "#f0f0f0" : "#1a1a2e",
        transition: "background 0.3s, color 0.3s",
      }}
    >
      <Toast toasts={toasts} />

      {/* Fixed top bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: darkMode ? "#1a1a2e" : "#f9fafb",
          borderBottom: darkMode ? "1px solid #2a2a3e" : "1px solid #e5e7eb",
          padding: "8px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          direction: "rtl",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: persistence.saveColor, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            {persistence.saveIndicator}
          </span>
          <SyncStatusIndicator
            syncStatus={sync.syncStatus}
            lastSyncTime={sync.lastSyncTime}
            syncError={sync.syncError}
            onSettingsClick={() => ui.setShowAuthModal(true)}
          />
        </div>
        <button
          onClick={() => ui.setDarkMode((value) => !value)}
          title="Dark Mode"
          style={{
            background: darkMode ? "#2a2a3e" : "#e0e0e0",
            color: darkMode ? "#ffd700" : "#ff9800",
            border: "none",
            borderRadius: 6,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {darkMode ? "🌙" : "☀️"}
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", paddingTop: 56 }}>

        <h1 style={{ textAlign: "center", fontSize: 32, fontWeight: 900, marginBottom: 24, color: headerColor.bg }}>جدول الأسبوع 📆</h1>

        <GeneralNotesReadonly notes={notes.activeGeneralNotes} colors={colors} darkMode={darkMode} />

        <div
          style={{
            background: darkMode ? "#2a2a3e" : "#f0f5ff",
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
            <button onClick={week.decrementWeek} title="Previous Week" style={{ background: headerColor.bg, color: headerColor.text, border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>←</button>
            <input
              type="number"
              value={week.selectedWeek}
              onChange={(event) => {
                const nextValue = parseInt(event.target.value, 10);
                if (nextValue >= 1 && nextValue <= 52) week.setSelectedWeek(nextValue);
              }}
              min="1"
              max="52"
              style={{ width: 60, padding: "6px 8px", border: `2px solid ${headerColor.bg}`, borderRadius: 4, textAlign: "center", fontSize: 14, fontWeight: 600 }}
              title="Week Number (1-52)"
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: darkMode ? "#aaa" : "#666" }}>w</span>
            <button onClick={week.incrementWeek} title="Next Week" style={{ background: headerColor.bg, color: headerColor.text, border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>→</button>
            <select
              value={week.selectedWeek}
              onChange={(event) => week.setSelectedWeek(parseInt(event.target.value, 10))}
              style={{ padding: "6px 8px", border: `1px solid ${headerColor.bg}`, borderRadius: 4, fontSize: 13, background: darkMode ? "#1a1a2e" : "#fff", color: darkMode ? "#f0f0f0" : "#1a1a2e", cursor: "pointer" }}
            >
              {Array.from({ length: 52 }, (_, index) => index + 1).map((weekNumber) => (
                <option key={weekNumber} value={weekNumber}>الأسبوع {weekNumber}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "#999", marginLeft: 12, whiteSpace: "nowrap" }}>{week.weekRangeLabel}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 24, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={tasks.copyPreviousWeek}
            disabled={week.selectedWeek === 1}
            style={{ background: "#e8f5e9", color: "#388e3c", border: "1px solid #c8e6c9", borderRadius: 6, padding: "8px 12px", cursor: week.selectedWeek === 1 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: week.selectedWeek === 1 ? 0.5 : 1 }}
          >
            📋 نسخ من الأسبوع السابق
          </button>
          <button
            onClick={() => setShowTemplateModal(true)}
            style={{ background: "#f4efff", color: "#5f3bb3", border: "1px solid #e9d9f5", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            ⚙️ إدارة قوالب الأيام
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 24, borderBottom: "2px solid #e0e0e0", flexWrap: "wrap", alignItems: "center" }}>
          {Object.entries(TAB_LABELS).map(([tabKey, label]) => (
            <button
              key={tabKey}
              onClick={() => ui.setTab(tabKey)}
              style={{
                background: ui.tab === tabKey ? headerColor.bg : "transparent",
                color: ui.tab === tabKey ? headerColor.text : "#666",
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
            <button onClick={undoRedo.undo} disabled={!undoRedo.canUndo} title="Ctrl+Z" style={{ background: "#e3f2fd", color: "#1976d2", border: "1px solid #90caf9", borderRadius: 6, padding: "8px 12px", cursor: undoRedo.canUndo ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600, opacity: undoRedo.canUndo ? 1 : 0.5 }}>↶ تراجع</button>
            <button onClick={undoRedo.redo} disabled={!undoRedo.canRedo} title="Ctrl+Y" style={{ background: "#f3e5f5", color: "#7b1fa2", border: "1px solid #ce93d8", borderRadius: 6, padding: "8px 12px", cursor: undoRedo.canRedo ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600, opacity: undoRedo.canRedo ? 1 : 0.5 }}>↷ إعادة</button>

            <button onClick={() => ui.setShowAuthModal(true)} title="حساب Supabase" style={{ background: sync.isAuthenticated ? "#6366f1" : "#bdc3c7", color: "#fff", border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>☁️ {sync.isAuthenticated ? "حساب" : "دخول"}</button>
            <button onClick={persistence.exportSchedule} title="Export as JSON" style={{ background: "#e8f5e9", color: "#388e3c", border: "1px solid #81c784", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>⬇️ تصدير</button>
            <label title="Import JSON" style={{ background: "#fce4ec", color: "#c2185b", border: "1px solid #f48fb1", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "inline-block" }}>
              ⬆️ استيراد
              <input type="file" accept=".json" onChange={handleImportChange} style={{ display: "none" }} />
            </label>
            <button onClick={() => window.print()} title="Ctrl+P" style={{ background: "#27ae60", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>🖨️ طباعة</button>
            <button
              onClick={() => setShowArchive((v) => !v)}
              title="تصدير الأرشيف"
              style={{ background: showArchive ? "#b8860b" : "#fdf6e3", color: showArchive ? "#fff" : "#8a6a00", border: "1px solid #e6d58a", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              📦
            </button>
          </div>
        </div>

        {/* Archive bar — collapsible */}
        {showArchive && (
          <div
            style={{
              background: darkMode ? "#1e1e35" : "#fdf6e3",
              border: `1px solid ${darkMode ? "#3a3a5e" : "#e6d58a"}`,
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 20,
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: darkMode ? "#e0c97f" : "#8a6a00", whiteSpace: "nowrap" }}>📦 تصدير الأرشيف</span>
            <span style={{ fontSize: 12, color: darkMode ? "#aaa" : "#999", whiteSpace: "nowrap" }}>من</span>
            <input type="date" value={archiveFrom} onChange={(e) => setArchiveFrom(e.target.value)} style={{ padding: "5px 8px", border: `1px solid ${darkMode ? "#555" : "#ccc"}`, borderRadius: 6, fontSize: 13, background: darkMode ? "#2a2a3e" : "#fff", color: darkMode ? "#f0f0f0" : "#1a1a2e", cursor: "pointer" }} />
            <span style={{ fontSize: 12, color: darkMode ? "#aaa" : "#999", whiteSpace: "nowrap" }}>إلى</span>
            <input type="date" value={archiveTo} onChange={(e) => setArchiveTo(e.target.value)} style={{ padding: "5px 8px", border: `1px solid ${darkMode ? "#555" : "#ccc"}`, borderRadius: 6, fontSize: 13, background: darkMode ? "#2a2a3e" : "#fff", color: darkMode ? "#f0f0f0" : "#1a1a2e", cursor: "pointer" }} />
            <button onClick={handleArchiveExport} style={{ background: "#b8860b", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>⬇️ تصدير</button>
            <span style={{ fontSize: 11, color: darkMode ? "#888" : "#aaa" }}>JSON بدون IDs — مناسب للأرشيف والـ AI</span>
          </div>
        )}

        {ui.tab === "editor" && (
          <div style={{ marginBottom: 24 }}>
            <datalist id="task-suggestions">
              {tasks.taskSuggestions.list.map((item) => (
                <option key={item.task} value={item.task} />
              ))}
            </datalist>
            {tasks.days.map((day) => (
              <DayCard
                key={day.id}
                day={day}
                colors={colors}
                goalOptions={tasks.goalOptions}
                taskSuggestions={tasks.taskSuggestions}
                onChange={(patch) => tasks.updateDay(day.id, patch)}
                onCopyDay={tasks.copyDay}
                onSaveAsTemplate={tasks.saveAsTemplate}
                onApplyTemplate={tasks.applyTemplate}
                onCarryTask={tasks.carryTaskToNextDay}
                createTaskId={tasks.createTaskId}
                isCurrentDay={day.التاريخ === todayDate}
                darkMode={darkMode}
                onToast={showToast}
              />
            ))}
          </div>
        )}

        {ui.tab === "notes" && (
          <GeneralNotesTab
            notes={notes.generalNotes}
            colors={colors}
            darkMode={darkMode}
            onAddNote={notes.addGeneralNote}
            onUpdateNote={notes.updateGeneralNote}
            onToggleActive={notes.toggleGeneralNoteActive}
            onDeleteNote={notes.deleteGeneralNote}
          />
        )}

        {ui.tab === "json" && (
          <JSONEditorTab
            schedule={persistence.getScheduleData()}
            onScheduleUpdate={persistence.updateScheduleFromJSON}
            colors={colors}
            darkMode={darkMode}
          />
        )}

        {ui.tab === "goals" && (
          <>
            <GoalsTab
              colors={colors}
              monthLabel={week.monthLabel}
              weekRangeLabel={week.weekRangeLabel}
              currentMonthGoals={goals.currentMonthGoals}
              currentWeekGoals={goals.currentWeekGoals}
              monthlySummary={goals.monthlySummary}
              onAddMonthlyGoal={goals.addMonthlyGoal}
              onUpdateMonthlyGoalTitle={goals.updateMonthlyGoalTitle}
              onAddWeeklyGoal={goals.addWeeklyGoal}
              onUpdateWeeklyGoalTitle={goals.updateWeeklyGoalTitle}
              onDeleteMonthlyGoal={goals.deleteMonthlyGoal}
              onDeleteWeeklyGoal={goals.deleteWeeklyGoal}
              onUpdateWeeklyGoalCompletion={goals.updateWeeklyGoalCompletion}
            />
            <div style={{ marginTop: 16 }}>
              <StatsTab
                colors={colors}
                days={tasks.days}
                weekRangeLabel={week.weekRangeLabel}
                weeklyGoals={goals.weeklyGoalsForStats}
                darkMode={darkMode}
                weekSchedules={tasks.weekSchedules}
                weekKey={week.weekKey}
              />
            </div>
          </>
        )}

        {ui.tab === "goalStats" && (
          <GoalStatsTab
            monthLabel={week.monthLabel}
            currentMonthGoals={goals.currentMonthGoals}
            currentWeekGoals={goals.currentWeekGoals}
            monthlySummary={goals.monthlySummary}
          />
        )}

        {ui.tab === "colors" && <ColorsTab colors={colors} onColorChange={theme.changeColor} />}

        {ui.tab === "preview" && (
          <PreviewTab
            colors={colors}
            days={tasks.days}
            currentWeekGoals={goals.currentWeekGoals}
            monthLabel={week.monthLabel}
            monthlySummary={goals.monthlySummary}
            printZoom={ui.printZoom}
            onZoomOut={ui.zoomOut}
            onZoomIn={ui.zoomIn}
          />
        )}

        <AuthModal
          isOpen={ui.showAuthModal}
          onClose={() => ui.setShowAuthModal(false)}
          user={sync.user}
          onSignOut={sync.signOut}
          syncStatus={sync.syncStatus}
          syncError={sync.syncError}
          needsMigration={sync.needsMigration}
          onImportFromLocal={sync.importFromLocal}
        />

        <TemplateManager
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          darkMode={darkMode}
          templates={tasks.templates}
          onDeleteTemplate={tasks.deleteTemplate}
          onUpdateTemplate={tasks.updateTemplate}
          onToast={showToast}
        />
      </div>
    </div>
  );
}
