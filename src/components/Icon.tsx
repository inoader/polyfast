type IconName =
  | "search"
  | "markets"
  | "wallet"
  | "activity"
  | "close"
  | "back"
  | "refresh"
  | "external"
  | "chevron"
  | "book"
  | "chart"
  | "clock";

const paths: Record<IconName, ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  markets: <><path d="M4 19V9m6 10V5m6 14v-7m4 7H2" /></>,
  wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12" /><path d="M16 11h4v4h-4a2 2 0 1 1 0-4Z" /></>,
  activity: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  back: <><path d="m15 18-6-6 6-6" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M18 9a7 7 0 0 0-12-2l-2 5m2 3a7 7 0 0 0 12 2l2-5" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></>,
  chevron: <><path d="m9 18 6-6-6-6" /></>,
  book: <><path d="M4 5a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2V5Zm16 0a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2V5Z" /></>,
  chart: <><path d="M4 19V5m0 14h16" /><path d="m7 15 4-5 3 2 5-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
import type { ReactNode } from "react";
