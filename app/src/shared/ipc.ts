// Renderer → Main (invoke) payloads

export interface SessionStartRequest {
  task: string;
  distractionList: string[];
}

export interface SessionStartResponse {
  sessionId: string;
  startedAt: string; // ISO 8601
}

export interface SessionEndRequest {
  sessionId: string;
}

export interface SessionEndResponse {
  summary: string;
  nextSteps: string[];
  onTaskSeconds: number;
  distractedSeconds: number;
}

export interface SessionGetPastRequest {
  limit: number;
}

export interface PastSession {
  id: string;
  startedAt: string; // ISO 8601
  endedAt: string; // ISO 8601
  task: string;
  summary: string;
}

export interface SessionGetPastResponse {
  sessions: PastSession[];
}

// Main → Renderer (push event) payloads

export interface ClassificationTickPayload {
  sessionId: string;
  timestamp: string; // ISO 8601
  signalType: "native" | "browser" | "vision";
  classification: "on_task" | "distraction" | "drift" | "ambiguous";
}

export interface NudgeTriggerPayload {
  sessionId: string;
  stage: 1 | 2 | 3;
  task: string;
  distractedSinceSeconds: number;
}

export interface NudgeClearPayload {
  sessionId: string;
}

// Bridge shape exposed via contextBridge

export interface IpcApi {
  session: {
    start(req: SessionStartRequest): Promise<SessionStartResponse>;
    end(req: SessionEndRequest): Promise<SessionEndResponse>;
    getPast(req: SessionGetPastRequest): Promise<SessionGetPastResponse>;
  };
  classification: {
    onTick(cb: (payload: ClassificationTickPayload) => void): () => void;
  };
  nudge: {
    onTrigger(cb: (payload: NudgeTriggerPayload) => void): () => void;
    onClear(cb: (payload: NudgeClearPayload) => void): () => void;
  };
}
