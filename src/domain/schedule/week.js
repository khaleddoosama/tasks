function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getWeekDates(weekNumber = null) {
  let startDate;

  if (weekNumber === null) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;

    startDate = new Date(today);
    startDate.setDate(today.getDate() + (daysUntilSaturday === 0 ? 0 : daysUntilSaturday - 7));
  } else {
    const year = new Date().getFullYear();
    const jan1 = new Date(year, 0, 1);
    const jan1DayOfWeek = jan1.getDay();
    const daysToFirstSaturday = (6 - jan1DayOfWeek + 7) % 7;
    const firstSaturday = new Date(year, 0, 1 + (daysToFirstSaturday === 0 ? 0 : daysToFirstSaturday));

    startDate = new Date(firstSaturday);
    startDate.setDate(firstSaturday.getDate() + (weekNumber - 1) * 7);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return formatLocalDate(date);
  });
}

export function formatDateDisplay(dateStr) {
  if (!dateStr) return "";

  const [year, month, day] = dateStr.split("-");
  return `${day}/${parseInt(month, 10)}/${year}`;
}

export function getCurrentWeekNumber() {
  const today = new Date();
  const year = today.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const firstSaturday = new Date(year, 0, 1 + ((6 - jan1.getDay() + 7) % 7));

  const dayOfWeek = today.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  const currentSaturday = new Date(today);
  currentSaturday.setDate(today.getDate() + (daysUntilSaturday === 0 ? 0 : daysUntilSaturday - 7));

  const diffTime = currentSaturday - firstSaturday;
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));

  return diffWeeks + 1;
}
