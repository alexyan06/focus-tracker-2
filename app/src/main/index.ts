import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import type {
  SessionStartRequest,
  SessionStartResponse,
  SessionEndRequest,
  SessionEndResponse,
  SessionGetPastRequest,
  SessionGetPastResponse,
} from "../shared/ipc";
import { createSession, endSession, getPastSessions } from "./db";
import { startPolling } from "./poller";

let stopPolling: (() => void) | null = null;

ipcMain.handle(
  "session:start",
  (_e, req: SessionStartRequest): SessionStartResponse => {
    const { id, startedAt } = createSession(req.task, req.distractionList);
    stopPolling?.();
    stopPolling = startPolling(id);
    return { sessionId: id, startedAt };
  },
);

ipcMain.handle(
  "session:end",
  (_e, req: SessionEndRequest): SessionEndResponse => {
    stopPolling?.();
    stopPolling = null;
    // Summary generation (Claude API) is a later task — store empty summary for now.
    endSession(req.sessionId, "");
    return {
      summary: "Session ended. Summary generation coming in a later task.",
      nextSteps: [],
      onTaskSeconds: 0,
      distractedSeconds: 0,
    };
  },
);

ipcMain.handle(
  "session:getPast",
  (_e, req: SessionGetPastRequest): SessionGetPastResponse => ({
    sessions: getPastSessions(req.limit),
  }),
);

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
    },
  });

  mainWindow.on("ready-to-show", () => mainWindow.show());

  if (process.env["ELECTRON_RENDERER_URL"] !== undefined) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
