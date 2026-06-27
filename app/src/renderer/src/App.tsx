import { cn } from "@/lib/utils";

export function App(): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center bg-background",
      )}
    >
      <div className="rounded-lg bg-card text-card-foreground p-8 shadow-md">
        <h1 className="text-2xl font-bold">Focus Tracker</h1>
        <p className="mt-2 text-muted-foreground">shadcn/ui pipeline ready.</p>
      </div>
    </div>
  );
}
