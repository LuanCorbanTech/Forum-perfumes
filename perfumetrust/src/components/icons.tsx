// Ícones de traço (stroke) inline, sem biblioteca externa — mesmo padrão do
// redesign "handoff": stroke="currentColor", stroke-width 1.6, sem emoji
// (emoji colorido não respeita `color`).

function Icon({ paths }: { paths: string[] }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export function TagIcon() {
  return (
    <Icon
      paths={[
        "M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-6.2-6.2a2 2 0 01-.6-1.4V5a2 2 0 012-2h8a2 2 0 011.4.6l5.4 5.4a2 2 0 010 2.8z",
        "M8.5 8.5h.01",
      ]}
    />
  );
}

export function BagIcon() {
  return <Icon paths={["M5 8h14l1 12H4L5 8z", "M9 8V6a3 3 0 016 0v2"]} />;
}

export function TrophyIcon() {
  return (
    <Icon
      paths={[
        "M7 4h10v5a5 5 0 01-10 0V4z",
        "M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3",
        "M9.5 20h5M12 14v6",
      ]}
    />
  );
}
