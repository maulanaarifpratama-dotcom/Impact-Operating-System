import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Read a numeric field that is bound to a text input, returning null when it
 * holds nothing usable.
 *
 * The row types declare these columns `number | null`, but a cleared input puts
 * `''` there at runtime. Call sites were guarding against that with
 * `!== ''` comparisons the compiler rejected as impossible — correct code
 * against a type that was lying. Widening the whole domain type would spread a
 * form concern across the schema, so the reality is admitted here instead.
 */
export function numericOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Human-readable age of a timestamp, in Indonesian.
 *
 * Lives here because the Grant Writer list and the LFA Studio list both show it
 * and should agree; the Grant Writer copy used to be the only one, which is
 * partly why the Studio cards showed no date at all.
 */
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '—';

    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}
