import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface GlobalSearchProps {
  onClick?: () => void;
  transparent?: boolean;
}

// Detect macOS using userAgentData (modern) with fallback to userAgent
function detectMac(): boolean {
  // Modern API (Chromium browsers)
  if (typeof navigator !== "undefined" && "userAgentData" in navigator) {
    const platform = (navigator as any).userAgentData?.platform;
    if (platform) {
      return platform.toLowerCase().includes("mac");
    }
  }
  // Fallback to userAgent for Safari and older browsers
  if (typeof navigator !== "undefined") {
    return /mac/i.test(navigator.userAgent);
  }
  return false;
}

export function GlobalSearch({
  onClick,
  transparent = false,
}: GlobalSearchProps) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(detectMac());
  }, []);

  return (
    <Button
      variant={transparent ? "ghost" : "outline"}
      className={cn(
        "w-64 justify-start gap-2 font-normal h-9 px-3",
        transparent
          ? "bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 hover:text-white"
          : "text-muted-foreground hover:bg-muted/50",
      )}
      onClick={onClick}
    >
      <Search
        className={cn("h-4 w-4 shrink-0", transparent && "drop-shadow-sm")}
      />
      <span className="flex-1 text-left truncate">
        Search clients, projects...
      </span>
      <kbd
        className={cn(
          "pointer-events-none hidden h-5 select-none items-center gap-1 rounded px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex",
          transparent
            ? "bg-white/20 border-white/30 text-white/80"
            : "border bg-muted",
        )}
      >
        {isMac ? "⌘" : "Ctrl"}K
      </kbd>
    </Button>
  );
}
