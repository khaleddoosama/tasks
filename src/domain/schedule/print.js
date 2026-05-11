import { CATEGORY_CHECKBOX_EXCLUSIONS } from "./constants";
import { calculateDuration } from "./time";

export const PRINT_STYLE_TEXT =
  "@media print { @page { size: A4; margin: 0; } body > *:not(#__print_root__) { display: none !important; } #__print_root__ { display: block !important; font-family: Arial, sans-serif; direction: rtl; } .print-page { width: 210mm; height: 297mm; padding: 8mm 10mm; box-sizing: border-box; page-break-after: always; overflow: hidden; } .print-page:last-child { page-break-after: auto; } }";

export function buildPrintHtml(colors, days) {
  const enabledDays = days.filter((day) => day.enabled);

  const buildRow = (task, index) => {
    const color = task.cat && colors[task.cat];
    const background = color ? color.bg : index % 2 === 1 ? "#f7f8ff" : "#fff";
    const textColor = color ? color.text : "#1a1a2e";
    const showCheckbox = !CATEGORY_CHECKBOX_EXCLUSIONS.includes(task.cat);

    return (
      `<tr style="background:${background};border-bottom:1px solid #e5e5e5;">` +
      `<td style="padding:1.5mm 3mm;text-align:right;font-weight:700;color:${textColor};">${task.task}</td>` +
      `<td style="padding:1.5mm 3mm;text-align:center;font-size:8pt;color:${textColor};white-space:nowrap;">${task.time}</td>` +
      `<td style="padding:1.5mm 3mm;text-align:center;font-size:8pt;color:${textColor};">${calculateDuration(task.time)}</td>` +
      `<td style="padding:1.5mm 3mm;text-align:center;">${
        showCheckbox
          ? task.done
            ? '<div style="width:4.5mm;height:4.5mm;border:1.5px solid #777;border-radius:2px;display:inline-flex;align-items:center;justify-content:center;font-size:8pt;font-weight:700;">✓</div>'
            : '<div style="width:4.5mm;height:4.5mm;border:1.5px solid #777;border-radius:2px;display:inline-block;"></div>'
          : ""
      }</td>` +
      `<td style="padding:1.5mm 3mm;font-size:8pt;color:${textColor};">${task.notes || ""}</td>` +
      "</tr>"
    );
  };

  return enabledDays
    .map((day) => {
      const headerColor = colors.header;
      const rows = day.tasks.map(buildRow).join("");
      const goals = Array(6)
        .fill(
          '<div style="display:flex;align-items:center;gap:2mm;font-size:9pt;padding:2mm 0;border-bottom:1px solid #f0f0f0;">' +
            '<span style="flex:1;border-bottom:1px dashed #d4d4d8;height:5mm;"></span>' +
          "</div>",
        )
        .join("");
      const circles5 = Array(5)
        .fill(
          `<div style="width:5.5mm;height:5.5mm;border-radius:50%;border:1.5px solid ${headerColor.bg};display:inline-block;margin-left:2mm;"></div>`,
        )
        .join("");
      const stars5 = Array(5)
        .fill('<span style="font-size:13pt;color:#ccc;margin-left:2mm;">&#9733;</span>')
        .join("");
      const energyLevel = day.مستوى_الطاقة ? parseInt(day.مستوى_الطاقة, 10) : 0;
      const dayRating = day.تقييم_اليوم ? parseInt(day.تقييم_اليوم, 10) : 0;
      const energyEmojis = ["", "😴", "😐", "😊", "😄", "🔥"];
      const ratingEmojis = ["", "😞", "😕", "😐", "😊", "🌟"];
      const energyDisplay = energyLevel
        ? Array(5)
            .fill('<span style="font-size:13pt;margin-left:2mm;">')
            .map((prefix, index) => `${prefix}${index < energyLevel ? "●" : "○"}</span>`)
            .join("")
        : circles5;
      const ratingDisplay = dayRating
        ? Array(5)
            .fill('<span style="font-size:13pt;margin-left:2mm;">')
            .map((prefix, index) => `${prefix}${index < dayRating ? "★" : "☆"}</span>`)
            .join("")
        : stars5;

      return (
        '<div class="print-page">' +
        `<div style="display:flex;gap:4mm;border-bottom:2px solid ${headerColor.bg};padding-bottom:3mm;margin-bottom:2mm;">` +
        `<div style="background:${headerColor.bg};color:${headerColor.text};border-radius:6px;padding:3mm 6mm;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:28mm;">` +
        `<span style="font-size:19pt;font-weight:900;line-height:1.1;">${day.name}</span>` +
        `<span style="font-size:8pt;opacity:0.8;margin-top:1mm;">${day.type}</span></div>` +
        '<div style="flex:1;display:flex;flex-direction:column;justify-content:space-around;">' +
        `<div style="display:flex;align-items:center;gap:3mm;"><span style="font-size:9pt;font-weight:700;white-space:nowrap;">التاريخ:</span><span style="flex:1;border-bottom:1.5px solid #bbb;height:5mm;font-size:8pt;padding:1mm 2mm;">${day.التاريخ || ""}</span></div>` +
        `<div style="display:flex;align-items:center;gap:3mm;margin-top:2mm;"><span style="font-size:9pt;font-weight:700;white-space:nowrap;">مستوى الطاقة:</span>${energyDisplay}${energyEmojis[energyLevel] ? `<span style="margin-right:3mm;">${energyEmojis[energyLevel]}</span>` : ""}</div>` +
        `<div style="display:flex;align-items:center;gap:3mm;"><span style="font-size:9pt;font-weight:700;white-space:nowrap;">تقييم اليوم:</span>${ratingDisplay}${ratingEmojis[dayRating] ? `<span style="margin-right:3mm;">${ratingEmojis[dayRating]}</span>` : ""}</div>` +
        `<div style="display:flex;align-items:center;gap:3mm;"><span style="font-size:9pt;font-weight:700;white-space:nowrap;">ساعات النوم:</span><span style="flex:1;border-bottom:1.5px solid #bbb;height:5mm;font-size:8pt;padding:1mm 2mm;">${day.عدد_ساعات_النوم || ""}</span></div></div></div>` +
        `<table style="width:100%;border-collapse:collapse;font-size:9pt;"><thead><tr style="background:${headerColor.bg};color:${headerColor.text};">` +
        '<th style="padding:2mm 3mm;text-align:right;">المهمة</th>' +
        '<th style="padding:2mm 3mm;text-align:center;width:24mm;">الوقت</th>' +
        '<th style="padding:2mm 3mm;text-align:center;width:13mm;">المدة</th>' +
        '<th style="padding:2mm 3mm;text-align:center;width:10mm;">تم</th>' +
        '<th style="padding:2mm 3mm;text-align:center;width:48mm;">لو متمش / ملاحظة</th>' +
        `</tr></thead><tbody>${rows}</tbody></table>` +
        '<div style="display:flex;gap:4mm;flex:1;margin-top:3mm;">' +
        `<div style="flex:1;border:1.5px solid ${headerColor.bg};border-radius:6px;padding:3mm 4mm;">` +
        '<div style="font-size:9pt;font-weight:700;border-bottom:1px solid #ccc;padding-bottom:1mm;margin-bottom:2mm;">ملاحظات اليوم</div>' +
        Array(5).fill('<div style="border-bottom:1px solid #ddd;height:7mm;margin-bottom:1mm;"></div>').join("") +
        "</div>" +
        `<div style="width:50mm;border:1.5px solid ${headerColor.bg};border-radius:6px;padding:3mm 4mm;">` +
        '<div style="font-size:9pt;font-weight:700;border-bottom:1px solid #ccc;padding-bottom:1mm;margin-bottom:2mm;">الأهداف / المخرجات</div>' +
        `${goals}</div></div></div>`
      );
    })
    .join("");
}
