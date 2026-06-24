import { lazy, Suspense } from "react";

const PlannerPage = lazy(() => import("./features/planner/PlannerPage"));

function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#fff",
        direction: "rtl",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "24px", marginBottom: "10px" }}>جاري التحميل...</div>
        <div style={{ fontSize: "14px", color: "#666" }}>جاري تحضير البيانات</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PlannerPage />
    </Suspense>
  );
}
 