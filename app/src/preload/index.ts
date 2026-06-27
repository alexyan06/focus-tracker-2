import { contextBridge, ipcRenderer } from "electron";
import type {
  IpcApi,
  ClassificationTickPayload,
  NudgeTriggerPayload,
  NudgeClearPayload,
} from "../shared/ipc";

const api: IpcApi = {
  session: {
    start: (req) => ipcRenderer.invoke("session:start", req),
    end: (req) => ipcRenderer.invoke("session:end", req),
    getPast: (req) => ipcRenderer.invoke("session:getPast", req),
  },
  classification: {
    onTick: (cb) => {
      const handler = (
        _e: Electron.IpcRendererEvent,
        payload: ClassificationTickPayload,
      ) => cb(payload);
      ipcRenderer.on("classification:tick", handler);
      return () => ipcRenderer.removeListener("classification:tick", handler);
    },
  },
  nudge: {
    onTrigger: (cb) => {
      const handler = (
        _e: Electron.IpcRendererEvent,
        payload: NudgeTriggerPayload,
      ) => cb(payload);
      ipcRenderer.on("nudge:trigger", handler);
      return () => ipcRenderer.removeListener("nudge:trigger", handler);
    },
    onClear: (cb) => {
      const handler = (
        _e: Electron.IpcRendererEvent,
        payload: NudgeClearPayload,
      ) => cb(payload);
      ipcRenderer.on("nudge:clear", handler);
      return () => ipcRenderer.removeListener("nudge:clear", handler);
    },
  },
};

contextBridge.exposeInMainWorld("api", api);
