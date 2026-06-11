import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * "2 min ago"-style relative time for tile metadata (UI_WORKFLOWS §5.5).
 * `now` is injectable for tests.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const deltaMs = now.getTime() - new Date(iso).getTime();
  if (deltaMs < 0) return "just now";
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
