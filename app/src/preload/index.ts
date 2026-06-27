import { contextBridge } from "electron";

// Stub — full typed IPC bridge implemented in task 3
contextBridge.exposeInMainWorld("api", {});
