import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

const ArchivePage = lazy(() => import("./features/archive/ArchivePage.jsx"));

function LoadingFallback() {
  return <div style={{ padding: "20px", textAlign: "center" }}>جاري التحميل...</div>;
}

function Root() {
  const path = window.location.pathname;
  if (path === "/archive") {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ArchivePage />
      </Suspense>
    );
  }
  return <App />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
