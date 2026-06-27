import { WebSocketServer } from "ws";
import { app } from "electron";

const WS_PORT = 8743;

export function startWsServer(): void {
  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on("listening", () => {
    console.log(`[ws] server listening on :${WS_PORT}`);
  });

  wss.on("connection", (socket) => {
    console.log("[ws] client connected");

    socket.on("message", (data) => {
      let msg: unknown;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        console.warn("[ws] received non-JSON message");
        return;
      }

      if (typeof msg === "object" && msg !== null && "type" in msg) {
        const { type } = msg as { type: string };

        if (type === "connection:hello") {
          socket.send(
            JSON.stringify({
              type: "connection:ack",
              serverVersion: app.getVersion(),
            }),
          );
          console.log("[ws] connection:hello →", msg);
        } else if (type === "tab:update") {
          // task 9 will route this into the classifier — log only for now
          console.log("[ws] tab:update →", msg);
        }
      }
    });

    socket.on("close", () => {
      console.log("[ws] client disconnected");
    });

    socket.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code !== "ECONNRESET") {
        console.error("[ws] socket error:", err);
      }
    });
  });

  wss.on("error", (err) => {
    console.error("[ws] server error:", err);
  });
}

export { WS_PORT };
