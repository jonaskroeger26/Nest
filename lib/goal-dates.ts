import { format, isValid, parseISO } from "date-fns"

/** Parse unlock: ISO `yyyy-MM-dd` or legacy strings like "Sep 2028". */
export function parseGoalUnlockDate(s: string): Date | null {
  if (!s?.trim()) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = parseISO(s)
    return isValid(d) ? d : null
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatGoalUnlockDisplay(s: string): string {
  const d = parseGoalUnlockDate(s)
  if (d) return format(d, "MMM d, yyyy")
  return s
}
