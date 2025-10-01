import { cn } from "@/lib/utils";

export const LiveIndicator = () => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-accent rounded-full">
      <div className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-live"></span>
      </div>
      <span className="text-xs font-medium text-accent-foreground">Live Monitoring</span>
    </div>
  );
};