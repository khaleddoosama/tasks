import { useEffect, useState } from "react";
import { exportArchiveRange } from "../../services/archiveExport";
import { LS_KEY, MONTHLY_GOALS_KEY, WEEKLY_GOALS_KEY } from "../../domain/schedule/constants";

function normalizeDate(raw) {
  // Accept 2026/05/03 or 2026-05-03
  return raw ? raw.replace(/\//g, "-") : "";
}

function readAppDataFromStorage() {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    const weekSchedules = stored.weekSchedules || {};
    const monthlyGoalsStore = JSON.parse(localStorage.getItem(MONTHLY_GOALS_KEY) || "{}");
    const weeklyGoalsStore = JSON.parse(localStorage.getItem(WEEKLY_GOALS_KEY) || "{}");
    return { weekSchedules, monthlyGoalsStore, weeklyGoalsStore };
  } catch {
    return { weekSchedules: {}, monthlyGoalsStore: {}, weeklyGoalsStore: {} };
  }
}

export default function ArchivePage() {
  const [status, setStatus] = useState("loading"); // loading | done | empty | error
  const [info, setInfo] = useState({ from: "", to: "", totalDays: 0, totalTasks: 0 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromDate = normalizeDate(params.get("from"));
    const toDate = normalizeDate(params.get("to"));

    if (!fromDate || !toDate) {
      setStatus("error");
      setInfo((prev) => ({ ...prev, errorMsg: 'يجب تحديد from و to في الـ URL مثال: ?from=2026-05-01&to=2026-05-07' }));
      return;
    }

    if (fromDate > toDate) {
      setStatus("error");
      setInfo((prev) => ({ ...prev, errorMsg: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' }));
      return;
    }

    const { weekSchedules, monthlyGoalsStore, weeklyGoalsStore } = readAppDataFromStorage();
    const result = exportArchiveRange({ weekSchedules, monthlyGoalsStore, weeklyGoalsStore, fromDate, toDate });

    setInfo({ from: fromDate, to: toDate, totalDays: result.totalDays, totalTasks: result.totalTasks });
    setStatus(result.totalDays === 0 ? "empty" : "done");
  }, []);

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        direction: "rtl",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9fafb",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "48px 56px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
          textAlign: "center",
          maxWidth: 480,
          width: "100%",
        }}
      >
        {status === "loading" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontWeight: 800, fontSize: 22, color: "#1a1a2e" }}>جاري تحضير الأرشيف...</h2>
          </>
        )}

        {status === "done" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontWeight: 800, fontSize: 22, color: "#1a1a2e", marginBottom: 8 }}>
              تم تحميل الأرشيف
            </h2>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 20 }}>
              من <strong>{info.from}</strong> إلى <strong>{info.to}</strong>
            </p>
            <div
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <span style={{ background: "#eef4ff", color: "#1a56db", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 14 }}>
                {info.totalDays} يوم
              </span>
              <span style={{ background: "#f0fdf4", color: "#166534", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 14 }}>
                {info.totalTasks} مهمة
              </span>
            </div>
            <p style={{ color: "#888", fontSize: 12 }}>
              إذا لم يبدأ التحميل، تحقق من إعدادات المتصفح
            </p>
          </>
        )}

        {status === "empty" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <h2 style={{ fontWeight: 800, fontSize: 22, color: "#1a1a2e", marginBottom: 8 }}>
              لا توجد بيانات
            </h2>
            <p style={{ color: "#555", fontSize: 14 }}>
              لا توجد أيام محفوظة من <strong>{info.from}</strong> إلى <strong>{info.to}</strong>
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 style={{ fontWeight: 800, fontSize: 22, color: "#c0392b", marginBottom: 8 }}>
              خطأ في الطلب
            </h2>
            <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7 }}>{info.errorMsg}</p>
          </>
        )}

        <div style={{ marginTop: 28, borderTop: "1px solid #f0f0f0", paddingTop: 20 }}>
          <a
            href="/"
            style={{ color: "#1a56db", fontSize: 13, textDecoration: "none", fontWeight: 600 }}
          >
            ← العودة للتطبيق
          </a>
        </div>
      </div>
    </div>
  );
}
