import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  FolderOpen,
  FileText,
  Loader2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalSearch, useRecentItems } from "@/hooks/use-global-search";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-700",
  SENT: "bg-blue-100 text-blue-700",
  VIEWED: "bg-purple-100 text-purple-700",
  ACCEPTED: "bg-green-100 text-green-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
};

type ResultItem = {
  type: "contact" | "project" | "smartFile";
  id: string;
  label: string;
  sublabel: string;
  status?: string;
};

// Safe date formatter that handles invalid dates
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [, navigate] = useLocation();
  const { query, setQuery, results, isLoading, isSearching, hasResults } = useGlobalSearch(open);
  const { recentContacts, recentProjects, isLoading: recentLoading } = useRecentItems(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Build flat list of all results for keyboard navigation (memoized)
  const allResults: ResultItem[] = useMemo(() => {
    if (isSearching) {
      return [
        ...results.projects.map((p) => {
          const dateStr = formatDate(p.eventDate);
          return {
            type: "project" as const,
            id: p.id,
            label: p.title,
            sublabel: `${p.projectType || "Project"}${dateStr ? ` | ${dateStr}` : ""}`,
          };
        }),
        ...results.smartFiles.map((f) => ({
          type: "smartFile" as const,
          id: f.id,
          label: f.name,
          sublabel: f.status,
          status: f.status,
        })),
        ...results.contacts.map((c) => ({
          type: "contact" as const,
          id: c.id,
          label: `${c.firstName} ${c.lastName}`,
          sublabel: c.email || c.phone || "",
        })),
      ];
    }
    // Recent items when not searching
    return [
      ...recentProjects.map((p) => ({
        type: "project" as const,
        id: p.id,
        label: p.title,
        sublabel: `${p.projectType || "Project"}${p.clientFirstName ? ` | ${p.clientFirstName} ${p.clientLastName}` : ""}`,
      })),
      ...recentContacts.map((c) => ({
        type: "contact" as const,
        id: c.id,
        label: `${c.firstName} ${c.lastName}`,
        sublabel: c.email || c.phone || "",
      })),
    ];
  }, [isSearching, results, recentProjects, recentContacts]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(0);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open, setQuery]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results, recentProjects, recentContacts]);

  const handleNavigate = useCallback((item: ResultItem) => {
    onOpenChange(false);
    switch (item.type) {
      case "contact":
        navigate(`/contacts/${item.id}`);
        break;
      case "project":
        navigate(`/projects/${item.id}`);
        break;
      case "smartFile":
        navigate(`/smart-files/${item.id}`);
        break;
    }
  }, [navigate, onOpenChange]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!allResults.length) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allResults.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allResults.length) % allResults.length);
        break;
      case "Enter":
        e.preventDefault();
        if (allResults[selectedIndex]) {
          handleNavigate(allResults[selectedIndex]);
        }
        break;
    }
  }, [allResults, selectedIndex, handleNavigate]);

  // Get current index offset for each section (for search results)
  const getSearchGlobalIndex = (type: string, localIndex: number): number => {
    let offset = 0;
    if (type === "smartFile") offset = results.projects.length;
    if (type === "contact") offset = results.projects.length + results.smartFiles.length;
    return offset + localIndex;
  };

  // Get current index offset for recent items
  const getRecentGlobalIndex = (type: string, localIndex: number): number => {
    let offset = 0;
    if (type === "contact") offset = recentProjects.length;
    return offset + localIndex;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b pr-12">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground shrink-0 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find clients, projects, proposals..."
            className="border-0 p-0 h-auto text-base focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
          />
        </div>

        {/* Results */}
        <ScrollArea className="h-[500px]">
          <div className="p-4">
            {/* Loading state for search */}
            {isSearching && isLoading && (
              <div className="py-8 text-center">
                <Loader2 className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3 animate-spin" />
                <p className="text-sm text-muted-foreground">Searching...</p>
              </div>
            )}

            {/* Search Results */}
            {isSearching && !isLoading && (
              <>
                {/* Projects Section */}
                {results.projects.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      {results.projects.length} Projects
                    </p>
                    <div className="space-y-1">
                      {results.projects.map((project, idx) => {
                        const globalIdx = getSearchGlobalIndex("project", idx);
                        return (
                          <div
                            key={project.id}
                            onClick={() => handleNavigate({ type: "project", id: project.id, label: project.title, sublabel: "" })}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                              globalIdx === selectedIndex
                                ? "bg-primary/10 ring-1 ring-primary/20"
                                : "hover:bg-muted"
                            )}
                          >
                            <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center shrink-0">
                              <FolderOpen className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{project.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {project.projectType || "Project"}
                                {project.clientFirstName && ` | ${project.clientFirstName} ${project.clientLastName}`}
                                {project.eventDate && ` | ${new Date(project.eventDate).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Smart Files Section */}
                {results.smartFiles.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      {results.smartFiles.length} Smart Files
                    </p>
                    <div className="space-y-1">
                      {results.smartFiles.map((file, idx) => {
                        const globalIdx = getSearchGlobalIndex("smartFile", idx);
                        return (
                          <div
                            key={file.id}
                            onClick={() => handleNavigate({ type: "smartFile", id: file.id, label: file.name, sublabel: file.status })}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                              globalIdx === selectedIndex
                                ? "bg-primary/10 ring-1 ring-primary/20"
                                : "hover:bg-muted"
                            )}
                          >
                            <div className="w-10 h-10 rounded bg-pink-100 flex items-center justify-center shrink-0">
                              <FileText className="h-5 w-5 text-pink-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{file.name}</p>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full font-medium",
                                  statusColors[file.status] || "bg-gray-100 text-gray-700"
                                )}>
                                  {file.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Contacts Section */}
                {results.contacts.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      {results.contacts.length} Contacts
                    </p>
                    <div className="space-y-1">
                      {results.contacts.map((contact, idx) => {
                        const globalIdx = getSearchGlobalIndex("contact", idx);
                        return (
                          <div
                            key={contact.id}
                            onClick={() => handleNavigate({ type: "contact", id: contact.id, label: `${contact.firstName} ${contact.lastName}`, sublabel: contact.email || "" })}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                              globalIdx === selectedIndex
                                ? "bg-primary/10 ring-1 ring-primary/20"
                                : "hover:bg-muted"
                            )}
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                              <span className="text-white font-medium text-sm">
                                {contact.firstName?.[0] || ''}{contact.lastName?.[0] || ''}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{contact.firstName} {contact.lastName}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {contact.email}
                                {contact.email && contact.phone && " | "}
                                {contact.phone}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {!hasResults && (
                  <div className="py-12 text-center">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No results found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try searching by name, email, or project title
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Recent Items (when not searching) */}
            {!isSearching && (
              <>
                {recentLoading ? (
                  <div className="py-8 text-center">
                    <Loader2 className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading recent items...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">Recently viewed</p>
                    </div>

                    {/* Recent Projects */}
                    {recentProjects.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Recent Projects
                        </p>
                        <div className="space-y-1">
                          {recentProjects.map((project, idx) => {
                            const globalIdx = getRecentGlobalIndex("project", idx);
                            return (
                              <div
                                key={project.id}
                                onClick={() => handleNavigate({ type: "project", id: project.id, label: project.title, sublabel: "" })}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                                  globalIdx === selectedIndex
                                    ? "bg-primary/10 ring-1 ring-primary/20"
                                    : "hover:bg-muted"
                                )}
                              >
                                <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center shrink-0">
                                  <FolderOpen className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{project.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {project.projectType || "Project"}
                                    {project.clientFirstName && ` | ${project.clientFirstName} ${project.clientLastName}`}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Recent Contacts */}
                    {recentContacts.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Recent Contacts
                        </p>
                        <div className="space-y-1">
                          {recentContacts.map((contact, idx) => {
                            const globalIdx = getRecentGlobalIndex("contact", idx);
                            return (
                              <div
                                key={contact.id}
                                onClick={() => handleNavigate({ type: "contact", id: contact.id, label: `${contact.firstName} ${contact.lastName}`, sublabel: contact.email || "" })}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                                  globalIdx === selectedIndex
                                    ? "bg-primary/10 ring-1 ring-primary/20"
                                    : "hover:bg-muted"
                                )}
                              >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                                  <span className="text-white font-medium text-sm">
                                    {contact.firstName?.[0] || ''}{contact.lastName?.[0] || ''}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{contact.firstName} {contact.lastName}</p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {contact.email}
                                    {contact.email && contact.phone && " | "}
                                    {contact.phone}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Empty state when no recent items */}
                    {recentProjects.length === 0 && recentContacts.length === 0 && (
                      <div className="py-8 text-center">
                        <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Type to search for clients, projects, or proposals
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Keyboard hint */}
            {allResults.length > 0 && (
              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground border-t mt-4">
                <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd> to navigate</span>
                <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> to select</span>
                <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd> to close</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
