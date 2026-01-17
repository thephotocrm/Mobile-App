import { useState, useEffect } from "react";
import { GlobalSearch } from "./global-search";
import { NotificationButton } from "./notification-button";
import { AIAssistantButton } from "./ai-assistant-button";
import { NewItemButton } from "./new-item-button";
import { SearchModal } from "./search-modal";
import { cn } from "@/lib/utils";

interface TopHeaderProps {
  onAIAssistantClick?: () => void;
  variant?: 'default' | 'transparent';
}

export function TopHeader({ onAIAssistantClick, variant = 'default' }: TopHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const isTransparent = variant === 'transparent';

  // Global keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header
        className={cn(
          "hidden md:flex h-14",
          isTransparent
            ? "absolute top-0 left-0 right-0 z-[25] bg-transparent"
            : "sticky top-0 z-[5] border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        )}
      >
        <div className="flex h-full w-full items-center justify-between px-4 gap-4">
          {/* Left: Search */}
          <GlobalSearch onClick={() => setSearchOpen(true)} transparent={isTransparent} />

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2">
            <NotificationButton transparent={isTransparent} />
            <AIAssistantButton onClick={onAIAssistantClick} transparent={isTransparent} />
            <NewItemButton transparent={isTransparent} />
          </div>
        </div>
      </header>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
