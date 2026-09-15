'use client';

export function CheckSquareIcon({ className = "w-5 h-5", fill = false, checkStroke }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" w="18" h="18" rx="5" ry="5" fill={fill ? "currentColor" : "none"} />
      <path d="M9 11l2 2 4-4" stroke={fill ? (checkStroke || "#181818") : "currentColor"} strokeWidth={3} />
    </svg>
  );
}

export function CalendarIconCustom({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="4" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01" />
    </svg>
  );
}

export function ArrowLeftEndOnRectangleIconCustom({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}