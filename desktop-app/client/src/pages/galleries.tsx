import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Images,
  Plus,
  Search,
  Eye,
  Calendar,
  Globe,
  Lock,
  Trash2,
  RotateCcw,
  Camera,
  Aperture,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { GalleryImage, Project, Contact } from "@shared/schema";

// Gallery type with relations from API
interface GalleryWithRelations {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  isPublic: boolean;
  photographerId: string;
  projectId?: string | null;
  coverImageId?: string | null;
  createdAt: string | Date;
  deletedAt?: string | Date | null;
  images?: GalleryImage[];
  coverImage?: GalleryImage | null;
  imageCount?: number;
  viewCount?: number;
  project?: {
    id: string;
    title: string;
    client?: {
      firstName: string;
      lastName: string;
    } | null;
  } | null;
}

// Project type for dropdown
interface ProjectWithClient extends Project {
  client?: Contact | null;
}

// Status display configuration
const STATUS_CONFIG = {
  DRAFT: { label: "Draft", description: "Not yet ready to share" },
  READY: { label: "Ready to Share", description: "Ready for client" },
  SHARED: { label: "Shared", description: "Sent to client" },
} as const;

// Gallery card skeleton for loading state
function GalleryCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Galleries() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [privacyFilter, setPrivacyFilter] = useState<string>("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [galleryTitle, setGalleryTitle] = useState("");
  const [activeTab, setActiveTab] = useState<string>("active");
  const { toast } = useToast();

  // Handle ?new=true query param to auto-open dialog
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("new") === "true") {
      setCreateModalOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Fetch active galleries
  const { data: galleries = [], isLoading } = useQuery<GalleryWithRelations[]>({
    queryKey: ["/api/galleries"],
    enabled: !!user && activeTab === "active",
  });

  // Fetch deleted galleries (trash)
  const { data: deletedGalleries = [], isLoading: isLoadingTrash } = useQuery<
    GalleryWithRelations[]
  >({
    queryKey: ["/api/galleries-trash"],
    enabled: !!user && activeTab === "trash",
  });

  // Fetch projects for gallery creation
  const { data: projects = [] } = useQuery<ProjectWithClient[]>({
    queryKey: ["/api/projects"],
    enabled: createModalOpen && !!user,
  });

  // Create gallery mutation
  const createGalleryMutation = useMutation({
    mutationFn: async (data: {
      projectId: string | null;
      title: string;
      status: string;
      isPublic: boolean;
    }) => {
      const response = await apiRequest("POST", "/api/galleries", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({
        title: "Gallery created",
        description: "Your new gallery is ready for uploads",
      });
      setCreateModalOpen(false);
      setSelectedProjectId("");
      setGalleryTitle("");
      setLocation(`/galleries/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create gallery",
        variant: "destructive",
      });
    },
  });

  // Toggle public/private - removed from list, only in detail page now
  const togglePrivacyMutation = useMutation({
    mutationFn: async ({
      galleryId,
      isPublic,
    }: {
      galleryId: string;
      isPublic: boolean;
    }) => {
      return apiRequest("PUT", `/api/galleries/${galleryId}`, { isPublic });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({
        title: "Privacy updated",
        description: "Gallery visibility has been changed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update privacy",
        variant: "destructive",
      });
    },
  });

  // Restore deleted gallery
  const restoreGalleryMutation = useMutation({
    mutationFn: async (galleryId: string) => {
      return apiRequest("POST", `/api/galleries/${galleryId}/restore`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/galleries-trash"] });
      toast({
        title: "Gallery restored",
        description: "Your gallery has been recovered",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore gallery",
        variant: "destructive",
      });
    },
  });

  // When project is selected, auto-fill gallery title
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    if (projectId === "STANDALONE") {
      setGalleryTitle("");
      return;
    }
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      const clientName =
        project.client?.firstName && project.client?.lastName
          ? `${project.client.firstName} ${project.client.lastName}`
          : null;
      setGalleryTitle(
        project.title || (clientName ? `${clientName} Gallery` : ""),
      );
    }
  };

  // Create gallery handler - removed photographerId, backend uses req.user
  const handleCreateGallery = () => {
    if (!galleryTitle) {
      toast({
        title: "Title required",
        description: "Please enter a gallery title",
        variant: "destructive",
      });
      return;
    }

    createGalleryMutation.mutate({
      projectId:
        selectedProjectId === "STANDALONE" ? null : selectedProjectId || null,
      title: galleryTitle,
      status: "DRAFT",
      isPublic: false,
    });
  };

  // Filter galleries
  const filteredGalleries = galleries.filter((gallery) => {
    const matchesSearch =
      !searchQuery ||
      gallery.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gallery.project?.client?.firstName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      gallery.project?.client?.lastName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || gallery.status === statusFilter;

    const matchesPrivacy =
      privacyFilter === "all" ||
      (privacyFilter === "public" && gallery.isPublic) ||
      (privacyFilter === "private" && !gallery.isPublic);

    return matchesSearch && matchesStatus && matchesPrivacy;
  });

  // Get user-friendly status label
  const getStatusLabel = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label || status;
  };

  // Safe date formatting
  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return "Unknown date";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b px-4 sm:px-6 py-4 bg-background">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Galleries</h1>
                <p className="text-sm text-muted-foreground">
                  Share beautiful photos with your clients
                </p>
              </div>
            </div>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              data-testid="button-create-gallery"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Gallery
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search galleries by name or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-gallery-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="w-full sm:w-[180px]"
                data-testid="select-status-filter"
              >
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="READY">Ready to Share</SelectItem>
                <SelectItem value="SHARED">Shared</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Gallery Grid */}
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <div className="max-w-[1400px] mx-auto">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-6">
              <TabsTrigger value="active" data-testid="tab-active-galleries">
                <Images className="w-4 h-4 mr-2" />
                Active Galleries
              </TabsTrigger>
              <TabsTrigger value="trash" data-testid="tab-trash-galleries">
                <Trash2 className="w-4 h-4 mr-2" />
                Trash
              </TabsTrigger>
            </TabsList>

            {/* Active Galleries Tab */}
            <TabsContent value="active">
              {/* Privacy Filter Tabs */}
              <Tabs
                value={privacyFilter}
                onValueChange={setPrivacyFilter}
                className="mb-6"
              >
                <TabsList>
                  <TabsTrigger value="all" data-testid="tab-filter-all">
                    All Galleries
                  </TabsTrigger>
                  <TabsTrigger value="public" data-testid="tab-filter-public">
                    <Globe className="w-4 h-4 mr-2" />
                    Public
                  </TabsTrigger>
                  <TabsTrigger value="private" data-testid="tab-filter-private">
                    <Lock className="w-4 h-4 mr-2" />
                    Private
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <GalleryCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredGalleries.length === 0 ? (
                <Card className="max-w-lg mx-auto mt-12 border-dashed border-2">
                  <CardContent className="py-16">
                    <div className="text-center">
                      <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mb-6">
                        <Aperture className="w-10 h-10 text-purple-500" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">
                        {searchQuery || statusFilter !== "ALL"
                          ? "No galleries found"
                          : "Create your first gallery"}
                      </h3>
                      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                        {searchQuery || statusFilter !== "ALL"
                          ? "Try adjusting your search or filters"
                          : "Upload and share beautiful photos with your clients. Galleries are the perfect way to deliver your work."}
                      </p>
                      {!searchQuery && statusFilter === "ALL" && (
                        <Button
                          onClick={() => setCreateModalOpen(true)}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          data-testid="button-create-first-gallery"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Gallery
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="mb-4 text-sm text-muted-foreground">
                    {filteredGalleries.length}{" "}
                    {filteredGalleries.length === 1 ? "gallery" : "galleries"}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredGalleries.map((gallery) => (
                      <Card
                        key={gallery.id}
                        className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1"
                        onClick={() => setLocation(`/galleries/${gallery.id}`)}
                        data-testid={`gallery-card-${gallery.id}`}
                      >
                        {/* Cover Image */}
                        <div className="relative h-48 overflow-hidden">
                          {gallery.coverImage?.thumbnailUrl ? (
                            <img
                              src={gallery.coverImage.thumbnailUrl}
                              alt={gallery.title || "Gallery cover"}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : gallery.images?.[0]?.thumbnailUrl ? (
                            <img
                              src={gallery.images[0].thumbnailUrl}
                              alt={gallery.title || "Gallery cover"}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                              <Camera className="w-12 h-12 text-slate-400" />
                            </div>
                          )}

                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                          {/* Status Badge - Top Right */}
                          <div className="absolute top-3 right-3">
                            <Badge
                              variant={
                                gallery.status === "SHARED"
                                  ? "default"
                                  : "secondary"
                              }
                              className={`${
                                gallery.status === "SHARED"
                                  ? "bg-green-600 hover:bg-green-700"
                                  : gallery.status === "READY"
                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                    : ""
                              }`}
                              data-testid={`badge-status-${gallery.id}`}
                            >
                              {getStatusLabel(gallery.status)}
                            </Badge>
                          </div>

                          {/* Privacy Badge - Top Left */}
                          <div className="absolute top-3 left-3">
                            <Badge
                              variant="secondary"
                              className={`${
                                gallery.isPublic
                                  ? "bg-white/90 text-green-700 dark:bg-black/50 dark:text-green-400"
                                  : "bg-white/90 text-slate-700 dark:bg-black/50 dark:text-slate-300"
                              }`}
                            >
                              {gallery.isPublic ? (
                                <>
                                  <Globe className="w-3 h-3 mr-1" />
                                  Public
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 mr-1" />
                                  Private
                                </>
                              )}
                            </Badge>
                          </div>

                          {/* Image count overlay */}
                          <div className="absolute bottom-3 right-3">
                            <Badge
                              variant="secondary"
                              className="bg-black/60 text-white border-0"
                            >
                              <Images className="w-3 h-3 mr-1" />
                              {gallery.imageCount || 0}
                            </Badge>
                          </div>
                        </div>

                        {/* Gallery Info */}
                        <CardContent className="p-4">
                          <h3
                            className="font-bold text-lg mb-1 truncate group-hover:text-purple-600 transition-colors"
                            data-testid={`text-gallery-title-${gallery.id}`}
                          >
                            {gallery.title}
                          </h3>

                          <p className="text-sm text-muted-foreground mb-3 truncate">
                            {gallery.project?.client?.firstName &&
                            gallery.project?.client?.lastName
                              ? `${gallery.project.client.firstName} ${gallery.project.client.lastName}`
                              : "Portfolio Gallery"}
                          </p>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span
                                data-testid={`text-view-count-${gallery.id}`}
                              >
                                {gallery.viewCount || 0} views
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span
                                data-testid={`text-created-date-${gallery.id}`}
                              >
                                {formatDate(gallery.createdAt)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Trash Tab */}
            <TabsContent value="trash">
              {isLoadingTrash ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <GalleryCardSkeleton key={i} />
                  ))}
                </div>
              ) : deletedGalleries.length === 0 ? (
                <Card className="max-w-lg mx-auto mt-12 border-dashed border-2">
                  <CardContent className="py-16">
                    <div className="text-center">
                      <div className="mx-auto w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                        <Trash2 className="w-10 h-10 text-slate-400" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">
                        Trash is empty
                      </h3>
                      <p className="text-muted-foreground max-w-sm mx-auto">
                        Deleted galleries will appear here. You have 30 days to
                        recover them before they're permanently removed.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="mb-4 text-sm text-muted-foreground">
                    {deletedGalleries.length}{" "}
                    {deletedGalleries.length === 1 ? "gallery" : "galleries"} in
                    trash
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {deletedGalleries.map((gallery) => (
                      <Card
                        key={gallery.id}
                        className="overflow-hidden opacity-75 hover:opacity-100 transition-opacity"
                        data-testid={`deleted-gallery-card-${gallery.id}`}
                      >
                        {/* Cover Image */}
                        <div className="relative h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          {gallery.coverImage?.thumbnailUrl ? (
                            <img
                              src={gallery.coverImage.thumbnailUrl}
                              alt={gallery.title || "Gallery cover"}
                              className="w-full h-full object-cover opacity-60 grayscale"
                            />
                          ) : gallery.images?.[0]?.thumbnailUrl ? (
                            <img
                              src={gallery.images[0].thumbnailUrl}
                              alt={gallery.title || "Gallery cover"}
                              className="w-full h-full object-cover opacity-60 grayscale"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Camera className="w-12 h-12 text-slate-400" />
                            </div>
                          )}

                          {/* Deleted Badge */}
                          <div className="absolute top-3 right-3">
                            <Badge variant="destructive">
                              <Trash2 className="w-3 h-3 mr-1" />
                              Deleted
                            </Badge>
                          </div>
                        </div>

                        {/* Gallery Info */}
                        <CardContent className="p-4">
                          <h3
                            className="font-bold text-lg mb-1 truncate"
                            data-testid={`text-deleted-gallery-title-${gallery.id}`}
                          >
                            {gallery.title}
                          </h3>

                          <p className="text-sm text-muted-foreground mb-3">
                            {gallery.project?.client?.firstName &&
                            gallery.project?.client?.lastName
                              ? `${gallery.project.client.firstName} ${gallery.project.client.lastName}`
                              : "Portfolio Gallery"}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <Images className="w-3 h-3" />
                              <span>{gallery.imageCount || 0} images</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Trash2 className="w-3 h-3" />
                              <span>{formatDate(gallery.deletedAt)}</span>
                            </div>
                          </div>

                          {/* Restore Button */}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              restoreGalleryMutation.mutate(gallery.id);
                            }}
                            disabled={restoreGalleryMutation.isPending}
                            className="w-full"
                            variant="outline"
                            data-testid={`button-restore-gallery-${gallery.id}`}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {restoreGalleryMutation.isPending
                              ? "Restoring..."
                              : "Restore Gallery"}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create Gallery Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent
          className="sm:max-w-[500px]"
          data-testid="dialog-create-gallery"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-600" />
              Create New Gallery
            </DialogTitle>
            <DialogDescription>
              Create a gallery for a client project or a standalone portfolio to
              showcase your work.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project">Link to Project (Optional)</Label>
              <Select
                value={selectedProjectId}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger id="project" data-testid="select-project">
                  <SelectValue placeholder="Select a project or create standalone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDALONE">
                    <div className="flex items-center gap-2">
                      <Aperture className="w-4 h-4 text-purple-500" />
                      Standalone Portfolio Gallery
                    </div>
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}{" "}
                      {project.client
                        ? `- ${project.client.firstName} ${project.client.lastName}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Linking to a project will auto-fill the title and associate the
                gallery with your client.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Gallery Title</Label>
              <Input
                id="title"
                value={galleryTitle}
                onChange={(e) => setGalleryTitle(e.target.value)}
                placeholder="e.g., Johnson Wedding Photos"
                data-testid="input-gallery-title"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGallery}
              disabled={createGalleryMutation.isPending || !galleryTitle}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              data-testid="button-submit-create"
            >
              {createGalleryMutation.isPending
                ? "Creating..."
                : "Create Gallery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
