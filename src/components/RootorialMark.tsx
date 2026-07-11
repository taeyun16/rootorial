export function RootorialMark({ className = "" }: { className?: string }) {
  return (
    <span className={`rootorial-mark ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false">
        <path d="M20 49V17h14c8 0 13 4 13 11s-5 11-13 11H20m14 0 14 11" />
        <circle cx="20" cy="49" r="4.25" />
      </svg>
    </span>
  );
}
