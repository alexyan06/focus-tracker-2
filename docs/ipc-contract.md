# IPC & Messaging Contract

Single source of truth for channel names and payload shapes across the three boundaries in this app:
renderer ↔ main (Electron IPC), main ↔ extension (local WebSocket), and main → Claude API (documented separately in the `activity-classification` skill).

If you change a shape here, update both sides in the same commit. Claude Code sessions on `app/` and `extension/` may not share context — this file is what keeps them honest with each other.

## Conventions

- Channel names: `domain:action`, lowercase, colon-separated (e.g. `session:start`, not `startSession`).
- All payloads are JSON-serializable plain objects — no class instances, no `Date` objects (use ISO 8601 strings).
- Every event that crosses a boundary has a fixed shape below. Don't invent ad-hoc fields; add a new field here first if one is needed.

---

## Renderer → Main (via `ipcRenderer.invoke`, exposed through `preload.ts`)

### `session:start`

Request:

```ts
{ task: string; distractionList: string[] }
```

Response:

```ts
{
  sessionId: string;
  startedAt: string;
}
```

### `session:end`

Request:

```ts
{
  sessionId: string;
}
```

Response:

```ts
{ summary: string; nextSteps: string[]; onTaskSeconds: number; distractedSeconds: number }
```

### `session:getPast`

Request: `{ limit: number }`
Response: `{ sessions: Array<{ id: string; startedAt: string; endedAt: string; task: string; summary: string }> }`

---

## Main → Renderer (via `webContents.send`, listened on via preload-exposed `on`)

### `classification:tick`

Fired on every classification result, used to update the live session view.

```ts
{
  sessionId: string;
  timestamp: string;
  signalType: "native" | "browser" | "vision";
  classification: "on_task" | "distraction" | "drift" | "ambiguous";
}
```

### `nudge:trigger`

Fired when a nudge stage is entered or escalates.

```ts
{
  sessionId: string;
  stage: 1 | 2 | 3;
  task: string;
  distractedSinceSeconds: number;
}
```

### `nudge:clear`

Fired the moment classification returns to on-task and the stage resets to 0.

```ts
{
  sessionId: string;
}
```

---

## Extension → Main (WebSocket, `ws://localhost:WS_PORT`)

Extension is a client; main runs the WebSocket server. Port comes from `.env` (`WS_PORT`, default `8743`), must match the value baked into the extension build — see §2 below.

### `tab:update` (extension → main, sent on tab focus change or URL change in the active tab)

```ts
{
  type: "tab:update";
  url: string;
  tabTitle: string;
  timestamp: string;
}
```

### `connection:hello` (extension → main, sent immediately on WebSocket open)

```ts
{
  type: "connection:hello";
  extensionVersion: string;
}
```

### `connection:ack` (main → extension, reply to `connection:hello`)

```ts
{
  type: "connection:ack";
  serverVersion: string;
}
```

**Reconnection rule:** the extension must retry connecting every 5s if the WebSocket closes or fails to open (the Electron app may not be running, or may have restarted). Main does not need to do anything special on the server side beyond accepting new connections — no session/auth state is tied to a particular WebSocket connection.

---

## Open question to resolve before implementing

None currently — if a new field or channel is needed mid-build, add it here in the same PR/commit as the code that needs it, don't let code and this doc drift apart.
