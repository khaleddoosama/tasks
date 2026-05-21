import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ArchivePage from "./features/archive/ArchivePage.jsx";

function Root() {
  const path = window.location.pathname;
  if (path === "/archive") return <ArchivePage />;
  return <App />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
