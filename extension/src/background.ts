const WS_PORT = 8743;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connect(): void {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  ws = new WebSocket(`ws://localhost:${WS_PORT}`);

  ws.onopen = () => {
    console.log("[focus-tracker] connected to Electron app");
    ws?.send(
      JSON.stringify({
        type: "connection:hello",
        extensionVersion: chrome.runtime.getManifest().version,
      }),
    );
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string) as { type: string };
      if (msg.type === "connection:ack") {
        console.log("[focus-tracker] connection acknowledged by server");
      }
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    ws = null;
    reconnectTimer = setTimeout(connect, 5000);
  };

  ws.onerror = () => {
    // error fires before close; close handler schedules reconnect
  };
}

function sendTabUpdate(tab: chrome.tabs.Tab): void {
  if (ws?.readyState !== WebSocket.OPEN) return;
  if (!tab.url || !tab.title) return;

  ws.send(
    JSON.stringify({
      type: "tab:update",
      url: tab.url,
      tabTitle: tab.title,
      timestamp: new Date().toISOString(),
    }),
  );
}

connect();

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    sendTabUpdate(tab);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    sendTabUpdate(tab);
  }
});
