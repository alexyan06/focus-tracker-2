import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { PastSession } from "../../shared/ipc";

export function App(): React.JSX.Element {
  const [sessions, setSessions] = useState<PastSession[]>([]);

  useEffect(() => {
    window.api.session
      .getPast({ limit: 5 })
      .then(({ sessions: s }) => setSessions(s))
      .catch((err: unknown) =>
        console.error("[App] session.getPast failed:", err),
      );
  }, []);

  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center bg-background",
      )}
    >
      <div className="rounded-lg bg-card p-8 text-card-foreground shadow-md">
        <h1 className="text-2xl font-bold">Focus Tracker</h1>
        <p className="mt-2 text-muted-foreground">shadcn/ui pipeline ready.</p>
        <p className="mt-4 text-sm text-muted-foreground">
          IPC bridge:{" "}
          {sessions.length === 0
            ? "connected (0 past sessions)"
            : `${sessions.length} past sessions`}
        </p>
      </div>
    </div>
  );
}
