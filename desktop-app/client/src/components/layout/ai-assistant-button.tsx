import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AIAssistantButtonProps {
  onClick?: () => void;
  transparent?: boolean;
}

export function AIAssistantButton({ onClick, transparent = false }: AIAssistantButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className={cn(
              "relative group",
              transparent
                ? "bg-white/15 backdrop-blur-md border border-white/20 hover:bg-white/25"
                : "hover:bg-purple-50 dark:hover:bg-purple-950/20"
            )}
          >
            <Sparkles className={cn(
              "h-6 w-6 transition-colors",
              transparent
                ? "text-white drop-shadow-sm group-hover:text-white"
                : "text-purple-500 group-hover:text-purple-600"
            )} />
            {/* Subtle animated glow effect */}
            {!transparent && (
              <span className="absolute inset-0 rounded-md bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>AI Assistant</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
