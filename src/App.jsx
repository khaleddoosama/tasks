import { useState, useEffect, useRef } from "react";

// ── Calculate duration from time range ──────────────────────────
function calculateDuration(timeStr) {
  if (!timeStr || timeStr.includes("—")) return "—";

  const parts = timeStr.split("-").map(p => p.trim());
  if (parts.length !== 2) return "—";

  const parseTime = (str) => {
    const [hours, mins] = str.split(":").map(Number);
    if (isNaN(hours) || isNaN(mins)) return null;
    return hours * 60 + mins;
  };

  let startMin = parseTime(parts[0]);
  let endMin = parseTime(parts[1]);

  if (startMin === null || endMin === null) return "—";

  // Handle cases where end time is next day (e.g., 11:30 PM - 1:00 AM)
  if (endMin <= startMin) {
    endMin += 24 * 60;
  }

  const diffMin = endMin - startMin;

  // Format as hours and/or minutes in Arabic
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;

  if (hours === 0) {
    return `${mins} د`;
  } else if (mins === 0) {
    return `${hours} س`;
  } else {
    const decimal = (mins / 60).toFixed(2).slice(1);
    return `${hours}${decimal} س`;
  }
}

const INITIAL_DAYS = [
  {
    id: 1, name: "الأحد", type: "أوفيس",
    tasks: [
      { id: 1, time: "4:45 - 5:30", task: "صلاة الفجر + أذكار", dur: "45 د", cat: "ibadah" },
      { id: 2, time: "5:30 - 6:30", task: "ركوب العجلة", dur: "45 د", cat: "highlight" },
      { id: 3, time: "6:30 - 7:00", task: "فطار + قهوة", dur: "30 د", cat: "" },
      { id: 4, time: "7:00 - 7:30", task: "Anki", dur: "30 د", cat: "" },
      { id: 5, time: "7:30 - 8:15", task: "إنجليزي", dur: "45 د", cat: "highlight" },
      { id: 6, time: "8:15 - 8:45", task: "حفظ قرآن", dur: "30 د", cat: "ibadah" },
      { id: 8, time: "9:00 - 10:00", task: "تحرك للأوفيس + قرآن سماع", dur: "1 س", cat: "ibadah" },
      { id: 9, time: "10:00 - 12:00", task: "API Design (فيديوهين)", dur: "2 س", cat: "highlight" },
      { id: 10, time: "12:00 - 12:15", task: "buffer", dur: "15 د", cat: "buffer" },
      { id: 11, time: "12:15 - 1:00", task: "OIC", dur: "45 د", cat: "" },
      { id: 12, time: "1:00 - 2:00", task: "راحة + ظهر", dur: "1 س", cat: "" },
      { id: 13, time: "2:00 - 3:30", task: "OIC", dur: "1.5 س", cat: "" },
      { id: 14, time: "3:30 - 3:45", task: "buffer", dur: "15 د", cat: "buffer" },
      { id: 15, time: "3:45 - 6:15", task: "تحرك للبيت", dur: "2.5 س", cat: "" },
      { id: 16, time: "6:15 - 6:45", task: "راحة + أكل", dur: "30 د", cat: "" },
      { id: 17, time: "6:45 - 7:45", task: "LH2L", dur: "1 س", cat: "" },
      { id: 18, time: "7:45 - 8:15", task: "مراجعة اليوم + تخطيط بكرا", dur: "30 د", cat: "" },
      { id: 19, time: "8:15 - 10:00", task: "وقت حر / عائلة / قرآن", dur: "1.45 س", cat: "ibadah" },
      { id: 20, time: "10:00", task: "نوم", dur: "—", cat: "highlight" },
    ]
  },
  {
    id: 2, name: "الاثنين", type: "بيت",
    tasks: [
      { id: 1, time: "4:45 - 5:30", task: "صلاة الفجر + أذكار", dur: "45 د", cat: "ibadah" },
      { id: 2, time: "5:30 - 6:30", task: "ركوب العجلة", dur: "45 د", cat: "highlight" },
      { id: 3, time: "6:30 - 7:00", task: "فطار + قهوة", dur: "30 د", cat: "" },
      { id: 4, time: "7:00 - 7:30", task: "Anki", dur: "30 د", cat: "" },
      { id: 5, time: "7:30 - 8:00", task: "حفظ قرآن", dur: "30 د", cat: "ibadah" },
      { id: 6, time: "8:00 - 8:15", task: "buffer", dur: "15 د", cat: "buffer" },
      { id: 7, time: "8:15 - 11:15", task: "API Design (3 فيديوهات)", dur: "3 س", cat: "highlight" },
      { id: 8, time: "11:15 - 11:30", task: "buffer", dur: "15 د", cat: "buffer" },
      { id: 9, time: "11:30 - 1:00", task: "إنجليزي", dur: "90 د", cat: "highlight" },
      { id: 11, time: "1:00 - 2:00", task: "راحة + ظهر", dur: "1 س", cat: "" },
      { id: 12, time: "2:00 - 2:15", task: "buffer", dur: "15 د", cat: "buffer" },
      { id: 13, time: "2:15 - 4:15", task: "OIC تعمق", dur: "2 س", cat: "" },
      { id: 14, time: "4:15 - 5:15", task: "LH2L", dur: "1 س", cat: "" },
      { id: 15, time: "5:15 - 5:45", task: "راحة", dur: "30 د", cat: "" },
      { id: 16, time: "5:45 - 6:15", task: "مراجعة + تخطيط", dur: "30 د", cat: "" },
      { id: 17, time: "6:15 - 10:00", task: "وقت حر / عائلة / قرآن", dur: "3.45 س", cat: "ibadah" },
      { id: 18, time: "10:00", task: "نوم", dur: "—", cat: "highlight" },
    ]
  },
  {
    id: 3, name: "الثلاثاء", type: "أوفيس",
    tasks: [
      { id: 1, time: "4:45 - 5:30", task: "صلاة الفجر + أذكار", dur: "45 د", cat: "ibadah" },
      { id: 3, time: "5:30 - 6:00", task: "فطار + قهوة", dur: "30 د", cat: "" },
      { id: 4, time: "6:00 - 6:30", task: "Anki", dur: "30 د", cat: "" },
      { id: 5, time: "6:30 - 7:15", task: "إنجليزي", dur: "45 د", cat: "highlight" },
      { id: 8, time: "8:45 - 10:00", task: "تحرك للأوفيس + قرآن سماع", dur: "1.15 س", cat: "ibadah" },
      { id: 9, time: "10:15 - 10:30", task: "buffer", dur: "15 د", cat: "buffer" },
      { id: 10, time: "10:30 - 12:30", task: "API Design (فيديوهين)", dur: "2 س", cat: "" },
      { id: 11, time: "12:30 - 12:45", task: "buffer", dur: "15 د", cat: "buffer" },
      { id: 12, time: "12:45 - 1:00", task: "OIC", dur: "15 د", cat: "" },
      { id: 13, time: "1:00 - 2:00", task: "راحة + ظهر", dur: "1 س", cat: "" },
      { id: 14, time: "2:00 - 3:30", task: "OIC", dur: "1.5 س", cat: "" },
      { id: 15, time: "3:30 - 3:45", task: "buffer", dur: "15 د", cat: "buffer" },
      { id: 16, time: "3:45 - 5:00", task: "تحرك للبيت + قرآن سماع", dur: "1.15 س", cat: "ibadah" },
      { id: 17, time: "5:00 - 5:30", task: "راحة + أكل", dur: "30 د", cat: "" },
      { id: 18, time: "5:30 - 6:30", task: "LH2L", dur: "1 س", cat: "" },
      { id: 19, time: "6:30 - 7:00", task: "مراجعة + تخطيط", dur: "30 د", cat: "" },
      { id: 20, time: "7:00 - 9:00", task: "وقت حر", dur: "2 س", cat: "" },
      { id: 21, time: "9:00 - 10:00", task: "وقت حر / قرآن", dur: "1 س", cat: "ibadah" },
      { id: 22, time: "10:00", task: "نوم", dur: "—", cat: "highlight" },
    ]
  },
  {
    id: 4, name: "الأربعاء", type: "بيت",
    tasks: [
      { id: 1, time: "4:45 - 5:30", task: "صلاة الفجر + أذكار", dur: "45 د", cat: "ibadah" },
      { id: 2, time: "5:30 - 6:30", task: "ركوب العجلة", dur: "45 د", cat: "highlight" },
      { id: 3, time: "6:30 - 7:00", task: "فطار + قهوة", dur: "30 د", cat: "" },
      { id: 4, time: "7:00 - 7:30", task: "Anki", dur: "30 د", cat: "" },
      { id: 5, time: "7:30 - 8:00", task: "حفظ قرآن", dur: "30 د", cat: "ibadah" },
      { id: 6, time: "8:00 - 8:15", task: "buffer", dur: "15 د", cat: "buffer" },
      { id: 7, time: "8:15 - 11:15", task: "API Design (3 فيديوهات)", dur: "3 س", cat: "highlight" },
      { id: 8, time: "11:15 - 11:30", task: "buffer", dur: "15 د", cat: "buffer" },
      { id: 9, time: "11:30 - 1:00", task: "إنجليزي", dur: "90 د", cat: "highlight" },
      { id: 11, time: "1:00 - 2:00", task: "راحة + ظهر", dur: "1 س", cat: "" },
      { id: 12, time: "2:00 - 2:15", task: "buffer", dur: "15 د", cat: "buffer" },
      { id: 13, time: "2:15 - 4:15", task: "OIC تعمق", dur: "2 س", cat: "" },
      { id: 14, time: "4:15 - 5:15", task: "LH2L", dur: "1 س", cat: "" },
      { id: 15, time: "5:15 - 5:45", task: "راحة", dur: "30 د", cat: "" },
      { id: 16, time: "5:45 - 6:15", task: "مراجعة + تخطيط", dur: "30 د", cat: "" },
      { id: 17, time: "6:15 - 7:00", task: "وقت حر", dur: "45 د", cat: "" },
      { id: 18, time: "7:00 - 9:45", task: "تسميع قرآن", dur: "2.45 س", cat: "highlight" },
      { id: 19, time: "9:45 - 10:00", task: "نوم", dur: "15 د", cat: "highlight" },
    ]
  },
  {
    id: 5, name: "الخميس", type: "أوفيس",
    tasks: [
      { id: 1, time: "4:45 - 5:30", task: "صلاة الفجر + أذكار", dur: "45 د", cat: "ibadah" },
      { id: 3, time: "6:30 - 7:00", task: "فطار + قهوة", dur: "30 د", cat: "" },
      { id: 4, time: "7:00 - 7:30", task: "Anki", dur: "30 د", cat: "" },
      { id: 5, time: "7:30 - 8:15", task: "إنجليزي", dur: "45 د", cat: "highlight" },
      { id: 6, time: "8:15 - 8:45", task: "حفظ قرآن", dur: "30 د", cat: "ibadah" },
      { id: 7, time: "8:45 - 9:00", task: "تجهيز + شنطة", dur: "15 د", cat: "" },
      { id: 8, time: "9:00 - 11:30", task: "تحرك للأوفيس + قرآن سماع", dur: "2.5 س", cat: "ibadah" },
      { id: 9, time: "11:30 - 11:45", task: "buffer", dur: "15 د", cat: "buffer" },
      { id: 10, time: "11:45 - 12:45", task: "API Design (فيديو واحد)", dur: "1 س", cat: "" },
      { id: 11, time: "12:45 - 1:00", task: "buffer", dur: "15 د", cat: "buffer" },
      { id: 12, time: "1:00 - 2:00", task: "راحة + ظهر", dur: "1 س", cat: "" },
      { id: 13, time: "2:00 - 3:30", task: "OIC", dur: "1.5 س", cat: "" },
      { id: 14, time: "3:30 - 3:45", task: "buffer", dur: "15 د", cat: "buffer" },
      { id: 15, time: "3:45 - 4:45", task: "تحرك للبيت", dur: "1 س", cat: "" },
      { id: 16, time: "4:45 - 5:15", task: "راحة + أكل", dur: "30 د", cat: "" },
      { id: 17, time: "5:15 - 6:15", task: "LH2L", dur: "1 س", cat: "" },
      { id: 18, time: "6:15 - 7:15", task: "مراجعة الأسبوع كامل", dur: "1 س", cat: "" },
      { id: 19, time: "7:15 - 10:00", task: "وقت حر / عائلة / قرآن", dur: "2.45 س", cat: "ibadah" },
      { id: 20, time: "10:00", task: "نوم", dur: "—", cat: "highlight" },
    ]
  },
];

const DEFAULT_COLORS = {
  header: { bg: "#1a1a2e", text: "#ffffff" },
  highlight: { bg: "#fff0f0", text: "#c0392b" },
  ibadah: { bg: "#f0faf5", text: "#1e6e45" },
  buffer: { bg: "#fffbeb", text: "#92680a" },
};

const CAT_LABELS = { "": "عادي", highlight: "مميّز 🔴", ibadah: "عبادة 🟢", buffer: "Buffer 🟡" };
const GOALS = ["API Design", "OIC", "LH2L", "إنجليزي", "قرآن", "ركوب عجلة"];
let nextId = 500;

// ── Print stylesheet injected into <head> ─────────────────────
function usePrintStyle(colors, days) {
  useEffect(() => {
    const existing = document.getElementById("__print_style__");
    if (existing) existing.remove();

    const buildRow = (t, i) => {
      const c = t.cat && colors[t.cat];
      const bg = c ? c.bg : (i % 2 === 1 ? "#f7f8ff" : "#fff");
      const col = c ? c.text : "#1a1a2e";
      const noCheck = t.cat === "buffer";
      const duration = calculateDuration(t.time);
      return `<tr style="background:${bg};border-bottom:1px solid #e5e5e5;">
        <td style="padding:1.5mm 3mm;text-align:right;font-weight:700;color:${col};">${t.task}</td>
        <td style="padding:1.5mm 3mm;text-align:center;font-size:8pt;color:${col};white-space:nowrap;">${t.time}</td>
        <td style="padding:1.5mm 3mm;text-align:center;font-size:8pt;color:${col};">${duration}</td>
        <td style="padding:1.5mm 3mm;text-align:center;">${noCheck ? "" : '<div style="width:4.5mm;height:4.5mm;border:1.5px solid #777;border-radius:2px;display:inline-block;"></div>'}</td>
        <td style="padding:1.5mm 3mm;">${noCheck ? "" : '<div style="border-bottom:1px solid #ccc;height:4mm;"></div>'}</td>
      </tr>`;
    };

    const pagesHtml = days.map(day => {
      const hc = colors.header;
      const rows = day.tasks.map((t, i) => buildRow(t, i)).join("");
      const goals = GOALS.map(g =>
        `<div style="display:flex;align-items:center;gap:2mm;font-size:9pt;padding:1mm 0;border-bottom:1px solid #f0f0f0;">
          <span style="flex:1;">${g}</span>
          <div style="width:4.5mm;height:4.5mm;border:1.5px solid #777;border-radius:2px;"></div>
        </div>`
      ).join("");
      const circles5 = Array(5).fill(`<div style="width:5.5mm;height:5.5mm;border-radius:50%;border:1.5px solid ${hc.bg};display:inline-block;margin-left:2mm;"></div>`).join("");
      const stars5 = Array(5).fill(`<span style="font-size:13pt;color:#ccc;margin-left:2mm;">★</span>`).join("");

      return `<div class="print-page">
        <div style="display:flex;gap:4mm;border-bottom:2px solid ${hc.bg};padding-bottom:3mm;margin-bottom:2mm;">
          <div style="background:${hc.bg};color:${hc.text};border-radius:6px;padding:3mm 6mm;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:28mm;">
            <span style="font-size:19pt;font-weight:900;line-height:1.1;">${day.name}</span>
            <span style="font-size:8pt;opacity:0.8;margin-top:1mm;">${day.type}</span>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;justify-content:space-around;">
            <div style="display:flex;align-items:center;gap:3mm;"><span style="font-size:9pt;font-weight:700;white-space:nowrap;">التاريخ:</span><div style="flex:1;border-bottom:1.5px solid #bbb;height:5mm;"></div></div>
            <div style="display:flex;align-items:center;gap:3mm;margin-top:2mm;"><span style="font-size:9pt;font-weight:700;white-space:nowrap;">اجمالي النوم:</span><span style="font-size:9pt;font-weight:700;"></span></div>
            <div style="display:flex;align-items:center;gap:3mm;margin-top:2mm;"><span style="font-size:9pt;font-weight:700;white-space:nowrap;">مستوى الطاقة:</span>${circles5}</div>
            <div style="display:flex;align-items:center;gap:3mm;"><span style="font-size:9pt;font-weight:700;white-space:nowrap;">تقييم اليوم:</span>${stars5}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:9pt;">
          <thead><tr style="background:${hc.bg};color:${hc.text};">
            <th style="padding:2mm 3mm;text-align:right;">المهمة</th>
            <th style="padding:2mm 3mm;text-align:center;width:24mm;">الوقت</th>
            <th style="padding:2mm 3mm;text-align:center;width:13mm;">المدة</th>
            <th style="padding:2mm 3mm;text-align:center;width:10mm;">تم</th>
            <th style="padding:2mm 3mm;text-align:center;width:48mm;">لو متمش / ملاحظة</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="display:flex;gap:4mm;flex:1;margin-top:5mm;">
          <div style="flex:1;border:1.5px solid ${hc.bg};border-radius:6px;padding:3mm 4mm;">
            <div style="font-size:9pt;font-weight:700;border-bottom:1px solid #ccc;padding-bottom:1mm;margin-bottom:2mm;">ملاحظات اليوم</div>
            ${Array(5).fill('<div style="border-bottom:1px solid #ddd;height:7mm;margin-bottom:1mm;"></div>').join("")}
          </div>
          <div style="width:50mm;border:1.5px solid ${hc.bg};border-radius:6px;padding:3mm 4mm;">
            <div style="font-size:9pt;font-weight:700;border-bottom:1px solid #ccc;padding-bottom:1mm;margin-bottom:2mm;">ملخص الأهداف</div>
            ${goals}
          </div>
        </div>
      </div>`;
    }).join("");

    const style = document.createElement("style");
    style.id = "__print_style__";
    style.innerHTML = `
      @media print {
        @page { size: A4; margin: 0; }
        body > *:not(#__print_root__) { display: none !important; }
        #__print_root__ {
          display: block !important;
          font-family: Arial, sans-serif;
          direction: rtl;
        }
        .print-page {
          width: 210mm;
          height: 297mm;
          padding: 8mm 10mm;
          box-sizing: border-box;

          page-break-after: always;
          overflow: hidden;
        }
        .print-page:last-child { page-break-after: auto; }
      }
    `;
    document.head.appendChild(style);

    let root = document.getElementById("__print_root__");
    if (!root) {
      root = document.createElement("div");
      root.id = "__print_root__";
      root.style.display = "none";
      document.body.appendChild(root);
    }
    root.innerHTML = pagesHtml;

    return () => {
      style.remove();
      root.remove();
    };
  }, [colors, days]);
}

// ── Task editor row ────────────────────────────────────────────
function TaskRow({ task, onUpdate, onDelete, onMoveUp, onMoveDown, colors }) {
  const c = task.cat && colors[task.cat];
  const duration = calculateDuration(task.time);
  return (
    <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "5px 8px", borderRadius: "6px", background: c ? c.bg : "#f9f9f9", border: "1px solid #e0e0e0", marginBottom: "4px" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <button onClick={onMoveUp} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "9px", color: "#999", lineHeight: 1.2, padding: "0" }}>▲</button>
        <button onClick={onMoveDown} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "9px", color: "#999", lineHeight: 1.2, padding: "0" }}>▼</button>
      </div>
      <input value={task.time} onChange={e => onUpdate({ ...task, time: e.target.value })}
        style={{ width: "88px", fontSize: "11px", padding: "3px 5px", border: "1px solid #ddd", borderRadius: "4px", direction: "ltr", textAlign: "center", fontFamily: "inherit" }} />
      <input value={task.task} onChange={e => onUpdate({ ...task, task: e.target.value })}
        style={{ flex: 1, fontSize: "12px", padding: "3px 6px", border: "1px solid #ddd", borderRadius: "4px", direction: "rtl", fontFamily: "inherit" }} />
      <div style={{ width: "48px", fontSize: "11px", padding: "3px 4px", textAlign: "center", fontFamily: "inherit" }}>
        {duration}
      </div>
      <select value={task.cat} onChange={e => onUpdate({ ...task, cat: e.target.value })}
        style={{ fontSize: "11px", padding: "3px 5px", border: "1px solid #ddd", borderRadius: "4px", background: c ? c.bg : "#fff", color: c ? c.text : "#333", fontFamily: "inherit" }}>
        {Object.entries(CAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <button onClick={onDelete} style={{ background: "#fee2e2", border: "none", cursor: "pointer", borderRadius: "4px", padding: "4px 8px", color: "#dc2626", fontSize: "13px", fontWeight: 700 }}>×</button>
    </div>
  );
}

// ── Color picker panel ─────────────────────────────────────────
function ColorPanel({ colors, setColors }) {
  const labels = { header: "الهيدر", highlight: "مميّز", ibadah: "عبادة", buffer: "Buffer" };
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 700, color: "#888", marginBottom: "8px", letterSpacing: "0.5px" }}>🎨 الألوان</div>
      {Object.entries(colors).map(([key, val]) => (
        <div key={key} style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <div style={{ width: "16px", height: "16px", borderRadius: "3px", background: val.bg, border: `2px solid ${val.text}`, flexShrink: 0 }} />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#444" }}>{labels[key]}</span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "9px", color: "#999", marginBottom: "2px" }}>خلفية</div>
              <input type="color" value={val.bg} onChange={e => setColors(p => ({ ...p, [key]: { ...p[key], bg: e.target.value } }))}
                style={{ width: "100%", height: "28px", cursor: "pointer", border: "1px solid #ddd", borderRadius: "4px", padding: "1px 2px" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "9px", color: "#999", marginBottom: "2px" }}>نص</div>
              <input type="color" value={val.text} onChange={e => setColors(p => ({ ...p, [key]: { ...p[key], text: e.target.value } }))}
                style={{ width: "100%", height: "28px", cursor: "pointer", border: "1px solid #ddd", borderRadius: "4px", padding: "1px 2px" }} />
            </div>
          </div>
        </div>
      ))}
      <button onClick={() => setColors(DEFAULT_COLORS)}
        style={{ width: "100%", padding: "6px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit", fontSize: "12px", color: "#666", marginTop: "4px" }}>
        ↺ إعادة تعيين
      </button>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────
export default function App() {
  const [days, setDays] = useState(INITIAL_DAYS);
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [tab, setTab] = useState("editor");
  const [activeDay, setActiveDay] = useState(0);

  usePrintStyle(colors, days);

  const updateDay = (i, d) => setDays(p => p.map((x, j) => j === i ? d : x));
  const updateTask = (di, id, t) => updateDay(di, { ...days[di], tasks: days[di].tasks.map(x => x.id === id ? t : x) });
  const deleteTask = (di, id) => updateDay(di, { ...days[di], tasks: days[di].tasks.filter(x => x.id !== id) });
  const addTask = (di) => {
    const t = { id: nextId++, time: "", task: "مهمة جديدة", dur: "30 د", cat: "" };
    updateDay(di, { ...days[di], tasks: [...days[di].tasks, t] });
  };
  const moveTask = (di, id, dir) => {
    const tasks = [...days[di].tasks];
    const idx = tasks.findIndex(t => t.id === id);
    const ni = idx + dir;
    if (ni < 0 || ni >= tasks.length) return;
    [tasks[idx], tasks[ni]] = [tasks[ni], tasks[idx]];
    updateDay(di, { ...days[di], tasks });
  };

  const day = days[activeDay];

  // Preview page component
  const PreviewPage = ({ day }) => {
    const hc = colors.header;
    return (
      <div style={{ width: "210mm", background: "#fff", padding: "8mm 10mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif", direction: "rtl", display: "flex", flexDirection: "column", gap: "3mm", minHeight: "297mm" }}>
        <div style={{ display: "flex", gap: "4mm", borderBottom: `2px solid ${hc.bg}`, paddingBottom: "3mm" }}>
          <div style={{ background: hc.bg, color: hc.text, borderRadius: "6px", padding: "3mm 6mm", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: "28mm" }}>
            <span style={{ fontSize: "19pt", fontWeight: 900, lineHeight: 1.1 }}>{day.name}</span>
            <span style={{ fontSize: "8pt", opacity: 0.8, marginTop: "1mm" }}>{day.type}</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}><span style={{ fontSize: "9pt", fontWeight: 700, whiteSpace: "nowrap" }}>التاريخ:</span><div style={{ flex: 1, borderBottom: "1.5px solid #bbb" }} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}><span style={{ fontSize: "9pt", fontWeight: 700, whiteSpace: "nowrap" }}>اجمالي النوم:</span><span style={{ fontSize: "9pt", fontWeight: 700 }}></span></div>
            <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}><span style={{ fontSize: "9pt", fontWeight: 700 }}>مستوى الطاقة:</span>{[...Array(5)].map((_, i) => <div key={i} style={{ width: "5.5mm", height: "5.5mm", borderRadius: "50%", border: `1.5px solid ${hc.bg}`, marginLeft: "2mm" }} />)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}><span style={{ fontSize: "9pt", fontWeight: 700 }}>تقييم اليوم:</span>{[...Array(5)].map((_, i) => <span key={i} style={{ fontSize: "13pt", color: "#ccc", marginLeft: "2mm" }}>★</span>)}</div>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt" }}>
          <thead><tr style={{ background: hc.bg, color: hc.text }}>
            <th style={{ padding: "2mm 3mm", textAlign: "right" }}>المهمة</th>
            <th style={{ padding: "2mm 3mm", textAlign: "center", width: "24mm" }}>الوقت</th>
            <th style={{ padding: "2mm 3mm", textAlign: "center", width: "13mm" }}>المدة</th>
            <th style={{ padding: "2mm 3mm", textAlign: "center", width: "10mm" }}>تم</th>
            <th style={{ padding: "2mm 3mm", textAlign: "center", width: "48mm" }}>لو متمش / ملاحظة</th>
          </tr></thead>
          <tbody>
            {day.tasks.map((t, i) => {
              const c = t.cat && colors[t.cat];
              const bg = c ? c.bg : (i % 2 === 1 ? "#f7f8ff" : "#fff");
              const col = c ? c.text : "#1a1a2e";
              const noCheck = t.cat === "buffer";
              const duration = calculateDuration(t.time);
              return (
                <tr key={t.id} style={{ background: bg, borderBottom: "1px solid #e5e5e5" }}>
                  <td style={{ padding: "1.5mm 3mm", textAlign: "right", fontWeight: 700, color: col }}>{t.task}</td>
                  <td style={{ padding: "1.5mm 3mm", textAlign: "center", fontSize: "8pt", color: col, whiteSpace: "nowrap" }}>{t.time}</td>
                  <td style={{ padding: "1.5mm 3mm", textAlign: "center", fontSize: "8pt", color: col }}>{duration}</td>
                  <td style={{ padding: "1.5mm 3mm", textAlign: "center" }}>{!noCheck && <div style={{ width: "4.5mm", height: "4.5mm", border: "1.5px solid #777", borderRadius: "2px", display: "inline-block" }} />}</td>
                  <td style={{ padding: "1.5mm 3mm" }}>{!noCheck && <div style={{ borderBottom: "1px solid #ccc", height: "4mm" }} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: "4mm", flex: 1, marginTop: "2mm" }}>
          <div style={{ flex: 1, border: `1.5px solid ${hc.bg}`, borderRadius: "6px", padding: "3mm 4mm" }}>
            <div style={{ fontSize: "9pt", fontWeight: 700, borderBottom: "1px solid #ccc", paddingBottom: "1mm", marginBottom: "2mm" }}>ملاحظات اليوم</div>
            {[...Array(5)].map((_, i) => <div key={i} style={{ borderBottom: "1px solid #ddd", height: "7mm", marginBottom: "1mm" }} />)}
          </div>
          <div style={{ width: "50mm", border: `1.5px solid ${hc.bg}`, borderRadius: "6px", padding: "3mm 4mm" }}>
            <div style={{ fontSize: "9pt", fontWeight: 700, borderBottom: "1px solid #ccc", paddingBottom: "1mm", marginBottom: "2mm" }}>ملخص الأهداف</div>
            {GOALS.map(g => (
              <div key={g} style={{ display: "flex", alignItems: "center", gap: "2mm", fontSize: "9pt", padding: "1mm 0", borderBottom: "1px solid #f0f0f0" }}>
                <span style={{ flex: 1 }}>{g}</span>
                <div style={{ width: "4.5mm", height: "4.5mm", border: "1.5px solid #777", borderRadius: "2px" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", direction: "rtl", minHeight: "100vh", background: "#f1f3f8", display: "flex", flexDirection: "column" }}>
      {/* Topbar */}
      <div style={{ background: "#1a1a2e", color: "#fff", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <span style={{ fontSize: "15px", fontWeight: 700 }}>📅 جدول الأسبوع</span>
        <div style={{ display: "flex", gap: "6px" }}>
          {[["editor", "✏️ تعديل"], ["preview", "👁 معاينة"]].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "7px 14px", borderRadius: "6px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", background: tab === t ? "#fff" : "rgba(255,255,255,0.15)", color: tab === t ? "#1a1a2e" : "#fff", fontWeight: tab === t ? 700 : 400 }}>{l}</button>
          ))}
          <button onClick={() => window.print()} style={{ padding: "7px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", background: "#e74c3c", color: "#fff", fontWeight: 700 }}>
            🖨️ طباعة / PDF
          </button>
        </div>
      </div>

      {tab === "editor" && (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Sidebar */}
          <div style={{ width: "210px", background: "#fff", borderLeft: "1px solid #e0e0e0", padding: "12px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#888", marginBottom: "6px", letterSpacing: "0.5px" }}>الأيام</div>
              {days.map((d, i) => (
                <button key={d.id} onClick={() => setActiveDay(i)} style={{ width: "100%", textAlign: "right", padding: "8px 10px", borderRadius: "6px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", marginBottom: "3px", background: i === activeDay ? "#1a1a2e" : "#f5f5f5", color: i === activeDay ? "#fff" : "#333", fontWeight: i === activeDay ? 700 : 400 }}>
                  {d.name} <span style={{ fontSize: "10px", opacity: 0.65 }}>({d.type})</span>
                </button>
              ))}
            </div>
            <div style={{ borderTop: "1px solid #eee", paddingTop: "12px" }}>
              <ColorPanel colors={colors} setColors={setColors} />
            </div>
          </div>

          {/* Tasks */}
          <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ background: "#1a1a2e", color: "#fff", padding: "4px 14px", borderRadius: "6px", fontSize: "16px", fontWeight: 700 }}>{day.name}</div>
              <input value={day.type} onChange={e => updateDay(activeDay, { ...day, type: e.target.value })}
                style={{ fontSize: "13px", padding: "4px 10px", border: "1px solid #ddd", borderRadius: "6px", direction: "rtl", fontFamily: "inherit" }} />

              <span style={{ fontSize: "12px", color: "#999", marginRight: "auto" }}>{day.tasks.length} مهمة</span>
            </div>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "12px", border: "1px solid #e5e5e5" }}>
              <div style={{ display: "flex", gap: "5px", fontSize: "10px", color: "#999", marginBottom: "6px", padding: "0 8px" }}>
                <span style={{ width: "20px" }} />
                <span style={{ width: "88px" }}>الوقت</span>
                <span style={{ flex: 1 }}>المهمة</span>
                <span style={{ width: "48px" }}>المدة</span>
                <span style={{ width: "90px" }}>النوع</span>
                <span style={{ width: "30px" }} />
              </div>
              {day.tasks.map(t => (
                <TaskRow key={t.id} task={t} colors={colors}
                  onUpdate={nt => updateTask(activeDay, t.id, nt)}
                  onDelete={() => deleteTask(activeDay, t.id)}
                  onMoveUp={() => moveTask(activeDay, t.id, -1)}
                  onMoveDown={() => moveTask(activeDay, t.id, 1)} />
              ))}
              <button onClick={() => addTask(activeDay)} style={{ width: "100%", padding: "8px", marginTop: "8px", background: "#f0f9ff", border: "1.5px dashed #3b82f6", borderRadius: "6px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", color: "#3b82f6" }}>
                + إضافة مهمة
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", background: "#e8eaf0", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
          {days.map(d => (
            <div key={d.id} style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.12)", borderRadius: "4px", overflow: "hidden" }}>
              <PreviewPage day={d} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
