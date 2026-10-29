/** Formats a date as DD/MM/YYYY (local time). */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
