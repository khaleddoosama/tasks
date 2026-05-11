import { useEffect, useState } from "react";

export default function TimePickerField({ value, onChange, label }) {
  const [time, setTime] = useState(value || "09:00");

  useEffect(() => {
    if (value && value.includes(":")) {
      setTime(value);
    }
  }, [value]);

  const handleChange = (event) => {
    const nextValue = event.target.value;
    if (!nextValue) return;

    setTime(nextValue);
    onChange(nextValue);
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
        width: "90px",
      }}
    />
  );
}
