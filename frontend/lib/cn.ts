/**
 * Minimal className combiner. Falsy values are dropped so callers can write
 * conditional classes inline without pulling in clsx/tailwind-merge.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
