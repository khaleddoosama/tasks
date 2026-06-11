const WEEK_START_DAY = 6;

function createLocalDate(year, monthIndex, day) {
  return new Date(year, monthIndex, day);
}

function toLocalDate(dateInput) {
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  }

  if (typeof dateInput === "string") {
    const [year, month, day] = dateInput.split("-").map(Number);
    return createLocalDate(year, month - 1, day);
  }

  return new Date(dateInput);
}

export function formatLocalDate(dateInput) {
  const date = toLocalDate(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getCurrentYear() {
  return new Date().getFullYear();
}

export function getFirstWeekStart(year = getCurrentYear()) {
  const jan1 = createLocalDate(year, 0, 1);
  const offset = (WEEK_START_DAY - jan1.getDay() + 7) % 7;
  return createLocalDate(year, 0, 1 + offset);
}

export function getWeekStartDateFromWeekNumber(weekNumber, year = getCurrentYear()) {
  const firstWeekStart = getFirstWeekStart(year);
  const startDate = new Date(firstWeekStart);
  startDate.setDate(firstWeekStart.getDate() + (weekNumber - 1) * 7);
  return startDate;
}

export function getWeekStartDate(dateInput) {
  const date = toLocalDate(dateInput);
  const offset = (date.getDay() - WEEK_START_DAY + 7) % 7;
  const startDate = new Date(date);
  startDate.setDate(date.getDate() - offset);
  return startDate;
}

export function getWeekDates(weekNumber = null, year = getCurrentYear()) {
  const startDate =
    weekNumber === null ? getWeekStartDate(new Date()) : getWeekStartDateFromWeekNumber(weekNumber, year);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return formatLocalDate(date);
  });
}

export function getWeekNumberFromDate(dateInput, year = getCurrentYear()) {
  const startDate = getWeekStartDate(dateInput);
  const firstWeekStart = getFirstWeekStart(year);
  // Math.round instead of floor avoids DST clock-shift errors (±1 h ≪ 0.5 day)
  const diffDays = Math.round((startDate - firstWeekStart) / (24 * 60 * 60 * 1000));
  return Math.floor(diffDays / 7) + 1;
}

export function getWeekKey(weekNumber, year = getCurrentYear()) {
  return `${year}-W${String(weekNumber).padStart(2, "0")}`;
}

export function getMonthKey(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : "";
}

export function getPrimaryWeekDate(weekDates = []) {
  return weekDates[1] || weekDates[0] || "";
}

export function formatMonthDisplay(monthKey) {
  if (!monthKey) return "";

  const [year, month] = monthKey.split("-");
  return `${parseInt(month, 10)}/${year}`;
}

export function formatDateDisplay(dateStr) {
  if (!dateStr) return "";

  const [year, month, day] = dateStr.split("-");
  return `${day}/${parseInt(month, 10)}/${year}`;
}

export function getCurrentWeekNumber() {
  return getWeekNumberFromDate(new Date());
}

export function getTodayDate() {
  return formatLocalDate(new Date());
}
