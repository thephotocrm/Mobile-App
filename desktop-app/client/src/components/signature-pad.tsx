import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Check } from "lucide-react";

// Imperative handle interface for external access
export interface SignaturePadHandle {
  getCanvasData: () => string | null;
  isEmpty: () => boolean;
  clear: () => void;
}

interface SignaturePadProps {
  onSave?: (dataUrl: string) => void;
  onCancel?: () => void;
  existingSignature?: string;
  label?: string;
  hideButtons?: boolean;
  disableAutoSave?: boolean; // When true, disables the 500ms auto-save behavior
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(({
  onSave,
  onCancel,
  existingSignature,
  label = "Your Signature",
  hideButtons = false,
  disableAutoSave = false
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmptyState, setIsEmptyState] = useState(true);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Expose imperative methods via ref
  useImperativeHandle(ref, () => ({
    getCanvasData: () => {
      const canvas = canvasRef.current;
      if (!canvas || isEmptyState) return null;
      return canvas.toDataURL('image/png');
    },
    isEmpty: () => isEmptyState,
    clear: () => clearCanvas()
  }), [isEmptyState]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set drawing styles
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Load existing signature if provided
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setIsEmptyState(false);
      };
      img.src = existingSignature;
    }
  }, [existingSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmptyState(false);

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);

    // Auto-save after user stops drawing (when hideButtons is true and autoSave not disabled)
    if (hideButtons && !disableAutoSave && !isEmptyState && onSave) {
      // Clear any existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Save after 500ms of inactivity
      autoSaveTimeoutRef.current = setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas || isEmptyState) return;

        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
      }, 500);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmptyState(true);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmptyState || !onSave) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{label}</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearCanvas}
            disabled={isEmptyState}
            data-testid="button-clear-signature"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>

        <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg bg-white">
          <canvas
            ref={canvasRef}
            className="w-full h-40 cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={(e) => {
              e.preventDefault();
              startDrawing(e);
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              draw(e);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopDrawing();
            }}
            data-testid="canvas-signature"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Draw your signature above using your mouse or touchscreen
        </p>

        {!hideButtons && (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={save}
              disabled={isEmptyState}
              className="flex-1"
              data-testid="button-save-signature"
            >
              <Check className="w-4 h-4 mr-2" />
              Save Signature
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                data-testid="button-cancel-signature"
              >
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});

SignaturePad.displayName = "SignaturePad";
