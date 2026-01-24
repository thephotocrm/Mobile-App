import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Heart,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid3x3,
  Calendar,
  User,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function ClientGalleryView() {
  const { galleryId } = useParams();
  const { toast } = useToast();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Fetch gallery (public endpoint)
  const {
    data: gallery,
    isLoading,
    error,
  } = useQuery<any>({
    queryKey: ["/api/galleries", galleryId, "view"],
    enabled: !!galleryId,
    retry: false, // Don't retry on 403 errors
  });

  // Extract private gallery info from error response
  const privateGalleryInfo = useMemo(() => {
    if (error && (error as any)?.isPrivate) {
      return {
        photographerSlug: (error as any).photographerSlug,
        galleryName: (error as any).galleryName || "Gallery",
      };
    }
    return null;
  }, [error]);

  // Fetch favorites - only when gallery loaded successfully (not for private galleries)
  const { data: favoriteIds = [] } = useQuery<string[]>({
    queryKey: ["/api/galleries", galleryId, "favorites"],
    enabled: !!galleryId && !!gallery && !privateGalleryInfo,
    retry: false,
  });

  // Track view on mount - only when gallery loaded successfully
  useEffect(() => {
    if (galleryId && gallery && !privateGalleryInfo) {
      // Track view - fire and forget
      fetch(`/api/galleries/${galleryId}/view`, {
        method: "GET",
        credentials: "include",
      }).catch(console.error);
    }
  }, [galleryId, gallery, privateGalleryInfo]);

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      return apiRequest(
        "POST",
        `/api/galleries/${galleryId}/favorites/${imageId}`,
        {},
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/galleries", galleryId, "favorites"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update favorite",
        variant: "destructive",
      });
    },
  });

  // Download image
  const handleDownloadImage = async (image: any) => {
    try {
      const response = await fetch(image.originalUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-${image.id}.${image.format || "jpg"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Image downloaded",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  // Request download all/favorites
  const handleBulkDownload = async (scope: "ALL" | "FAVORITES") => {
    try {
      const response = await apiRequest(
        "POST",
        `/api/galleries/${galleryId}/downloads`,
        { scope },
      );

      toast({
        title: "Download Requested",
        description:
          "We're preparing your download. This may take a few minutes.",
      });

      // Poll for download completion
      const checkDownload = async () => {
        const download = await apiRequest(
          "GET",
          `/api/galleries/downloads/${response.id}`,
          {},
        );

        if (download.status === "READY" && download.zipUrl) {
          window.location.href = download.zipUrl;
          toast({
            title: "Download Ready",
            description: "Your download has started",
          });
        } else if (download.status === "FAILED") {
          toast({
            title: "Error",
            description: "Download preparation failed",
            variant: "destructive",
          });
        } else {
          // Still processing, check again in 3 seconds
          setTimeout(checkDownload, 3000);
        }
      };

      setTimeout(checkDownload, 3000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to request download",
        variant: "destructive",
      });
    }
  };

  // Open lightbox
  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  // Navigate lightbox
  const goToPrevious = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? displayedImages.length - 1 : prev - 1,
    );
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) =>
      prev === displayedImages.length - 1 ? 0 : prev + 1,
    );
  };

  // Prepare image data before early returns (hooks must be called unconditionally)
  const allImages = gallery?.images || [];
  const displayedImages = showFavoritesOnly
    ? allImages.filter((img: any) => favoriteIds.includes(img.id))
    : allImages;

  const currentImage = displayedImages[currentImageIndex];

  // Calculate grid spans based on orientation (CSS Grid dense layout)
  const imagesWithLayout = useMemo(() => {
    let landscapeCount = 0;

    return displayedImages.map((img: any) => {
      const width = img.width || 1;
      const height = img.height || 1;
      const isPortrait = height > width; // Portrait: taller than wide
      const isLandscape = width > height; // Landscape: wider than tall

      // Determine if this landscape image should be featured (enlarged to 2x2)
      let isFeatured = false;
      if (isLandscape) {
        landscapeCount++;
        // Every 8th landscape photo is featured (2 cols × 2 rows)
        if (landscapeCount % 8 === 0) {
          isFeatured = true;
        }
      }

      // Assign CSS Grid span classes
      let colSpan = "col-span-1";
      let rowSpan = "row-span-1";

      if (isPortrait) {
        // Portrait photos: 1 column × 2 rows (tall)
        colSpan = "col-span-1";
        rowSpan = "row-span-2";
      } else if (isFeatured) {
        // Featured landscape: 2 columns × 2 rows (large)
        colSpan = "col-span-2";
        rowSpan = "row-span-2";
      }
      // Regular landscape: already default 1×1

      return {
        ...img,
        isPortrait,
        isLandscape,
        isFeatured,
        colSpan,
        rowSpan,
      };
    });
  }, [displayedImages]);

  // Keyboard navigation in lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;

      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "Escape") setLightboxOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen]);

  // Reset loading state when image changes
  useEffect(() => {
    setImageLoaded(false);
  }, [currentImageIndex]);

  // Preload images for smooth navigation (enterprise standard: 3 ahead + 1 behind)
  useEffect(() => {
    if (!lightboxOpen || displayedImages.length === 0) return;

    const preloadImage = (url: string) => {
      const img = new Image();
      img.src = url;
    };

    const totalImages = displayedImages.length;

    // Preload next 3 images (sequential priority - most users navigate forward)
    for (let i = 1; i <= 3; i++) {
      const nextIndex = (currentImageIndex + i) % totalImages;
      if (displayedImages[nextIndex]?.webUrl) {
        preloadImage(displayedImages[nextIndex].webUrl);
      }
    }

    // Preload 1 previous image
    const prevIndex =
      currentImageIndex === 0 ? totalImages - 1 : currentImageIndex - 1;
    if (displayedImages[prevIndex]?.webUrl) {
      preloadImage(displayedImages[prevIndex].webUrl);
    }
  }, [lightboxOpen, currentImageIndex, displayedImages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-lg">Loading gallery...</div>
      </div>
    );
  }

  if (!gallery) {
    // Check if this is a private gallery with login option
    if (privateGalleryInfo) {
      const portalUrl = privateGalleryInfo.photographerSlug
        ? `https://${privateGalleryInfo.photographerSlug}.tpcportal.co`
        : null;

      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 gap-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">This gallery is private</h1>
            <p className="text-muted-foreground">
              You need to be logged in to view "{privateGalleryInfo.galleryName}
              "
            </p>
          </div>
          {portalUrl && (
            <Button
              onClick={() => (window.location.href = portalUrl)}
              className="gap-2"
              data-testid="button-login-to-view"
            >
              <User className="h-4 w-4" />
              Log in to view
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 gap-4">
        <h1 className="text-2xl font-bold">Gallery not found</h1>
        <p className="text-muted-foreground">
          This gallery may be private or no longer available
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Cover Photo Hero - FIRST THING VISITORS SEE */}
      {gallery.coverImageId &&
        (() => {
          const coverImage = allImages.find(
            (img: any) => img.id === gallery.coverImageId,
          );
          if (coverImage) {
            return (
              <div className="w-full bg-white dark:bg-gray-900">
                {/* Desktop: Full-height cover photo with branding */}
                <div className="hidden lg:flex lg:flex-col lg:min-h-screen lg:justify-center lg:items-center lg:py-16">
                  <div className="w-full px-4 sm:px-6">
                    {/* Photographer Branding - Top Center */}
                    <div className="text-center mb-12">
                      {gallery.photographer?.logoUrl && (
                        <img
                          src={gallery.photographer.logoUrl}
                          alt="Logo"
                          className="h-12 mx-auto mb-4 object-contain"
                          data-testid="photographer-logo"
                        />
                      )}
                      <h1 className="text-xl sm:text-2xl font-semibold tracking-wide uppercase">
                        {gallery.photographer?.businessName ||
                          gallery.photographer?.photographerName ||
                          "Gallery"}
                      </h1>
                      <p className="text-xs text-muted-foreground mt-2 tracking-wide">
                        Photo & Video
                      </p>
                    </div>

                    {/* Cover Image - Centered, with text on left and gallery info on right */}
                    <div className="flex justify-center items-center">
                      {/* Cover Image with relative positioning for absolute children */}
                      <div className="relative max-w-[900px] w-fit overflow-visible">
                        <img
                          src={coverImage.webUrl}
                          alt={gallery.title}
                          className="w-full h-auto max-h-[75vh] object-contain"
                          data-testid="cover-photo"
                        />

                        {/* "Photos by" - Vertical text positioned right next to left edge of photo */}
                        <div className="absolute right-[calc(100%+1.5rem)] top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                          <p className="text-xs tracking-wider uppercase text-muted-foreground [writing-mode:vertical-rl] rotate-180">
                            Photos by{" "}
                            {gallery.photographer?.businessName ||
                              gallery.photographer?.photographerName ||
                              "Photographer"}{" "}
                            Photo & Video
                          </p>
                        </div>

                        {/* Gallery Info - Positioned right next to right edge of photo */}
                        <div className="absolute left-[calc(100%+1.5rem)] top-1/2 -translate-y-1/2 text-left">
                          <h2 className="text-3xl font-semibold tracking-wide mb-3 whitespace-nowrap">
                            {gallery.title}
                          </h2>
                          <div className="w-16 h-px bg-foreground mb-3"></div>
                          <p className="text-sm text-muted-foreground tracking-wide whitespace-nowrap">
                            {format(
                              new Date(gallery.createdAt),
                              "MMMM d, yyyy",
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile: Full-height cover photo with title/branding overlay */}
                <div className="lg:hidden min-h-screen flex flex-col">
                  {/* Full-height cover photo */}
                  <div className="relative flex-1 min-h-screen flex items-center justify-center bg-black">
                    <img
                      src={coverImage.webUrl}
                      alt={gallery.title}
                      className="w-full h-full object-contain"
                      data-testid="cover-photo-mobile"
                    />

                    {/* Title and branding overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent py-12 px-6 text-center text-white">
                      <h2 className="text-2xl sm:text-3xl font-semibold tracking-wide mb-2">
                        {gallery.title}
                      </h2>
                      <h3 className="text-sm sm:text-base font-medium tracking-widest uppercase mb-1">
                        {gallery.photographer?.businessName ||
                          gallery.photographer?.photographerName ||
                          "Gallery"}
                      </h3>
                      <p className="text-xs text-white/80 tracking-wide">
                        Photo & Video
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
        })()}

      {/* Header with Favorites Bar - BELOW COVER PHOTO */}
      <header className="bg-white dark:bg-gray-950 border-b sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-2 lg:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {gallery.project?.client && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>
                      {gallery.project.client.firstName}{" "}
                      {gallery.project.client.lastName}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Grid3x3 className="w-4 h-4" />
                  <span data-testid="text-image-count">
                    {displayedImages.length}{" "}
                    {displayedImages.length === 1 ? "image" : "images"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                data-testid="button-toggle-favorites"
              >
                <Heart
                  className={`w-4 h-4 mr-2 ${showFavoritesOnly ? "fill-current" : ""}`}
                />
                My Favorites ({favoriteIds.length})
              </Button>

              {/* Only show downloads for authorized clients */}
              {gallery.isAuthorizedClient && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkDownload("FAVORITES")}
                    disabled={favoriteIds.length === 0}
                    data-testid="button-download-favorites"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Favorites
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkDownload("ALL")}
                    data-testid="button-download-all"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download All
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Gallery Description */}
      {gallery.description && (
        <div className="max-w-[1600px] mx-auto px-2 lg:px-6 py-4">
          <p className="text-muted-foreground">{gallery.description}</p>
        </div>
      )}

      {/* Image Grid - CSS Grid dense layout with fixed row heights */}
      <div className="max-w-[1400px] mx-auto px-0 lg:px-8 xl:px-16 py-6">
        {displayedImages.length === 0 ? (
          <Card className="p-12 text-center mx-4">
            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {showFavoritesOnly
                ? "No favorites yet"
                : "No images in this gallery"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {showFavoritesOnly
                ? "Click the heart icon on images to add them to your favorites"
                : "Check back later for photos"}
            </p>
          </Card>
        ) : (
          <div
            className="grid grid-cols-2 md:grid-cols-3 gap-2 lg:gap-4"
            style={{
              gridAutoFlow: "dense",
              gridAutoRows: "clamp(160px, 18vw, 220px)",
            }}
          >
            {imagesWithLayout.map((image: any, index: number) => {
              const isFavorited = favoriteIds.includes(image.id);
              // Use webUrl with Cloudinary transformation for performance
              const displayUrl =
                image.webUrl?.replace(
                  "/upload/",
                  "/upload/q_auto,f_auto,w_1200/",
                ) || image.thumbnailUrl;

              return (
                <Card
                  key={image.id}
                  className={`border-0 overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300 rounded-none ${image.colSpan} ${image.rowSpan}`}
                  onClick={() => openLightbox(index)}
                  data-testid={`image-card-${index}`}
                >
                  <div className="relative w-full h-full">
                    <img
                      src={displayUrl}
                      alt={image.caption || `Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteMutation.mutate(image.id);
                        }}
                        data-testid={`button-favorite-${index}`}
                      >
                        <Heart
                          className={`w-5 h-5 ${isFavorited ? "fill-red-500 text-red-500" : ""}`}
                        />
                      </Button>
                    </div>

                    {/* Favorite badge */}
                    {isFavorited && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-red-500 text-white">
                          <Heart className="w-3 h-3 fill-current" />
                        </Badge>
                      </div>
                    )}
                  </div>

                  {image.caption && (
                    <div className="p-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {image.caption}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="max-w-screen-xl w-full h-[90vh] p-0 bg-black/95 border-0"
          data-testid="dialog-lightbox"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
              data-testid="button-close-lightbox"
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Navigation - Previous */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20"
              onClick={goToPrevious}
              data-testid="button-previous"
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>

            {/* Navigation - Next */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20"
              onClick={goToNext}
              data-testid="button-next"
            >
              <ChevronRight className="w-8 h-8" />
            </Button>

            {/* Main Image with Progressive Loading */}
            {currentImage && (
              <div className="w-full h-full flex flex-col items-center justify-center px-12 py-6">
                <div className="relative max-w-full max-h-[calc(90vh-120px)]">
                  {/* Thumbnail shown immediately (blurred placeholder) */}
                  <img
                    src={currentImage.thumbnailUrl || currentImage.webUrl}
                    alt={currentImage.caption || "Gallery image"}
                    className={`max-w-full max-h-[calc(90vh-120px)] object-contain transition-opacity duration-300 ${
                      imageLoaded
                        ? "opacity-0 absolute inset-0"
                        : "opacity-100 blur-sm scale-[1.02]"
                    }`}
                    data-testid="lightbox-thumbnail"
                  />
                  {/* Full resolution image loads on top */}
                  <img
                    src={currentImage.webUrl}
                    alt={currentImage.caption || "Gallery image"}
                    className={`max-w-full max-h-[calc(90vh-120px)] object-contain transition-opacity duration-300 ${
                      imageLoaded ? "opacity-100" : "opacity-0 absolute inset-0"
                    }`}
                    onLoad={() => setImageLoaded(true)}
                    data-testid="lightbox-image"
                  />
                  {/* Loading indicator */}
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/50 rounded-full p-3">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Image Info Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex-1">
                      {currentImage.caption && (
                        <p className="text-sm sm:text-base mb-2">
                          {currentImage.caption}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm text-gray-300">
                        Image {currentImageIndex + 1} of{" "}
                        {displayedImages.length}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pointer-events-auto">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteMutation.mutate(currentImage.id);
                        }}
                        data-testid="button-favorite-lightbox"
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            favoriteIds.includes(currentImage.id)
                              ? "fill-red-500 text-red-500"
                              : ""
                          }`}
                        />
                      </Button>

                      {gallery.allowDownloads && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={() => handleDownloadImage(currentImage)}
                          data-testid="button-download-lightbox"
                        >
                          <Download className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
