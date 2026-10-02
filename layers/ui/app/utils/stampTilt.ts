const MAX_TILT_DEGREES = 6

/** Inclinação estável (−6° a +6°): o mesmo carimbo cai sempre do mesmo jeito. */
export function stampTilt(seed: string, salt = 0): number {
  let hash = salt * 31
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) % 9973
  return (hash % (MAX_TILT_DEGREES * 2 + 1)) - MAX_TILT_DEGREES
}
