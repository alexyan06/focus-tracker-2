import { useState } from "react";
import { SessionSetup } from "./components/SessionSetup";
import { SessionActive } from "./components/SessionActive";

type Screen = "setup" | "active";

export function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>("setup");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  const handleStarted = (id: string, at: string): void => {
    setSessionId(id);
    setStartedAt(at);
    setScreen("active");
  };

  const handleEnded = (): void => {
    setSessionId(null);
    setStartedAt(null);
    setScreen("setup");
  };

  if (screen === "active" && sessionId !== null && startedAt !== null) {
    return (
      <SessionActive
        sessionId={sessionId}
        startedAt={startedAt}
        onEnded={handleEnded}
      />
    );
  }

  return <SessionSetup onStarted={handleStarted} />;
}
