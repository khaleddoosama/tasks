import { normalizeColors, normalizeDaysCategories } from "../domain/schedule/categories";

function convertSingleTo24Hour(time12) {
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return time12;

  let [, hours, minutes, period] = match;
  let parsedHours = parseInt(hours, 10);

  if (period.toUpperCase() === "PM") {
    if (parsedHours !== 12) parsedHours += 12;
  } else if (parsedHours === 12) {
    parsedHours = 0;
  }

  return `${String(parsedHours).padStart(2, "0")}:${minutes}`;
}

function convertTo24Hour(timeValue) {
  if (!timeValue) return timeValue;

  if (!timeValue.includes("AM") && !timeValue.includes("PM")) {
    return timeValue;
  }

  if (timeValue.includes(" - ")) {
    const [start, end] = timeValue.split(" - ").map((part) => part.trim());
    return `${convertSingleTo24Hour(start)} - ${convertSingleTo24Hour(end)}`;
  }

  return convertSingleTo24Hour(timeValue);
}

export function exportScheduleBackup({ days, colors, selectedWeek }) {
  const payload = {
    days,
    colors,
    selectedWeek,
    exportDate: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `schedule-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function importScheduleFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result);
        if (!imported.days || !Array.isArray(imported.days)) {
          reject(new Error("صيغة الملف غير صحيحة"));
          return;
        }

        const days = imported.days.map((day) => ({
          ...day,
          tasks: day.tasks.map((task) => ({
            ...task,
            time: convertTo24Hour(task.time),
          })),
        }));

        resolve({
          days: normalizeDaysCategories(days),
          colors: normalizeColors(imported.colors),
          selectedWeek: imported.selectedWeek,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.readAsText(file);
  });
}
