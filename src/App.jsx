import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useGistSync } from "./useGistSync";
import GistSettingsModal from "./GistSettingsModal";
import SyncStatusIndicator from "./SyncStatusIndicator";

// == Utilities ==
function parseTimeToMin(str) {
  if (!str) return null;
  const [h, m] = str.trim().split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}
function calculateDurationMin(timeStr) {
  if (!timeStr || timeStr.includes("—")) return 0;
  const parts = timeStr.split("-").map(p => p.trim());
  if (parts.length !== 2) return 0;
  let s = parseTimeToMin(parts[0]), e = parseTimeToMin(parts[1]);
  if (s === null || e === null) return 0;
  if (e <= s) e += 24 * 60;
  return e - s;
}
function calculateDuration(timeStr) {
  if (!timeStr || timeStr.includes("—")) return "—";
  const diffMin = calculateDurationMin(timeStr);
  if (diffMin === 0) return "—";
  const h = Math.floor(diffMin / 60), m = diffMin % 60;
  if (h === 0) return `${m} د`;
  if (m === 0) return `${h} س`;
  return `${h}${(m / 60).toFixed(2).slice(1)} س`;
}
function detectConflicts(tasks) {
  const ranges = tasks.map(t => {
    if (!t.time || t.time.includes("—")) return null;
    const parts = t.time.split("-").map(p => p.trim());
    if (parts.length !== 2) return null;
    let s = parseTimeToMin(parts[0]), e = parseTimeToMin(parts[1]);
    if (s === null || e === null) return null;
    if (e <= s) e += 24 * 60;
    return { id: t.id, s, e };
  }).filter(Boolean);
  const c = new Set();
  for (let i = 0; i < ranges.length; i++)
    for (let j = i + 1; j < ranges.length; j++)
      if (ranges[i].s < ranges[j].e && ranges[j].s < ranges[i].e) { c.add(ranges[i].id); c.add(ranges[j].id); }
  return c;
}
function isValidTimeFormat(str) {
  if (!str) return true;
  const trimmed = str.trim();
  if (!trimmed.includes("-")) return /^\d{1,2}:\d{2}$/.test(trimmed);
  const parts = trimmed.split("-").map(p => p.trim());
  if (parts.length !== 2) return false;
  return parts.every(p => /^\d{1,2}:\d{2}$/.test(p));
}
function sortTasksByStartTime(tasks) {
  return [...tasks].sort((a, b) => {
    const getStartTime = (task) => {
      if (!task.time) return 24 * 60; // Empty times go to end
      const parts = task.time.split("-").map(p => p.trim());
      const startTimeStr = parts[0];
      return parseTimeToMin(startTimeStr) ?? 24 * 60;
    };
    return getStartTime(a) - getStartTime(b);
  });
}
function calcGoalHours(days) {
  const result = {};
  GOALS.forEach(g => { result[g] = 0; });
  days.forEach(day => {
    if (!day.enabled) return;
    day.tasks.forEach(t => {
      const lower = t.task.toLowerCase();
      for (const [goal, keywords] of Object.entries(GOAL_KEYWORDS)) {
        if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
          result[goal] = (result[goal] || 0) + calculateDurationMin(t.time);
        }
      }
    });
  });
  for (const g of GOALS) result[g] = Math.round(result[g] / 60 * 100) / 100;
  return result;
}

// == Constants ==
const LS_KEY = "weekScheduleV2";
const DEFAULT_COLORS = {
  header: { bg: "#1a1a2e", text: "#ffffff" },
  highlight: { bg: "#fff0f0", text: "#c0392b" },
  ibadah: { bg: "#f0faf5", text: "#1e6e45" },
  buffer: { bg: "#fffbeb", text: "#92680a" },
};
const CAT_LABELS = { "": "عادي", highlight: "مميّز 🔴", ibadah: "عبادة 🟢", buffer: "Buffer 🟡" };
const GOALS = ["API Design","OIC","LH2L","إنجليزي","قرآن","ركوب عجلة"];
const GOAL_KEYWORDS = {
  "API Design": ["api design", "api"],
  "OIC": ["oic"],
  "LH2L": ["lh2l"],
  "إنجليزي": ["إنجليزي"],
  "قرآن": ["قرآن", "تسميع", "حفظ قرآن"],
  "ركوب عجلة": ["عجلة", "ركوب"],
};
let nextId = 500;

// Helper function to get week dates starting from Saturday for a given week number
function getWeekDates(weekNumber = null) {
  let startDate;
  
  if (weekNumber === null) {
    // Current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Saturday is day 6, so calculate Saturday of current week
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
    startDate = new Date(today);
    startDate.setDate(today.getDate() + (daysUntilSaturday === 0 ? 0 : daysUntilSaturday - 7));
  } else {
    // Calculate Saturday for the given week number
    // Reference: Week 1 starts on the first Saturday of the year
    const year = new Date().getFullYear();
    const jan1 = new Date(year, 0, 1);
    
    // Find the first Saturday of the year
    const jan1DayOfWeek = jan1.getDay();
    const daysToFirstSaturday = (6 - jan1DayOfWeek + 7) % 7;
    const firstSaturday = new Date(year, 0, 1 + (daysToFirstSaturday === 0 ? 0 : daysToFirstSaturday));
    
    // Calculate the Saturday for the requested week
    startDate = new Date(firstSaturday);
    startDate.setDate(firstSaturday.getDate() + (weekNumber - 1) * 7);
  }
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
  }
  return dates;
}

// Helper function to format date as DD/M/YYYY for display
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${parseInt(month)}/${year}`;
}

// Helper function to get current week number
function getCurrentWeekNumber() {
  const today = new Date();
  const year = today.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const firstSaturday = new Date(year, 0, 1 + ((6 - jan1.getDay() + 7) % 7));
  
  // Find Saturday of current week
  const dayOfWeek = today.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  const currentSaturday = new Date(today);
  currentSaturday.setDate(today.getDate() + (daysUntilSaturday === 0 ? 0 : daysUntilSaturday - 7));
  
  // Calculate week number
  const diffTime = currentSaturday - firstSaturday;
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
  return diffWeeks + 1;
}

const weekDates = getWeekDates();

const INITIAL_DAYS = [
  { id: 7, name: "السبت", type: "إجازة", notes: "", التاريخ: weekDates[0] || "", مستوى_الطاقة: "", تقييم_اليوم: "", عدد_ساعات_النوم: "", enabled: false, tasks: [] },
  { id: 1, name: "الأحد", type: "أوفيس", notes: "", التاريخ: weekDates[1] || "", مستوى_الطاقة: "", تقييم_اليوم: "", عدد_ساعات_النوم: "", enabled: true, tasks: [
    { id: 1, time: "4:45 - 5:30", task: "صلاة الفجر + أذكار", cat: "ibadah", recurring: false },
    { id: 2, time: "5:30 - 6:30", task: "ركوب العجلة", cat: "highlight", recurring: false },
    { id: 3, time: "6:30 - 7:00", task: "فطار + قهوة", cat: "", recurring: false },
    { id: 4, time: "7:00 - 7:30", task: "Anki", cat: "", recurring: false },
    { id: 5, time: "7:30 - 8:15", task: "إنجليزي", cat: "highlight", recurring: false },
    { id: 6, time: "8:15 - 8:45", task: "حفظ قرآن", cat: "ibadah", recurring: false },
    { id: 8, time: "9:00 - 10:00", task: "تحرك للأوفيس + قرآن سماع", cat: "ibadah", recurring: false },
    { id: 9, time: "10:00 - 12:00", task: "API Design (فيديوهين)", cat: "highlight", recurring: false },
    { id: 10, time: "12:00 - 12:15", task: "buffer", cat: "buffer", recurring: false },
    { id: 11, time: "12:15 - 1:00", task: "OIC", cat: "", recurring: false },
    { id: 12, time: "1:00 - 2:00", task: "راحة + ظهر", cat: "", recurring: false },
    { id: 13, time: "2:00 - 3:30", task: "OIC", cat: "", recurring: false },
    { id: 14, time: "3:30 - 3:45", task: "buffer", cat: "buffer", recurring: false },
    { id: 15, time: "3:45 - 6:15", task: "تحرك للبيت", cat: "", recurring: false },
    { id: 16, time: "6:15 - 6:45", task: "راحة + أكل", cat: "", recurring: false },
    { id: 17, time: "6:45 - 7:45", task: "LH2L", cat: "", recurring: false },
    { id: 18, time: "7:45 - 8:15", task: "مراجعة اليوم + تخطيط بكرا", cat: "", recurring: false },
    { id: 19, time: "8:15 - 10:00", task: "وقت حر / عائلة / قرآن", cat: "ibadah", recurring: false },
    { id: 20, time: "10:00", task: "نوم", cat: "highlight", recurring: false },
  ]},
  { id: 2, name: "الاثنين", type: "بيت", notes: "", التاريخ: weekDates[2] || "", مستوى_الطاقة: "", تقييم_اليوم: "", عدد_ساعات_النوم: "", enabled: true, tasks: [
    { id: 1, time: "4:45 - 5:30", task: "صلاة الفجر + أذكار", cat: "ibadah", recurring: false },
    { id: 2, time: "5:30 - 6:30", task: "ركوب العجلة", cat: "highlight", recurring: false },
    { id: 3, time: "6:30 - 7:00", task: "فطار + قهوة", cat: "", recurring: false },
    { id: 4, time: "7:00 - 7:30", task: "Anki", cat: "", recurring: false },
    { id: 5, time: "7:30 - 8:00", task: "حفظ قرآن", cat: "ibadah", recurring: false },
    { id: 6, time: "8:00 - 8:15", task: "buffer", cat: "buffer", recurring: false },
    { id: 7, time: "8:15 - 11:15", task: "API Design (3 فيديوهات)", cat: "highlight", recurring: false },
    { id: 8, time: "11:15 - 11:30", task: "buffer", cat: "buffer", recurring: false },
    { id: 9, time: "11:30 - 1:00", task: "إنجليزي", cat: "highlight", recurring: false },
    { id: 11, time: "1:00 - 2:00", task: "راحة + ظهر", cat: "", recurring: false },
    { id: 12, time: "2:00 - 2:15", task: "buffer", cat: "buffer", recurring: false },
    { id: 13, time: "2:15 - 4:15", task: "OIC تعمق", cat: "", recurring: false },
    { id: 14, time: "4:15 - 5:15", task: "LH2L", cat: "", recurring: false },
    { id: 15, time: "5:15 - 5:45", task: "راحة", cat: "", recurring: false },
    { id: 16, time: "5:45 - 6:15", task: "مراجعة + تخطيط", cat: "", recurring: false },
    { id: 17, time: "6:15 - 10:00", task: "وقت حر / عائلة / قرآن", cat: "ibadah", recurring: false },
    { id: 18, time: "10:00", task: "نوم", cat: "highlight", recurring: false },
  ]},
  { id: 3, name: "الثلاثاء", type: "أوفيس", notes: "", التاريخ: weekDates[3] || "", مستوى_الطاقة: "", تقييم_اليوم: "", عدد_ساعات_النوم: "", enabled: true, tasks: [
    { id: 1, time: "4:45 - 5:30", task: "صلاة الفجر + أذكار", cat: "ibadah", recurring: false },
    { id: 3, time: "5:30 - 6:00", task: "فطار + قهوة", cat: "", recurring: false },
    { id: 4, time: "6:00 - 6:30", task: "Anki", cat: "", recurring: false },
    { id: 5, time: "6:30 - 7:15", task: "إنجليزي", cat: "highlight", recurring: false },
    { id: 8, time: "8:45 - 10:00", task: "تحرك للأوفيس + قرآن سماع", cat: "ibadah", recurring: false },
    { id: 9, time: "10:15 - 10:30", task: "buffer", cat: "buffer", recurring: false },
    { id: 10, time: "10:30 - 12:30", task: "API Design (فيديوهين)", cat: "", recurring: false },
    { id: 11, time: "12:30 - 12:45", task: "buffer", cat: "buffer", recurring: false },
    { id: 12, time: "12:45 - 1:00", task: "OIC", cat: "", recurring: false },
    { id: 13, time: "1:00 - 2:00", task: "راحة + ظهر", cat: "", recurring: false },
    { id: 14, time: "2:00 - 3:30", task: "OIC", cat: "", recurring: false },
    { id: 15, time: "3:30 - 3:45", task: "buffer", cat: "buffer", recurring: false },
    { id: 16, time: "3:45 - 5:00", task: "تحرك للبيت + قرآن سماع", cat: "ibadah", recurring: false },
    { id: 17, time: "5:00 - 5:30", task: "راحة + أكل", cat: "", recurring: false },
    { id: 18, time: "5:30 - 6:30", task: "LH2L", cat: "", recurring: false },
    { id: 19, time: "6:30 - 7:00", task: "مراجعة + تخطيط", cat: "", recurring: false },
    { id: 20, time: "7:00 - 9:00", task: "وقت حر", cat: "", recurring: false },
    { id: 21, time: "9:00 - 10:00", task: "وقت حر / قرآن", cat: "ibadah", recurring: false },
    { id: 22, time: "10:00", task: "نوم", cat: "highlight", recurring: false },
  ]},
  { id: 4, name: "الأربعاء", type: "بيت", notes: "", التاريخ: weekDates[4] || "", مستوى_الطاقة: "", تقييم_اليوم: "", عدد_ساعات_النوم: "", enabled: true, tasks: [
    { id: 1, time: "4:45 - 5:30", task: "صلاة الفجر + أذكار", cat: "ibadah", recurring: false },
    { id: 2, time: "5:30 - 6:30", task: "ركوب العجلة", cat: "highlight", recurring: false },
    { id: 3, time: "6:30 - 7:00", task: "فطار + قهوة", cat: "", recurring: false },
    { id: 4, time: "7:00 - 7:30", task: "Anki", cat: "", recurring: false },
    { id: 5, time: "7:30 - 8:00", task: "حفظ قرآن", cat: "ibadah", recurring: false },
    { id: 6, time: "8:00 - 8:15", task: "buffer", cat: "buffer", recurring: false },
    { id: 7, time: "8:15 - 11:15", task: "API Design (3 فيديوهات)", cat: "highlight", recurring: false },
    { id: 8, time: "11:15 - 11:30", task: "buffer", cat: "buffer", recurring: false },
    { id: 9, time: "11:30 - 1:00", task: "إنجليزي", cat: "highlight", recurring: false },
    { id: 11, time: "1:00 - 2:00", task: "راحة + ظهر", cat: "", recurring: false },
    { id: 12, time: "2:00 - 2:15", task: "buffer", cat: "buffer", recurring: false },
    { id: 13, time: "2:15 - 4:15", task: "OIC تعمق", cat: "", recurring: false },
    { id: 14, time: "4:15 - 5:15", task: "LH2L", cat: "", recurring: false },
    { id: 15, time: "5:15 - 5:45", task: "راحة", cat: "", recurring: false },
    { id: 16, time: "5:45 - 6:15", task: "مراجعة + تخطيط", cat: "", recurring: false },
    { id: 17, time: "6:15 - 7:00", task: "وقت حر", cat: "", recurring: false },
    { id: 18, time: "7:00 - 9:45", task: "تسميع قرآن", cat: "highlight", recurring: false },
    { id: 19, time: "9:45 - 10:00", task: "نوم", cat: "highlight", recurring: false },
  ]},
  { id: 5, name: "الخميس", type: "أوفيس", notes: "", التاريخ: weekDates[5] || "", مستوى_الطاقة: "", تقييم_اليوم: "", عدد_ساعات_النوم: "", enabled: true, tasks: [
    { id: 1, time: "4:45 - 5:30", task: "صلاة الفجر + أذكار", cat: "ibadah", recurring: false },
    { id: 3, time: "6:30 - 7:00", task: "فطار + قهوة", cat: "", recurring: false },
    { id: 4, time: "7:00 - 7:30", task: "Anki", cat: "", recurring: false },
    { id: 5, time: "7:30 - 8:15", task: "إنجليزي", cat: "highlight", recurring: false },
    { id: 6, time: "8:15 - 8:45", task: "حفظ قرآن", cat: "ibadah", recurring: false },
    { id: 7, time: "8:45 - 9:00", task: "تجهيز + شنطة", cat: "", recurring: false },
    { id: 8, time: "9:00 - 11:30", task: "تحرك للأوفيس + قرآن سماع", cat: "ibadah", recurring: false },
    { id: 9, time: "11:30 - 11:45", task: "buffer", cat: "buffer", recurring: false },
    { id: 10, time: "11:45 - 12:45", task: "API Design (فيديو واحد)", cat: "", recurring: false },
    { id: 11, time: "12:45 - 1:00", task: "buffer", cat: "buffer", recurring: false },
    { id: 12, time: "1:00 - 2:00", task: "راحة + ظهر", cat: "", recurring: false },
    { id: 13, time: "2:00 - 3:30", task: "OIC", cat: "", recurring: false },
    { id: 14, time: "3:30 - 3:45", task: "buffer", cat: "buffer", recurring: false },
    { id: 15, time: "3:45 - 4:45", task: "تحرك للبيت", cat: "", recurring: false },
    { id: 16, time: "4:45 - 5:15", task: "راحة + أكل", cat: "", recurring: false },
    { id: 17, time: "5:15 - 6:15", task: "LH2L", cat: "", recurring: false },
    { id: 18, time: "6:15 - 7:15", task: "مراجعة الأسبوع كامل", cat: "", recurring: false },
    { id: 19, time: "7:15 - 10:00", task: "وقت حر / عائلة / قرآن", cat: "ibadah", recurring: false },
    { id: 20, time: "10:00", task: "نوم", cat: "highlight", recurring: false },
  ]},
  { id: 6, name: "الجمعة", type: "إجازة", notes: "", التاريخ: weekDates[6] || "", مستوى_الطاقة: "", تقييم_اليوم: "", عدد_ساعات_النوم: "", enabled: false, tasks: [] },
];
// == Undo/Redo hook ==
function useUndoRedo(initial, max) {
  max = max || 30;
  const [state, setState] = useState(initial);
  const hist = useRef([initial]);
  const ptr = useRef(0);
  const set = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const h = hist.current.slice(0, ptr.current + 1);
      h.push(next);
      if (h.length > max) h.shift(); else ptr.current = h.length - 1;
      hist.current = h;
      return next;
    });
  }, [max]);
  const undo = useCallback(() => { if (ptr.current > 0) { ptr.current--; setState(hist.current[ptr.current]); } }, []);
  const redo = useCallback(() => { if (ptr.current < hist.current.length - 1) { ptr.current++; setState(hist.current[ptr.current]); } }, []);
  return [state, set, { undo, redo, canUndo: ptr.current > 0, canRedo: ptr.current < hist.current.length - 1 }];
}
// == Print stylesheet hook ==
function usePrintStyle(colors, days) {
  useEffect(() => {
    const existing = document.getElementById("__print_style__");
    if (existing) existing.remove();
    const enabledDays = days.filter(d => d.enabled);
    const buildRow = (t, i) => {
      const c = t.cat && colors[t.cat];
      const bg = c ? c.bg : (i % 2 === 1 ? "#f7f8ff" : "#fff");
      const col = c ? c.text : "#1a1a2e";
      const noCheck = t.cat === "buffer";
      const duration = calculateDuration(t.time);
      return '<tr style="background:' + bg + ';border-bottom:1px solid #e5e5e5;">'
        + '<td style="padding:1.5mm 3mm;text-align:right;font-weight:700;color:' + col + ';">' + t.task + '</td>'
        + '<td style="padding:1.5mm 3mm;text-align:center;font-size:8pt;color:' + col + ';white-space:nowrap;">' + t.time + '</td>'
        + '<td style="padding:1.5mm 3mm;text-align:center;font-size:8pt;color:' + col + ';">' + duration + '</td>'
        + '<td style="padding:1.5mm 3mm;text-align:center;">' + (noCheck ? "" : '<div style="width:4.5mm;height:4.5mm;border:1.5px solid #777;border-radius:2px;display:inline-block;"></div>') + '</td>'
        + '<td style="padding:1.5mm 3mm;font-size:8pt;color:' + col + ';">' + (t.notes || "") + '</td>'
        + '</tr>';
    };
    const pagesHtml = enabledDays.map(day => {
      const hc = colors.header;
      const rows = day.tasks.map((t, i) => buildRow(t, i)).join("");
      const goals = GOALS.map(g =>
        '<div style="display:flex;align-items:center;gap:2mm;font-size:9pt;padding:1mm 0;border-bottom:1px solid #f0f0f0;">'
        + '<span style="flex:1;">' + g + '</span>'
        + '<div style="width:4.5mm;height:4.5mm;border:1.5px solid #777;border-radius:2px;"></div></div>'
      ).join("");
      const circles5 = Array(5).fill('<div style="width:5.5mm;height:5.5mm;border-radius:50%;border:1.5px solid ' + hc.bg + ';display:inline-block;margin-left:2mm;"></div>').join("");
      const stars5 = Array(5).fill('<span style="font-size:13pt;color:#ccc;margin-left:2mm;">&#9733;</span>').join("");
      const energyLevel = day.مستوى_الطاقة ? parseInt(day.مستوى_الطاقة) : 0;
      const dayRating = day.تقييم_اليوم ? parseInt(day.تقييم_اليوم) : 0;
      const energyEmojis = ["", "😴", "😐", "😊", "😄", "🔥"];
      const ratingEmojis = ["", "😞", "😕", "😐", "😊", "🌟"];
      const energyDisplay = energyLevel ? Array(5).fill('<span style="font-size:13pt;margin-left:2mm;">').map((s, i) => s + (i < energyLevel ? '●' : '○') + '</span>').join("") : circles5;
      const ratingDisplay = dayRating ? Array(5).fill('<span style="font-size:13pt;margin-left:2mm;">').map((s, i) => s + (i < dayRating ? '★' : '☆') + '</span>').join("") : stars5;
      return '<div class="print-page">'
        + '<div style="display:flex;gap:4mm;border-bottom:2px solid ' + hc.bg + ';padding-bottom:3mm;margin-bottom:2mm;">'
        + '<div style="background:' + hc.bg + ';color:' + hc.text + ';border-radius:6px;padding:3mm 6mm;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:28mm;">'
        + '<span style="font-size:19pt;font-weight:900;line-height:1.1;">' + day.name + '</span>'
        + '<span style="font-size:8pt;opacity:0.8;margin-top:1mm;">' + day.type + '</span></div>'
        + '<div style="flex:1;display:flex;flex-direction:column;justify-content:space-around;">'
        + '<div style="display:flex;align-items:center;gap:3mm;"><span style="font-size:9pt;font-weight:700;white-space:nowrap;">التاريخ:</span><span style="flex:1;border-bottom:1.5px solid #bbb;height:5mm;font-size:8pt;padding:1mm 2mm;">' + (day.التاريخ || '') + '</span></div>'
        + '<div style="display:flex;align-items:center;gap:3mm;margin-top:2mm;"><span style="font-size:9pt;font-weight:700;white-space:nowrap;">مستوى الطاقة:</span>' + energyDisplay + (energyEmojis[energyLevel] ? '<span style="margin-right:3mm;">' + energyEmojis[energyLevel] + '</span>' : '') + '</div>'
        + '<div style="display:flex;align-items:center;gap:3mm;"><span style="font-size:9pt;font-weight:700;white-space:nowrap;">تقييم اليوم:</span>' + ratingDisplay + (ratingEmojis[dayRating] ? '<span style="margin-right:3mm;">' + ratingEmojis[dayRating] + '</span>' : '') + '</div>'
        + '<div style="display:flex;align-items:center;gap:3mm;"><span style="font-size:9pt;font-weight:700;white-space:nowrap;">ساعات النوم:</span><span style="flex:1;border-bottom:1.5px solid #bbb;height:5mm;font-size:8pt;padding:1mm 2mm;">' + (day.عدد_ساعات_النوم || '') + '</span></div></div></div>'
        + '<table style="width:100%;border-collapse:collapse;font-size:9pt;"><thead><tr style="background:' + hc.bg + ';color:' + hc.text + ';">'
        + '<th style="padding:2mm 3mm;text-align:right;">المهمة</th>'
        + '<th style="padding:2mm 3mm;text-align:center;width:24mm;">الوقت</th>'
        + '<th style="padding:2mm 3mm;text-align:center;width:13mm;">المدة</th>'
        + '<th style="padding:2mm 3mm;text-align:center;width:10mm;">تم</th>'
        + '<th style="padding:2mm 3mm;text-align:center;width:48mm;">لو متمش / ملاحظة</th>'
        + '</tr></thead><tbody>' + rows + '</tbody></table>'
        + '<div style="display:flex;gap:4mm;flex:1;margin-top:3mm;">'
        + '<div style="flex:1;border:1.5px solid ' + hc.bg + ';border-radius:6px;padding:3mm 4mm;">'
        + '<div style="font-size:9pt;font-weight:700;border-bottom:1px solid #ccc;padding-bottom:1mm;margin-bottom:2mm;">ملاحظات اليوم</div>'
        + Array(5).fill('<div style="border-bottom:1px solid #ddd;height:7mm;margin-bottom:1mm;"></div>').join("")
        + '</div>'
        + '<div style="width:50mm;border:1.5px solid ' + hc.bg + ';border-radius:6px;padding:3mm 4mm;">'
        + '<div style="font-size:9pt;font-weight:700;border-bottom:1px solid #ccc;padding-bottom:1mm;margin-bottom:2mm;">ملخص الأهداف</div>'
        + goals + '</div></div></div>';
    }).join("");
    const style = document.createElement("style");
    style.id = "__print_style__";
    style.innerHTML = '@media print { @page { size: A4; margin: 0; } body > *:not(#__print_root__) { display: none !important; } #__print_root__ { display: block !important; font-family: Arial, sans-serif; direction: rtl; } .print-page { width: 210mm; height: 297mm; padding: 8mm 10mm; box-sizing: border-box; page-break-after: always; overflow: hidden; } .print-page:last-child { page-break-after: auto; } }';
    document.head.appendChild(style);
    let root = document.getElementById("__print_root__");
    if (!root) { root = document.createElement("div"); root.id = "__print_root__"; root.style.display = "none"; document.body.appendChild(root); }
    root.innerHTML = pagesHtml;
    return () => { style.remove(); root.remove(); };
  }, [colors, days]);
}
// == TimePickerField component (enhanced HTML time input) ==
function TimePickerField({ value, onChange, label }) {
  const [time, setTime] = useState(value || "09:00");

  useEffect(() => {
    if (value && value.includes(":")) {
      setTime(value);
    }
  }, [value]);

  const handleChange = (e) => {
    const newTime = e.target.value;
    if (newTime) {
      setTime(newTime);
      onChange(newTime);
    }
  };

  return (
    <input 
      type="time"
      value={time}
      onChange={handleChange}
      title={label}
      style={{
        padding: "4px 6px",
        border: "1px solid #ddd",
        borderRadius: 4,
        background: "#fafafa",
        cursor: "pointer",
        fontSize: "11px",
        fontFamily: "inherit",
        color: "#1a1a2e",
        textAlign: "center",
        width: "90px"
      }}
    />
  );
}


// == TimePicker component ==
function TimePicker({ value, onChange, textColor }) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState(0); // 0: start hour, 1: start min, 2: end hour, 3: end min
  
  const parseTime = (str) => {
    if (!str) return { startH: 9, startM: 0, endH: 10, endM: 0 };
    const parts = str.split(" - ");
    if (parts.length === 1) {
      const [h, m] = parts[0].split(":").map(Number);
      return { startH: h || 9, startM: m || 0, endH: 10, endM: 0 };
    }
    const [sh, sm] = parts[0].split(":").map(Number);
    const [eh, em] = parts[1].split(":").map(Number);
    return { startH: sh || 9, startM: sm || 0, endH: eh || 10, endM: em || 0 };
  };
  
  const [time, setTime] = useState(parseTime(value));
  
  const updateTime = (patch) => {
    const newTime = { ...time, ...patch };
    setTime(newTime);
    const start = `${String(newTime.startH).padStart(2, "0")}:${String(newTime.startM).padStart(2, "0")}`;
    const end = `${String(newTime.endH).padStart(2, "0")}:${String(newTime.endM).padStart(2, "0")}`;
    onChange(start + " - " + end);
  };
  
  const increment = (field, max) => {
    const val = time[field];
    updateTime({ [field]: (val + 1) % (max + 1) });
  };
  
  const decrement = (field, max) => {
    const val = time[field];
    updateTime({ [field]: val === 0 ? max : val - 1 });
  };
  
  const timeValid = isValidTimeFormat(value);
  const displayTime = value || "HH:MM - HH:MM";
  
  return (
    <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        style={{
          width: "100%",
          border: timeValid ? "none" : "1.5px solid #e74c3c",
          borderRadius: 4,
          background: "transparent",
          color: textColor,
          textAlign: "center",
          padding: "2px 6px",
          fontFamily: "inherit",
          fontSize: "inherit",
          cursor: "pointer",
          position: "relative"
        }}
      >
        {displayTime} 🕐
      </button>
      
      {showPicker && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          marginTop: 4,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 1000,
          minWidth: 200
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, textAlign: "right" }}>اختر الوقت</div>
          
          {/* Column 1: Start Time */}
          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #eee" }}>
            <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 8, textAlign: "center" }}>البداية</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "flex-start" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <button type="button" onClick={() => increment("startH", 23)} style={{ border: "1px solid #ddd", width: 24, height: 24, borderRadius: 4, cursor: "pointer", background: "#f9f9f9" }}>▲</button>
                  <div style={{ fontSize: 16, fontWeight: 700, width: 30, textAlign: "center" }}>{String(time.startH).padStart(2, "0")}</div>
                  <button type="button" onClick={() => decrement("startH", 23)} style={{ border: "1px solid #ddd", width: 24, height: 24, borderRadius: 4, cursor: "pointer", background: "#f9f9f9" }}>▼</button>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 8 }}>:</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <button type="button" onClick={() => increment("startM", 59)} style={{ border: "1px solid #ddd", width: 24, height: 24, borderRadius: 4, cursor: "pointer", background: "#f9f9f9" }}>▲</button>
                  <div style={{ fontSize: 16, fontWeight: 700, width: 30, textAlign: "center" }}>{String(time.startM).padStart(2, "0")}</div>
                  <button type="button" onClick={() => decrement("startM", 59)} style={{ border: "1px solid #ddd", width: 24, height: 24, borderRadius: 4, cursor: "pointer", background: "#f9f9f9" }}>▼</button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Column 2: End Time */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 8, textAlign: "center" }}>النهاية</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "flex-start" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <button type="button" onClick={() => increment("endH", 23)} style={{ border: "1px solid #ddd", width: 24, height: 24, borderRadius: 4, cursor: "pointer", background: "#f9f9f9" }}>▲</button>
                  <div style={{ fontSize: 16, fontWeight: 700, width: 30, textAlign: "center" }}>{String(time.endH).padStart(2, "0")}</div>
                  <button type="button" onClick={() => decrement("endH", 23)} style={{ border: "1px solid #ddd", width: 24, height: 24, borderRadius: 4, cursor: "pointer", background: "#f9f9f9" }}>▼</button>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 8 }}>:</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <button type="button" onClick={() => increment("endM", 59)} style={{ border: "1px solid #ddd", width: 24, height: 24, borderRadius: 4, cursor: "pointer", background: "#f9f9f9" }}>▲</button>
                  <div style={{ fontSize: 16, fontWeight: 700, width: 30, textAlign: "center" }}>{String(time.endM).padStart(2, "0")}</div>
                  <button type="button" onClick={() => decrement("endM", 59)} style={{ border: "1px solid #ddd", width: 24, height: 24, borderRadius: 4, cursor: "pointer", background: "#f9f9f9" }}>▼</button>
                </div>
              </div>
            </div>
          </div>
          
          <button type="button" onClick={() => setShowPicker(false)} style={{ width: "100%", background: "#4CAF50", color: "#fff", border: "none", borderRadius: 4, padding: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>تم ✓</button>
        </div>
      )}
    </div>
  );
}

// == TaskRow component ==
function TaskRow({ t, idx, colors, conflict, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast, onDragStart, onDragOver, onDrop, isDragging }) {
  const catColor = t.cat && colors[t.cat];
  const bg = catColor ? catColor.bg : (idx % 2 === 1 ? "#f7f8ff" : "#fff");
  const textColor = catColor ? catColor.text : "#1a1a2e";
  const duration = calculateDuration(t.time);
  const timeValid = isValidTimeFormat(t.time);
  
  // Parse time to extract start and end
  const parseTimeForDisplay = (timeStr) => {
    if (!timeStr) return { start: "", end: "" };
    const parts = timeStr.split(" - ");
    return { start: parts[0] || "", end: parts[1] || "" };
  };
  
  const { start, end } = parseTimeForDisplay(t.time);
  
  const updateTime = (newStart, newEnd) => {
    // Always use the current values if the new one is being edited
    const finalStart = newStart !== undefined ? newStart : start;
    const finalEnd = newEnd !== undefined ? newEnd : end;
    
    if (finalStart && finalEnd) {
      onUpdate({ time: `${finalStart} - ${finalEnd}` });
    } else if (finalStart) {
      onUpdate({ time: finalStart });
    }
  };
  
  return (
    <tr 
      draggable
      onDragStart={() => onDragStart(t.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(t.id); }}
      onDrop={() => onDrop(t.id)}
      style={{ 
        background: isDragging ? "rgba(100, 150, 255, 0.2)" : bg,
        borderBottom: "1px solid #e5e5e5",
        transition: "background 0.2s, opacity 0.2s",
        opacity: isDragging ? 0.6 : 1,
        cursor: "move"
      }}>
      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: textColor, position: "relative" }}>
        {conflict && <span title="تعارض في الوقت" style={{ color: "#e74c3c", marginLeft: 4, fontSize: 14 }}>&#9888;</span>}
        <input value={t.task} onChange={e => onUpdate({ task: e.target.value })}
          style={{ border: "none", background: "transparent", color: textColor, fontWeight: 700, width: "100%", fontFamily: "inherit", fontSize: "inherit", outline: "none" }} />
      </td>
      <td style={{ padding: "6px 10px", textAlign: "center", fontSize: 13, color: textColor, whiteSpace: "nowrap" }}>
        <TimePickerField value={start} onChange={v => updateTime(v, end)} label="البداية" />
      </td>
      <td style={{ padding: "6px 10px", textAlign: "center", fontSize: 13, color: textColor, whiteSpace: "nowrap" }}>
        <TimePickerField value={end} onChange={v => updateTime(start, v)} label="النهاية" />
      </td>
      <td style={{ padding: "6px 10px", textAlign: "center", fontSize: 12, color: textColor }}>{duration}</td>
      <td style={{ padding: "6px 10px", textAlign: "center" }}>
        <select value={t.cat} onChange={e => onUpdate({ cat: e.target.value })}
          style={{ border: "1px solid #ddd", borderRadius: 4, padding: "2px 4px", fontSize: 12, background: "#fff", cursor: "pointer" }}>
          {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </td>
      <td style={{ padding: "6px 10px", textAlign: "right", fontSize: 12, color: textColor }}>
        <input value={t.notes || ""} onChange={e => onUpdate({ notes: e.target.value })}
          placeholder="لو متمش / ملاحظة..."
          style={{ border: "1px solid #ddd", background: "transparent", color: textColor, width: "100%", fontFamily: "inherit", fontSize: "inherit", outline: "none", borderRadius: 4, padding: "4px 6px", boxSizing: "border-box" }} />
      </td>
      <td style={{ padding: "6px 4px", textAlign: "center", whiteSpace: "nowrap" }}>
        <button onClick={onMoveUp} disabled={isFirst} title="لأعلى" style={{ border: "none", background: "none", cursor: isFirst ? "default" : "pointer", opacity: isFirst ? 0.3 : 1, fontSize: 14 }}>&#9650;</button>
        <button onClick={onMoveDown} disabled={isLast} title="لأسفل" style={{ border: "none", background: "none", cursor: isLast ? "default" : "pointer", opacity: isLast ? 0.3 : 1, fontSize: 14 }}>&#9660;</button>
        <button onClick={onDelete} title="حذف" style={{ border: "none", background: "none", cursor: "pointer", color: "#e74c3c", fontSize: 14, marginRight: 4 }}>&#10005;</button>
      </td>
    </tr>
  );
}
// == DayCard component ==
function DayCard({ day, colors, onUpdate, onCopyDay }) {
  const [collapsed, setCollapsed] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const conflicts = useMemo(() => detectConflicts(day.tasks), [day.tasks]);
  const totalMin = useMemo(() => day.tasks.reduce((s, t) => s + calculateDurationMin(t.time), 0), [day.tasks]);
  const totalH = Math.floor(totalMin / 60);
  const totalM = totalMin % 60;
  const hc = colors.header;
  const updateTask = (taskId, patch) => {
    onUpdate({ ...day, tasks: day.tasks.map(t => t.id === taskId ? { ...t, ...patch } : t) });
  };
  const deleteTask = (taskId) => {
    onUpdate({ ...day, tasks: day.tasks.filter(t => t.id !== taskId) });
  };
  const moveTask = (taskId, dir) => {
    const idx = day.tasks.findIndex(t => t.id === taskId);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === day.tasks.length - 1)) return;
    const arr = [...day.tasks];
    [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
    onUpdate({ ...day, tasks: arr });
  };
  const handleDragStart = (taskId) => {
    setDraggedId(taskId);
  };
  const handleDragOver = (taskId) => {
    if (taskId !== draggedId) {
      setDragOverId(taskId);
    }
  };
  const handleDrop = (taskId) => {
    if (draggedId && draggedId !== taskId) {
      const fromIdx = day.tasks.findIndex(t => t.id === draggedId);
      const toIdx = day.tasks.findIndex(t => t.id === taskId);
      const arr = [...day.tasks];
      [arr[fromIdx], arr[toIdx]] = [arr[toIdx], arr[fromIdx]];
      onUpdate({ ...day, tasks: arr });
    }
    setDraggedId(null);
    setDragOverId(null);
  };
  const addTask = () => {
    onUpdate({ ...day, tasks: [...day.tasks, { id: ++nextId, time: "", task: "", cat: "", recurring: false, notes: "" }] });
  };
  return (
    <div style={{ marginBottom: 24, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "1px solid #e5e5e5", opacity: day.enabled ? 1 : 0.5, transition: "opacity 0.3s" }}>
      <div style={{ background: hc.bg, color: hc.text, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setCollapsed(!collapsed)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 900 }}>{day.name}</span>
          <span style={{ fontSize: 12, opacity: 0.8 }}>{day.type}</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{totalH > 0 ? totalH + " س " : ""}{totalM > 0 ? totalM + " د" : ""}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={day.enabled} onChange={e => onUpdate({ ...day, enabled: e.target.checked })} />
            مفعّل
          </label>
          <button onClick={e => { e.stopPropagation(); onUpdate({ ...day, tasks: sortTasksByStartTime(day.tasks) }); }} title="ترتيب المهام حسب الوقت" style={{ border: "none", background: "rgba(255,255,255,0.2)", color: hc.text, borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 12 }}>⏱️ ترتيب</button>
          <button onClick={e => { e.stopPropagation(); onCopyDay(day); }} title="نسخ جدول اليوم" style={{ border: "none", background: "rgba(255,255,255,0.2)", color: hc.text, borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 12 }}>نسخ</button>
          <span style={{ fontSize: 18, transform: collapsed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>&#9660;</span>
        </div>
      </div>
      {!collapsed && day.enabled && (
        <div style={{ padding: "0 0 12px 0", animation: "slideDown 0.3s ease-out" }}>
          <div style={{ padding: "8px 16px" }}>
            <textarea value={day.notes || ""} onChange={e => onUpdate({ ...day, notes: e.target.value })}
              placeholder="ملاحظات اليوم..."
              style={{ width: "100%", minHeight: 40, border: "1px solid #e0e0e0", borderRadius: 6, padding: "6px 10px", fontFamily: "inherit", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
          </div>
          <div style={{ padding: "8px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, textAlign: "right" }}>التاريخ:</label>
              <input type="date" value={day.التاريخ || ""} onChange={e => onUpdate({ ...day, التاريخ: e.target.value })}
                style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: 6, padding: "6px 10px", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, textAlign: "right" }}>مستوى الطاقة:</label>
              <select value={day.مستوى_الطاقة || ""} onChange={e => onUpdate({ ...day, مستوى_الطاقة: e.target.value })}
                style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: 6, padding: "6px 10px", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }}>
                <option value="">--</option>
                <option value="1">منخفضة جداً 😴</option>
                <option value="2">منخفضة 😐</option>
                <option value="3">متوسطة 😊</option>
                <option value="4">عالية 😄</option>
                <option value="5">عالية جداً 🔥</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, textAlign: "right" }}>تقييم اليوم:</label>
              <select value={day.تقييم_اليوم || ""} onChange={e => onUpdate({ ...day, تقييم_اليوم: e.target.value })}
                style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: 6, padding: "6px 10px", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }}>
                <option value="">--</option>
                <option value="1">سيء جداً 😞</option>
                <option value="2">سيء 😕</option>
                <option value="3">جيد 😐</option>
                <option value="4">جيد جداً 😊</option>
                <option value="5">ممتاز 🌟</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, textAlign: "right" }}>عدد ساعات النوم:</label>
              <input type="text" value={day.عدد_ساعات_النوم || ""} onChange={e => onUpdate({ ...day, عدد_ساعات_النوم: e.target.value })}
                placeholder="مثال: 7 ساعات"
                style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: 6, padding: "6px 10px", fontFamily: "inherit", fontSize: 13, boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: hc.bg, color: hc.text }}>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>المهمة</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 70 }}>البداية</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 70 }}>النهاية</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 60 }}>المدة</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 90 }}>التصنيف</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", width: 150 }}>لو متمش / ملاحظة</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 80 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {day.tasks.map((t, idx) => (
                  <TaskRow key={t.id} t={t} idx={idx} colors={colors} conflict={conflicts.has(t.id)}
                    onUpdate={patch => updateTask(t.id, patch)}
                    onDelete={() => deleteTask(t.id)}
                    onMoveUp={() => moveTask(t.id, -1)}
                    onMoveDown={() => moveTask(t.id, 1)}
                    isFirst={idx === 0} 
                    isLast={idx === day.tasks.length - 1}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    isDragging={draggedId === t.id} />
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "8px 16px", textAlign: "center" }}>
            <button onClick={addTask} style={{ background: hc.bg, color: hc.text, border: "none", borderRadius: 6, padding: "6px 20px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ إضافة مهمة</button>
          </div>
        </div>
      )}
    </div>
  );
}
/*MARKER_GOAL_PANEL*/

// == GoalsPanel Component ==
function GoalsPanel({ currentWeekGoals, goalHours, onUpdateGoal, onDeleteGoal, colors }) {
  const hc = colors.header;
  const DEFAULT_TARGET = 20;
  const colors_legend = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];
  
  const goalList = Object.entries(currentWeekGoals).sort((a, b) => {
    // Show predefined goals first
    if (a[1].type === 'predefined' && b[1].type !== 'predefined') return -1;
    if (a[1].type !== 'predefined' && b[1].type === 'predefined') return 1;
    return a[0].localeCompare(b[0]);
  });
  
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
      {goalList.map(([goal, goalData], idx) => {
        const target = goalData.target || DEFAULT_TARGET;
        const actual = goalHours[goal] || 0;
        const percentage = target > 0 ? (actual / target) * 100 : 0;
        const isOnTrack = percentage >= 80;
        const isWarning = percentage >= 50 && percentage < 80;
        const statusColor = isOnTrack ? "#27ae60" : isWarning ? "#f39c12" : "#e74c3c";
        const statusLabel = isOnTrack ? "✅ على المسار" : isWarning ? "⚠️ تحذير" : "❌ متأخر";
        const colorIdx = idx % colors_legend.length;
        const isCustom = goalData.type === 'custom';
        
        return (
          <div key={goal} style={{
            background: "#fff",
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            border: `3px solid ${statusColor}`,
            transition: "all 0.3s ease",
            transform: isOnTrack ? "scale(1.02)" : "scale(1)",
            position: "relative"
          }}>
            {isCustom && (
              <button
                onClick={() => onDeleteGoal(goal)}
                title="حذف الهدف"
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  background: "rgba(231, 76, 60, 0.2)",
                  color: "#e74c3c",
                  border: "none",
                  borderRadius: "50%",
                  width: 24,
                  height: 24,
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => { e.target.style.background = "#e74c3c"; e.target.style.color = "#fff"; }}
                onMouseOut={(e) => { e.target.style.background = "rgba(231, 76, 60, 0.2)"; e.target.style.color = "#e74c3c"; }}
              >
                ✕
              </button>
            )}
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingRight: isCustom ? 24 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: colors_legend[colorIdx],
                  boxShadow: "0 0 8px rgba(0,0,0,0.2)"
                }}></div>
                <span style={{ fontSize: 16, fontWeight: 700, color: colors_legend[colorIdx] }}>{goal}</span>
                {isCustom && <span style={{ fontSize: 10, opacity: 0.5, color: "#999" }}>مخصص</span>}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: statusColor, padding: "4px 8px", background: statusColor + "20", borderRadius: 4, whiteSpace: "nowrap" }}>{statusLabel}</span>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <div style={{
                height: 28,
                background: "#f0f0f0",
                borderRadius: 8,
                overflow: "hidden",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)"
              }}>
                <div style={{
                  height: "100%",
                  width: Math.min(percentage, 100) + "%",
                  background: `linear-gradient(90deg, ${statusColor}, ${statusColor}dd)`,
                  transition: "width 0.4s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700
                }}>
                  {percentage > 10 && `${Math.round(percentage)}%`}
                </div>
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666" }}>
                <span>{actual.toFixed(1)}h من {target}h</span>
                <span style={{ color: statusColor, fontWeight: 700 }}>{(target - actual).toFixed(1)}h متبقية</span>
              </div>
            </div>
            
            <div style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              padding: 8,
              background: "#f9f9f9",
              borderRadius: 6,
              marginBottom: 12
            }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#666" }}>الهدف:</label>
              <input
                type="number"
                min="0"
                max="168"
                step="1"
                value={target}
                onChange={(e) => onUpdateGoal(goal, parseFloat(e.target.value) || DEFAULT_TARGET)}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  border: `1px solid ${statusColor}`,
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "center"
                }}
              />
              <span style={{ fontSize: 12, color: "#666" }}>ساعة</span>
            </div>
            
            <div style={{
              padding: 8,
              background: colors_legend[colorIdx] + "15",
              borderRadius: 6,
              fontSize: 11,
              color: "#333",
              textAlign: "right"
            }}>
              <div>📊 متوسط يومي: {(actual / 7).toFixed(1)}h</div>
              <div style={{ marginTop: 4 }}>⏱️ التقدم: {percentage > 0 ? percentage.toFixed(0) : 0}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// == Main App Component ==
export default function App() {
  const [days, setDays, undoRedo] = useUndoRedo(INITIAL_DAYS, 30);
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [tab, setTab] = useState("editor");
  const [selectedDay, setSelectedDay] = useState(0);
  const [printZoom, setPrintZoom] = useState(100);
  const [lastSaved, setLastSaved] = useState(new Date());
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('darkMode') === 'true';
    } catch {
      return false;
    }
  });
  const [showGistSettings, setShowGistSettings] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekNumber());
  const [weeklyGoals, setWeeklyGoals] = useState(() => {
    try {
      const saved = localStorage.getItem('weeklyGoals');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState(20);
  const saveTimeoutRef = useRef(null);

  // Initialize GitHub Gist sync
  const {
    syncStatus,
    lastSyncTime,
    syncError,
    pullFromGist,
    pushToGist,
    createNewGist,
    hasCredentials,
  } = useGistSync(
    days,
    colors,
    (mergedData) => {
      if (mergedData) {
        setDays(mergedData.days);
        setColors(mergedData.colors);
      }
    }
  );
  
  usePrintStyle(colors, days);
  
  // Persist dark mode preference
  useEffect(() => {
    try {
      localStorage.setItem('darkMode', darkMode.toString());
    } catch (e) {
      console.error('Failed to save dark mode preference:', e);
    }
  }, [darkMode]);
  
  // Persist weekly goals
  useEffect(() => {
    try {
      localStorage.setItem('weeklyGoals', JSON.stringify(weeklyGoals));
    } catch (e) {
      console.error('Failed to save weekly goals:', e);
    }
  }, [weeklyGoals]);
  
  // Auto-save to localStorage with debounce
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');
    
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const state = { days, colors };
        localStorage.setItem(LS_KEY, JSON.stringify(state));
        setLastSaved(new Date());
        setSaveStatus('saved');
      } catch (e) {
        console.error('Save failed:', e);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('saved'), 3000);
      }
    }, 500);
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [days, colors]);
  
  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const { days: savedDays, colors: savedColors } = JSON.parse(saved);
        if (savedDays && Array.isArray(savedDays)) {
          setDays(savedDays);
          if (savedColors) setColors(savedColors);
          setSaveStatus('loaded');
          setTimeout(() => setSaveStatus('saved'), 2000);
        }
      }
    } catch (e) {
      console.error('Load failed:', e);
    }
  }, []);
  
  // Update day dates when week changes
  useEffect(() => {
    const weekDates = getWeekDates(selectedWeek);
    setDays(prev => prev.map((day, idx) => ({
      ...day,
      التاريخ: weekDates[idx] || ''
    })));
  }, [selectedWeek]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoRedo.undo(); }
        if ((e.key === 'z' && e.shiftKey) || (e.key === 'y')) { e.preventDefault(); undoRedo.redo(); }
        if (e.key === 'p') { e.preventDefault(); window.print(); }
        if (e.key === 's') { e.preventDefault(); alert(`✅ Schedule auto-saved at ${lastSaved.toLocaleTimeString()}`); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoRedo, lastSaved]);
  
  const goalHours = useMemo(() => calcGoalHours(days), [days]);
  const updateDay = (dayId, patch) => {
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, ...patch } : d));
  };
  const copyDay = (fromDay) => {
    const newTasks = fromDay.tasks.map(t => ({ ...t, id: ++nextId }));
    setDays(prev => prev.map(d => d.id === fromDay.id ? { ...d, tasks: newTasks } : d));
  };
  const hc = colors.header;
  
  // Get current week's goals with defaults
  const getCurrentWeekGoals = () => {
    const weekGoals = weeklyGoals[selectedWeek] || {};
    // Ensure all predefined goals exist
    const merged = { ...weekGoals };
    GOALS.forEach(g => {
      if (!merged[g]) {
        merged[g] = { target: 20, type: 'predefined' };
      }
    });
    return merged;
  };
  
  const currentWeekGoals = getCurrentWeekGoals();
  
  // Add new goal to current week
  const addGoal = (goalName, target) => {
    if (!goalName.trim()) return;
    setWeeklyGoals(prev => ({
      ...prev,
      [selectedWeek]: {
        ...(prev[selectedWeek] || {}),
        [goalName]: { target, type: 'custom' }
      }
    }));
    setNewGoalName('');
    setNewGoalTarget(20);
  };
  
  // Update goal target for current week
  const updateGoalTarget = (goalName, target) => {
    setWeeklyGoals(prev => ({
      ...prev,
      [selectedWeek]: {
        ...(prev[selectedWeek] || {}),
        [goalName]: { ...((prev[selectedWeek] || {})[goalName] || { type: 'predefined' }), target }
      }
    }));
  };
  
  // Delete goal from current week
  const deleteGoal = (goalName) => {
    setWeeklyGoals(prev => {
      const newWeekGoals = { ...(prev[selectedWeek] || {}) };
      delete newWeekGoals[goalName];
      return {
        ...prev,
        [selectedWeek]: newWeekGoals
      };
    });
  };
  
  const getSaveIndicator = () => {
    if (saveStatus === 'loading' || saveStatus === 'saving') return '💾 جارٍ الحفظ...';
    if (saveStatus === 'error') return '❌ خطأ في الحفظ';
    if (saveStatus === 'loaded') return '✅ تم تحميل البيانات';
    return `✅ محفوظ ${lastSaved.toLocaleTimeString()}`;
  };
  const getSaveColor = () => {
    if (saveStatus === 'saving') return '#f39c12';
    if (saveStatus === 'error') return '#e74c3c';
    if (saveStatus === 'loaded') return '#27ae60';
    return '#27ae60';
  };
  
  return (
    <div style={{ fontFamily: "Arial, sans-serif", direction: "rtl", background: darkMode ? "#1a1a2e" : "#f9fafb", minHeight: "100vh", padding: "20px", color: darkMode ? "#f0f0f0" : "#1a1a2e", transition: "background 0.3s, color 0.3s" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: getSaveColor(), fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              {getSaveIndicator()}
            </span>
            <SyncStatusIndicator
              syncStatus={syncStatus}
              lastSyncTime={lastSyncTime}
              syncError={syncError}
              onSettingsClick={() => setShowGistSettings(true)}
            />
          </div>
          <button onClick={() => setDarkMode(!darkMode)} title="Dark Mode" style={{ background: darkMode ? "#2a2a3e" : "#e0e0e0", color: darkMode ? "#ffd700" : "#ff9800", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 16, fontWeight: 600, transition: "all 0.2s" }}>
            {darkMode ? '🌙' : '☀️'}
          </button>
        </div>
        <h1 style={{ textAlign: "center", fontSize: 32, fontWeight: 900, marginBottom: 24, color: hc.bg }}>جدول الأسبوع 📅</h1>
        
        {/* Week Selector */}
        <div style={{ background: darkMode ? "#2a2a3e" : "#f0f5ff", border: `2px solid ${hc.bg}`, borderRadius: 8, padding: 16, marginBottom: 24, display: "flex", gap: 12, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>📆 اختر الأسبوع:</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))} title="Previous Week" style={{ background: hc.bg, color: hc.text, border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>←</button>
            <input 
              type="number" 
              value={selectedWeek} 
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1 && val <= 52) setSelectedWeek(val);
              }}
              min="1" 
              max="52"
              style={{ width: 60, padding: "6px 8px", border: `2px solid ${hc.bg}`, borderRadius: 4, textAlign: "center", fontSize: 14, fontWeight: 600 }}
              title="Week Number (1-52)"
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: darkMode ? "#aaa" : "#666" }}>w</span>
            <button onClick={() => setSelectedWeek(Math.min(52, selectedWeek + 1))} title="Next Week" style={{ background: hc.bg, color: hc.text, border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>→</button>
            <select 
              value={selectedWeek} 
              onChange={(e) => setSelectedWeek(parseInt(e.target.value, 10))}
              style={{ padding: "6px 8px", border: `1px solid ${hc.bg}`, borderRadius: 4, fontSize: 13, background: darkMode ? "#1a1a2e" : "#fff", color: darkMode ? "#f0f0f0" : "#1a1a2e", cursor: "pointer" }}>
              {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
                <option key={week} value={week}>الأسبوع {week}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: darkMode ? "#999" : "#999", marginLeft: 12, whiteSpace: "nowrap" }}>
              من {formatDateDisplay(getWeekDates(selectedWeek)[0])} إلى {formatDateDisplay(getWeekDates(selectedWeek)[6])}
            </span>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: 12, marginBottom: 24, borderBottom: "2px solid #e0e0e0", flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => setTab("editor")} style={{ background: tab === "editor" ? hc.bg : "transparent", color: tab === "editor" ? hc.text : "#666", border: "none", borderRadius: "8px 8px 0 0", padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>✏️ محرّر</button>
          <button onClick={() => setTab("goals")} style={{ background: tab === "goals" ? hc.bg : "transparent", color: tab === "goals" ? hc.text : "#666", border: "none", borderRadius: "8px 8px 0 0", padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>🎯 الأهداف</button>
          <button onClick={() => setTab("colors")} style={{ background: tab === "colors" ? hc.bg : "transparent", color: tab === "colors" ? hc.text : "#666", border: "none", borderRadius: "8px 8px 0 0", padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>🎨 الألوان</button>
          <button onClick={() => setTab("preview")} style={{ background: tab === "preview" ? hc.bg : "transparent", color: tab === "preview" ? hc.text : "#666", border: "none", borderRadius: "8px 8px 0 0", padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all 0.2s" }}>👁️ معاينة</button>
          <div style={{ marginRight: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={undoRedo.undo} disabled={!undoRedo.canUndo} title="Ctrl+Z" style={{ background: "#e3f2fd", color: "#1976d2", border: "1px solid #90caf9", borderRadius: 6, padding: "8px 12px", cursor: undoRedo.canUndo ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600, opacity: undoRedo.canUndo ? 1 : 0.5, transition: "all 0.2s" }}>↶ تراجع</button>
            <button onClick={undoRedo.redo} disabled={!undoRedo.canRedo} title="Ctrl+Y" style={{ background: "#f3e5f5", color: "#7b1fa2", border: "1px solid #ce93d8", borderRadius: 6, padding: "8px 12px", cursor: undoRedo.canRedo ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600, opacity: undoRedo.canRedo ? 1 : 0.5, transition: "all 0.2s" }}>↷ إعادة</button>
            <button onClick={() => setShowGistSettings(true)} title="GitHub Gist Sync" style={{ background: hasCredentials() ? "#9b59b6" : "#bdc3c7", color: "#fff", border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🔗 GitHub</button>
            <button onClick={() => {
              const data = { days, colors, selectedWeek, exportDate: new Date().toISOString() };
              const json = JSON.stringify(data, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `schedule-backup-${new Date().toISOString().slice(0,10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }} title="Export as JSON" style={{ background: "#e8f5e9", color: "#388e3c", border: "1px solid #81c784", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>⬇️ تصدير</button>
            <label title="Import JSON" style={{ background: "#fce4ec", color: "#c2185b", border: "1px solid #f48fb1", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "inline-block" }}>
              ⬆️ استيراد
              <input type="file" accept=".json" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const imported = JSON.parse(ev.target?.result);
                      if (imported.days && Array.isArray(imported.days)) {
                        // Helper to convert 12-hour AM/PM to 24-hour format
                        const convertTo24Hour = (time12) => {
                          if (!time12) return time12;
                          
                          // Check if it's already 24-hour format
                          if (!time12.includes('AM') && !time12.includes('PM')) {
                            return time12; // Already 24-hour
                          }
                          
                          // Handle range: "h:mm AM - h:mm PM"
                          if (time12.includes(' - ')) {
                            const [start, end] = time12.split(' - ').map(t => t.trim());
                            return convertSingleTo24(start) + ' - ' + convertSingleTo24(end);
                          }
                          return convertSingleTo24(time12);
                        };
                        
                        const convertSingleTo24 = (time12) => {
                          const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                          if (!match) return time12;
                          
                          let [, hours, minutes, period] = match;
                          hours = parseInt(hours);
                          
                          if (period.toUpperCase() === 'PM') {
                            if (hours !== 12) hours += 12;
                          } else {
                            if (hours === 12) hours = 0;
                          }
                          
                          return String(hours).padStart(2, '0') + ':' + minutes;
                        };
                        
                        // Convert all times in imported data
                        const convertedDays = imported.days.map(day => ({
                          ...day,
                          tasks: day.tasks.map(task => ({
                            ...task,
                            time: convertTo24Hour(task.time)
                          }))
                        }));
                        
                        setDays(convertedDays);
                        if (imported.colors) setColors(imported.colors);
                        if (imported.selectedWeek) setSelectedWeek(imported.selectedWeek);
                        alert('✅ تم استيراد البيانات بنجاح!');
                      } else {
                        alert('❌ صيغة الملف غير صحيحة');
                      }
                    } catch (err) {
                      alert('❌ خطأ في قراءة الملف: ' + err.message);
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }
              }} style={{ display: "none" }} />
            </label>
            <button onClick={() => window.print()} title="Ctrl+P" style={{ background: "#27ae60", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>🖨️ طباعة</button>
          </div>
        </div>
        {tab === "editor" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              {days.map((day, idx) => (
                <DayCard key={day.id} day={day} colors={colors} onUpdate={patch => updateDay(day.id, patch)} onCopyDay={copyDay} />
              ))}
            </div>
          </div>
        )}
        {tab === "goals" && (
          <div style={{ padding: 20, background: "#f9fafb", borderRadius: 12 }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ textAlign: "right", fontSize: 24, fontWeight: 900, marginBottom: 8, color: hc.bg }}>الأهداف الأسبوعية 🎯</h2>
              <p style={{ textAlign: "right", fontSize: 13, color: "#666", margin: 0 }}>تتبع تقدمك نحو أهدافك الأسبوعية. عدّل الأهداف حسب احتياجاتك.</p>
            </div>
            
            <div style={{
              background: hc.bg,
              color: hc.text,
              padding: 16,
              borderRadius: 12,
              marginBottom: 24,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 16
            }}>
              <div style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>إجمالي الساعات</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{Object.values(goalHours).reduce((a, b) => a + b, 0).toFixed(1)}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>ساعة مسجلة</div>
              </div>
              <div style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>إجمالي الأهداف</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{Object.values(currentWeekGoals).reduce((sum, g) => sum + (g.target || 20), 0)}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>ساعة مستهدفة</div>
              </div>
              <div style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>معدل الإنجاز</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{Object.values(currentWeekGoals).reduce((sum, g) => sum + (g.target || 20), 0) > 0 ? Math.round((Object.values(goalHours).reduce((a, b) => a + b, 0) / Object.values(currentWeekGoals).reduce((sum, g) => sum + (g.target || 20), 0)) * 100) : 0}%</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>نسبة التقدم</div>
              </div>
              <div style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>عدد الأيام</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{days.filter(d => d.enabled).length}</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>أيام نشطة</div>
              </div>
            </div>
            
            {/* Add New Goal Form */}
            <div style={{
              background: "#fff",
              padding: 16,
              borderRadius: 12,
              marginBottom: 24,
              border: "2px dashed " + hc.bg,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
            }}>
              <h3 style={{ textAlign: "right", marginTop: 0, marginBottom: 12, fontSize: 14, fontWeight: 700, color: hc.bg }}>➕ إضافة هدف جديد</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px", gap: 12, alignItems: "flex-end" }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, textAlign: "right" }}>اسم الهدف</label>
                  <input
                    type="text"
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    placeholder="مثال: دراسة لغة جديدة"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addGoal(newGoalName, newGoalTarget);
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid #ddd",
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: "inherit",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, textAlign: "right" }}>الهدف (ساعة)</label>
                  <input
                    type="number"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(parseFloat(e.target.value) || 20)}
                    min="1"
                    max="168"
                    style={{
                      width: "100%",
                      padding: "8px 6px",
                      border: "1px solid #ddd",
                      borderRadius: 6,
                      fontSize: 13,
                      textAlign: "center",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                <button
                  onClick={() => addGoal(newGoalName, newGoalTarget)}
                  style={{
                    background: hc.bg,
                    color: hc.text,
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => { e.target.style.opacity = "0.9"; e.target.style.transform = "scale(1.05)"; }}
                  onMouseOut={(e) => { e.target.style.opacity = "1"; e.target.style.transform = "scale(1)"; }}
                >
                  إضافة
                </button>
              </div>
            </div>
            
            {/* Goals Grid */}
            <GoalsPanel
              currentWeekGoals={currentWeekGoals}
              goalHours={goalHours}
              onUpdateGoal={updateGoalTarget}
              onDeleteGoal={deleteGoal}
              colors={colors}
            />
          </div>
        )}
        {tab === "colors" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 }}>
            {Object.entries(colors).map(([key, color]) => (
              <div key={key} style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #e5e5e5" }}>
                <h3 style={{ marginTop: 0, textAlign: "right", fontWeight: 700, marginBottom: 16 }}>{key === "header" ? "العنوان" : key === "highlight" ? "مميّز" : key === "ibadah" ? "عبادة" : "Buffer"}</h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600 }}>لون الخلفية</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="color" value={color.bg} onChange={e => setColors(prev => ({ ...prev, [key]: { ...prev[key], bg: e.target.value } }))} style={{ width: 50, height: 40, border: "none", borderRadius: 6, cursor: "pointer" }} />
                    <input type="text" value={color.bg} onChange={e => setColors(prev => ({ ...prev, [key]: { ...prev[key], bg: e.target.value } }))} style={{ flex: 1, border: "1px solid #ddd", borderRadius: 6, padding: "6px 10px", fontSize: 12 }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600 }}>لون النص</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="color" value={color.text} onChange={e => setColors(prev => ({ ...prev, [key]: { ...prev[key], text: e.target.value } }))} style={{ width: 50, height: 40, border: "none", borderRadius: 6, cursor: "pointer" }} />
                    <input type="text" value={color.text} onChange={e => setColors(prev => ({ ...prev, [key]: { ...prev[key], text: e.target.value } }))} style={{ flex: 1, border: "1px solid #ddd", borderRadius: 6, padding: "6px 10px", fontSize: 12 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "preview" && (
          <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", minHeight: 400 }}>
            {/* Enhanced Statistics with Pie Chart */}
            <div style={{ marginBottom: 24, padding: 16, background: hc.bg, color: hc.text, borderRadius: 8 }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>📈 إحصائيات متقدمة</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
                {/* Pie Chart */}
                <svg viewBox="0 0 120 120" style={{ width: "100%", maxWidth: 200 }}>
                  {GOALS.map((goal, i) => {
                    const totalHours = Object.values(goalHours).reduce((a, b) => a + b, 0);
                    const percentage = totalHours > 0 ? (goalHours[goal] / totalHours) * 100 : 0;
                    const colors_pie = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];
                    const startAngle = (GOALS.slice(0, i).reduce((sum, g) => sum + (goalHours[g] || 0), 0) / totalHours) * 360;
                    const endAngle = startAngle + (percentage * 360 / 100);
                    const large = percentage > 50 ? 1 : 0;
                    const radius = 40;
                    const centerX = 60, centerY = 60;
                    const start = { x: centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180), y: centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180) };
                    const end = { x: centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180), y: centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180) };
                    const pathData = `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y} Z`;
                    return <path key={goal} d={pathData} fill={colors_pie[i]} />;
                  })}
                </svg>
                
                {/* Summary Stats */}
                <div>
                  <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>ملخص الأهداف:</div>
                  {GOALS.map((g, i) => {
                    const colors_legend = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"];
                    const totalHours = Object.values(goalHours).reduce((a, b) => a + b, 0);
                    const percentage = totalHours > 0 ? (goalHours[g] / totalHours) * 100 : 0;
                    return (
                      <div key={g} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 4 }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: colors_legend[i] }}></div>
                        <span style={{ flex: 1 }}>{g}</span>
                        <span style={{ fontWeight: 700 }}>{goalHours[g]}h ({Math.round(percentage)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div style={{ marginBottom: 24, padding: 16, background: hc.bg, color: hc.text, borderRadius: 8 }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700 }}>ملخص الأهداف الأسبوعية 📊</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                {GOALS.map(g => {
                  const maxHours = 20;
                  const percent = Math.min((goalHours[g] / maxHours) * 100, 100);
                  const barColor = percent < 33 ? "#e74c3c" : percent < 66 ? "#f39c12" : "#27ae60";
                  return (
                    <div key={g} style={{ background: "rgba(255,255,255,0.1)", padding: 12, borderRadius: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, textAlign: "right" }}>{g}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 20, background: "rgba(255,255,255,0.2)", borderRadius: 10, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: percent + "%", background: barColor, transition: "width 0.3s ease" }}></div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 900, minWidth: "40px", textAlign: "center" }}>{goalHours[g]}h</div>
                      </div>
                      <div style={{ fontSize: 10, marginTop: 4, opacity: 0.8 }}>{Math.round(percent)}%</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 16, padding: 12, background: "rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 12 }}>
                <strong>الإجمالي:</strong> {Object.values(goalHours).reduce((a, b) => a + b, 0).toFixed(1)} ساعة من {GOALS.length * 20} ساعة مستهدفة
              </div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: 12, background: "#f0f0f0", borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>🔍 أدوات المعاينة:</span>
                <button onClick={() => setPrintZoom(Math.max(50, printZoom - 10))} style={{ padding: "6px 12px", background: "#fff", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>− صغّر</button>
                <span style={{ fontSize: 12, fontWeight: 600, minWidth: "50px", textAlign: "center" }}>{printZoom}%</span>
                <button onClick={() => setPrintZoom(Math.min(150, printZoom + 10))} style={{ padding: "6px 12px", background: "#fff", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>+ كبّر</button>
                <div style={{ marginRight: "auto", height: 1, flex: 1, background: "#ddd" }}></div>
                <span style={{ fontSize: 11, color: "#666" }}>{days.filter(d => d.enabled).length} صفحات</span>
              </div>
              <h3 style={{ textAlign: "right", marginTop: 0, marginBottom: 12, fontSize: 16, fontWeight: 700 }}>أيام الأسبوع</h3>
              <div style={{ transform: `scale(${printZoom / 100})`, transformOrigin: "top right", transition: "transform 0.2s" }}>
                {days.filter(d => d.enabled).map((day, pageIdx) => (
                <div key={day.id} style={{ marginBottom: 20, padding: 16, background: "#f9fafb", borderRadius: 8, border: `2px solid ${hc.bg}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: 12, background: hc.bg, color: hc.text, borderRadius: 6 }}>
                    <span style={{ fontSize: 20, fontWeight: 900 }}>{day.name}</span>
                    <span style={{ fontSize: 12, opacity: 0.9 }}>{day.type}</span>
                  </div>
                  {day.notes && (
                    <div style={{ marginBottom: 12, padding: 10, background: "#fff", borderRadius: 6, borderRight: `3px solid ${hc.bg}`, fontSize: 13 }}>
                      <strong>ملاحظات:</strong> {day.notes}
                    </div>
                  )}
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: hc.bg, color: hc.text }}>
                        <th style={{ padding: 8, textAlign: "right" }}>المهمة</th>
                        <th style={{ padding: 8, textAlign: "center", width: "20%" }}>الوقت</th>
                        <th style={{ padding: 8, textAlign: "center", width: "15%" }}>المدة</th>
                        <th style={{ padding: 8, textAlign: "right", width: "30%" }}>لو متمش / ملاحظة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.tasks.map((t, idx) => {
                        const catColor = t.cat && colors[t.cat];
                        const bg = catColor ? catColor.bg : (idx % 2 === 1 ? "#f7f8ff" : "#fff");
                        const col = catColor ? catColor.text : "#1a1a2e";
                        return (
                          <tr key={t.id} style={{ background: bg, borderBottom: "1px solid #e5e5e5" }}>
                            <td style={{ padding: 8, textAlign: "right", color: col, fontWeight: 600 }}>{t.task}</td>
                            <td style={{ padding: 8, textAlign: "center", color: col, whiteSpace: "nowrap", fontSize: 11 }}>{t.time}</td>
                            <td style={{ padding: 8, textAlign: "center", color: col, fontSize: 11 }}>{calculateDuration(t.time)}</td>
                            <td style={{ padding: 8, textAlign: "right", color: col, fontSize: 11 }}>{t.notes || ""}</td>
                          </tr>
                       );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
              </div>
            </div>
          </div>
        )}

        {/* GitHub Gist Settings Modal */}
        <GistSettingsModal
          isOpen={showGistSettings}
          onClose={() => setShowGistSettings(false)}
          syncStatus={syncStatus}
          lastSyncTime={lastSyncTime}
          syncError={syncError}
          onCreateGist={createNewGist}
          onSave={(config) => {
            // Settings saved, sync will trigger automatically via the hook
          }}
        />
      </div>
    </div>
  );
}