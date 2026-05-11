import { useEffect } from "react";
import { buildPrintHtml, PRINT_STYLE_TEXT } from "../domain/schedule/print";

export function usePrintStyle(colors, days) {
  useEffect(() => {
    const existingStyle = document.getElementById("__print_style__");
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement("style");
    style.id = "__print_style__";
    style.innerHTML = PRINT_STYLE_TEXT;
    document.head.appendChild(style);

    let root = document.getElementById("__print_root__");
    if (!root) {
      root = document.createElement("div");
      root.id = "__print_root__";
      root.style.display = "none";
      document.body.appendChild(root);
    }

    root.innerHTML = buildPrintHtml(colors, days);

    return () => {
      style.remove();
      root.remove();
    };
  }, [colors, days]);
}
