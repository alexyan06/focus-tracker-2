import activeWin from "active-win";
import { BrowserWindow, powerMonitor } from "electron";
import { insertClassificationEvent } from "./db";
import { classifyTier1 } from "./classifier";
import { getLatestBrowserSignal } from "./ws-server";
import type { ClassificationTickPayload } from "../shared/ipc";

const BROWSER_APP_NAMES = [
  "google chrome",
  "chrome",
  "chromium",
  "safari",
  "firefox",
  "arc",
  "brave",
  "microsoft edge",
  "opera",
];

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

    const isBrowser =
      appName !== null && BROWSER_APP_NAMES.includes(appName.toLowerCase());

    const browserSignal = isBrowser ? getLatestBrowserSignal() : null;

    let classification: ReturnType<typeof classifyTier1>;
    let signalType: ClassificationTickPayload["signalType"];
    let rawSignal: object;

    if (browserSignal !== null) {
      classification = classifyTier1(
        { appName, windowTitle: browserSignal.tabTitle },
        task,
        distractionList,
      );
      signalType = "browser";
      rawSignal = {
        appName,
        url: browserSignal.url,
        tabTitle: browserSignal.tabTitle,
        idleSeconds,
      };
    } else {
      classification = classifyTier1(
        { appName, windowTitle },
        task,
        distractionList,
      );
      signalType = "native";
      rawSignal = { appName, windowTitle, idleSeconds };
    }

    insertClassificationEvent({
      sessionId,
      timestamp,
      signalType,
      rawSignal,
      classification,
    });

    const payload: ClassificationTickPayload = {
      sessionId,
      timestamp,
      signalType,
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
      signal:
        browserSignal !== null
          ? { tabTitle: browserSignal.tabTitle, url: browserSignal.url }
          : { windowTitle },
      signalType,
      idleSeconds,
      classification,
    });
  };

  void tick();
  const interval = setInterval(() => void tick(), POLL_INTERVAL_MS);

  return () => clearInterval(interval);
}
