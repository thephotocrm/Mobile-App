import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  ChevronDown,
  FolderPlus,
  UserPlus,
  FileText,
  Zap,
  Mail,
  Image,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NewItemButtonProps {
  transparent?: boolean;
}

export function NewItemButton({ transparent = false }: NewItemButtonProps) {
  const [, navigate] = useLocation();

  const handleNew = (path: string) => {
    navigate(`${path}?new=true`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-9 px-3 gap-1",
            transparent
              ? "bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 hover:text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Plus className={cn("h-4 w-4", transparent && "drop-shadow-sm")} />
          <span className="hidden sm:inline">New</span>
          <ChevronDown
            className={cn("h-3 w-3", transparent ? "opacity-70" : "opacity-50")}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => handleNew("/projects")}
        >
          <FolderPlus className="mr-2 h-4 w-4 text-primary/70" />
          <span>New Project</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => handleNew("/contacts")}
        >
          <UserPlus className="mr-2 h-4 w-4 text-primary/70" />
          <span>New Contact</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => handleNew("/smart-files")}
        >
          <FileText className="mr-2 h-4 w-4 text-primary/70" />
          <span>New Smart File</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => handleNew("/galleries")}
        >
          <Image className="mr-2 h-4 w-4 text-primary/70" />
          <span>New Gallery</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => handleNew("/automations")}
        >
          <Zap className="mr-2 h-4 w-4 text-primary/70" />
          <span>New Automation</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => handleNew("/templates")}
        >
          <Mail className="mr-2 h-4 w-4 text-primary/70" />
          <span>New Email Template</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
