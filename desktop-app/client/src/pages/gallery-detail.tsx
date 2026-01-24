import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Share2,
  Save,
  Eye,
  Globe,
  Lock,
  Calendar,
  User,
  Copy,
  Star,
  Camera,
  Check,
  AlertTriangle,
  Settings,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Image as ImageIcon,
  GripVertical,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Download,
  Heart,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import Uppy from "@uppy/core";
import XHRUpload from "@uppy/xhr-upload";
import Dashboard from "@uppy/react/dashboard";
import type { GalleryImage } from "@shared/schema";

// dnd-kit for drag and drop reordering
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Uppy CSS
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";

// Types
interface GalleryWithRelations {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  isPublic: boolean;
  photographerId: string;
  projectId?: string | null;
  coverImageId?: string | null;
  watermarkEnabled?: boolean;
  allowDownloads?: boolean;
  createdAt: string | Date;
  sharedAt?: string | Date | null;
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

interface ImageWithFavorite extends GalleryImage {
  isFavorite?: boolean;
  favoriteCount?: number;
}

// Status config
const STATUS_CONFIG = {
  DRAFT: {
    label: "Draft",
    color: "bg-slate-500",
    description: "Not shared yet",
  },
  READY: {
    label: "Ready",
    color: "bg-blue-500",
    description: "Ready to share",
  },
  SHARED: {
    label: "Shared",
    color: "bg-green-500",
    description: "Client can view",
  },
} as const;

// Sortable Image Card Component
function SortableImageCard({
  image,
  index,
  isSelected,
  onSelect,
  onSetCover,
  onDelete,
  onOpenLightbox,
  isCover,
  savingCaptionId,
  savedCaptionId,
  onCaptionChange,
  onCaptionBlur,
  galleryId,
}: {
  image: ImageWithFavorite;
  index: number;
  isSelected: boolean;
  onSelect: (imageId: string, shiftKey: boolean) => void;
  onSetCover: (imageId: string) => void;
  onDelete: (imageId: string) => void;
  onOpenLightbox: (index: number) => void;
  isCover: boolean;
  savingCaptionId: string | null;
  savedCaptionId: string | null;
  onCaptionChange: (imageId: string, value: string) => void;
  onCaptionBlur: (imageId: string, value: string) => void;
  galleryId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm border-2 transition-all ${
        isSelected
          ? "border-purple-500 ring-2 ring-purple-500/20"
          : "border-transparent hover:border-slate-200 dark:hover:border-slate-700"
      } ${isDragging ? "shadow-xl" : ""}`}
    >
      {/* Image */}
      <div
        className="relative aspect-[4/3] cursor-pointer"
        onClick={() => onOpenLightbox(index)}
      >
        <img
          src={image.thumbnailUrl || ""}
          alt={image.caption || `Image ${index + 1}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 p-1.5 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Selection checkbox */}
        <div
          className={`absolute top-2 right-2 transition-opacity ${
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all ${
              isSelected
                ? "bg-purple-500 text-white"
                : "bg-black/50 text-white hover:bg-black/70"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(image.id, e.shiftKey);
            }}
          >
            {isSelected ? (
              <Check className="w-4 h-4" />
            ) : (
              <div className="w-3 h-3 rounded-full border-2 border-white" />
            )}
          </div>
        </div>

        {/* Cover badge */}
        {isCover && (
          <Badge className="absolute bottom-2 left-2 bg-yellow-500 hover:bg-yellow-600 text-white">
            <Star className="w-3 h-3 mr-1 fill-current" />
            Cover
          </Badge>
        )}

        {/* Favorite indicator from client */}
        {image.isFavorite && (
          <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-pink-500/90 text-white">
            <Heart className="w-3.5 h-3.5 fill-current" />
          </div>
        )}

        {/* Hover overlay with actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-white/90 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLightbox(index);
              }}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant={isCover ? "secondary" : "default"}
              size="icon"
              className={`h-8 w-8 ${
                isCover
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                  : "bg-white/90 hover:bg-white"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onSetCover(image.id);
              }}
              title="Set as cover"
            >
              <Star className={`w-4 h-4 ${isCover ? "fill-current" : ""}`} />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(image.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Caption input */}
      <div className="p-2.5 border-t dark:border-slate-800">
        <div className="relative">
          <Input
            placeholder="Add caption..."
            value={image.caption || ""}
            onChange={(e) => onCaptionChange(image.id, e.target.value)}
            onBlur={(e) => onCaptionBlur(image.id, e.target.value)}
            className={`text-sm pr-8 ${
              savedCaptionId === image.id ? "border-green-500" : ""
            }`}
          />
          {savingCaptionId === image.id && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {savedCaptionId === image.id && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <Check className="w-4 h-4 text-green-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Lightbox Component
function Lightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
  onDownload,
}: {
  images: ImageWithFavorite[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDownload?: (image: ImageWithFavorite) => void;
}) {
  const currentImage = images[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0)
        onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < images.length - 1)
        onNavigate(currentIndex + 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images.length, onClose, onNavigate]);

  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Image counter */}
      <div className="absolute top-4 left-4 text-white/80 text-sm font-medium z-10">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 z-10"
          onClick={() => onNavigate(currentIndex - 1)}
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      )}
      {currentIndex < images.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 z-10"
          onClick={() => onNavigate(currentIndex + 1)}
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      )}

      {/* Main image */}
      <div className="max-w-[90vw] max-h-[85vh] relative">
        <img
          src={
            currentImage.webUrl ||
            currentImage.originalUrl ||
            currentImage.thumbnailUrl ||
            ""
          }
          alt={currentImage.caption || `Image ${currentIndex + 1}`}
          className="max-w-full max-h-[85vh] object-contain"
        />
      </div>

      {/* Bottom bar with info and actions */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            {currentImage.caption && (
              <p className="text-white text-lg">{currentImage.caption}</p>
            )}
            {currentImage.isFavorite && (
              <div className="flex items-center gap-1.5 text-pink-400 mt-1">
                <Heart className="w-4 h-4 fill-current" />
                <span className="text-sm">Favorited by client</span>
              </div>
            )}
          </div>
          {onDownload && (
            <Button
              variant="secondary"
              onClick={() => onDownload(currentImage)}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Gallery Completion Checklist Component
function CompletionChecklist({ gallery }: { gallery: GalleryWithRelations }) {
  const hasImages = (gallery.images?.length || 0) > 0;
  const hasCover = !!gallery.coverImageId;
  const hasTitle = !!gallery.title && gallery.title.trim().length > 0;
  const isShared = gallery.status === "SHARED";

  const items = [
    { label: "Add a gallery title", done: hasTitle, icon: Check },
    { label: "Upload at least one image", done: hasImages, icon: ImageIcon },
    { label: "Set a cover image", done: hasCover, icon: Star },
    { label: "Share with client", done: isShared, icon: Share2 },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const progress = (completedCount / items.length) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          Gallery Checklist
        </span>
        <span className="text-slate-500">
          {completedCount} of {items.length} complete
        </span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-sm p-2 rounded-md ${
              item.done
                ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {item.done ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 shrink-0" />
            )}
            <span className={item.done ? "line-through" : ""}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading skeleton
function GalleryDetailSkeleton() {
  return (
    <div className="h-full flex flex-col bg-background">
      <header className="shrink-0 border-b px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-20" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
      </header>
      <div className="flex-1 p-6">
        <Skeleton className="h-[200px] w-full rounded-lg mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function GalleryDetail() {
  const { galleryId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // UI State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [savingCaptionId, setSavingCaptionId] = useState<string | null>(null);
  const [savedCaptionId, setSavedCaptionId] = useState<string | null>(null);
  const [uploadExpanded, setUploadExpanded] = useState(true);

  // Selection state
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const lastSelectedIndexRef = useRef<number | null>(null);

  // Form states
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  // Debounce ref
  const invalidateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Fetch gallery
  const { data: gallery, isLoading } = useQuery<GalleryWithRelations>({
    queryKey: ["/api/galleries", galleryId],
    enabled: !!galleryId && !!user,
  });

  // Initialize form
  useEffect(() => {
    if (gallery) {
      setEditedTitle(gallery.title || "");
      setEditedDescription(gallery.description || "");
    }
  }, [gallery]);

  // Debounced invalidation
  const debouncedInvalidate = useCallback(() => {
    if (invalidateTimeoutRef.current) {
      clearTimeout(invalidateTimeoutRef.current);
    }
    invalidateTimeoutRef.current = setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: ["/api/galleries", galleryId],
      });
    }, 1000);
  }, [galleryId]);

  // Uppy instance
  const uppy = useMemo(() => {
    if (!galleryId) return null;

    return new Uppy({
      id: `gallery-${galleryId}`,
      autoProceed: false,
      restrictions: {
        maxNumberOfFiles: 10000,
        allowedFileTypes: ["image/*"],
        maxFileSize: 100 * 1024 * 1024,
      },
    }).use(XHRUpload, {
      endpoint: `/api/galleries/${galleryId}/upload`,
      fieldName: "file",
      formData: true,
      limit: 3,
      withCredentials: true,
    });
  }, [galleryId]);

  // Uppy event handlers
  useEffect(() => {
    if (!uppy) return;

    const handleUploadSuccess = () => {
      debouncedInvalidate();
    };

    const handleUploadError = (
      file: { name?: string } | undefined,
      error: Error,
    ) => {
      console.error("[Upload] Upload error:", error);
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${file?.name || "file"}`,
        variant: "destructive",
      });
    };

    const handleComplete = (result: { successful: { id?: string }[] }) => {
      if (result.successful.length > 0) {
        queryClient.invalidateQueries({
          queryKey: ["/api/galleries", galleryId],
        });
        toast({
          title: "Upload complete",
          description: `${result.successful.length} ${
            result.successful.length === 1 ? "image" : "images"
          } uploaded successfully`,
        });
      }
    };

    uppy.on("upload-success", handleUploadSuccess);
    uppy.on("upload-error", handleUploadError as any);
    uppy.on("complete", handleComplete as any);

    return () => {
      uppy.off("upload-success", handleUploadSuccess);
      uppy.off("upload-error", handleUploadError as any);
      uppy.off("complete", handleComplete as any);
    };
  }, [uppy, galleryId, toast, debouncedInvalidate]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (uppy) uppy.destroy();
      if (invalidateTimeoutRef.current)
        clearTimeout(invalidateTimeoutRef.current);
    };
  }, [uppy]);

  // Mutations
  const updateGalleryMutation = useMutation({
    mutationFn: async (data: Partial<GalleryWithRelations>) => {
      return apiRequest("PUT", `/api/galleries/${galleryId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/galleries", galleryId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({ title: "Saved", description: "Gallery updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update gallery",
        variant: "destructive",
      });
    },
  });

  const deleteGalleryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/galleries/${galleryId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({
        title: "Gallery moved to trash",
        description: "You can restore it within 30 days",
      });
      setLocation("/galleries");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete gallery",
        variant: "destructive",
      });
    },
  });

  const shareGalleryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/galleries/${galleryId}/share`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/galleries", galleryId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({
        title: "Gallery shared",
        description: "Your client can now view this gallery",
      });
      setShareDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to share gallery",
        variant: "destructive",
      });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      return apiRequest(
        "DELETE",
        `/api/galleries/${galleryId}/images/${imageId}`,
        {},
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/galleries", galleryId],
      });
      setImageToDelete(null);
      toast({
        title: "Image deleted",
        description: "The image has been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete image",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (imageIds: string[]) => {
      // Delete images sequentially
      for (const imageId of imageIds) {
        await apiRequest(
          "DELETE",
          `/api/galleries/${galleryId}/images/${imageId}`,
          {},
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/galleries", galleryId],
      });
      setSelectedImages(new Set());
      setBulkDeleteConfirmOpen(false);
      toast({
        title: "Images deleted",
        description: `${selectedImages.size} images have been removed`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete images",
        variant: "destructive",
      });
    },
  });

  const setCoverImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      return apiRequest("PATCH", `/api/galleries/${galleryId}/cover-image`, {
        imageId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/galleries", galleryId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      toast({
        title: "Cover updated",
        description: "Cover image has been set",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set cover image",
        variant: "destructive",
      });
    },
  });

  const updateImageMutation = useMutation({
    mutationFn: async ({
      imageId,
      caption,
    }: {
      imageId: string;
      caption: string;
    }) => {
      setSavingCaptionId(imageId);
      return apiRequest(
        "PUT",
        `/api/galleries/${galleryId}/images/${imageId}`,
        { caption },
      );
    },
    onSuccess: (_, variables) => {
      setSavingCaptionId(null);
      setSavedCaptionId(variables.imageId);
      setTimeout(() => setSavedCaptionId(null), 2000);
    },
    onError: (error: Error) => {
      setSavingCaptionId(null);
      queryClient.invalidateQueries({
        queryKey: ["/api/galleries", galleryId],
      });
      toast({
        title: "Failed to save caption",
        description: error.message || "Your changes were not saved",
        variant: "destructive",
      });
    },
  });

  const reorderImagesMutation = useMutation({
    mutationFn: async (imageIds: string[]) => {
      return apiRequest("PATCH", `/api/galleries/${galleryId}/reorder`, {
        imageIds,
      });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/galleries", galleryId],
      });
      toast({
        title: "Failed to reorder",
        description: error.message || "Could not save new order",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleSelectImage = useCallback(
    (imageId: string, shiftKey: boolean) => {
      const images = gallery?.images || [];
      const currentIndex = images.findIndex((img) => img.id === imageId);

      if (shiftKey && lastSelectedIndexRef.current !== null) {
        // Shift+click: select range
        const start = Math.min(lastSelectedIndexRef.current, currentIndex);
        const end = Math.max(lastSelectedIndexRef.current, currentIndex);
        const newSelected = new Set(selectedImages);
        for (let i = start; i <= end; i++) {
          newSelected.add(images[i].id);
        }
        setSelectedImages(newSelected);
      } else {
        // Regular click: toggle selection
        const newSelected = new Set(selectedImages);
        if (newSelected.has(imageId)) {
          newSelected.delete(imageId);
        } else {
          newSelected.add(imageId);
        }
        setSelectedImages(newSelected);
        lastSelectedIndexRef.current = currentIndex;
      }
    },
    [gallery?.images, selectedImages],
  );

  const handleSelectAll = useCallback(() => {
    const images = gallery?.images || [];
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map((img) => img.id)));
    }
  }, [gallery?.images, selectedImages.size]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !gallery?.images) return;

      const oldIndex = gallery.images.findIndex((img) => img.id === active.id);
      const newIndex = gallery.images.findIndex((img) => img.id === over.id);

      const newImages = arrayMove(gallery.images, oldIndex, newIndex);

      // Optimistic update
      queryClient.setQueryData(
        ["/api/galleries", galleryId],
        (old: GalleryWithRelations | undefined) =>
          old ? { ...old, images: newImages } : old,
      );

      // Save to server
      reorderImagesMutation.mutate(newImages.map((img) => img.id));
    },
    [gallery?.images, galleryId, reorderImagesMutation],
  );

  const handleCaptionChange = useCallback(
    (imageId: string, value: string) => {
      queryClient.setQueryData(
        ["/api/galleries", galleryId],
        (old: GalleryWithRelations | undefined) =>
          old
            ? {
                ...old,
                images: old.images?.map((img) =>
                  img.id === imageId ? { ...img, caption: value } : img,
                ),
              }
            : old,
      );
    },
    [galleryId],
  );

  const handleCaptionBlur = useCallback(
    (imageId: string, value: string) => {
      updateImageMutation.mutate({ imageId, caption: value });
    },
    [updateImageMutation],
  );

  const copyShareLink = async () => {
    const shareUrl = `${window.location.origin}/client/galleries/${galleryId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "Gallery link copied to clipboard",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handlePreviewAsClient = () => {
    window.open(`/client/galleries/${galleryId}`, "_blank");
  };

  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return "Unknown date";
    try {
      return format(new Date(dateStr), "MMMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  // Loading state
  if (isLoading) {
    return <GalleryDetailSkeleton />;
  }

  // Not found state
  if (!gallery) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
          <Camera className="w-12 h-12 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold">Gallery not found</h1>
        <p className="text-muted-foreground">
          This gallery may have been deleted or you don't have access.
        </p>
        <Button onClick={() => setLocation("/galleries")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Galleries
        </Button>
      </div>
    );
  }

  const images = (gallery.images || []) as ImageWithFavorite[];
  const statusConfig =
    STATUS_CONFIG[gallery.status as keyof typeof STATUS_CONFIG];

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Compact Header */}
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b px-4 sm:px-6 py-3">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/galleries")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Galleries
            </Button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <h1 className="text-lg font-semibold">{gallery.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  className={`${statusConfig?.color || "bg-slate-500"} text-white text-xs`}
                >
                  {statusConfig?.label || gallery.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {images.length} {images.length === 1 ? "image" : "images"}
                </span>
                {gallery.project?.client && (
                  <span className="text-xs text-muted-foreground">
                    • {gallery.project.client.firstName}{" "}
                    {gallery.project.client.lastName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePreviewAsClient}>
              <Eye className="w-4 h-4 mr-2" />
              Preview as Client
            </Button>
            <Button
              size="sm"
              onClick={() => shareGalleryMutation.mutate()}
              disabled={
                shareGalleryMutation.isPending || gallery.status === "SHARED"
              }
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {gallery.status === "SHARED" ? "Already Shared" : "Share"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1280px] mx-auto p-4 sm:p-6 space-y-6">
          {/* Hero Section with Cover + Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cover Image */}
            <div className="lg:col-span-2">
              <div className="relative rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 aspect-[21/9]">
                {gallery.coverImage?.webUrl ||
                gallery.coverImage?.thumbnailUrl ? (
                  <img
                    src={
                      gallery.coverImage.webUrl ||
                      gallery.coverImage.thumbnailUrl ||
                      ""
                    }
                    alt="Gallery cover"
                    className="w-full h-full object-cover"
                  />
                ) : images.length > 0 ? (
                  <img
                    src={images[0].thumbnailUrl || ""}
                    alt="Gallery cover"
                    className="w-full h-full object-cover opacity-60"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <Camera className="w-16 h-16 mb-2" />
                    <p>No cover image set</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                        {gallery.title}
                      </h2>
                      {gallery.description && (
                        <p className="text-white/80 text-sm mt-1 max-w-lg">
                          {gallery.description}
                        </p>
                      )}
                    </div>
                    {gallery.status === "SHARED" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={copyShareLink}
                        className="bg-white/20 hover:bg-white/30 text-white border-0"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist + Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-5">
                  <CompletionChecklist gallery={gallery} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                      <p className="text-2xl font-bold text-purple-600">
                        {images.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Images</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <p className="text-2xl font-bold text-blue-600">
                        {gallery.viewCount || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Created {formatDate(gallery.createdAt)}
                    </div>
                    {gallery.sharedAt && (
                      <div className="flex items-center gap-2 mt-1">
                        <Share2 className="w-4 h-4" />
                        Shared {formatDate(gallery.sharedAt)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Collapsible Settings */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Settings className="w-5 h-5 text-slate-500" />
                      Gallery Settings
                    </CardTitle>
                    {settingsOpen ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Gallery Title</Label>
                      <Input
                        id="title"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">
                        Description (Optional)
                      </Label>
                      <Textarea
                        id="description"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        placeholder="Add a description for your gallery"
                        rows={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Label className="text-sm font-medium">
                          Public Gallery
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Show in portfolio
                        </p>
                      </div>
                      <Switch
                        checked={gallery.isPublic || false}
                        onCheckedChange={(checked) =>
                          updateGalleryMutation.mutate({ isPublic: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Label className="text-sm font-medium">
                          Watermarks
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Protect your images
                        </p>
                      </div>
                      <Switch
                        checked={gallery.watermarkEnabled || false}
                        onCheckedChange={(checked) =>
                          updateGalleryMutation.mutate({
                            watermarkEnabled: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Label className="text-sm font-medium">Downloads</Label>
                        <p className="text-xs text-muted-foreground">
                          Allow client downloads
                        </p>
                      </div>
                      <Switch
                        checked={gallery.allowDownloads ?? true}
                        onCheckedChange={(checked) =>
                          updateGalleryMutation.mutate({
                            allowDownloads: checked,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Gallery
                    </Button>
                    <Button
                      onClick={() =>
                        updateGalleryMutation.mutate({
                          title: editedTitle,
                          description: editedDescription,
                        })
                      }
                      disabled={updateGalleryMutation.isPending}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateGalleryMutation.isPending
                        ? "Saving..."
                        : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Compact Upload Zone */}
          <Collapsible open={uploadExpanded} onOpenChange={setUploadExpanded}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Upload className="w-5 h-5 text-purple-500" />
                      Upload Images
                    </CardTitle>
                    {uploadExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {uppy && (
                    <div className="[&_.uppy-Dashboard]:!z-40 [&_.uppy-Dashboard--modal]:!z-40">
                      <Dashboard
                        uppy={uppy}
                        height={280}
                        width="100%"
                        note="Drag & drop images or click to browse (up to 10,000)"
                        proudlyDisplayPoweredByUppy={false}
                        theme="auto"
                        showRemoveButtonAfterComplete={true}
                      />
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Images Section with Bulk Actions */}
          {images.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-purple-600" />
                    Gallery Images ({images.length})
                  </CardTitle>

                  {/* Bulk Actions Toolbar */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedImages.size === images.length ? (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Deselect All
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Select All
                        </>
                      )}
                    </Button>
                    {selectedImages.size > 0 && (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {selectedImages.size} selected
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setBulkDeleteConfirmOpen(true)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Selected
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Drag to reorder • Click to preview • Shift+click to select
                  multiple
                </p>
              </CardHeader>
              <CardContent>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={images.map((img) => img.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {images.map((image, index) => (
                        <SortableImageCard
                          key={image.id}
                          image={image}
                          index={index}
                          isSelected={selectedImages.has(image.id)}
                          onSelect={handleSelectImage}
                          onSetCover={(id) => setCoverImageMutation.mutate(id)}
                          onDelete={(id) => setImageToDelete(id)}
                          onOpenLightbox={(idx) => setLightboxIndex(idx)}
                          isCover={gallery.coverImageId === image.id}
                          savingCaptionId={savingCaptionId}
                          savedCaptionId={savedCaptionId}
                          onCaptionChange={handleCaptionChange}
                          onCaptionBlur={handleCaptionBlur}
                          galleryId={galleryId || ""}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {images.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                    <ImageIcon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No images yet</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Upload your first images to start building this gallery.
                    Your client will love it!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(idx) => setLightboxIndex(idx)}
        />
      )}

      {/* Delete Gallery Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Gallery?
            </DialogTitle>
            <DialogDescription>
              This gallery will be moved to trash. You can restore it within 30
              days. After that, it will be permanently deleted along with all
              images.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteGalleryMutation.mutate();
                setDeleteConfirmOpen(false);
              }}
              disabled={deleteGalleryMutation.isPending}
            >
              {deleteGalleryMutation.isPending
                ? "Deleting..."
                : "Move to Trash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Image Confirmation */}
      <Dialog
        open={!!imageToDelete}
        onOpenChange={(open) => !open && setImageToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Image?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove this image from the gallery. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (imageToDelete) deleteImageMutation.mutate(imageToDelete);
              }}
              disabled={deleteImageMutation.isPending}
            >
              {deleteImageMutation.isPending ? "Deleting..." : "Delete Image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <Dialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete {selectedImages.size} Images?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove the selected images from the gallery.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                bulkDeleteMutation.mutate(Array.from(selectedImages))
              }
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending
                ? "Deleting..."
                : `Delete ${selectedImages.size} Images`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Success Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              Gallery Shared!
            </DialogTitle>
            <DialogDescription>
              Your gallery is now ready for your client. Copy the link below to
              share it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 py-4">
            <Input
              value={`${window.location.origin}/client/galleries/${galleryId}`}
              readOnly
              className="font-mono text-sm"
            />
            <Button onClick={copyShareLink}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setShareDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
