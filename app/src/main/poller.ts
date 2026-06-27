import activeWin from "active-win";
import { BrowserWindow, powerMonitor } from "electron";
import { insertClassificationEvent } from "./db";
import { classifyTier1 } from "./classifier";
import type { ClassificationTickPayload } from "../shared/ipc";

const POLL_INTERVAL_MS = 7000;

export function startPolling(
  sessionId: string,
  task: string,
  distractionList: string[],
): () => void {
  const tick = async (): Promise<void> => {
    const win = await activeWin();
    const idleSeconds = powerMonitor.getSystemIdleTime();
    const timestamp = new Date().toISOString();

    const appName = win?.owner.name ?? null;
    const windowTitle = win?.title ?? null;

    const classification = classifyTier1(
      { appName, windowTitle },
      task,
      distractionList,
    );

    insertClassificationEvent({
      sessionId,
      timestamp,
      signalType: "native",
      rawSignal: { appName, windowTitle, idleSeconds },
      classification,
    });

    const payload: ClassificationTickPayload = {
      sessionId,
      timestamp,
      signalType: "native",
      classification,
    };
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      "classification:tick",
      payload,
    );

    console.log("[poller]", {
      sessionId,
      timestamp,
      appName,
      windowTitle,
      idleSeconds,
      classification,
    });
  };

  void tick();
  const interval = setInterval(() => void tick(), POLL_INTERVAL_MS);

  return () => clearInterval(interval);
}
