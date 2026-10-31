/**
 * Monday 00:00 local time of the ISO week (Monday first) that contains the instant.
 *
 * @param time - Instant in epoch milliseconds.
 * @returns The start of its week.
 * @public
 */
export function startOfIsoWeek(time: number): Date {
  const date = new Date(time);
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}
