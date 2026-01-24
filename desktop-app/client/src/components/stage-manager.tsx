import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Still used for reassign stage dropdown
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
import { Plus, Edit2, Trash2, AlertTriangle, Loader2 } from "lucide-react";

type Stage = {
  id: string;
  name: string;
  orderIndex: number;
  color: string;
  isDefault: boolean;
  projectType?: string | null; // Deprecated - stages are now unified
  photographerId: string;
};

type StageUsageStats = {
  projectCount: number;
  automationCount: number;
  campaignCount: number;
};

export function StageManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [deletingStage, setDeletingStage] = useState<Stage | null>(null);
  const [deleteStats, setDeleteStats] = useState<StageUsageStats | null>(null);
  const [reassignToStageId, setReassignToStageId] = useState<string>("");

  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#64748b");
  const [editStageName, setEditStageName] = useState("");
  const [editStageColor, setEditStageColor] = useState("");

  // Stages are now unified per photographer (no project type filter)
  const { data: stages = [], isLoading } = useQuery<Stage[]>({
    queryKey: ["/api/stages"],
    queryFn: async () => {
      const response = await fetch(`/api/stages`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch stages");
      return response.json();
    },
    enabled: !!user,
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
      setIsAddDialogOpen(false);
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
      orderIndex?: number;
    }) => {
      return apiRequest("PATCH", `/api/stages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      setIsEditDialogOpen(false);
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
      force,
    }: {
      id: string;
      reassignToStageId?: string;
      force?: boolean;
    }) => {
      return apiRequest("DELETE", `/api/stages/${id}`, {
        reassignToStageId,
        force,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      setIsDeleteDialogOpen(false);
      setDeletingStage(null);
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

  const handleEditStage = () => {
    if (!editingStage || !editStageName.trim()) return;
    updateStageMutation.mutate({
      id: editingStage.id,
      name: editStageName.trim(),
      color: editStageColor,
    });
  };

  const handleStartEdit = (stage: Stage) => {
    setEditingStage(stage);
    setEditStageName(stage.name);
    setEditStageColor(stage.color);
    setIsEditDialogOpen(true);
  };

  const handleStartDelete = async (stage: Stage) => {
    setDeletingStage(stage);
    try {
      const response = await fetch(`/api/stages/${stage.id}/usage`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setDeleteStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch stage usage:", error);
    }
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingStage) return;

    const hasProjects = deleteStats && deleteStats.projectCount > 0;
    if (hasProjects && !reassignToStageId) {
      toast({
        title: "Please select a stage to reassign projects",
        variant: "destructive",
      });
      return;
    }

    deleteStageMutation.mutate({
      id: deletingStage.id,
      reassignToStageId: reassignToStageId || undefined,
      force: true,
    });
  };

  const availableReassignStages = stages.filter(
    (s) => s.id !== deletingStage?.id,
  );

  const predefinedColors = [
    "#64748b",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
    "#3b82f6",
    "#6366f1",
    "#a855f7",
    "#ec4899",
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Pipeline Stages</CardTitle>
              <CardDescription>
                Manage the stages in your project pipeline. Projects move
                through these stages as they progress. These stages apply to all
                project types.
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              data-testid="button-add-stage"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Stage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : stages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stages configured yet.
              <br />
              <Button variant="link" onClick={() => setIsAddDialogOpen(true)}>
                Create your first stage
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`stage-item-${stage.id}`}
                >
                  <div className="w-4 h-4 flex items-center justify-center text-muted-foreground">
                    <span className="text-xs font-medium">{index + 1}</span>
                  </div>
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{stage.name}</span>
                      {stage.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Position {index + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartEdit(stage)}
                      data-testid={`button-edit-stage-${stage.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartDelete(stage)}
                      disabled={stages.length <= 1}
                      title={
                        stages.length <= 1
                          ? "Cannot delete the only stage"
                          : undefined
                      }
                      data-testid={`button-delete-stage-${stage.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Stage</DialogTitle>
            <DialogDescription>
              Create a new stage for your project pipeline. This stage will
              apply to all project types.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stage-name">Stage Name</Label>
              <Input
                id="stage-name"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="e.g., Contract Sent"
                data-testid="input-new-stage-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newStageColor === color
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewStageColor(color)}
                    type="button"
                    data-testid={`color-option-${color.replace("#", "")}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddStage}
              disabled={!newStageName.trim() || createStageMutation.isPending}
              data-testid="button-confirm-add-stage"
            >
              {createStageMutation.isPending ? "Creating..." : "Add Stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stage</DialogTitle>
            <DialogDescription>
              Update the name or color of this stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-stage-name">Stage Name</Label>
              <Input
                id="edit-stage-name"
                value={editStageName}
                onChange={(e) => setEditStageName(e.target.value)}
                data-testid="input-edit-stage-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      editStageColor === color
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditStageColor(color)}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditStage}
              disabled={!editStageName.trim() || updateStageMutation.isPending}
              data-testid="button-confirm-edit-stage"
            >
              {updateStageMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Stage: {deletingStage?.name}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {stages.length <= 1 ? (
                  <p className="text-destructive">
                    You cannot delete the only stage. You need at least one
                    stage in your pipeline.
                  </p>
                ) : (
                  <>
                    {deletingStage?.isDefault && (
                      <p className="text-amber-600 dark:text-amber-400 text-sm mb-2">
                        Note: This is the default stage. Another stage will be
                        promoted to default automatically.
                      </p>
                    )}
                    {deleteStats &&
                    (deleteStats.projectCount > 0 ||
                      deleteStats.automationCount > 0 ||
                      deleteStats.campaignCount > 0) ? (
                      <div className="space-y-3">
                        <p>This stage is currently being used:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {deleteStats.projectCount > 0 && (
                            <li>
                              {deleteStats.projectCount} project
                              {deleteStats.projectCount !== 1 ? "s" : ""}
                            </li>
                          )}
                          {deleteStats.automationCount > 0 && (
                            <li>
                              {deleteStats.automationCount} automation
                              {deleteStats.automationCount !== 1 ? "s" : ""}
                            </li>
                          )}
                          {deleteStats.campaignCount > 0 && (
                            <li>
                              {deleteStats.campaignCount} campaign
                              {deleteStats.campaignCount !== 1 ? "s" : ""}
                            </li>
                          )}
                        </ul>
                        {deleteStats.projectCount > 0 && (
                          <div className="space-y-2 pt-2">
                            <Label>Move projects to:</Label>
                            <Select
                              value={reassignToStageId}
                              onValueChange={setReassignToStageId}
                            >
                              <SelectTrigger data-testid="select-reassign-stage">
                                <SelectValue placeholder="Select a stage..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableReassignStages.map((stage) => (
                                  <SelectItem key={stage.id} value={stage.id}>
                                    {stage.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground pt-2">
                          Note: Automations and campaigns referencing this stage
                          may need to be updated manually.
                        </p>
                      </div>
                    ) : (
                      <p>
                        Are you sure you want to delete this stage? This action
                        cannot be undone.
                      </p>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeletingStage(null);
                setDeleteStats(null);
                setReassignToStageId("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            {stages.length > 1 && (
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={
                  deleteStageMutation.isPending ||
                  (deleteStats?.projectCount! > 0 && !reassignToStageId)
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-stage"
              >
                {deleteStageMutation.isPending ? "Deleting..." : "Delete Stage"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
