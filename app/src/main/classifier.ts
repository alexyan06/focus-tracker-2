export type Tier1Result = "on_task" | "distraction" | "ambiguous";

export interface NativeSignal {
  appName: string | null;
  windowTitle: string | null;
}

export function classifyTier1(
  signal: NativeSignal,
  task: string,
  distractionList: string[],
): Tier1Result {
  const text = [signal.appName, signal.windowTitle]
    .filter((s): s is string => s !== null && s.length > 0)
    .join(" ")
    .toLowerCase();

  if (text.length === 0) return "ambiguous";

  for (const keyword of distractionList) {
    const kw = keyword.trim().toLowerCase();
    if (kw.length > 0 && text.includes(kw)) return "distraction";
  }

  const taskTokens = task
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  for (const token of taskTokens) {
    if (text.includes(token)) return "on_task";
  }

  return "ambiguous";
}
