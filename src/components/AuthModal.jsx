import { useState } from "react";
import { supabase } from "../services/supabaseClient";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle = {
  background: "#fff",
  borderRadius: 14,
  padding: "28px 32px",
  minWidth: 320,
  maxWidth: 400,
  width: "90%",
  direction: "rtl",
  boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1.5px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  marginBottom: 12,
  boxSizing: "border-box",
  direction: "ltr",
  textAlign: "left",
};

const btnPrimary = {
  width: "100%",
  padding: "11px",
  background: "#6366f1",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 4,
};

const btnSecondary = {
  width: "100%",
  padding: "9px",
  background: "transparent",
  color: "#6366f1",
  border: "1.5px solid #6366f1",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 8,
};

const btnDanger = {
  width: "100%",
  padding: "9px",
  background: "#fee2e2",
  color: "#dc2626",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 8,
};

export default function AuthModal({
  isOpen,
  onClose,
  user,
  onSignOut,
  syncStatus,
  syncError,
  needsMigration,
  onImportFromLocal,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    onClose();
  };

  // ── Logged-in view ──────────────────────────────────────────────────────
  if (user) {
    return (
      <div style={overlayStyle} onClick={handleClose}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800 }}>☁️ حسابك</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>{user.email}</p>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background:
                syncStatus === "synced"
                  ? "#dcfce7"
                  : syncStatus === "syncing"
                    ? "#fef9c3"
                    : syncStatus === "failed"
                      ? "#fee2e2"
                      : "#f3f4f6",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
              color:
                syncStatus === "synced"
                  ? "#166534"
                  : syncStatus === "syncing"
                    ? "#854d0e"
                    : syncStatus === "failed"
                      ? "#dc2626"
                      : "#374151",
            }}
          >
            {syncStatus === "synced" && "✅ متزامن"}
            {syncStatus === "syncing" && "🔄 جارٍ المزامنة..."}
            {syncStatus === "failed" && `❌ فشل: ${syncError || "خطأ غير معروف"}`}
            {syncStatus === "idle" && "⏸️ في انتظار تغييرات"}
          </div>

          {needsMigration && (
            <div
              style={{
                border: "1.5px solid #fbbf24",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 14,
                background: "#fffbeb",
              }}
            >
              <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#92400e" }}>
                📦 تم اكتشاف بيانات محلية — استوردها لـ Supabase
              </p>
              <button
                style={{ ...btnPrimary, background: "#d97706", marginTop: 0 }}
                onClick={onImportFromLocal}
                disabled={syncStatus === "syncing"}
              >
                ⬆️ استورد بيانات هذا الجهاز
              </button>
            </div>
          )}

          <button style={btnDanger} onClick={onSignOut}>
            تسجيل الخروج
          </button>
          <button style={btnSecondary} onClick={handleClose}>
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  // ── Auth form (sign in / sign up) ────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
    } else if (isSignUp) {
      setSuccess("✅ تحقق من بريدك الإلكتروني لتأكيد الحساب");
    } else {
      handleClose();
    }

    setLoading(false);
  };

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>
          {isSignUp ? "☁️ إنشاء حساب" : "☁️ تسجيل الدخول"}
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: 12, color: "#9ca3af" }}>
          مزامنة بياناتك عبر Supabase
        </p>

        <form onSubmit={handleSubmit}>
          <input
            style={inputStyle}
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="كلمة المرور (6 أحرف على الأقل)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />

          {error && (
            <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 10px", fontWeight: 600 }}>
              ❌ {error}
            </p>
          )}
          {success && (
            <p style={{ color: "#16a34a", fontSize: 13, margin: "0 0 10px", fontWeight: 600 }}>
              {success}
            </p>
          )}

          <button style={btnPrimary} type="submit" disabled={loading}>
            {loading ? "جارٍ التحميل..." : isSignUp ? "إنشاء الحساب" : "دخول"}
          </button>
        </form>

        <button style={btnSecondary} onClick={() => { setError(null); setSuccess(null); setIsSignUp((v) => !v); }}>
          {isSignUp ? "لدي حساب بالفعل — تسجيل الدخول" : "إنشاء حساب جديد"}
        </button>
      </div>
    </div>
  );
}
