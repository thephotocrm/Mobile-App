import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProjectTypes, type ProjectType } from "@/hooks/use-project-types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, Pencil, Archive, ArchiveRestore, Trash2, Loader2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const DEFAULT_COLORS = [
  "#e11d48", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#0ea5e9", "#6366f1", "#a855f7", "#ec4899", "#64748b"
];

interface SortableItemProps {
  type: ProjectType;
  onEdit: (type: ProjectType) => void;
  onArchive: (type: ProjectType) => void;
  onDelete: (type: ProjectType) => void;
}

function SortableItem({ type, onEdit, onArchive, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: type.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 bg-card border rounded-lg ${
        type.isArchived ? "opacity-60" : ""
      }`}
      data-testid={`project-type-item-${type.slug}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          data-testid={`drag-handle-${type.slug}`}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div
          className="w-4 h-4 rounded-full shrink-0"
          style={{ backgroundColor: type.color }}
        />
        <div>
          <span className="font-medium">{type.name}</span>
          {type.isDefault && (
            <Badge variant="secondary" className="ml-2 text-xs">
              Default
            </Badge>
          )}
          {type.isArchived && (
            <Badge variant="outline" className="ml-2 text-xs">
              Archived
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(type)}
          data-testid={`button-edit-${type.slug}`}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        {!type.isDefault && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onArchive(type)}
            data-testid={`button-archive-${type.slug}`}
          >
            {type.isArchived ? (
              <ArchiveRestore className="w-4 h-4" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
          </Button>
        )}
        {type.isArchived && !type.isDefault && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(type)}
            className="text-destructive hover:text-destructive"
            data-testid={`button-delete-${type.slug}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ProjectTypesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { projectTypes, isLoading } = useProjectTypes(true);
  
  const [localTypes, setLocalTypes] = useState<ProjectType[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ProjectType | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(DEFAULT_COLORS[0]);

  useEffect(() => {
    setLocalTypes(projectTypes);
  }, [projectTypes]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      return apiRequest("POST", "/api/project-types", data);
    },
    onSuccess: () => {
      toast({ title: "Project type created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/project-types"] });
      handleCloseCreateDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create project type",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; color?: string } }) => {
      return apiRequest("PATCH", `/api/project-types/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Project type updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/project-types"] });
      handleCloseEditDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update project type",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      return apiRequest("PATCH", `/api/project-types/${id}/archive`, { archive });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.archive
          ? "Project type archived"
          : "Project type restored",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/project-types"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update project type",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/project-types/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Project type deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/project-types"] });
      setDeleteDialogOpen(false);
      setSelectedType(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete project type",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      return apiRequest("PUT", "/api/project-types/reorder", { orderedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/project-types"] });
    },
    onError: (error: any) => {
      setLocalTypes(projectTypes);
      toast({
        title: "Failed to reorder project types",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormColor(DEFAULT_COLORS[0]);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    resetForm();
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedType(null);
    resetForm();
  };

  const handleEdit = (type: ProjectType) => {
    setSelectedType(type);
    setFormName(type.name);
    setFormColor(type.color);
    setEditDialogOpen(true);
  };

  const handleArchive = (type: ProjectType) => {
    if (type.isDefault) {
      toast({
        title: "Cannot archive default type",
        description: "Default project types cannot be archived.",
        variant: "destructive",
      });
      return;
    }
    archiveMutation.mutate({ id: type.id, archive: !type.isArchived });
  };

  const handleDelete = (type: ProjectType) => {
    if (type.isDefault) {
      toast({
        title: "Cannot delete default type",
        description: "Default project types cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    setSelectedType(type);
    setDeleteDialogOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const displayedTypes = showArchived
        ? localTypes
        : localTypes.filter((t) => !t.isArchived);
      const oldIndex = displayedTypes.findIndex((t) => t.id === active.id);
      const newIndex = displayedTypes.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedDisplay = arrayMove(displayedTypes, oldIndex, newIndex);
        
        if (showArchived) {
          setLocalTypes(reorderedDisplay);
        } else {
          const archivedTypes = localTypes.filter((t) => t.isArchived);
          setLocalTypes([...reorderedDisplay, ...archivedTypes]);
        }
        
        reorderMutation.mutate(reorderedDisplay.map((t) => t.id));
      }
    }
  };

  const activeTypes = showArchived
    ? localTypes
    : localTypes.filter((t) => !t.isArchived);

  const archivedCount = localTypes.filter((t) => t.isArchived).length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Types</CardTitle>
              <CardDescription>
                Manage the types of photography projects you offer. Drag to reorder.
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setCreateDialogOpen(true);
              }}
              data-testid="button-create-project-type"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Type
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {archivedCount > 0 && (
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                data-testid="button-toggle-archived"
              >
                {showArchived ? "Hide" : "Show"} Archived ({archivedCount})
              </Button>
            </div>
          )}

          {activeTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No project types found. Create your first one!
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={activeTypes.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {activeTypes.map((type) => (
                    <SortableItem
                      key={type.id}
                      type={type}
                      onEdit={handleEdit}
                      onArchive={handleArchive}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseCreateDialog();
        else setCreateDialogOpen(true);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project Type</DialogTitle>
            <DialogDescription>
              Add a new type of photography project to your business.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Wedding, Portrait, Event"
                maxLength={50}
                data-testid="input-project-type-name"
              />
              <p className="text-xs text-muted-foreground">
                {formName.length}/50 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((color, index) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formColor === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormColor(color)}
                    data-testid={`color-option-create-${index}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor="customColor" className="text-sm">
                  Custom:
                </Label>
                <Input
                  id="customColor"
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-16 h-8 p-1 cursor-pointer"
                  data-testid="input-custom-color"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCreateDialog}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => createMutation.mutate({ name: formName.trim(), color: formColor })}
              disabled={!formName.trim() || formName.trim().length > 50 || createMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseEditDialog();
        else setEditDialogOpen(true);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project Type</DialogTitle>
            <DialogDescription>
              Update the name or color of this project type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                maxLength={50}
                data-testid="input-edit-project-type-name"
              />
              <p className="text-xs text-muted-foreground">
                {formName.length}/50 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((color, index) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formColor === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormColor(color)}
                    data-testid={`color-option-edit-${index}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor="editCustomColor" className="text-sm">
                  Custom:
                </Label>
                <Input
                  id="editCustomColor"
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-16 h-8 p-1 cursor-pointer"
                  data-testid="input-edit-custom-color"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseEditDialog}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() =>
                selectedType &&
                updateMutation.mutate({
                  id: selectedType.id,
                  data: { name: formName.trim(), color: formColor },
                })
              }
              disabled={!formName.trim() || formName.trim().length > 50 || updateMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project Type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedType?.name}". This action
              cannot be undone. Any projects using this type will need to be
              reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedType && deleteMutation.mutate(selectedType.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
