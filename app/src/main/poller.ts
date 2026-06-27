import activeWin from "active-win";
import { powerMonitor } from "electron";

const POLL_INTERVAL_MS = 7000;

export function startPolling(sessionId: string): () => void {
  const tick = async (): Promise<void> => {
    const win = await activeWin();
    const idleSeconds = powerMonitor.getSystemIdleTime();

    console.log("[poller]", {
      sessionId,
      timestamp: new Date().toISOString(),
      appName: win?.owner.name ?? null,
      windowTitle: win?.title ?? null,
      idleSeconds,
    });
  };

  void tick();
  const interval = setInterval(() => void tick(), POLL_INTERVAL_MS);

  return () => clearInterval(interval);
}
