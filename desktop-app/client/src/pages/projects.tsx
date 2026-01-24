import { useState, useEffect, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Calendar,
  ChevronRight,
  MoreVertical,
  Settings,
  Zap,
  X,
  Edit2,
  Trash2,
  Loader2,
  GripVertical,
  Archive,
  ArchiveRestore,
  FolderOpen,
  Camera,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { type ProjectWithClientAndStage, type Contact } from "@shared/schema";
import { useProjectTypes } from "@/hooks/use-project-types";

type Stage = {
  id: string;
  name: string;
  orderIndex: number;
  color: string;
  isDefault: boolean;
  projectType: string;
  photographerId: string;
};

const STAGE_COLORS = [
  "#64748b",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
];

function SortableStageCard({
  stage,
  editingStage,
  setEditingStage,
  editName,
  setEditName,
  editColor,
  setEditColor,
  handleSaveEdit,
  handleStartDelete,
  updateStageMutation,
  stages,
}: {
  stage: Stage;
  editingStage: Stage | null;
  setEditingStage: (stage: Stage | null) => void;
  editName: string;
  setEditName: (name: string) => void;
  editColor: string;
  setEditColor: (color: string) => void;
  handleSaveEdit: () => void;
  handleStartDelete: (stage: Stage) => void;
  updateStageMutation: UseMutationResult<
    unknown,
    Error,
    { id: string; name?: string; color?: string }
  >;
  stages: Stage[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex-shrink-0 w-[140px] h-[100px] border rounded-lg p-3 relative group hover:border-primary transition-colors bg-background",
        isDragging && "shadow-lg ring-2 ring-primary",
      )}
      data-testid={`stage-card-${stage.id}`}
    >
      {editingStage?.id === stage.id ? (
        <div className="flex flex-col h-full">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-7 text-sm mb-2"
            autoFocus
            data-testid="input-edit-stage-name"
          />
          <div className="flex gap-1 mb-2">
            {STAGE_COLORS.slice(0, 5).map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  "w-4 h-4 rounded-full border-2",
                  editColor === color
                    ? "border-foreground"
                    : "border-transparent",
                )}
                style={{ backgroundColor: color }}
                onClick={() => setEditColor(color)}
              />
            ))}
          </div>
          <div className="flex gap-1 mt-auto">
            <Button
              size="sm"
              className="h-6 flex-1 text-xs"
              onClick={handleSaveEdit}
              disabled={updateStageMutation.isPending}
            >
              {updateStageMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={() => setEditingStage(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 hover:bg-muted rounded"
              data-testid={`drag-handle-stage-${stage.id}`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color || "#64748b" }}
            />
          </div>
          <p className="text-sm font-medium line-clamp-2">{stage.name}</p>
          {stage.isDefault && (
            <Badge
              variant="secondary"
              className="absolute bottom-2 left-2 text-[10px] px-1 py-0"
            >
              Default
            </Badge>
          )}
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={() => {
                setEditingStage(stage);
                setEditName(stage.name);
                setEditColor(stage.color || "#64748b");
              }}
              className="p-1 hover:bg-muted rounded bg-background/50 backdrop-blur-sm shadow-sm"
              data-testid={`button-edit-stage-${stage.id}`}
            >
              <Edit2 className="w-3 h-3" />
            </button>
            {stages.length > 1 && (
              <button
                onClick={() => handleStartDelete(stage)}
                className="p-1 hover:bg-destructive/10 rounded text-destructive bg-background/50 backdrop-blur-sm shadow-sm"
                data-testid={`button-delete-stage-${stage.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PipelineCustomizeModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#64748b");
  const [deleteStage, setDeleteStage] = useState<Stage | null>(null);
  const [reassignToStageId, setReassignToStageId] = useState("");
  const [deleteStats, setDeleteStats] = useState<{
    projectCount: number;
    automationCount: number;
    campaignCount: number;
  } | null>(null);

  // Stages are now unified per photographer (no project type filter)
  const { data: stages = [], isLoading } = useQuery<Stage[]>({
    queryKey: ["/api/stages"],
    queryFn: async () => {
      const response = await fetch(`/api/stages`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch stages");
      return response.json();
    },
    enabled: open,
  });

  const createStageMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      color: string;
      orderIndex: number;
    }) => {
      return apiRequest("POST", "/api/stages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      setIsAddingStage(false);
      setNewStageName("");
      setNewStageColor("#64748b");
      toast({ title: "Stage created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create stage",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      color?: string;
    }) => {
      return apiRequest("PATCH", `/api/stages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      setEditingStage(null);
      toast({ title: "Stage updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update stage",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: async ({
      id,
      reassignToStageId,
    }: {
      id: string;
      reassignToStageId?: string;
    }) => {
      return apiRequest("DELETE", `/api/stages/${id}`, { reassignToStageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      setDeleteStage(null);
      setDeleteStats(null);
      setReassignToStageId("");
      toast({ title: "Stage deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete stage",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderStagesMutation = useMutation({
    mutationFn: async (stageOrders: { id: string; orderIndex: number }[]) => {
      return apiRequest("POST", "/api/stages/reorder", { stageOrders });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reorder stages",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Prevent concurrent reorder operations
    if (reorderStagesMutation.isPending) return;

    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);

    const newStages = arrayMove(stages, oldIndex, newIndex);
    const stageOrders = newStages.map((s, index) => ({
      id: s.id,
      orderIndex: index,
    }));

    // Optimistically update the cache
    queryClient.setQueryData(
      ["/api/stages"],
      newStages.map((s, idx) => ({ ...s, orderIndex: idx })),
    );

    reorderStagesMutation.mutate(stageOrders);
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    const maxOrder =
      stages.length > 0 ? Math.max(...stages.map((s) => s.orderIndex)) : 0;
    createStageMutation.mutate({
      name: newStageName.trim(),
      color: newStageColor,
      orderIndex: maxOrder + 1,
    });
  };

  const handleSaveEdit = () => {
    if (!editingStage || !editName.trim()) return;
    updateStageMutation.mutate({
      id: editingStage.id,
      name: editName.trim(),
      color: editColor,
    });
  };

  const handleStartDelete = async (stage: Stage) => {
    setDeleteStage(stage);
    try {
      const response = await fetch(`/api/stages/${stage.id}/usage`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setDeleteStats(data.stats);
      } else {
        toast({
          title: "Warning",
          description:
            "Could not fetch stage usage data. Proceed with caution.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch stage usage:", error);
      toast({
        title: "Warning",
        description: "Could not fetch stage usage data. Proceed with caution.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteStage) return;
    if (
      deleteStats?.projectCount &&
      deleteStats.projectCount > 0 &&
      !reassignToStageId
    ) {
      toast({
        title: "Select a stage to reassign projects",
        variant: "destructive",
      });
      return;
    }
    deleteStageMutation.mutate({
      id: deleteStage.id,
      reassignToStageId: reassignToStageId || undefined,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[85vh] min-h-[400px] p-0">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle>Customize Pipeline Stages</DialogTitle>
              <DialogDescription>
                Add, delete, rename, or reorder your pipeline stages.
                <br />
                These stages apply to all project types.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 overflow-hidden">
            <ScrollArea className="w-full" type="always">
              <div className="flex gap-3 pb-4">
                {/* Add Stage Button */}
                {isAddingStage ? (
                  <div className="flex-shrink-0 w-[140px] border-2 border-dashed border-primary rounded-lg p-3 bg-muted/50">
                    <Input
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="Stage name"
                      className="mb-2 h-8 text-sm"
                      autoFocus
                      data-testid="input-new-stage-name"
                    />
                    <div className="flex gap-1 mb-2">
                      {STAGE_COLORS.slice(0, 5).map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={cn(
                            "w-5 h-5 rounded-full border-2",
                            newStageColor === color
                              ? "border-foreground"
                              : "border-transparent",
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewStageColor(color)}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-7 flex-1 text-xs"
                        onClick={handleAddStage}
                        disabled={createStageMutation.isPending}
                        data-testid="button-save-new-stage"
                      >
                        {createStageMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Add"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => {
                          setIsAddingStage(false);
                          setNewStageName("");
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingStage(true)}
                    className="flex-shrink-0 w-[100px] h-[100px] border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-muted/50 transition-colors"
                    data-testid="button-add-stage"
                  >
                    <Plus className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Add stage</span>
                  </button>
                )}

                {/* Stage Cards */}
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading stages...</span>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={stages.map((s) => s.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {stages.map((stage) => (
                        <SortableStageCard
                          key={stage.id}
                          stage={stage}
                          editingStage={editingStage}
                          setEditingStage={setEditingStage}
                          editName={editName}
                          setEditName={setEditName}
                          editColor={editColor}
                          setEditColor={setEditColor}
                          handleSaveEdit={handleSaveEdit}
                          handleStartDelete={handleStartDelete}
                          updateStageMutation={updateStageMutation}
                          stages={stages}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          <div className="border-t p-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteStage}
        onOpenChange={(open) => !open && setDeleteStage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete "{deleteStage?.name}" stage?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteStats && deleteStats.projectCount > 0 ? (
                <div className="space-y-3">
                  <p>
                    This stage has {deleteStats.projectCount} project(s)
                    assigned to it.
                  </p>
                  <div>
                    <Label className="text-sm">Reassign projects to:</Label>
                    <Select
                      value={reassignToStageId}
                      onValueChange={setReassignToStageId}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages
                          .filter((s) => s.id !== deleteStage?.id)
                          .map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(deleteStats.automationCount > 0 ||
                    deleteStats.campaignCount > 0) && (
                    <p className="text-sm text-amber-600">
                      Note: {deleteStats.automationCount} automation(s) and{" "}
                      {deleteStats.campaignCount} campaign(s) reference this
                      stage and may need manual updates.
                    </p>
                  )}
                </div>
              ) : (
                <p>This action cannot be undone.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteStage(null);
                setDeleteStats(null);
                setReassignToStageId("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={
                deleteStageMutation.isPending ||
                Boolean(
                  deleteStats?.projectCount &&
                    deleteStats.projectCount > 0 &&
                    !reassignToStageId,
                )
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete Stage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function Projects() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch project types from API
  const { projectTypes: apiProjectTypes, isLoading: projectTypesLoading } =
    useProjectTypes();

  // Transform API project types to dropdown format - memoized with "All Types" option
  const PROJECT_TYPES = useMemo(
    () => [
      { value: "ALL", label: "All Types" },
      ...apiProjectTypes.map((pt) => ({
        value: pt.slug,
        label: pt.name,
      })),
    ],
    [apiProjectTypes],
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManageStagesOpen, setIsManageStagesOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("");
  const [clientId, setClientId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [noDateYet, setNoDateYet] = useState(false);
  const [notes, setNotes] = useState("");
  const [enableAutomations, setEnableAutomations] = useState(true);
  const [enableDripCampaigns, setEnableDripCampaigns] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [activeProjectType, setActiveProjectType] = useState<string>("ALL"); // Default to "All Types"
  const [activeTab, setActiveTab] = useState<"all" | "active" | "archived">(
    "active",
  );

  // Handle query parameters to pre-select client or auto-open dialog
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const clientIdParam = urlParams.get("clientId");
    const newParam = urlParams.get("new");
    if (clientIdParam) {
      setClientId(clientIdParam);
      setIsDialogOpen(true);
    } else if (newParam === "true") {
      setIsDialogOpen(true);
      // Clear the query param from URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Fetch projects with auto-refresh - fetch all when "ALL" is selected
  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsError,
  } = useQuery<ProjectWithClientAndStage[]>({
    queryKey: ["/api/projects", activeProjectType],
    queryFn: async () => {
      const url =
        activeProjectType === "ALL"
          ? `/api/projects`
          : `/api/projects?projectType=${activeProjectType}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
    retry: 2,
  });

  // Fetch stages - unified pipeline (no project type filter)
  const { data: stages, isLoading: stagesLoading } = useQuery<Stage[]>({
    queryKey: ["/api/stages"],
    queryFn: async () => {
      const response = await fetch(`/api/stages`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch stages");
      return response.json();
    },
    enabled: !!user,
    retry: 2,
  });

  // Fetch clients for the dropdown
  const { data: clients, isLoading: clientsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: !!user,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: {
      title: string;
      projectType: string;
      clientId: string;
      eventDate?: Date;
      notes?: string;
      enableAutomations: boolean;
      enableDripCampaigns: boolean;
    }) => {
      await apiRequest("POST", "/api/projects", projectData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Project created",
        description: "New project has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const archiveProjectMutation = useMutation({
    mutationFn: async ({
      projectId,
      archive,
    }: {
      projectId: string;
      archive: boolean;
    }) => {
      await apiRequest("PATCH", `/api/projects/${projectId}/archive`, {
        archive,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: variables.archive ? "Project archived" : "Project restored",
        description: variables.archive
          ? "Project has been moved to the archived list."
          : "Project has been restored to the active list.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setProjectType("");
    setClientId("");
    setEventDate("");
    setNoDateYet(false);
    setNotes("");
    setEnableAutomations(true);
    setEnableDripCampaigns(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !projectType || !clientId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createProjectMutation.mutate({
      title,
      projectType,
      clientId,
      eventDate: eventDate ? new Date(eventDate) : undefined,
      notes: notes || undefined,
      enableAutomations,
      enableDripCampaigns,
    });
  };

  // Split projects into active and archived
  const activeProjects =
    projects?.filter(
      (project: ProjectWithClientAndStage) =>
        project.status === "ACTIVE" || !project.status,
    ) || [];

  const archivedProjects =
    projects?.filter(
      (project: ProjectWithClientAndStage) => project.status === "ARCHIVED",
    ) || [];

  // Get the projects to show based on active tab
  const projectsToShow =
    activeTab === "all"
      ? projects
      : activeTab === "active"
        ? activeProjects
        : archivedProjects;

  // Filter projects by stage and search
  const filteredProjects = projectsToShow.filter(
    (project: ProjectWithClientAndStage) => {
      const matchesStage =
        selectedStage === "ALL" || project.stageId === selectedStage;
      const matchesSearch =
        (project.title || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        `${project.client?.firstName || ""} ${project.client?.lastName || ""}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      return matchesStage && matchesSearch;
    },
  );

  // Calculate stage counts (only for current tab's projects) - memoized
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: projectsToShow.length };

    stages?.forEach((stage) => {
      counts[stage.id] = projectsToShow.filter(
        (p) => p.stageId === stage.id,
      ).length;
    });

    return counts;
  }, [stages, projectsToShow]);

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "TBD";
    // Extract YYYY-MM-DD and parse as local date (not UTC) to avoid timezone shift
    const dateStr = typeof date === "string" ? date : date.toISOString();
    const datePart = dateStr.split("T")[0];
    const [year, month, day] = datePart.split("-").map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return "TBD";
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString();
  };

  const getProjectTypeLabel = (type: string) => {
    return PROJECT_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="h-full flex flex-col w-full">
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-[1140px] mx-auto w-full p-4 md:p-6 space-y-4 min-w-0">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <SidebarTrigger
                data-testid="button-menu-toggle"
                className="md:hidden shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-3xl md:text-4xl font-semibold">Projects</h1>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsManageStagesOpen(true)}
                data-testid="button-customize-pipeline"
              >
                <Settings className="w-4 h-4 mr-2" />
                Customize Pipeline
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-new">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Project</DialogTitle>
                    <DialogDescription>
                      Create a new photography project and assign it to a
                      client.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Project Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter project title"
                        required
                        data-testid="input-project-title"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="projectType">Project Type *</Label>
                      <Select
                        value={projectType}
                        onValueChange={setProjectType}
                      >
                        <SelectTrigger data-testid="select-project-type">
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientId">Contact *</Label>
                      <Select value={clientId} onValueChange={setClientId}>
                        <SelectTrigger data-testid="select-client">
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.firstName} {client.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="eventDate">Event Date</Label>
                      <Input
                        id="eventDate"
                        type="date"
                        value={eventDate}
                        onChange={(e) => {
                          setEventDate(e.target.value);
                          if (e.target.value) {
                            setNoDateYet(false);
                          }
                        }}
                        disabled={noDateYet}
                        data-testid="input-event-date"
                      />
                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="checkbox"
                          id="noDateYet"
                          checked={noDateYet}
                          onChange={(e) => {
                            setNoDateYet(e.target.checked);
                            if (e.target.checked) {
                              setEventDate("");
                            }
                          }}
                          data-testid="checkbox-no-date-yet"
                          className="rounded border-gray-300"
                        />
                        <Label
                          htmlFor="noDateYet"
                          className="text-sm font-normal cursor-pointer"
                        >
                          I don't have a date yet
                        </Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional project notes..."
                        rows={3}
                        data-testid="textarea-project-notes"
                      />
                    </div>

                    <div className="space-y-3 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label
                            htmlFor="enableAutomations"
                            className="text-sm font-medium"
                          >
                            Enable Automations
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Run stage-based and business trigger automations
                          </p>
                        </div>
                        <Switch
                          id="enableAutomations"
                          checked={enableAutomations}
                          onCheckedChange={setEnableAutomations}
                          data-testid="switch-enable-automations"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label
                            htmlFor="enableDripCampaigns"
                            className="text-sm font-medium"
                          >
                            Enable Drip Campaigns
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Subscribe to email drip sequences
                          </p>
                        </div>
                        <Switch
                          id="enableDripCampaigns"
                          checked={enableDripCampaigns}
                          onCheckedChange={setEnableDripCampaigns}
                          data-testid="switch-enable-drip-campaigns"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createProjectMutation.isPending}
                        data-testid="button-create-project"
                      >
                        {createProjectMutation.isPending
                          ? "Creating..."
                          : "Create Project"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Project Type Filter and Active/Archived Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">View:</span>
              <Select
                value={activeProjectType}
                onValueChange={setActiveProjectType}
              >
                <SelectTrigger
                  className="w-48"
                  data-testid="select-project-type-filter"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active/Archived Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) =>
                setActiveTab(v as "all" | "active" | "archived")
              }
            >
              <TabsList>
                <TabsTrigger value="all" data-testid="tab-all-projects">
                  All ({projects?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="active" data-testid="tab-active-projects">
                  Active ({activeProjects.length})
                </TabsTrigger>
                <TabsTrigger
                  value="archived"
                  data-testid="tab-archived-projects"
                >
                  Archived ({archivedProjects.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Horizontal Stage Slider */}
          <div className="relative overflow-x-auto pb-2">
            <div className="flex gap-2 flex-nowrap">
              <Button
                variant={selectedStage === "ALL" ? "default" : "outline"}
                className="shrink-0 rounded-lg transition-all px-4 py-3 h-auto"
                onClick={() => setSelectedStage("ALL")}
                data-testid="button-stage-all"
              >
                <div className="flex flex-col items-center gap-1 w-full">
                  <span className="text-2xl font-semibold leading-tight">
                    {stageCounts.ALL || 0}
                  </span>
                  <span className="text-xs whitespace-nowrap">All Stages</span>
                </div>
              </Button>

              {stages?.map((stage) => (
                <Button
                  key={stage.id}
                  variant={selectedStage === stage.id ? "default" : "outline"}
                  className={cn(
                    "shrink-0 rounded-lg transition-all min-w-[100px] max-w-[160px] px-4 py-3 h-auto relative overflow-hidden",
                    selectedStage !== stage.id && "hover:border-primary/50",
                  )}
                  onClick={() => setSelectedStage(stage.id)}
                  data-testid={`button-stage-${stage.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {/* Stage color indicator bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 transition-opacity"
                    style={{ backgroundColor: stage.color || "#64748b" }}
                  />
                  <div className="flex flex-col items-center gap-1 w-full overflow-hidden pt-1">
                    <span className="text-2xl font-semibold leading-tight">
                      {stageCounts[stage.id] || 0}
                    </span>
                    <span className="text-xs text-center leading-tight break-words w-full px-1">
                      {stage.name}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects or clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-projects"
            />
          </div>

          {/* Projects List */}
          {projectsLoading ? (
            <div className="space-y-3">
              {/* Skeleton loader for mobile */}
              <div className="md:hidden space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </Card>
                ))}
              </div>
              {/* Skeleton loader for desktop table */}
              <Card className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-8 rounded" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          ) : projectsError ? (
            <Card className="p-8 border-destructive/50">
              <div className="text-center">
                <p className="text-destructive font-medium">
                  Failed to load projects
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please check your connection and try again.
                </p>
              </div>
            </Card>
          ) : filteredProjects.length === 0 ? (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  {searchTerm || selectedStage !== "ALL" ? (
                    <Search className="w-8 h-8 text-primary/60" />
                  ) : (
                    <Camera className="w-8 h-8 text-primary/60" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-lg">
                    {searchTerm || selectedStage !== "ALL"
                      ? "No matching projects"
                      : "Ready to capture your first project?"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchTerm
                      ? `No projects found for "${searchTerm}"`
                      : selectedStage !== "ALL"
                        ? "No projects in this stage yet"
                        : "Create a project to start organizing your photography work"}
                  </p>
                </div>
                {!searchTerm && selectedStage === "ALL" && (
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Project
                  </Button>
                )}
                {(searchTerm || selectedStage !== "ALL") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedStage("ALL");
                    }}
                    className="mt-2"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="space-y-3 md:hidden">
                {filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden"
                    onClick={() => setLocation(`/projects/${project.id}`)}
                    data-testid={`row-project-${project.id}`}
                  >
                    {/* Stage color indicator */}
                    <div
                      className="h-1 w-full"
                      style={{
                        backgroundColor: project.stage?.color || "#e5e7eb",
                      }}
                    />
                    <div className="p-4 space-y-3">
                      {/* Header section */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-semibold text-base truncate"
                            title={project.title}
                            data-testid={`text-project-title-${project.id}`}
                          >
                            {project.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {[
                              project.client?.firstName,
                              project.client?.lastName,
                            ]
                              .filter(Boolean)
                              .join(" ") || "No client assigned"}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 h-8 w-8 p-0"
                              data-testid={`button-actions-${project.id}`}
                              disabled={archiveProjectMutation.isPending}
                            >
                              {archiveProjectMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <MoreVertical className="w-4 h-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/projects/${project.id}`);
                              }}
                            >
                              <ChevronRight className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveProjectMutation.mutate({
                                  projectId: project.id,
                                  archive: activeTab === "active",
                                });
                              }}
                              disabled={archiveProjectMutation.isPending}
                            >
                              {activeTab === "active" ? (
                                <>
                                  <Archive className="w-4 h-4 mr-2" />
                                  Archive Project
                                </>
                              ) : (
                                <>
                                  <ArchiveRestore className="w-4 h-4 mr-2" />
                                  Restore Project
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Metadata section */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {getProjectTypeLabel(project.projectType)}
                          </Badge>
                          {project.stage && (
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: project.stage.color,
                                color: project.stage.color,
                                backgroundColor: `${project.stage.color}10`,
                              }}
                            >
                              {project.stage.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {project.hasEventDate
                              ? formatDate(project.eventDate)
                              : "TBD"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <Card className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow
                        key={project.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/projects/${project.id}`)}
                        data-testid={`row-project-${project.id}`}
                      >
                        <TableCell
                          className="font-medium max-w-[200px] truncate"
                          title={project.title}
                          data-testid={`text-project-title-${project.id}`}
                        >
                          {project.title}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {[project.client?.firstName, project.client?.lastName]
                            .filter(Boolean)
                            .join(" ") || "No client"}
                        </TableCell>
                        <TableCell>
                          {getProjectTypeLabel(project.projectType)}
                        </TableCell>
                        <TableCell>
                          {project.hasEventDate
                            ? formatDate(project.eventDate)
                            : "TBD"}
                        </TableCell>
                        <TableCell>
                          {project.stage && (
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: project.stage.color,
                                color: project.stage.color,
                                backgroundColor: `${project.stage.color}10`,
                              }}
                            >
                              {project.stage.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                data-testid={`button-actions-${project.id}`}
                                disabled={archiveProjectMutation.isPending}
                              >
                                {archiveProjectMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MoreVertical className="w-4 h-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/projects/${project.id}`);
                                }}
                              >
                                <ChevronRight className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveProjectMutation.mutate({
                                    projectId: project.id,
                                    archive: activeTab === "active",
                                  });
                                }}
                                disabled={archiveProjectMutation.isPending}
                              >
                                {activeTab === "active" ? (
                                  <>
                                    <Archive className="w-4 h-4 mr-2" />
                                    Archive Project
                                  </>
                                ) : (
                                  <>
                                    <ArchiveRestore className="w-4 h-4 mr-2" />
                                    Restore Project
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Manage Stages Dialog - HoneyBook style */}
      <PipelineCustomizeModal
        open={isManageStagesOpen}
        onOpenChange={setIsManageStagesOpen}
      />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        [data-radix-scroll-area-scrollbar][data-orientation="horizontal"] {
          opacity: 1 !important;
          visibility: visible !important;
        }
      `}</style>
    </div>
  );
}
