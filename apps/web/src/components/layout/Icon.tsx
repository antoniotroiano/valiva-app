import type { ReactNode } from 'react';

/** Line icons on a 24 grid (stroke 1.8, drawn in `currentColor`). No icon library: paths live here. */
const PATHS = {
  overview: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  inputs: <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />,
  household: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 5.5a3 3 0 010 5.5M18 14c2 .7 3 2.6 3 6" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
    </>
  ),
  etf: <path d="M3 17l6-6 4 4 8-9M15 6h6v6" />,
  statutory: <path d="M3 9l9-5 9 5M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3 20h18" />,
  depot: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  occupational: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M3 13h18" />
    </>
  ),
  other: (
    <path d="M12 3v18M16.5 7.5C15.6 6.2 14 5.5 12 5.5c-2.5 0-4 1.2-4 3 0 4.5 8.500 2 8.500 6.500 0 1.800-1.700 3-4.500 3-2.200 0-3.900-.8-4.800-2.200" />
  ),
  goals: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  assumptions: (
    <>
      <path d="M4 7h8M18 7h2M4 17h2M12 17h8" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </>
  ),
  data: <path d="M12 4v11M7 11l5 5 5-5M4 20h16" />,
  ok: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6" />
    </>
  ),
  open: <circle cx="12" cy="12" r="8.5" strokeDasharray="3 3" />,
  warn: <path d="M12 4l9.5 16h-19zM12 10v4.5M12 17.5v.01" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  next: <path d="M9 6l6 6-6 6" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  go: <path d="M5 12h14M13 6l6 6-6 6" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

/** Decorative icon: the text next to it carries the meaning, so it is hidden from screen readers. */
export function Icon({ name, size }: { name: IconName; size?: 'sm' | 'lg' }) {
  return (
    <svg
      className={size ? `ic ${size}` : 'ic'}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
