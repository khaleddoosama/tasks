import { getWeekDates } from "./week";

export function createInitialDays(weekNumber) {
  const weekDates = getWeekDates(weekNumber);

  return [
    { id: 1, name: "السبت", type: "إجازة", notes: "", التاريخ: weekDates[0] || "", مستوى_الطاقة: "", تقييم_اليوم: "", عدد_ساعات_النوم: "", enabled: true, tasks: [] },
    {
      id: 2, name: "الأحد", type: "أوفيس", notes: "", التاريخ: weekDates[1] || "", مستوى_الطاقة: "", تقييم_اليوم: "", عدد_ساعات_النوم: "", enabled: true, tasks: []
    },
    {
      id: 3, name: "الاثنين", type: "بيت", notes: "", التاريخ: weekDates[2] || "", مستوى_الطاقة: "", تقييم_اليوم: "", عدد_ساعات_النوم: "", enabled: true, tasks: []
    },
    {
      id: 4, name: "الثلاثاء", type: "أوفيس", notes: "", التاريخ: weekDates[3] || "", مستوى_الطاقة: "", تقييم_اليوم: "", عدد_ساعات_النوم: "", enabled: true, tasks: []
    },
    {
      id: 5, name: "الأربعاء", type: "بيت", notes: "", التاريخ: weekDates[4] || "", مستوى_الطاقة: "", تقييم_اليوم: "", عدد_ساعات_النوم: "", enabled: true, tasks: []
    },
    {
      id: 6, name: "الخميس", type: "أوفيس", notes: "", التاريخ: weekDates[5] || "", مستوى_الطاقة: "", تقييم_اليوم: "", عدد_ساعات_النوم: "", enabled: true, tasks: []
    },
    { id: 7, name: "الجمعة", type: "إجازة", notes: "", التاريخ: weekDates[6] || "", مستوى_الطاقة: "", تقييم_اليوم: "", عدد_ساعات_النوم: "", enabled: false, tasks: [] },
  ];
}




