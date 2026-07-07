const UNIT_MAP = {
  ms: 1,
  s: 1000,
  sec: 1000,
  m: 60_000,
  min: 60_000,
  h: 3_600_000,
  hr: 3_600_000,
  hour: 3_600_000,
} as const;

export function parseDuration(input: string): number {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed || trimmed === "0" || trimmed === "none" || trimmed === "off" || trimmed === "disabled" || trimmed === "false") {
    return 0;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(ms|s|sec|m|min|h|hr|hour)$/);
  if (!match) {
    throw new Error(`Invalid duration: "${input}". Expected format like "5m", "30s", "2h", or a number in ms.`);
  }

  const value = Number(match[1]);
  const unit = match[2]! as keyof typeof UNIT_MAP;
  return Math.round(value * UNIT_MAP[unit]!);
}
