export default function GeneralNotesReadonly({ notes, colors, darkMode }) {
  if (!notes || notes.length === 0) {
    return null;
  }

  const headerColor = colors.header;

  return (
    <div
      style={{
        marginBottom: 24,
        direction: "rtl",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {notes.map((note) => (
        <div
          key={note.id}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: headerColor.bg, whiteSpace: "nowrap" }}>
            📝
          </span>
          <div
            style={{
              background: headerColor.bg,
              color: headerColor.text,
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 500,
              flex: 1,
            }}
            title={note.text}
          >
            {note.text}
          </div>
        </div>
      ))}
    </div>
  );
}

