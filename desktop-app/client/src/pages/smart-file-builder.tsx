import { useParams, useLocation, Link } from "wouter";
import DOMPurify from "dompurify";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  FileText,
  Package,
  Plus,
  DollarSign,
  GripVertical,
  Trash,
  Copy,
  Save,
  Loader2,
  Eye,
  Image as ImageIcon,
  Type,
  AlignLeft,
  MoveVertical,
  Sparkles,
  CheckCircle,
  Check,
  Camera,
  Shield,
  CreditCard,
  FileSignature,
  ClipboardList,
  Calendar,
  Settings,
  Columns,
  LayoutList,
  Video,
  Maximize2,
  Images,
  MessageSquare,
  CircleDot,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Reorder, useDragControls } from "framer-motion";
import type {
  SmartFileWithPages,
  SmartFilePage,
  InsertSmartFilePage,
} from "@shared/schema";
import {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  AVAILABLE_VARIABLES,
  parseContractVariables,
  parseContractVariablesHtml,
  isHtmlContent,
} from "@shared/contractVariables";
import { SchedulingCalendar } from "@/components/scheduling-calendar";
import {
  generateClientChoiceSchedule,
  PaymentInstallment,
} from "@shared/paymentScheduleUtils";
import {
  calculateInvoiceTotals,
  formatCentsAsDollars,
} from "@shared/invoiceCalculations";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  ContractRichTextEditor,
  ContractRichTextEditorRef,
} from "@/components/ContractRichTextEditor";

// Page type configurations
const PAGE_TYPES = {
  TEXT: {
    icon: FileText,
    label: "Text Page",
    color: "bg-blue-500",
  },
  PACKAGE: {
    icon: Package,
    label: "Package Selection",
    color: "bg-purple-500",
  },
  ADDON: {
    icon: Plus,
    label: "Add-ons",
    color: "bg-green-500",
  },
  CONTRACT: {
    icon: FileSignature,
    label: "Contract",
    color: "bg-indigo-500",
  },
  PAYMENT: {
    icon: DollarSign,
    label: "Payment",
    color: "bg-orange-500",
  },
  INVOICE: {
    icon: FileText,
    label: "Invoice & Pay",
    color: "bg-amber-500",
  },
  PAY: {
    icon: CreditCard,
    label: "Pay Page",
    color: "bg-emerald-500",
  },
  FORM: {
    icon: ClipboardList,
    label: "Form",
    color: "bg-teal-500",
  },
  SCHEDULING: {
    icon: Calendar,
    label: "Scheduling",
    color: "bg-pink-500",
  },
} as const;

type PageType = keyof typeof PAGE_TYPES;

// Type definitions for page content
type ImageContent = {
  url: string;
  borderRadius?: "straight" | "rounded";
  size?: "small" | "medium" | "large" | "stretched";
};

type FormFieldContent = {
  fieldType:
    | "TEXT_INPUT"
    | "TEXTAREA"
    | "MULTIPLE_CHOICE"
    | "CHECKBOX"
    | "DATE"
    | "EMAIL"
    | "NUMBER";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For MULTIPLE_CHOICE and CHECKBOX
};

type ContentBlock = {
  id: string;
  type: "HEADING" | "TEXT" | "SPACER" | "IMAGE" | "FORM_FIELD";
  content: any; // string for HEADING/TEXT, null for SPACER, ImageContent for IMAGE, FormFieldContent for FORM_FIELD
  column?: number; // For 2-column sections: 0 (left) or 1 (right)
};

type Section = {
  id: string;
  columns: 1 | 2;
  blocks: ContentBlock[];
};

type HeroSection = {
  backgroundImage?: string;
  title?: string;
  description?: string;
};

type TextPageContent = {
  hero?: HeroSection;
  sections?: Section[];
  // Legacy fields (for backwards compatibility)
  blocks?: ContentBlock[];
  heading?: string;
  content?: string;
};

type PackagePageContent = {
  heading: string;
  description: string;
  packageIds: string[];
};

type AddOnPageContent = {
  heading: string;
  description: string;
  addOnIds: string[];
};

type PaymentPageContent = {
  heading: string;
  description: string;
  depositPercent: number;
  paymentTerms: string;
  acceptOnlinePayments: boolean;
  // Payment schedule configuration
  paymentScheduleMode?:
    | "SIMPLE"
    | "CLIENT_CHOICE"
    | "BIWEEKLY"
    | "MONTHLY"
    | "CUSTOM";
  paymentScheduleConfig?: {
    maxInstallments?: number; // For client-choice mode
    allowPayInFull?: boolean; // For client-choice mode
    payInFullDiscountPercent?: number; // Discount for paying in full
  };
  customInstallments?: Array<{
    description: string;
    dueDate: string;
    percentOfTotal: number;
  }>;
};

type InvoiceLineItem = {
  id: string;
  service: string;
  quantity: number;
  unit: string; // e.g., "hour", "item", "session"
  unitPrice: number; // in cents
  taxable: boolean;
};

type InvoicePageContent = {
  // Header configuration
  heading: string;
  description: string;
  billTo: string; // Editable "Bill to" field

  // Invoice metadata
  invoiceNumber?: string; // Auto-generated or custom
  purchaseOrderNumber?: string;
  dateIssued?: string; // ISO date string
  nextPaymentDue?: string; // ISO date string

  // Line items (only used when NOT in proposal mode)
  lineItems?: InvoiceLineItem[];

  // Totals configuration
  taxPercent: number; // Tax percentage (e.g., 8.5)
  discountAmount: number; // Discount in cents or percent value (can be 0)
  discountType: "AMOUNT" | "PERCENT"; // Discount type

  // Payment schedule configuration (reusing existing payment schedule system)
  paymentScheduleMode:
    | "SIMPLE"
    | "CLIENT_CHOICE"
    | "BIWEEKLY"
    | "MONTHLY"
    | "CUSTOM";
  paymentScheduleConfig?: {
    maxInstallments?: number;
    allowPayInFull?: boolean;
    payInFullDiscountPercent?: number;
  };
  customInstallments?: Array<{
    description: string;
    dueDate: string;
    percentOfTotal: number;
  }>;
  depositPercent: number; // Default deposit percentage

  // Payment acceptance
  acceptOnlinePayments: boolean;
};

type PayPageContent = {
  heading: string;
  description: string;
  // This page is primarily preview-only in builder
  // Actual payment functionality handled in public view
};

type ContractPageContent = {
  heading: string;
  description: string;
  contractTemplate: string;
  requireClientSignature: boolean;
  requirePhotographerSignature: boolean;
};

type FormPageContent = {
  hero?: HeroSection;
  sections?: Section[];
};

type SchedulingPageContent = {
  heading: string;
  description: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  bookingType: string;
  allowRescheduling: boolean;
};

// Block types for text and form pages
const BLOCK_TYPES = {
  HEADING: { icon: Type, label: "Heading", placeholder: "Enter heading..." },
  TEXT: {
    icon: AlignLeft,
    label: "Text",
    placeholder: "Enter text content...",
  },
  SPACER: { icon: MoveVertical, label: "Spacer", placeholder: "" },
  IMAGE: { icon: ImageIcon, label: "Image", placeholder: "" },
  FORM_FIELD: { icon: ClipboardList, label: "Form Field", placeholder: "" },
} as const;

// Text layout templates for quick section creation
type LayoutTemplate = {
  id: string;
  label: string;
  icon: React.ElementType;
  columns: 1 | 2;
  blocks: Omit<ContentBlock, "id">[];
};

const TEXT_LAYOUTS: LayoutTemplate[] = [
  {
    id: "text-only",
    label: "Text only",
    icon: AlignLeft,
    columns: 1,
    blocks: [{ type: "TEXT", content: "" }],
  },
  {
    id: "title-text",
    label: "Title & text",
    icon: LayoutList,
    columns: 1,
    blocks: [
      { type: "HEADING", content: "" },
      { type: "TEXT", content: "" },
    ],
  },
  {
    id: "2-column-text",
    label: "2 column text",
    icon: Columns,
    columns: 2,
    blocks: [
      { type: "TEXT", content: "", column: 0 },
      { type: "TEXT", content: "", column: 1 },
    ],
  },
  {
    id: "icon-text",
    label: "Icon & text",
    icon: CircleDot,
    columns: 2,
    blocks: [
      {
        type: "IMAGE",
        content: { url: "", borderRadius: "rounded", size: "small" },
        column: 0,
      },
      { type: "TEXT", content: "", column: 1 },
    ],
  },
  {
    id: "image-text",
    label: "Image & text",
    icon: ImageIcon,
    columns: 2,
    blocks: [
      {
        type: "IMAGE",
        content: { url: "", borderRadius: "straight", size: "medium" },
        column: 0,
      },
      { type: "TEXT", content: "", column: 1 },
    ],
  },
  {
    id: "video-text",
    label: "Video & text",
    icon: Video,
    columns: 2,
    blocks: [
      { type: "TEXT", content: "Video placeholder", column: 0 },
      { type: "TEXT", content: "", column: 1 },
    ],
  },
  {
    id: "splash",
    label: "Splash",
    icon: Maximize2,
    columns: 1,
    blocks: [
      {
        type: "IMAGE",
        content: { url: "", borderRadius: "straight", size: "stretched" },
      },
    ],
  },
  {
    id: "image-gallery",
    label: "Image gallery",
    icon: Images,
    columns: 2,
    blocks: [
      {
        type: "IMAGE",
        content: { url: "", borderRadius: "straight", size: "medium" },
        column: 0,
      },
      {
        type: "IMAGE",
        content: { url: "", borderRadius: "straight", size: "medium" },
        column: 1,
      },
    ],
  },
  {
    id: "testimonial",
    label: "Testimonial",
    icon: MessageSquare,
    columns: 1,
    blocks: [
      {
        type: "IMAGE",
        content: { url: "", borderRadius: "rounded", size: "small" },
      },
      { type: "TEXT", content: "" },
      { type: "HEADING", content: "" },
    ],
  },
  {
    id: "spacer",
    label: "Spacer",
    icon: MoveVertical,
    columns: 1,
    blocks: [{ type: "SPACER", content: null }],
  },
  {
    id: "form-field",
    label: "Form field",
    icon: ClipboardList,
    columns: 1,
    blocks: [
      {
        type: "FORM_FIELD",
        content: { label: "", type: "text", required: false },
      },
    ],
  },
];

// Text Layout Picker Component (shown in sidebar for TEXT pages)
function TextLayoutPicker({
  onSelectLayout,
}: {
  onSelectLayout: (layout: LayoutTemplate) => void;
}) {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        TEXT LAYOUTS
      </h4>
      <div className="grid grid-cols-3 gap-3">
        {TEXT_LAYOUTS.map((layout) => {
          const Icon = layout.icon;
          return (
            <button
              key={layout.id}
              onClick={() => onSelectLayout(layout)}
              className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-border bg-background hover:border-blue-400 hover:bg-blue-50/50 transition-all"
              data-testid={`button-layout-${layout.id}`}
            >
              <div className="w-full h-16 mb-2 flex items-center justify-center rounded-md bg-white border border-gray-200 shadow-sm">
                <Icon className="w-8 h-8 text-blue-400" />
              </div>
              <span className="text-xs text-muted-foreground text-center leading-tight">
                {layout.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Block Editor Component
function BlockEditor({
  block,
  onUpdate,
  onDelete,
}: {
  block: ContentBlock;
  onUpdate: (content: any) => void;
  onDelete: () => void;
}) {
  const [localContent, setLocalContent] = useState(block.content);
  const dragControls = useDragControls();

  useEffect(() => {
    setLocalContent(block.content);
  }, [block.id, block.content]);

  const handleBlur = () => {
    if (JSON.stringify(localContent) !== JSON.stringify(block.content)) {
      onUpdate(localContent);
    }
  };

  return (
    <Reorder.Item
      value={block}
      id={block.id}
      dragListener={false}
      dragControls={dragControls}
      className="mb-2 group relative"
    >
      <div className="relative">
        {block.type === "HEADING" && (
          <Input
            value={localContent || ""}
            onChange={(e) => setLocalContent(e.target.value)}
            onBlur={handleBlur}
            placeholder={BLOCK_TYPES.HEADING.placeholder}
            className="text-lg font-semibold"
            data-testid={`block-heading-${block.id}`}
          />
        )}

        {block.type === "TEXT" && (
          <RichTextEditor
            value={localContent || ""}
            onChange={(html) => {
              setLocalContent(html);
              onUpdate(html);
            }}
            placeholder={BLOCK_TYPES.TEXT.placeholder}
            data-testid={`block-text-${block.id}`}
          />
        )}

        {block.type === "SPACER" && (
          <div className="py-4 border-t-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Spacer</span>
          </div>
        )}

        {block.type === "IMAGE" && (
          <div className="space-y-3">
            {/* Handle legacy string format and convert to ImageContent */}
            {(() => {
              const imageData: ImageContent =
                typeof localContent === "string"
                  ? {
                      url: localContent,
                      borderRadius: "straight",
                      size: "medium",
                    }
                  : localContent || {
                      url: "",
                      borderRadius: "straight",
                      size: "medium",
                    };

              const updateImageData = (updates: Partial<ImageContent>) => {
                const newData = { ...imageData, ...updates };
                setLocalContent(newData);
                onUpdate(newData);
              };

              return !imageData.url ? (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Label
                    htmlFor={`image-upload-${block.id}`}
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-primary hover:underline">
                        Click to upload image
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                  </Label>
                  <input
                    id={`image-upload-${block.id}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          updateImageData({ url: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    "relative",
                    imageData.size === "stretched" ? "-mx-6" : "",
                  )}
                >
                  <img
                    src={imageData.url}
                    alt="Uploaded"
                    className={cn(
                      "object-cover border",
                      imageData.borderRadius === "rounded"
                        ? "rounded-full aspect-square"
                        : "rounded-none",
                      imageData.size === "stretched" ? "w-full" : "",
                      imageData.size === "small" ? "max-h-32 max-w-32" : "",
                      imageData.size === "medium" ? "max-h-48 max-w-48" : "",
                      imageData.size === "large" ? "max-h-96 max-w-96" : "",
                    )}
                  />
                  {/* Settings gear icon */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md bg-white/90 hover:bg-white"
                        data-testid={`button-image-settings-${block.id}`}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-64 z-50"
                      side="left"
                    >
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">
                            Change Image
                          </Label>
                          <Label
                            htmlFor={`image-upload-${block.id}`}
                            className="cursor-pointer block"
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full"
                              asChild
                            >
                              <span>Upload New Image</span>
                            </Button>
                          </Label>
                          <input
                            id={`image-upload-${block.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  updateImageData({
                                    url: reader.result as string,
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <Label className="text-xs font-medium">
                            Border Radius
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={
                                imageData.borderRadius === "straight"
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                updateImageData({ borderRadius: "straight" })
                              }
                              className="flex-1"
                              data-testid={`button-border-straight-${block.id}`}
                            >
                              Straight
                            </Button>
                            <Button
                              type="button"
                              variant={
                                imageData.borderRadius === "rounded"
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                updateImageData({ borderRadius: "rounded" })
                              }
                              className="flex-1"
                              data-testid={`button-border-rounded-${block.id}`}
                            >
                              Rounded
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Size</Label>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant={
                                imageData.size === "small"
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => updateImageData({ size: "small" })}
                              className="flex-1 text-xs"
                              data-testid={`button-size-small-${block.id}`}
                            >
                              S
                            </Button>
                            <Button
                              type="button"
                              variant={
                                imageData.size === "medium"
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                updateImageData({ size: "medium" })
                              }
                              className="flex-1 text-xs"
                              data-testid={`button-size-medium-${block.id}`}
                            >
                              M
                            </Button>
                            <Button
                              type="button"
                              variant={
                                imageData.size === "large"
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => updateImageData({ size: "large" })}
                              className="flex-1 text-xs"
                              data-testid={`button-size-large-${block.id}`}
                            >
                              L
                            </Button>
                            <Button
                              type="button"
                              variant={
                                imageData.size === "stretched"
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                updateImageData({ size: "stretched" })
                              }
                              className="flex-1 text-xs"
                              data-testid={`button-size-stretched-${block.id}`}
                            >
                              Full
                            </Button>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              );
            })()}
          </div>
        )}

        {block.type === "FORM_FIELD" && (
          <div className="space-y-3">
            {(() => {
              const fieldData: FormFieldContent = localContent || {
                fieldType: "TEXT_INPUT",
                label: "",
                placeholder: "",
                required: false,
                options: [],
              };

              const updateFieldData = (updates: Partial<FormFieldContent>) => {
                const newData = { ...fieldData, ...updates };
                setLocalContent(newData);
                onUpdate(newData);
              };

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Field Type</Label>
                      <Select
                        value={fieldData.fieldType}
                        onValueChange={(value) =>
                          updateFieldData({
                            fieldType: value as FormFieldContent["fieldType"],
                          })
                        }
                      >
                        <SelectTrigger
                          data-testid={`select-field-type-${block.id}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TEXT_INPUT">Text Input</SelectItem>
                          <SelectItem value="TEXTAREA">Long Text</SelectItem>
                          <SelectItem value="EMAIL">Email</SelectItem>
                          <SelectItem value="NUMBER">Number</SelectItem>
                          <SelectItem value="DATE">Date</SelectItem>
                          <SelectItem value="MULTIPLE_CHOICE">
                            Multiple Choice
                          </SelectItem>
                          <SelectItem value="CHECKBOX">Checkboxes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Required</Label>
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          checked={fieldData.required}
                          onCheckedChange={(checked) =>
                            updateFieldData({ required: checked })
                          }
                          data-testid={`switch-required-${block.id}`}
                        />
                        <Label className="text-sm">
                          {fieldData.required ? "Required" : "Optional"}
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`field-label-${block.id}`}
                      className="text-xs font-medium"
                    >
                      Field Label
                    </Label>
                    <Input
                      id={`field-label-${block.id}`}
                      value={fieldData.label}
                      onChange={(e) =>
                        updateFieldData({ label: e.target.value })
                      }
                      placeholder="e.g., What is your full name?"
                      data-testid={`input-field-label-${block.id}`}
                    />
                  </div>

                  {!["MULTIPLE_CHOICE", "CHECKBOX"].includes(
                    fieldData.fieldType,
                  ) && (
                    <div className="space-y-2">
                      <Label
                        htmlFor={`field-placeholder-${block.id}`}
                        className="text-xs font-medium"
                      >
                        Placeholder (optional)
                      </Label>
                      <Input
                        id={`field-placeholder-${block.id}`}
                        value={fieldData.placeholder || ""}
                        onChange={(e) =>
                          updateFieldData({ placeholder: e.target.value })
                        }
                        placeholder="e.g., Enter your name..."
                        data-testid={`input-field-placeholder-${block.id}`}
                      />
                    </div>
                  )}

                  {["MULTIPLE_CHOICE", "CHECKBOX"].includes(
                    fieldData.fieldType,
                  ) && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">
                        Options (one per line)
                      </Label>
                      <Textarea
                        value={(fieldData.options || []).join("\n")}
                        onChange={(e) =>
                          updateFieldData({
                            options: e.target.value
                              .split("\n")
                              .filter((opt) => opt.trim()),
                          })
                        }
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                        rows={4}
                        data-testid={`textarea-field-options-${block.id}`}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
        {/* Delete button - appears on hover */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-2 -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm border"
          onClick={onDelete}
          data-testid={`button-delete-block-${block.id}`}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </Reorder.Item>
  );
}

// Section Editor Component
function SectionEditor({
  section,
  onUpdate,
  onDelete,
  dragControls,
}: {
  section: Section;
  onUpdate: (section: Section) => void;
  onDelete: () => void;
  dragControls: ReturnType<typeof useDragControls>;
}) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(section.blocks || []);

  useEffect(() => {
    setBlocks(section.blocks || []);
  }, [section.id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onUpdate({ ...section, blocks });
    }, 300);
    return () => clearTimeout(timeout);
  }, [blocks]);

  const addBlock = (type: ContentBlock["type"], column?: number) => {
    let content: any = "";
    if (type === "SPACER") {
      content = null;
    } else if (type === "FORM_FIELD") {
      content = {
        fieldType: "TEXT_INPUT",
        label: "",
        placeholder: "",
        required: false,
        options: [],
      } as FormFieldContent;
    }

    const newBlock: ContentBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      column: section.columns === 2 ? column : undefined,
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (blockId: string, content: any) => {
    setBlocks(blocks.map((b) => (b.id === blockId ? { ...b, content } : b)));
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId));
  };

  const handleReorderColumn = (
    columnIndex: number,
    newBlocks: ContentBlock[],
  ) => {
    // Replace blocks for this column
    const otherColumnBlocks = blocks.filter((b) => b.column !== columnIndex);
    setBlocks([...otherColumnBlocks, ...newBlocks]);
  };

  const handleReorder = (newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks);
  };

  // For 2-column sections, separate blocks by column
  const column0Blocks =
    section.columns === 2 ? blocks.filter((b) => b.column === 0) : [];
  const column1Blocks =
    section.columns === 2 ? blocks.filter((b) => b.column === 1) : [];

  return (
    <Card className="border-2 border-transparent hover:border-blue-400 transition-colors">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onDelete}
            data-testid={`button-delete-section-${section.id}`}
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {section.columns === 1 ? (
          // 1-Column Layout
          <div className="space-y-4">
            {blocks.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground">Empty section</p>
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={blocks}
                onReorder={handleReorder}
                className="space-y-3"
              >
                {blocks.map((block) => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    onUpdate={(content) => updateBlock(block.id, content)}
                    onDelete={() => deleteBlock(block.id)}
                  />
                ))}
              </Reorder.Group>
            )}
          </div>
        ) : (
          // 2-Column Layout
          <div className="grid grid-cols-2 gap-4">
            {/* Column 0 (Left) */}
            <div className="space-y-3">
              {column0Blocks.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground">Left column</p>
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={column0Blocks}
                  onReorder={(newBlocks) => handleReorderColumn(0, newBlocks)}
                  className="space-y-3"
                >
                  {column0Blocks.map((block) => (
                    <BlockEditor
                      key={block.id}
                      block={block}
                      onUpdate={(content) => updateBlock(block.id, content)}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  ))}
                </Reorder.Group>
              )}
            </div>

            {/* Column 1 (Right) */}
            <div className="space-y-3">
              {column1Blocks.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground">Right column</p>
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={column1Blocks}
                  onReorder={(newBlocks) => handleReorderColumn(1, newBlocks)}
                  className="space-y-3"
                >
                  {column1Blocks.map((block) => (
                    <BlockEditor
                      key={block.id}
                      block={block}
                      onUpdate={(content) => updateBlock(block.id, content)}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  ))}
                </Reorder.Group>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hero Section Editor Component
function HeroSectionEditor({
  hero,
  onUpdate,
}: {
  hero?: HeroSection;
  onUpdate: (hero?: HeroSection) => void;
}) {
  const [localHero, setLocalHero] = useState<HeroSection | undefined>(hero);
  const [isExpanded, setIsExpanded] = useState(!!hero?.backgroundImage);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onUpdate(localHero);
    }, 300);
    return () => clearTimeout(timeout);
  }, [localHero]);

  if (!isExpanded) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Button
            variant="outline"
            onClick={() => setIsExpanded(true)}
            data-testid="button-add-hero-section"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Add Hero Section
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <span className="font-semibold">Hero Section</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setLocalHero(undefined);
              setIsExpanded(false);
            }}
            data-testid="button-remove-hero-section"
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Background Image Upload */}
        <div className="space-y-2">
          <Label>Background Image</Label>
          {!localHero?.backgroundImage ? (
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Label
                htmlFor="hero-background-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <span className="text-sm font-medium text-primary hover:underline">
                    Click to upload background image
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: Wide landscape image (1920x600px)
                  </p>
                </div>
              </Label>
              <input
                id="hero-background-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setLocalHero({
                        ...localHero,
                        backgroundImage: reader.result as string,
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          ) : (
            <div className="relative">
              <img
                src={localHero.backgroundImage}
                alt="Hero background"
                className="w-full h-32 object-cover rounded border"
              />
              <div className="flex gap-2 mt-2">
                <Label
                  htmlFor="hero-background-upload"
                  className="cursor-pointer text-sm text-primary hover:underline"
                >
                  Change Image
                </Label>
                <input
                  id="hero-background-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setLocalHero({
                          ...localHero,
                          backgroundImage: reader.result as string,
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Title Input */}
        <div className="space-y-2">
          <Label>Title (optional)</Label>
          <Input
            value={localHero?.title || ""}
            onChange={(e) =>
              setLocalHero({ ...localHero, title: e.target.value })
            }
            placeholder="Enter hero title..."
            data-testid="input-hero-title"
          />
        </div>

        {/* Description Input */}
        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Textarea
            value={localHero?.description || ""}
            onChange={(e) =>
              setLocalHero({ ...localHero, description: e.target.value })
            }
            placeholder="Enter hero description..."
            rows={3}
            data-testid="input-hero-description"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Section Item Component (wrapper with drag controls)
function SectionItem({
  section,
  sectionIndex,
  onUpdate,
  onDelete,
  onInsertAbove,
  onInsertBelow,
}: {
  section: Section;
  sectionIndex: number;
  onUpdate: (section: Section) => void;
  onDelete: () => void;
  onInsertAbove: () => void;
  onInsertBelow: () => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      key={section.id}
      value={section}
      dragListener={false}
      dragControls={dragControls}
    >
      <div className="relative group">
        {/* Top + Icon */}
        <button
          type="button"
          onClick={onInsertAbove}
          className="absolute left-1/2 -translate-x-1/2 -top-3 z-10
                     opacity-0 group-hover:opacity-100 transition-opacity
                     w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600
                     text-white shadow-lg flex items-center justify-center
                     border-2 border-white"
          data-testid={`button-insert-above-${section.id}`}
        >
          <Plus className="w-4 h-4" />
        </button>

        <SectionEditor
          section={section}
          onUpdate={onUpdate}
          onDelete={onDelete}
          dragControls={dragControls}
        />

        {/* Bottom + Icon */}
        <button
          type="button"
          onClick={onInsertBelow}
          className="absolute left-1/2 -translate-x-1/2 -bottom-3 z-10
                     opacity-0 group-hover:opacity-100 transition-opacity
                     w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600
                     text-white shadow-lg flex items-center justify-center
                     border-2 border-white"
          data-testid={`button-insert-below-${section.id}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </Reorder.Item>
  );
}

// Ref type for TextPageEditor
type TextPageEditorRef = {
  addLayoutSection: (layout: LayoutTemplate) => void;
  populateSectionWithLayout: (
    sectionId: string,
    layout: LayoutTemplate,
  ) => void;
};

// Text Page Editor Component (Section-based)
const TextPageEditor = forwardRef<
  TextPageEditorRef,
  {
    page: SmartFilePage;
    onUpdate: (content: TextPageContent) => void;
    onAddClick?: () => void;
    onRequestLayoutForSection?: (sectionId: string) => void;
  }
>(({ page, onUpdate, onAddClick, onRequestLayoutForSection }, ref) => {
  const content = page.content as TextPageContent;

  // Convert legacy format to sections on load
  const initializeSections = (): Section[] => {
    if (content.sections && content.sections.length > 0) {
      return content.sections;
    }

    // Legacy block format conversion
    if (content.blocks && content.blocks.length > 0) {
      return [
        {
          id: `section-${Date.now()}`,
          columns: 1,
          blocks: content.blocks,
        },
      ];
    }

    // Legacy heading/content format conversion
    const legacyBlocks: ContentBlock[] = [];
    if (content.heading) {
      legacyBlocks.push({
        id: `block-${Date.now()}-heading`,
        type: "HEADING",
        content: content.heading,
      });
    }
    if (content.content) {
      legacyBlocks.push({
        id: `block-${Date.now()}-text`,
        type: "TEXT",
        content: content.content,
      });
    }

    if (legacyBlocks.length > 0) {
      return [
        {
          id: `section-${Date.now()}`,
          columns: 1,
          blocks: legacyBlocks,
        },
      ];
    }

    return [];
  };

  const [sections, setSections] = useState<Section[]>(initializeSections);

  useEffect(() => {
    setSections(initializeSections());
  }, [page.id]);

  useEffect(() => {
    // Auto-save sections when they change
    const timeout = setTimeout(() => {
      onUpdate({ sections });
    }, 500);
    return () => clearTimeout(timeout);
  }, [sections]);

  // Add a section from a layout template
  const addLayoutSection = (layout: LayoutTemplate) => {
    const newSection: Section = {
      id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      columns: layout.columns,
      blocks: layout.blocks.map((block, idx) => ({
        ...block,
        id: `block-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
      })),
    };
    setSections([...sections, newSection]);
  };

  // Populate a specific section with layout blocks
  const populateSectionWithLayout = (
    sectionId: string,
    layout: LayoutTemplate,
  ) => {
    setSections((prevSections) =>
      prevSections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            columns: layout.columns,
            blocks: layout.blocks.map((block, idx) => ({
              ...block,
              id: `block-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
            })),
          };
        }
        return section;
      }),
    );
  };

  // Insert an empty section at a specific index
  const insertSectionAtPosition = (index: number) => {
    const newSection: Section = {
      id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      columns: 1,
      blocks: [],
    };

    const updatedSections = [...sections];
    updatedSections.splice(index, 0, newSection);
    setSections(updatedSections);

    // Notify parent to show layout picker for this section
    if (onRequestLayoutForSection) {
      onRequestLayoutForSection(newSection.id);
    }
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    addLayoutSection,
    populateSectionWithLayout,
  }));

  const updateSection = (sectionId: string, updatedSection: Section) => {
    setSections((prevSections) =>
      prevSections.map((s) => (s.id === sectionId ? updatedSection : s)),
    );
  };

  const deleteSection = (sectionId: string) => {
    setSections((prevSections) =>
      prevSections.filter((s) => s.id !== sectionId),
    );
  };

  const handleReorder = (newSections: Section[]) => {
    setSections(newSections);
  };

  return (
    <div className="space-y-4">
      {sections.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-1">No sections yet</p>
          <p className="text-sm text-muted-foreground">
            Choose a layout from the sidebar to get started
          </p>
          {onAddClick && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={onAddClick}
              data-testid="button-add-layout-empty"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          )}
        </div>
      ) : (
        <>
          <Reorder.Group
            axis="y"
            values={sections}
            onReorder={handleReorder}
            className="space-y-4"
          >
            {sections.map((section, index) => (
              <SectionItem
                key={section.id}
                section={section}
                sectionIndex={index}
                onUpdate={(updatedSection) =>
                  updateSection(section.id, updatedSection)
                }
                onDelete={() => deleteSection(section.id)}
                onInsertAbove={() => insertSectionAtPosition(index)}
                onInsertBelow={() => insertSectionAtPosition(index + 1)}
              />
            ))}
          </Reorder.Group>
          {/* Add Section Button below all sections */}
          {onAddClick && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={onAddClick}
                data-testid="button-add-layout-section"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
});

// Form Page Editor Component (Section-based, same as TEXT but for forms)
function FormPageEditor({
  page,
  onUpdate,
}: {
  page: SmartFilePage;
  onUpdate: (content: FormPageContent) => void;
}) {
  const content = page.content as FormPageContent;

  const initializeSections = (): Section[] => {
    if (content.sections && content.sections.length > 0) {
      return content.sections;
    }
    return [];
  };

  const [hero, setHero] = useState<HeroSection | undefined>(content.hero);
  const [sections, setSections] = useState<Section[]>(initializeSections);

  useEffect(() => {
    setHero(content.hero);
    setSections(initializeSections());
  }, [page.id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onUpdate({ hero, sections });
    }, 500);
    return () => clearTimeout(timeout);
  }, [hero, sections]);

  const addSection = (columns: 1 | 2) => {
    const newSection: Section = {
      id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      columns,
      blocks: [],
    };
    setSections([...sections, newSection]);
  };

  // Insert an empty section at a specific index
  const insertSectionAtPosition = (index: number) => {
    const newSection: Section = {
      id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      columns: 1,
      blocks: [],
    };

    const updatedSections = [...sections];
    updatedSections.splice(index, 0, newSection);
    setSections(updatedSections);
  };

  const updateSection = (sectionId: string, updatedSection: Section) => {
    setSections((prevSections) =>
      prevSections.map((s) => (s.id === sectionId ? updatedSection : s)),
    );
  };

  const deleteSection = (sectionId: string) => {
    setSections((prevSections) =>
      prevSections.filter((s) => s.id !== sectionId),
    );
  };

  const handleReorder = (newSections: Section[]) => {
    setSections(newSections);
  };

  return (
    <div className="space-y-4">
      {/* Hero Section Editor (optional for forms) */}
      <HeroSectionEditor hero={hero} onUpdate={setHero} />

      {/* Section Controls */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => addSection(1)}
          data-testid="button-add-1-column-section-form"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add 1-Column Section
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addSection(2)}
          data-testid="button-add-2-column-section-form"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add 2-Column Section
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            No sections yet. Add a section to get started building your form.
          </p>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={sections}
          onReorder={handleReorder}
          className="space-y-4"
        >
          {sections.map((section, index) => (
            <SectionItem
              key={section.id}
              section={section}
              sectionIndex={index}
              onUpdate={(updatedSection) =>
                updateSection(section.id, updatedSection)
              }
              onDelete={() => deleteSection(section.id)}
              onInsertAbove={() => insertSectionAtPosition(index)}
              onInsertBelow={() => insertSectionAtPosition(index + 1)}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}

// Package Page Editor Component
function PackagePageEditor({
  page,
  onUpdate,
}: {
  page: SmartFilePage;
  onUpdate: (content: PackagePageContent) => void;
}) {
  const content = page.content as PackagePageContent;
  const [localContent, setLocalContent] = useState(content);

  const { data: packages, isLoading } = useQuery<any[]>({
    queryKey: ["/api/packages"],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    setLocalContent(content);
  }, [page.id]);

  const handleBlur = () => {
    if (JSON.stringify(localContent) !== JSON.stringify(content)) {
      onUpdate(localContent);
    }
  };

  const togglePackage = (packageId: string) => {
    const packageIds = localContent.packageIds || [];
    const newPackageIds = packageIds.includes(packageId)
      ? packageIds.filter((id) => id !== packageId)
      : [...packageIds, packageId];

    const newContent = { ...localContent, packageIds: newPackageIds };
    setLocalContent(newContent);
    onUpdate(newContent);
  };

  const selectedPackages =
    packages?.filter((pkg) =>
      (localContent.packageIds || []).includes(pkg.id),
    ) || [];

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="package-heading" data-testid="label-package-heading">
          Heading
        </Label>
        <Input
          id="package-heading"
          value={localContent.heading || ""}
          onChange={(e) =>
            setLocalContent({ ...localContent, heading: e.target.value })
          }
          onBlur={handleBlur}
          placeholder="Enter page heading"
          data-testid="input-package-heading"
        />
      </div>
      <div>
        <Label
          htmlFor="package-description"
          data-testid="label-package-description"
        >
          Description
        </Label>
        <Textarea
          id="package-description"
          value={localContent.description || ""}
          onChange={(e) =>
            setLocalContent({ ...localContent, description: e.target.value })
          }
          onBlur={handleBlur}
          placeholder="Enter description"
          rows={3}
          data-testid="textarea-package-description"
        />
      </div>
      <Separator />
      <div>
        <Label data-testid="label-packages">Packages</Label>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2
              className="w-6 h-6 animate-spin"
              data-testid="loading-packages"
            />
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            {packages && packages.length > 0 ? (
              packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={cn(
                    "cursor-pointer transition-all overflow-hidden",
                    (localContent.packageIds || []).includes(pkg.id)
                      ? "border-2 border-primary bg-primary/5"
                      : "border hover:border-primary/50",
                  )}
                  onClick={() => togglePackage(pkg.id)}
                  data-testid={`card-package-${pkg.id}`}
                >
                  {pkg.imageUrl && (
                    <div className="h-32 w-full overflow-hidden border-b">
                      <img
                        src={pkg.imageUrl}
                        alt={pkg.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-semibold text-base mb-1"
                          data-testid={`text-package-name-${pkg.id}`}
                        >
                          {pkg.name}
                        </p>
                        {pkg.description && (
                          <p
                            className="text-sm text-muted-foreground mb-2 line-clamp-2"
                            data-testid={`text-package-description-${pkg.id}`}
                          >
                            {pkg.description}
                          </p>
                        )}
                        <p
                          className="text-base font-semibold text-primary"
                          data-testid={`text-package-price-${pkg.id}`}
                        >
                          ${(pkg.basePriceCents / 100).toFixed(2)}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1",
                          (localContent.packageIds || []).includes(pkg.id)
                            ? "border-primary bg-primary"
                            : "border-muted",
                        )}
                      >
                        {(localContent.packageIds || []).includes(pkg.id) && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p
                className="text-sm text-muted-foreground"
                data-testid="text-no-packages"
              >
                No packages available. Create packages first.
              </p>
            )}
          </div>
        )}
      </div>
      {selectedPackages.length > 0 && (
        <>
          <Separator />
          <div>
            <Label data-testid="label-selected-packages">
              Selected Packages ({selectedPackages.length})
            </Label>
            <div className="space-y-2 mt-2">
              {selectedPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg"
                  data-testid={`selected-package-${pkg.id}`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="font-medium">{pkg.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    ${(pkg.basePriceCents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Add-on Page Editor Component
function AddOnPageEditor({
  page,
  onUpdate,
}: {
  page: SmartFilePage;
  onUpdate: (content: AddOnPageContent) => void;
}) {
  const content = page.content as AddOnPageContent;
  const [localContent, setLocalContent] = useState(content);

  const { data: addOns, isLoading } = useQuery({
    queryKey: ["/api/add-ons"],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    setLocalContent(content);
  }, [page.id]);

  const handleBlur = () => {
    if (JSON.stringify(localContent) !== JSON.stringify(content)) {
      onUpdate(localContent);
    }
  };

  const toggleAddOn = (addOnId: string) => {
    const addOnIds = localContent.addOnIds || [];
    const newAddOnIds = addOnIds.includes(addOnId)
      ? addOnIds.filter((id) => id !== addOnId)
      : [...addOnIds, addOnId];

    const newContent = { ...localContent, addOnIds: newAddOnIds };
    setLocalContent(newContent);
    onUpdate(newContent);
  };

  const selectedAddOns =
    addOns?.filter((addon: any) =>
      (localContent.addOnIds || []).includes(addon.id),
    ) || [];

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="addon-heading" data-testid="label-addon-heading">
          Heading
        </Label>
        <Input
          id="addon-heading"
          value={localContent.heading || ""}
          onChange={(e) =>
            setLocalContent({ ...localContent, heading: e.target.value })
          }
          onBlur={handleBlur}
          placeholder="Enter page heading"
          data-testid="input-addon-heading"
        />
      </div>
      <div>
        <Label
          htmlFor="addon-description"
          data-testid="label-addon-description"
        >
          Description
        </Label>
        <Textarea
          id="addon-description"
          value={localContent.description || ""}
          onChange={(e) =>
            setLocalContent({ ...localContent, description: e.target.value })
          }
          onBlur={handleBlur}
          placeholder="Enter description"
          rows={3}
          data-testid="textarea-addon-description"
        />
      </div>
      <Separator />
      <div>
        <Label data-testid="label-addons">Add-ons</Label>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2
              className="w-6 h-6 animate-spin"
              data-testid="loading-addons"
            />
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            {addOns && addOns.length > 0 ? (
              addOns.map((addon: any) => (
                <Card
                  key={addon.id}
                  className={cn(
                    "cursor-pointer transition-all overflow-hidden",
                    (localContent.addOnIds || []).includes(addon.id)
                      ? "border-2 border-primary bg-primary/5"
                      : "border hover:border-primary/50",
                  )}
                  onClick={() => toggleAddOn(addon.id)}
                  data-testid={`card-addon-${addon.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium mb-1">{addon.name}</h4>
                        {addon.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {addon.description}
                          </p>
                        )}
                        <p className="text-sm font-semibold text-primary mt-2">
                          ${(addon.priceCents / 100).toFixed(2)}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1",
                          (localContent.addOnIds || []).includes(addon.id)
                            ? "border-primary bg-primary"
                            : "border-muted",
                        )}
                      >
                        {(localContent.addOnIds || []).includes(addon.id) && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p
                className="text-sm text-muted-foreground"
                data-testid="text-no-addons"
              >
                No add-ons available. Create add-ons first.
              </p>
            )}
          </div>
        )}
      </div>
      {selectedAddOns.length > 0 && (
        <>
          <Separator />
          <div>
            <Label data-testid="label-selected-addons">
              Selected Add-ons ({selectedAddOns.length})
            </Label>
            <div className="space-y-2 mt-2">
              {selectedAddOns.map((addon: any) => (
                <div
                  key={addon.id}
                  className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg"
                  data-testid={`selected-addon-${addon.id}`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="font-medium">{addon.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    ${(addon.priceCents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Payment Page Editor Component
function PaymentPageEditor({
  page,
  onUpdate,
}: {
  page: SmartFilePage;
  onUpdate: (content: PaymentPageContent) => void;
}) {
  const content = page.content as PaymentPageContent;
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [page.id]);

  const handleBlur = () => {
    if (JSON.stringify(localContent) !== JSON.stringify(content)) {
      onUpdate(localContent);
    }
  };

  const handleToggle = (checked: boolean) => {
    const newContent = { ...localContent, acceptOnlinePayments: checked };
    setLocalContent(newContent);
    onUpdate(newContent);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="payment-heading" data-testid="label-payment-heading">
          Heading
        </Label>
        <Input
          id="payment-heading"
          value={localContent.heading || ""}
          onChange={(e) =>
            setLocalContent({ ...localContent, heading: e.target.value })
          }
          onBlur={handleBlur}
          placeholder="Enter page heading"
          data-testid="input-payment-heading"
        />
      </div>
      <div>
        <Label
          htmlFor="payment-description"
          data-testid="label-payment-description"
        >
          Description
        </Label>
        <Textarea
          id="payment-description"
          value={localContent.description || ""}
          onChange={(e) =>
            setLocalContent({ ...localContent, description: e.target.value })
          }
          onBlur={handleBlur}
          placeholder="Enter description"
          rows={3}
          data-testid="textarea-payment-description"
        />
      </div>
      <div>
        <Label htmlFor="deposit-percent" data-testid="label-deposit-percent">
          Deposit Percentage (%)
        </Label>
        <Input
          id="deposit-percent"
          type="number"
          min="0"
          max="100"
          value={localContent.depositPercent || 0}
          onChange={(e) =>
            setLocalContent({
              ...localContent,
              depositPercent: parseInt(e.target.value || "0"),
            })
          }
          onBlur={handleBlur}
          placeholder="50"
          data-testid="input-deposit-percent"
        />
      </div>
      <div>
        <Label htmlFor="payment-terms" data-testid="label-payment-terms">
          Payment Terms
        </Label>
        <Textarea
          id="payment-terms"
          value={localContent.paymentTerms || ""}
          onChange={(e) =>
            setLocalContent({ ...localContent, paymentTerms: e.target.value })
          }
          onBlur={handleBlur}
          placeholder="Enter payment terms and conditions"
          rows={4}
          data-testid="textarea-payment-terms"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="accept-online-payments"
          checked={localContent.acceptOnlinePayments || false}
          onCheckedChange={handleToggle}
          data-testid="switch-accept-online-payments"
        />
        <Label
          htmlFor="accept-online-payments"
          data-testid="label-accept-online-payments"
        >
          Accept online payments
        </Label>
      </div>

      <Separator />

      {/* Payment Schedule Configuration */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-1">Payment Schedule</h4>
          <p className="text-xs text-muted-foreground">
            Configure how clients will pay for this service
          </p>
        </div>

        <Tabs
          value={localContent.paymentScheduleMode || "SIMPLE"}
          onValueChange={(value) => {
            const newContent = {
              ...localContent,
              paymentScheduleMode: value as any,
            };
            setLocalContent(newContent);
            onUpdate(newContent);
          }}
        >
          <TabsList
            className="grid w-full grid-cols-4"
            data-testid="tabs-payment-schedule"
          >
            <TabsTrigger value="SIMPLE" data-testid="tab-simple">
              Simple
            </TabsTrigger>
            <TabsTrigger value="CLIENT_CHOICE" data-testid="tab-client-choice">
              Client Choice
            </TabsTrigger>
            <TabsTrigger value="MONTHLY" data-testid="tab-monthly">
              Monthly
            </TabsTrigger>
            <TabsTrigger value="BIWEEKLY" data-testid="tab-biweekly">
              Bi-weekly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="SIMPLE" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Traditional two-payment system: deposit now, balance before event.
            </p>
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Payment Structure:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  • Deposit: {localContent.depositPercent || 50}% due at booking
                </li>
                <li>
                  • Balance: {100 - (localContent.depositPercent || 50)}% due 30
                  days before event
                </li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="CLIENT_CHOICE" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Let clients choose their payment plan (like HoneyBook). Great for
              flexibility and higher conversions.
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="max-installments">Maximum Installments</Label>
                <Input
                  id="max-installments"
                  type="number"
                  min="2"
                  max="12"
                  value={
                    localContent.paymentScheduleConfig?.maxInstallments || 6
                  }
                  onChange={(e) => {
                    const newContent = {
                      ...localContent,
                      paymentScheduleConfig: {
                        ...localContent.paymentScheduleConfig,
                        maxInstallments: parseInt(e.target.value || "6"),
                      },
                    };
                    setLocalContent(newContent);
                  }}
                  onBlur={handleBlur}
                  placeholder="6"
                  data-testid="input-max-installments"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Clients can split payments into up to this many installments
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="allow-pay-in-full"
                  checked={
                    localContent.paymentScheduleConfig?.allowPayInFull ?? true
                  }
                  onCheckedChange={(checked) => {
                    const newContent = {
                      ...localContent,
                      paymentScheduleConfig: {
                        ...localContent.paymentScheduleConfig,
                        allowPayInFull: checked,
                      },
                    };
                    setLocalContent(newContent);
                    onUpdate(newContent);
                  }}
                  data-testid="switch-allow-pay-in-full"
                />
                <Label htmlFor="allow-pay-in-full">
                  Allow "Pay in Full" option
                </Label>
              </div>
              {localContent.paymentScheduleConfig?.allowPayInFull && (
                <div>
                  <Label htmlFor="pay-in-full-discount">
                    Pay in Full Discount (%)
                  </Label>
                  <Input
                    id="pay-in-full-discount"
                    type="number"
                    min="0"
                    max="20"
                    value={
                      localContent.paymentScheduleConfig
                        ?.payInFullDiscountPercent || 0
                    }
                    onChange={(e) => {
                      const newContent = {
                        ...localContent,
                        paymentScheduleConfig: {
                          ...localContent.paymentScheduleConfig,
                          payInFullDiscountPercent: parseInt(
                            e.target.value || "0",
                          ),
                        },
                      };
                      setLocalContent(newContent);
                    }}
                    onBlur={handleBlur}
                    placeholder="0"
                    data-testid="input-pay-in-full-discount"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional discount to incentivize upfront payment (e.g., 3%)
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="MONTHLY" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Payments spread monthly from today until 30 days before the event.
              Great for long engagement periods.
            </p>
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  • First payment: {localContent.depositPercent || 50}% due at
                  booking
                </li>
                <li>• Remaining amount split across monthly payments</li>
                <li>• Final payment: 30 days before event date</li>
                <li>
                  • Payment dates: Same day each month (e.g., 15th of each
                  month)
                </li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="BIWEEKLY" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Payments every 2 weeks from today until 30 days before the event.
              Good for shorter timelines.
            </p>
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  • First payment: {localContent.depositPercent || 50}% due at
                  booking
                </li>
                <li>• Remaining amount split across bi-weekly payments</li>
                <li>• Payments occur every 14 days</li>
                <li>• Final payment: 30 days before event date</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-xs text-blue-800 dark:text-blue-400">
            <strong>Note:</strong> Payment schedules are flexible guides.
            Clients can pay more or less than scheduled installments, and the
            system will automatically adjust remaining payments. Schedules are
            calculated when the Smart File is sent using the project's event
            date.
          </p>
        </div>
      </div>
    </div>
  );
}

// Invoice Page Editor Component - WYSIWYG Style
function InvoicePageEditor({
  page,
  onUpdate,
  pages,
}: {
  page: SmartFilePage;
  onUpdate: (content: InvoicePageContent) => void;
  pages: SmartFilePage[];
}) {
  const content = page.content as InvoicePageContent;
  const [localContent, setLocalContent] = useState(content);
  const { toast } = useToast();

  // Detect proposal mode from passed-in pages
  const isProposalMode = pages.some(
    (p) => p.pageType === "PACKAGE" || p.pageType === "ADDON",
  );

  const handleBlur = () => {
    if (JSON.stringify(localContent) !== JSON.stringify(content)) {
      onUpdate(localContent);
    }
  };

  const handleAddLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: `item-${Date.now()}`,
      service: "",
      quantity: 1,
      unit: "item",
      unitPrice: 0,
      taxable: false,
    };
    setLocalContent({
      ...localContent,
      lineItems: [...(localContent.lineItems || []), newItem],
    });
    setTimeout(
      () =>
        onUpdate({
          ...localContent,
          lineItems: [...(localContent.lineItems || []), newItem],
        }),
      0,
    );
  };

  const updateLineItem = (index: number, updates: Partial<InvoiceLineItem>) => {
    const updatedItems = [...(localContent.lineItems || [])];
    updatedItems[index] = { ...updatedItems[index], ...updates };
    const newContent = { ...localContent, lineItems: updatedItems };
    setLocalContent(newContent);
    onUpdate(newContent);
  };

  const removeLineItem = (index: number) => {
    const updatedItems = (localContent.lineItems || []).filter(
      (_, i) => i !== index,
    );
    if (updatedItems.length === 0) {
      toast({
        title: "Cannot remove",
        description: "Invoice must have at least one line item",
        variant: "destructive",
      });
      return;
    }
    setLocalContent({ ...localContent, lineItems: updatedItems });
    onUpdate({ ...localContent, lineItems: updatedItems });
  };

  // Calculate totals
  const lineItems = localContent.lineItems || [];
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const taxableSubtotal = lineItems
    .filter((item) => item.taxable)
    .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax =
    localContent.taxPercent > 0
      ? Math.round(taxableSubtotal * (localContent.taxPercent / 100))
      : 0;
  const discount =
    localContent.discountType === "PERCENT"
      ? Math.round(subtotal * (localContent.discountAmount / 100))
      : localContent.discountAmount || 0;
  const total = subtotal + tax - discount;

  // Inline input style - transparent until hover/focus
  const inlineInputClass =
    "bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-primary focus:ring-0 px-1 transition-colors";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Locked state message when in proposal mode */}
      {isProposalMode && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-400">
                Package/Add-on Selection Active
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-500">
                Line items will be auto-filled from client's selections.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WYSIWYG Invoice Document */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border p-8">
        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-8">
          {/* Left: Business Info */}
          <div className="flex-1">
            <input
              type="text"
              value={localContent.heading || ""}
              onChange={(e) =>
                setLocalContent({ ...localContent, heading: e.target.value })
              }
              onBlur={handleBlur}
              placeholder="Invoice Title"
              className={`${inlineInputClass} text-3xl font-bold w-full mb-2`}
            />
            <textarea
              value={localContent.description || ""}
              onChange={(e) =>
                setLocalContent({
                  ...localContent,
                  description: e.target.value,
                })
              }
              onBlur={handleBlur}
              placeholder="Add a description..."
              rows={1}
              className={`${inlineInputClass} text-sm text-muted-foreground w-full max-w-md resize-none`}
            />
          </div>

          {/* Right: Invoice Details */}
          <div className="text-right flex-shrink-0 ml-4">
            <div className="text-4xl font-bold text-primary mb-2">INVOICE</div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-end gap-1">
                <span className="text-muted-foreground">Invoice #:</span>
                <input
                  type="text"
                  value={localContent.invoiceNumber || ""}
                  onChange={(e) =>
                    setLocalContent({
                      ...localContent,
                      invoiceNumber: e.target.value,
                    })
                  }
                  onBlur={handleBlur}
                  placeholder="INV-001"
                  className={`${inlineInputClass} font-medium w-24 text-right`}
                />
              </div>
              <div className="flex items-center justify-end gap-1">
                <span className="text-muted-foreground">Date:</span>
                <input
                  type="date"
                  value={
                    localContent.dateIssued ||
                    new Date().toISOString().split("T")[0]
                  }
                  onChange={(e) => {
                    setLocalContent({
                      ...localContent,
                      dateIssued: e.target.value,
                    });
                    onUpdate({ ...localContent, dateIssued: e.target.value });
                  }}
                  className={`${inlineInputClass} font-medium w-32 text-right`}
                />
              </div>
              <div className="flex items-center justify-end gap-1">
                <span className="text-muted-foreground">PO #:</span>
                <input
                  type="text"
                  value={localContent.purchaseOrderNumber || ""}
                  onChange={(e) =>
                    setLocalContent({
                      ...localContent,
                      purchaseOrderNumber: e.target.value,
                    })
                  }
                  onBlur={handleBlur}
                  placeholder="Optional"
                  className={`${inlineInputClass} font-medium w-24 text-right`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="bg-muted/30 p-4 rounded-md mb-8">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Bill To
          </div>
          <input
            type="text"
            value={localContent.billTo || ""}
            onChange={(e) =>
              setLocalContent({ ...localContent, billTo: e.target.value })
            }
            onBlur={handleBlur}
            placeholder="Client name and address"
            className={`${inlineInputClass} font-semibold w-full`}
          />
        </div>

        {/* Line Items Table */}
        {!isProposalMode && (
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 text-sm font-semibold uppercase tracking-wide">
                    Description
                  </th>
                  <th className="text-center py-3 text-sm font-semibold uppercase tracking-wide w-16">
                    Qty
                  </th>
                  <th className="text-center py-3 text-sm font-semibold uppercase tracking-wide w-20">
                    Unit
                  </th>
                  <th className="text-right py-3 text-sm font-semibold uppercase tracking-wide w-24">
                    Rate
                  </th>
                  <th className="text-center py-3 text-sm font-semibold uppercase tracking-wide w-12">
                    Tax
                  </th>
                  <th className="text-right py-3 text-sm font-semibold uppercase tracking-wide w-24">
                    Amount
                  </th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`group ${index % 2 === 0 ? "bg-gray-50/50" : ""}`}
                  >
                    <td className="py-3">
                      <input
                        type="text"
                        value={item.service}
                        onChange={(e) =>
                          updateLineItem(index, { service: e.target.value })
                        }
                        onBlur={handleBlur}
                        placeholder="Service description"
                        className={`${inlineInputClass} font-medium w-full`}
                      />
                    </td>
                    <td className="py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(index, {
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                        onBlur={handleBlur}
                        className={`${inlineInputClass} w-12 text-center`}
                      />
                    </td>
                    <td className="py-3 text-center">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) =>
                          updateLineItem(index, { unit: e.target.value })
                        }
                        onBlur={handleBlur}
                        placeholder="item"
                        className={`${inlineInputClass} w-16 text-center`}
                      />
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end">
                        <span className="text-muted-foreground mr-1">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={(item.unitPrice / 100).toFixed(2)}
                          onChange={(e) =>
                            updateLineItem(index, {
                              unitPrice: Math.round(
                                parseFloat(e.target.value || "0") * 100,
                              ),
                            })
                          }
                          onBlur={handleBlur}
                          className={`${inlineInputClass} w-20 text-right`}
                        />
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <Checkbox
                        checked={item.taxable}
                        onCheckedChange={(checked) => {
                          updateLineItem(index, { taxable: !!checked });
                        }}
                      />
                    </td>
                    <td className="py-3 text-right font-semibold">
                      ${((item.quantity * item.unitPrice) / 100).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash className="w-3 h-3 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddLineItem}
              className="mt-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Line Item
            </Button>
          </div>
        )}

        {/* Proposal Mode Placeholder - shows where packages will appear */}
        {isProposalMode && (
          <div className="mb-8 py-8 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
            <div className="text-center">
              <Package className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <p className="text-blue-700 dark:text-blue-400 font-medium">
                Packages will feed the invoice
              </p>
              <p className="text-sm text-blue-600/70 dark:text-blue-500/70 mt-1">
                Selected packages and add-ons will appear here when the client
                views the proposal
              </p>
            </div>
          </div>
        )}

        {/* Totals Section */}
        <div className="flex justify-end">
          <div className="w-80 space-y-2">
            <div className="flex justify-between py-2 text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">
                ${(subtotal / 100).toFixed(2)}
              </span>
            </div>

            {/* Editable Tax */}
            <div className="flex justify-between py-2 text-sm items-center">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Tax</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={localContent.taxPercent || 0}
                  onChange={(e) =>
                    setLocalContent({
                      ...localContent,
                      taxPercent: parseFloat(e.target.value || "0"),
                    })
                  }
                  onBlur={handleBlur}
                  className={`${inlineInputClass} w-12 text-center`}
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <span className="font-medium">${(tax / 100).toFixed(2)}</span>
            </div>

            {/* Editable Discount */}
            <div className="flex justify-between py-2 text-sm items-center text-green-600">
              <div className="flex items-center gap-1">
                <span>Discount</span>
                <input
                  type="number"
                  min="0"
                  step={localContent.discountType === "PERCENT" ? "0.1" : "1"}
                  value={
                    localContent.discountType === "PERCENT"
                      ? localContent.discountAmount || 0
                      : ((localContent.discountAmount || 0) / 100).toFixed(2)
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value || "0");
                    setLocalContent({
                      ...localContent,
                      discountAmount:
                        localContent.discountType === "PERCENT"
                          ? val
                          : Math.round(val * 100),
                    });
                  }}
                  onBlur={handleBlur}
                  className={`${inlineInputClass} w-12 text-center text-green-600`}
                />
                <Select
                  value={localContent.discountType || "PERCENT"}
                  onValueChange={(value: "AMOUNT" | "PERCENT") => {
                    setLocalContent({
                      ...localContent,
                      discountType: value,
                      discountAmount: 0,
                    });
                    onUpdate({
                      ...localContent,
                      discountType: value,
                      discountAmount: 0,
                    });
                  }}
                >
                  <SelectTrigger className="h-6 w-12 border-0 bg-transparent p-0 text-green-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">%</SelectItem>
                    <SelectItem value="AMOUNT">$</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="font-medium">
                -${(discount / 100).toFixed(2)}
              </span>
            </div>

            <Separator />

            <div className="flex justify-between py-3 bg-primary/5 px-4 rounded-md">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-primary">
                ${(total / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Terms Section */}
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Payment Terms</h3>
        </div>

        <div className="space-y-4">
          {/* Plan Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                const newContent = {
                  ...localContent,
                  paymentScheduleMode: "SIMPLE" as const,
                };
                setLocalContent(newContent);
                onUpdate(newContent);
              }}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                localContent.paymentScheduleMode === "SIMPLE" ||
                !localContent.paymentScheduleMode
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-semibold mb-1">Preset Plan</div>
              <div className="text-xs text-muted-foreground">
                Deposit + final payment before event
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                const newContent = {
                  ...localContent,
                  paymentScheduleMode: "CLIENT_CHOICE" as const,
                };
                setLocalContent(newContent);
                onUpdate(newContent);
              }}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                localContent.paymentScheduleMode === "CLIENT_CHOICE"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-semibold mb-1">Client Selects Plan</div>
              <div className="text-xs text-muted-foreground">
                Client chooses their installment plan
              </div>
            </button>
          </div>

          {/* Deposit Percentage */}
          <div className="flex items-center gap-4">
            <Label htmlFor="deposit-percent" className="whitespace-nowrap">
              Deposit
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id="deposit-percent"
                type="number"
                min="0"
                max="100"
                value={localContent.depositPercent || 50}
                onChange={(e) =>
                  setLocalContent({
                    ...localContent,
                    depositPercent: parseInt(e.target.value) || 50,
                  })
                }
                onBlur={handleBlur}
                className="w-20 h-8"
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </div>

          {/* Client Choice Options */}
          {localContent.paymentScheduleMode === "CLIENT_CHOICE" && (
            <div className="pl-4 border-l-2 border-primary/20 space-y-3">
              <div className="flex items-center gap-4">
                <Label
                  htmlFor="max-installments"
                  className="whitespace-nowrap text-sm"
                >
                  Max Installments
                </Label>
                <Input
                  id="max-installments"
                  type="number"
                  min="2"
                  max="12"
                  value={
                    localContent.paymentScheduleConfig?.maxInstallments || 6
                  }
                  onChange={(e) =>
                    setLocalContent({
                      ...localContent,
                      paymentScheduleConfig: {
                        ...localContent.paymentScheduleConfig,
                        maxInstallments: parseInt(e.target.value) || 6,
                      },
                    })
                  }
                  onBlur={handleBlur}
                  className="w-20 h-8"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="allow-pay-full"
                  checked={
                    localContent.paymentScheduleConfig?.allowPayInFull || false
                  }
                  onCheckedChange={(checked) => {
                    const newContent = {
                      ...localContent,
                      paymentScheduleConfig: {
                        ...localContent.paymentScheduleConfig,
                        allowPayInFull: checked,
                      },
                    };
                    setLocalContent(newContent);
                    onUpdate(newContent);
                  }}
                />
                <Label htmlFor="allow-pay-full" className="text-sm">
                  Allow "pay in full" option
                </Label>
              </div>
              {localContent.paymentScheduleConfig?.allowPayInFull && (
                <div className="flex items-center gap-4">
                  <Label
                    htmlFor="pay-full-discount"
                    className="whitespace-nowrap text-sm"
                  >
                    Pay in Full Discount
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      id="pay-full-discount"
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={
                        localContent.paymentScheduleConfig
                          ?.payInFullDiscountPercent || 0
                      }
                      onChange={(e) =>
                        setLocalContent({
                          ...localContent,
                          paymentScheduleConfig: {
                            ...localContent.paymentScheduleConfig,
                            payInFullDiscountPercent:
                              parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      onBlur={handleBlur}
                      className="w-20 h-8"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accept Online Payments */}
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="accept-online-payments"
              checked={localContent.acceptOnlinePayments || false}
              onCheckedChange={(checked) => {
                const newContent = {
                  ...localContent,
                  acceptOnlinePayments: checked,
                };
                setLocalContent(newContent);
                onUpdate(newContent);
              }}
            />
            <Label htmlFor="accept-online-payments">
              Accept online payments
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pay Page Editor Component - Shows realistic payment UI preview
function PayPageEditor({
  page,
  onUpdate,
  pages,
}: {
  page: SmartFilePage;
  onUpdate: (content: PayPageContent) => void;
  pages: SmartFilePage[];
}) {
  const content = page.content as PayPageContent;
  const [localContent, setLocalContent] = useState(content);

  // Get invoice page to show payment terms info
  const invoicePage = pages.find((p) => p.pageType === "INVOICE");
  const invoiceContent = invoicePage?.content as InvoicePageContent | undefined;

  // Calculate totals from invoice
  const invoiceTotals = invoiceContent
    ? calculateInvoiceTotals(
        invoiceContent.lineItems || [],
        invoiceContent.taxPercent || 0,
        invoiceContent.discountAmount || 0,
        invoiceContent.discountType || "PERCENT",
      )
    : null;

  const total = invoiceTotals?.total || 0;
  const depositPercent = invoiceContent?.depositPercent || 50;
  const depositAmount = Math.round(total * (depositPercent / 100));
  const totalPayments =
    invoiceContent?.paymentScheduleMode === "SIMPLE"
      ? 2
      : invoiceContent?.paymentScheduleConfig?.maxInstallments || 2;

  const handleBlur = () => {
    if (JSON.stringify(localContent) !== JSON.stringify(content)) {
      onUpdate(localContent);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Editable Header Fields */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="pay-heading">Page Heading</Label>
          <Input
            id="pay-heading"
            value={localContent.heading || ""}
            onChange={(e) =>
              setLocalContent({ ...localContent, heading: e.target.value })
            }
            onBlur={handleBlur}
            placeholder="Complete Your Payment"
          />
        </div>

        <div>
          <Label htmlFor="pay-description">Description</Label>
          <Textarea
            id="pay-description"
            value={localContent.description || ""}
            onChange={(e) =>
              setLocalContent({ ...localContent, description: e.target.value })
            }
            onBlur={handleBlur}
            placeholder="Secure checkout powered by Stripe"
            rows={2}
          />
        </div>
      </div>

      <Separator />

      {/* Realistic Payment UI Preview - HoneyBook Style */}
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Client View Preview
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border overflow-hidden">
          {/* Header with branding */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                LOGO
              </div>
              <div>
                <div className="font-medium text-sm">
                  Payment 1 of {totalPayments}
                </div>
                <div className="text-xs text-muted-foreground">Due: Today</div>
              </div>
            </div>
            <button className="text-sm text-primary hover:underline">
              View Invoice
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Amount Due - Dynamic from Invoice */}
            <div>
              <div className="text-sm font-medium text-primary mb-1">
                Amount due
              </div>
              <div className="text-4xl font-bold">
                {total > 0 ? formatCentsAsDollars(depositAmount) : "$0.00"}
              </div>
              {total > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  Total: {formatCentsAsDollars(total)} ({depositPercent}%
                  deposit)
                </div>
              )}
              {!invoiceContent && (
                <div className="text-xs text-amber-600 mt-2">
                  Add line items to your Invoice page to see amounts
                </div>
              )}
            </div>

            {/* Tip Section */}
            <div className="space-y-3">
              <div className="text-sm">Would you like to leave a tip?</div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 flex-col h-auto py-2"
                >
                  <span>No thanks</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 flex-col h-auto py-2"
                >
                  <span>18%</span>
                  <span className="text-xs text-muted-foreground">$225</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 flex-col h-auto py-2"
                >
                  <span>20%</span>
                  <span className="text-xs text-muted-foreground">$250</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 flex-col h-auto py-2"
                >
                  <span>25%</span>
                  <span className="text-xs text-muted-foreground">$312</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 flex-col h-auto py-2"
                >
                  <span>Custom</span>
                </Button>
              </div>
            </div>

            {/* Autopay Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm font-medium">
                  Use Autopay, never make a late payment
                </span>
              </div>
              <div className="flex items-start gap-2 ml-8">
                <Checkbox disabled />
                <span className="text-xs text-muted-foreground">
                  (Optional) Pay this amount now. Upcoming payments will be
                  charged automatically per the invoice payment schedule.
                </span>
              </div>
            </div>

            {/* Google Pay Button */}
            <div className="bg-black text-white rounded-md py-3 flex items-center justify-center gap-2">
              <span className="font-medium">G Pay</span>
            </div>

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">OR</span>
              <Separator className="flex-1" />
            </div>

            {/* Payment Method Tabs */}
            <div className="flex rounded-md border overflow-hidden">
              <button className="flex-1 py-2 px-4 text-sm font-medium bg-gray-900 text-white">
                Debit or credit card
              </button>
              <button className="flex-1 py-2 px-4 text-sm text-muted-foreground border-l">
                Bank account
              </button>
            </div>

            {/* Card Form */}
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Card number
                </label>
                <div className="border rounded-md p-3 flex items-center justify-between">
                  <span className="text-muted-foreground">
                    1234 1234 1234 1234
                  </span>
                  <div className="flex gap-1">
                    <div className="w-8 h-5 bg-blue-600 rounded text-white text-[8px] flex items-center justify-center font-bold">
                      VISA
                    </div>
                    <div className="w-8 h-5 bg-red-500 rounded text-white text-[8px] flex items-center justify-center font-bold">
                      MC
                    </div>
                    <div className="w-8 h-5 bg-blue-400 rounded text-white text-[8px] flex items-center justify-center font-bold">
                      AMEX
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Expiration date
                  </label>
                  <div className="border rounded-md p-3">
                    <span className="text-muted-foreground">MM / YY</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Security code
                  </label>
                  <div className="border rounded-md p-3 flex items-center justify-between">
                    <span className="text-muted-foreground">CVC</span>
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 bg-muted/30 border-t">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
                <Shield className="w-4 h-4 text-yellow-800" />
              </div>
              <span className="text-xs text-muted-foreground">
                We use SSL encryption to protect your info.
              </span>
            </div>
            <Button className="bg-primary hover:bg-primary/90" disabled>
              Pay {total > 0 ? formatCentsAsDollars(depositAmount) : "$0.00"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Contract Page Editor Component
function ContractPageEditor({
  page,
  onUpdate,
}: {
  page: SmartFilePage;
  onUpdate: (content: ContractPageContent) => void;
}) {
  const content = page.content as ContractPageContent;
  const [localContent, setLocalContent] = useState(content);
  const [showVariables, setShowVariables] = useState(false);
  const editorRef = useRef<ContractRichTextEditorRef>(null);

  useEffect(() => {
    setLocalContent(content);
  }, [page.id]);

  const handleBlur = () => {
    if (JSON.stringify(localContent) !== JSON.stringify(content)) {
      onUpdate(localContent);
    }
  };

  const insertVariable = (variable: string) => {
    // Use the rich text editor's insertVariable method
    editorRef.current?.insertVariable(variable + " ");
    setShowVariables(false);
  };

  // Group variables by category
  const groupedVariables = AVAILABLE_VARIABLES.reduce(
    (acc, variable) => {
      if (!acc[variable.category]) {
        acc[variable.category] = [];
      }
      acc[variable.category].push(variable);
      return acc;
    },
    {} as Record<string, typeof AVAILABLE_VARIABLES>,
  );

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="contract-heading" data-testid="label-contract-heading">
          Heading
        </Label>
        <Input
          id="contract-heading"
          value={localContent.heading || ""}
          onChange={(e) =>
            setLocalContent({ ...localContent, heading: e.target.value })
          }
          onBlur={handleBlur}
          placeholder="e.g., Service Agreement"
          data-testid="input-contract-heading"
        />
      </div>

      <div>
        <Label
          htmlFor="contract-description"
          data-testid="label-contract-description"
        >
          Description
        </Label>
        <Textarea
          id="contract-description"
          value={localContent.description || ""}
          onChange={(e) =>
            setLocalContent({ ...localContent, description: e.target.value })
          }
          onBlur={handleBlur}
          placeholder="Brief description of this contract"
          rows={2}
          data-testid="textarea-contract-description"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="contract-template">Contract Template</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowVariables(!showVariables)}
            data-testid="button-toggle-variables"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Insert Variable
          </Button>
        </div>

        {showVariables && (
          <Card className="mb-3">
            <CardContent className="p-3">
              <ScrollArea className="h-64">
                {Object.entries(groupedVariables).map(
                  ([category, variables]) => (
                    <div key={category} className="mb-4">
                      <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                        {category}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {variables.map((variable) => (
                          <Button
                            key={variable.key}
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => insertVariable(variable.key)}
                            className="justify-start text-xs h-auto py-2"
                            data-testid={`button-insert-${variable.key}`}
                          >
                            <code className="text-primary mr-2">
                              {variable.key}
                            </code>
                            <span className="text-muted-foreground text-xs truncate">
                              {variable.label}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        <ContractRichTextEditor
          ref={editorRef}
          value={localContent.contractTemplate || ""}
          onChange={(html) => {
            const newContent = { ...localContent, contractTemplate: html };
            setLocalContent(newContent);
          }}
          onBlur={handleBlur}
          placeholder="Enter your contract template here. Use the Insert Variable button to add dynamic content like {{client_name}}, {{selected_packages}}, etc."
        />
        <p className="text-xs text-muted-foreground mt-2">
          Use the <strong>Insert Variable</strong> button above to add dynamic
          content like{" "}
          <code className="bg-muted px-1 rounded">{"{{client_name}}"}</code> or{" "}
          <code className="bg-muted px-1 rounded">
            {"{{selected_packages}}"}
          </code>
        </p>
      </div>

      {/* Contract Preview */}
      {localContent.contractTemplate && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Preview with Sample Data</h4>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-lg border">
                {isHtmlContent(localContent.contractTemplate) ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        parseContractVariablesHtml(
                          localContent.contractTemplate,
                          {
                            client_name: "Sarah Johnson",
                            photographer_name: "Your Business Name",
                            project_date: "June 15, 2025",
                            project_type: "WEDDING",
                            selected_packages: "Premium Package ($3,500)",
                            selected_addons:
                              "Second Shooter (x1), Engagement Session (x1)",
                            total_amount: "$4,800",
                            deposit_amount: "$2,400",
                            deposit_percent: "50%",
                          },
                        ),
                      ),
                    }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {parseContractVariables(localContent.contractTemplate, {
                      client_name: "Sarah Johnson",
                      photographer_name: "Your Business Name",
                      project_date: "June 15, 2025",
                      project_type: "WEDDING",
                      selected_packages: "Premium Package ($3,500)",
                      selected_addons:
                        "Second Shooter (x1), Engagement Session (x1)",
                      total_amount: "$4,800",
                      deposit_amount: "$2,400",
                      deposit_percent: "50%",
                    })}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                This preview shows how your contract will appear to clients with
                their actual data filled in.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Signature Requirements</h4>
        <div className="flex items-center space-x-2">
          <Switch
            id="require-client-signature"
            checked={localContent.requireClientSignature ?? true}
            onCheckedChange={(checked) => {
              const newContent = {
                ...localContent,
                requireClientSignature: checked,
              };
              setLocalContent(newContent);
              onUpdate(newContent);
            }}
            data-testid="switch-require-client-signature"
          />
          <Label htmlFor="require-client-signature">
            Require client signature
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="require-photographer-signature"
            checked={localContent.requirePhotographerSignature ?? true}
            onCheckedChange={(checked) => {
              const newContent = {
                ...localContent,
                requirePhotographerSignature: checked,
              };
              setLocalContent(newContent);
              onUpdate(newContent);
            }}
            data-testid="switch-require-photographer-signature"
          />
          <Label htmlFor="require-photographer-signature">
            Require photographer signature
          </Label>
        </div>
      </div>
    </div>
  );
}

// Scheduling Page Editor Component
function SchedulingPageEditor({
  page,
  onUpdate,
}: {
  page: SmartFilePage;
  onUpdate: (content: SchedulingPageContent) => void;
}) {
  const content = page.content as SchedulingPageContent;
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [page.id]);

  const handleBlur = () => {
    if (JSON.stringify(localContent) !== JSON.stringify(content)) {
      onUpdate(localContent);
    }
  };

  const handleUpdate = (updates: Partial<SchedulingPageContent>) => {
    const newContent = { ...localContent, ...updates };
    setLocalContent(newContent);
    onUpdate(newContent);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label
          htmlFor="scheduling-heading"
          data-testid="label-scheduling-heading"
        >
          Heading
        </Label>
        <Input
          id="scheduling-heading"
          value={localContent.heading || ""}
          onChange={(e) =>
            setLocalContent({ ...localContent, heading: e.target.value })
          }
          onBlur={handleBlur}
          placeholder="Schedule Your Session"
          data-testid="input-scheduling-heading"
        />
      </div>

      <div>
        <Label
          htmlFor="scheduling-description"
          data-testid="label-scheduling-description"
        >
          Description
        </Label>
        <Textarea
          id="scheduling-description"
          value={localContent.description || ""}
          onChange={(e) =>
            setLocalContent({ ...localContent, description: e.target.value })
          }
          onBlur={handleBlur}
          placeholder="Pick a time that works best for you"
          rows={3}
          data-testid="textarea-scheduling-description"
        />
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label
            htmlFor="duration-minutes"
            data-testid="label-duration-minutes"
          >
            Duration (minutes)
          </Label>
          <Input
            id="duration-minutes"
            type="number"
            min="15"
            step="15"
            value={localContent.durationMinutes || 60}
            onChange={(e) =>
              handleUpdate({ durationMinutes: parseInt(e.target.value) || 60 })
            }
            data-testid="input-duration-minutes"
          />
          <p className="text-xs text-muted-foreground mt-1">
            How long each appointment lasts
          </p>
        </div>

        <div>
          <Label htmlFor="booking-type" data-testid="label-booking-type">
            Booking Type
          </Label>
          <Select
            value={localContent.bookingType || "CONSULTATION"}
            onValueChange={(value) => handleUpdate({ bookingType: value })}
          >
            <SelectTrigger id="booking-type" data-testid="select-booking-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CONSULTATION">Consultation</SelectItem>
              <SelectItem value="ENGAGEMENT">Engagement Session</SelectItem>
              <SelectItem value="WEDDING">Wedding</SelectItem>
              <SelectItem value="MEETING">Meeting</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="buffer-before" data-testid="label-buffer-before">
            Buffer Before (minutes)
          </Label>
          <Input
            id="buffer-before"
            type="number"
            min="0"
            step="5"
            value={localContent.bufferBeforeMinutes || 0}
            onChange={(e) =>
              handleUpdate({
                bufferBeforeMinutes: parseInt(e.target.value) || 0,
              })
            }
            data-testid="input-buffer-before"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Prep time before appointments
          </p>
        </div>

        <div>
          <Label htmlFor="buffer-after" data-testid="label-buffer-after">
            Buffer After (minutes)
          </Label>
          <Input
            id="buffer-after"
            type="number"
            min="0"
            step="5"
            value={localContent.bufferAfterMinutes || 0}
            onChange={(e) =>
              handleUpdate({
                bufferAfterMinutes: parseInt(e.target.value) || 0,
              })
            }
            data-testid="input-buffer-after"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Cleanup time after appointments
          </p>
        </div>
      </div>

      <Separator />

      <div className="flex items-center space-x-2">
        <Switch
          id="allow-rescheduling"
          checked={localContent.allowRescheduling ?? true}
          onCheckedChange={(checked) =>
            handleUpdate({ allowRescheduling: checked })
          }
          data-testid="switch-allow-rescheduling"
        />
        <Label htmlFor="allow-rescheduling">
          Allow clients to reschedule appointments
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="show-photographer-profile"
          checked={localContent.showPhotographerProfile ?? true}
          onCheckedChange={(checked) =>
            handleUpdate({ showPhotographerProfile: checked })
          }
          data-testid="switch-show-photographer-profile"
        />
        <Label htmlFor="show-photographer-profile">
          Show your photo and name above calendar
        </Label>
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Calendar Integration</p>
              <p className="text-xs text-muted-foreground">
                Clients will see your available time slots based on your
                calendar settings. Booked appointments will automatically appear
                on your calendar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Page Card Component for the draggable list
function PageCard({
  page,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  page: SmartFilePage;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const controls = useDragControls();
  const pageConfig = PAGE_TYPES[page.pageType as PageType];
  const Icon = pageConfig?.icon || FileText;

  return (
    <Reorder.Item value={page} dragListener={false} dragControls={controls}>
      <Card
        className={cn(
          "cursor-pointer transition-all mb-2",
          isSelected && "border-primary shadow-md",
        )}
        onClick={onSelect}
        data-testid={`card-page-${page.id}`}
      >
        <CardContent className="p-4 flex items-center gap-3">
          <button
            className="cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={(e) => controls.start(e)}
            data-testid={`button-drag-${page.id}`}
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className={cn("p-2 rounded", pageConfig?.color)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p
              className="font-medium"
              data-testid={`text-page-title-${page.id}`}
            >
              {page.displayTitle}
            </p>
            <p
              className="text-sm text-muted-foreground"
              data-testid={`text-page-type-${page.id}`}
            >
              {pageConfig?.label || page.pageType}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              data-testid={`button-duplicate-${page.id}`}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              data-testid={`button-delete-${page.id}`}
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Reorder.Item>
  );
}

export default function SmartFileBuilder() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pages, setPages] = useState<SmartFilePage[]>([]);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">(
    "idle",
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentPreviewPageIndex, setCurrentPreviewPageIndex] = useState(0);
  const [previewInstallments, setPreviewInstallments] = useState<number>(3);
  const [showPaymentMethodsPreview, setShowPaymentMethodsPreview] =
    useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    pageId: string;
    isLinked: boolean;
  } | null>(null);
  const hasAutoSelectedRef = useRef(false);
  const textPageEditorRef = useRef<TextPageEditorRef>(null);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);

  // Read projectId from URL search params for auto-attachment
  const [projectIdForAttachment] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("projectId");
  });
  const [hasAttachedToProject, setHasAttachedToProject] = useState(false);

  const { user } = useAuth();

  const { data: smartFile, isLoading } = useQuery<SmartFileWithPages>({
    queryKey: ["/api/smart-files", id],
    enabled: !!id,
  });

  const { data: packages, refetch: refetchPackages } = useQuery<any[]>({
    queryKey: ["/api/packages"],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const { data: addOns, refetch: refetchAddOns } = useQuery<any[]>({
    queryKey: ["/api/add-ons"],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Refetch packages and add-ons when preview opens to ensure fresh data
  useEffect(() => {
    if (isPreviewOpen) {
      refetchPackages();
      refetchAddOns();
    }
  }, [isPreviewOpen, refetchPackages, refetchAddOns]);

  // Clamp preview index when pages change to prevent out-of-bounds access
  useEffect(() => {
    if (
      isPreviewOpen &&
      pages.length > 0 &&
      currentPreviewPageIndex >= pages.length
    ) {
      setCurrentPreviewPageIndex(pages.length - 1);
    }
  }, [pages.length, currentPreviewPageIndex, isPreviewOpen]);

  useEffect(() => {
    hasAutoSelectedRef.current = false;
    setSelectedPageId(null);
  }, [id]);

  // Reset layout picker when page changes
  useEffect(() => {
    setShowLayoutPicker(false);
  }, [selectedPageId]);

  useEffect(() => {
    if (smartFile?.pages && smartFile?.id === id) {
      const sortedPages = [...smartFile.pages].sort(
        (a, b) => a.pageOrder - b.pageOrder,
      );
      setPages(sortedPages);
      if (!hasAutoSelectedRef.current && sortedPages.length > 0) {
        setSelectedPageId(sortedPages[0].id);
        hasAutoSelectedRef.current = true;
      }
    }
  }, [smartFile?.pages, smartFile?.id, id]);

  useEffect(() => {
    if (
      smartFile?.id === id &&
      selectedPageId &&
      pages.length > 0 &&
      !pages.some((p) => p.id === selectedPageId)
    ) {
      setSelectedPageId(pages[0].id);
    }
  }, [smartFile?.id, selectedPageId, pages, id]);

  // Mutation to attach smart file to project when created from project context
  const attachToProjectMutation = useMutation({
    mutationFn: async (smartFileId: string) => {
      if (!projectIdForAttachment) return null;
      console.log("[SmartFileBuilder] Attaching smart file to project:", {
        smartFileId,
        projectId: projectIdForAttachment,
      });
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectIdForAttachment}/smart-files`,
        {
          smartFileId,
        },
      );
      return response.json();
    },
    onSuccess: () => {
      console.log("[SmartFileBuilder] Successfully attached to project");
      setHasAttachedToProject(true);

      // Invalidate project queries so the project page shows the new file immediately
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectIdForAttachment, "smart-files"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectIdForAttachment, "history"],
      });

      // Clear the projectId from URL to prevent re-attachment on refresh
      window.history.replaceState({}, "", `/smart-files/${id}/edit`);
      toast({
        title: "Smart File attached",
        description: "This Smart File has been attached to the project.",
      });
    },
    onError: (error: any) => {
      console.error("[SmartFileBuilder] Failed to attach:", error);
      toast({
        title: "Failed to attach to project",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Auto-attach to project when smart file is loaded and projectId is present
  useEffect(() => {
    console.log("[SmartFileBuilder] Auto-attach check:", {
      smartFileId: smartFile?.id,
      projectIdForAttachment,
      hasAttachedToProject,
      isPending: attachToProjectMutation.isPending,
    });
    if (
      smartFile?.id &&
      projectIdForAttachment &&
      !hasAttachedToProject &&
      !attachToProjectMutation.isPending
    ) {
      console.log(
        "[SmartFileBuilder] Triggering auto-attach to project:",
        projectIdForAttachment,
      );
      attachToProjectMutation.mutate(smartFile.id);
    }
  }, [
    smartFile?.id,
    projectIdForAttachment,
    hasAttachedToProject,
    attachToProjectMutation,
  ]);

  const createPageMutation = useMutation({
    mutationFn: async (data: {
      pageType: PageType;
      displayTitle: string;
      content: any;
      pageOrder?: number;
      skipToast?: boolean;
    }) => {
      const maxOrder =
        pages.length > 0 ? Math.max(...pages.map((p) => p.pageOrder)) : -1;
      const response = await apiRequest(
        "POST",
        `/api/smart-files/${id}/pages`,
        {
          smartFileId: id,
          pageType: data.pageType,
          pageOrder: data.pageOrder ?? maxOrder + 1,
          displayTitle: data.displayTitle,
          content: data.content,
        },
      );
      return { ...(await response.json()), skipToast: data.skipToast };
    },
    onSuccess: async (newPage) => {
      await queryClient.invalidateQueries({
        queryKey: ["/api/smart-files", id],
      });
      if (newPage?.id) {
        setSelectedPageId(newPage.id);
      }
      if (!newPage?.skipToast) {
        toast({
          title: "Page created",
          description: "New page has been added to your Smart File",
        });
      }
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: async ({
      pageId,
      updates,
    }: {
      pageId: string;
      updates: Partial<SmartFilePage>;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/smart-files/${id}/pages/${pageId}`,
        updates,
      );
      return { pageId, updates, response: await response.json() };
    },
    onMutate: ({ pageId, updates }) => {
      setSaveStatus("saving");
      // Optimistically update local state for immediate UI feedback
      setPages((prev) =>
        prev.map((p) =>
          p.id === pageId
            ? {
                ...p,
                ...updates,
                content: updates.content
                  ? { ...p.content, ...updates.content }
                  : p.content,
              }
            : p,
        ),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["/api/smart-files", id],
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: async () => {
      // On error, refetch to revert to server state
      await queryClient.invalidateQueries({
        queryKey: ["/api/smart-files", id],
      });
      setSaveStatus("idle");
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      return apiRequest("DELETE", `/api/smart-files/${id}/pages/${pageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smart-files", id] });
      toast({
        title: "Page deleted",
        description: "Page has been removed from your Smart File",
      });
    },
  });

  const reorderPagesMutation = useMutation({
    mutationFn: async (pageOrders: { id: string; pageOrder: number }[]) => {
      return apiRequest("POST", `/api/smart-files/${id}/pages/reorder`, {
        pageOrders,
      });
    },
    onSuccess: () => {
      // Wait a bit before invalidating to ensure backend has committed
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/smart-files", id] });
      }, 100);
    },
    onError: () => {
      // On error, refetch immediately to revert to correct state
      queryClient.invalidateQueries({ queryKey: ["/api/smart-files", id] });
    },
  });

  // Helper to check if a page is unconfigured (New Page)
  const isNewPage = (page: SmartFilePage) => {
    return page.displayTitle === "New Page" && page.content?.isNewPage === true;
  };

  // Get default content and title for a page type
  const getPageTypeDefaults = (pageType: PageType) => {
    let defaultContent: any = {};
    let displayTitle = "";

    switch (pageType) {
      case "TEXT":
        defaultContent = {
          sections: [
            {
              id: `section-${Date.now()}`,
              columns: 1,
              blocks: [
                {
                  id: `block-${Date.now()}-0-heading`,
                  type: "HEADING",
                  content: "New Text Page",
                },
                {
                  id: `block-${Date.now()}-1-text`,
                  type: "TEXT",
                  content: "<p></p>",
                },
              ],
            },
          ],
        };
        displayTitle = "Text Page";
        break;
      case "PACKAGE":
        defaultContent = {
          heading: "Select Your Package",
          description: "",
          packageIds: [],
        };
        displayTitle = "Package Selection";
        break;
      case "ADDON":
        defaultContent = { heading: "Add-ons", description: "", items: [] };
        displayTitle = "Add-ons";
        break;
      case "CONTRACT":
        defaultContent = {
          heading: "Service Agreement",
          description: "",
          contractTemplate: "",
          requireClientSignature: true,
          requirePhotographerSignature: false,
        };
        displayTitle = "Contract";
        break;
      case "PAYMENT":
        defaultContent = {
          heading: "Payment",
          description: "",
          depositPercent: 50,
          paymentTerms: "",
          acceptOnlinePayments: true,
        };
        displayTitle = "Payment";
        break;
      case "INVOICE":
        defaultContent = {
          heading: "Invoice",
          description: "Itemized billing and payment schedule",
          billTo: "",
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          dateIssued: new Date().toISOString(),
          lineItems: [
            {
              id: `item-${Date.now()}`,
              service: "Photography Service",
              quantity: 1,
              unit: "session",
              unitPrice: 0,
              taxable: false,
            },
          ],
          taxPercent: 0,
          discountAmount: 0,
          discountType: "AMOUNT",
          paymentScheduleMode: "SIMPLE",
          depositPercent: 50,
          acceptOnlinePayments: true,
        };
        displayTitle = "Invoice";
        break;
      case "PAY":
        defaultContent = {
          heading: "Complete Your Payment",
          description: "Secure checkout powered by Stripe",
        };
        displayTitle = "Payment Checkout";
        break;
      case "FORM":
        defaultContent = {
          sections: [
            {
              id: `section-${Date.now()}`,
              columns: 1,
              blocks: [],
            },
          ],
        };
        displayTitle = "Form";
        break;
      case "SCHEDULING":
        defaultContent = {
          heading: "Schedule Your Session",
          description: "Pick a time that works best for you",
          durationMinutes: 60,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
          bookingType: "CONSULTATION",
          allowRescheduling: true,
        };
        displayTitle = "Scheduling";
        break;
    }

    return { defaultContent, displayTitle };
  };

  // Create a new unconfigured page immediately
  const handleCreateNewPage = () => {
    createPageMutation.mutate({
      pageType: "TEXT",
      displayTitle: "New Page",
      content: { isNewPage: true },
    });
  };

  // Helper to reorder PACKAGE/ADDON pages before INVOICE
  const reorderPackageBeforeInvoice = async () => {
    // Wait for fresh data
    await queryClient.refetchQueries({ queryKey: ["/api/smart-files", id] });
    const freshData = queryClient.getQueryData<any>(["/api/smart-files", id]);

    if (!freshData?.pages) return;

    const sortedPages = [...freshData.pages].sort(
      (a: any, b: any) => a.pageOrder - b.pageOrder,
    );
    const invoiceIdx = sortedPages.findIndex(
      (p: any) => p.pageType === "INVOICE",
    );

    if (invoiceIdx < 0) return; // No INVOICE page

    // Find any PACKAGE/ADDON pages that are after INVOICE
    let needsReorder = false;
    const reorderedPages: any[] = [];
    const packageAddonPages: any[] = [];

    for (const page of sortedPages) {
      if (page.pageType === "PACKAGE" || page.pageType === "ADDON") {
        packageAddonPages.push(page);
      } else {
        reorderedPages.push(page);
      }
    }

    // Insert all PACKAGE/ADDON pages before INVOICE
    const newInvoiceIdx = reorderedPages.findIndex(
      (p: any) => p.pageType === "INVOICE",
    );
    if (newInvoiceIdx >= 0) {
      reorderedPages.splice(newInvoiceIdx, 0, ...packageAddonPages);
    } else {
      reorderedPages.push(...packageAddonPages);
    }

    // Check if order actually changed
    for (let i = 0; i < sortedPages.length; i++) {
      if (sortedPages[i].id !== reorderedPages[i]?.id) {
        needsReorder = true;
        break;
      }
    }

    if (needsReorder) {
      const pageOrders = reorderedPages.map((page: any, index: number) => ({
        id: page.id,
        pageOrder: index,
      }));
      reorderPagesMutation.mutate(pageOrders);
    }
  };

  // Auto-position CONTRACT pages before PAY pages
  const reorderContractBeforePay = async () => {
    // Wait for fresh data
    await queryClient.refetchQueries({ queryKey: ["/api/smart-files", id] });
    const freshData = queryClient.getQueryData<any>(["/api/smart-files", id]);

    if (!freshData?.pages) return;

    const sortedPages = [...freshData.pages].sort(
      (a: any, b: any) => a.pageOrder - b.pageOrder,
    );
    const payIdx = sortedPages.findIndex((p: any) => p.pageType === "PAY");

    if (payIdx < 0) return; // No PAY page, nothing to enforce

    // Find CONTRACT pages that are AFTER PAY (these need to be moved)
    const contractsAfterPay: any[] = [];
    for (let i = 0; i < sortedPages.length; i++) {
      if (sortedPages[i].pageType === "CONTRACT" && i > payIdx) {
        contractsAfterPay.push(sortedPages[i]);
      }
    }

    // If all CONTRACTs are already before PAY, no action needed
    if (contractsAfterPay.length === 0) return;

    // Remove contracts that are after PAY from their current position
    const reorderedPages = sortedPages.filter(
      (page: any) => !contractsAfterPay.some((c: any) => c.id === page.id),
    );

    // Insert them before PAY
    const newPayIdx = reorderedPages.findIndex(
      (p: any) => p.pageType === "PAY",
    );
    if (newPayIdx >= 0) {
      reorderedPages.splice(newPayIdx, 0, ...contractsAfterPay);
    }

    // Apply the reordering
    const pageOrders = reorderedPages.map((page: any, index: number) => ({
      id: page.id,
      pageOrder: index,
    }));
    reorderPagesMutation.mutate(pageOrders);
    toast({
      title: "Page order adjusted",
      description: "CONTRACT pages moved before PAY page",
    });
  };

  // Configure an existing "New Page" with the selected type
  const handleConfigureNewPage = (pageId: string, pageType: PageType) => {
    const { defaultContent, displayTitle } = getPageTypeDefaults(pageType);

    // For PACKAGE/ADDON, reorder after update to position before INVOICE
    if (pageType === "PACKAGE" || pageType === "ADDON") {
      updatePageMutation.mutate(
        {
          pageId,
          updates: {
            pageType,
            displayTitle,
            content: { ...defaultContent, isNewPage: false },
          },
        },
        {
          onSuccess: () => {
            setTimeout(() => reorderPackageBeforeInvoice(), 100);
          },
        },
      );
      return;
    }

    // For CONTRACT, reorder after update to position before PAY
    if (pageType === "CONTRACT") {
      updatePageMutation.mutate(
        {
          pageId,
          updates: {
            pageType,
            displayTitle,
            content: { ...defaultContent, isNewPage: false },
          },
        },
        {
          onSuccess: () => {
            setTimeout(() => reorderContractBeforePay(), 100);
          },
        },
      );
      return;
    }

    updatePageMutation.mutate({
      pageId,
      updates: {
        pageType,
        displayTitle,
        content: { ...defaultContent, isNewPage: false },
      },
    });
  };

  // Add Invoice and Pay pages together
  const handleAddInvoiceAndPay = () => {
    // 1. Find and remove existing PAYMENT page if it exists
    const paymentPage = pages.find((p) => p.pageType === "PAYMENT");
    if (paymentPage) {
      deletePageMutation.mutate(paymentPage.id);
    }

    // Calculate orders upfront based on current pages (before any mutations)
    const maxOrder =
      pages.length > 0 ? Math.max(...pages.map((p) => p.pageOrder)) : -1;
    const invoiceOrder = maxOrder + 1;
    const payOrder = maxOrder + 2;

    // 2. Create INVOICE page with explicit order
    const invoiceDefaults = getPageTypeDefaults("INVOICE");
    createPageMutation.mutate({
      pageType: "INVOICE",
      displayTitle: invoiceDefaults.displayTitle,
      content: invoiceDefaults.defaultContent,
      pageOrder: invoiceOrder,
      skipToast: true,
    });

    // 3. Create PAY page with explicit order (after INVOICE)
    const payDefaults = getPageTypeDefaults("PAY");
    createPageMutation.mutate({
      pageType: "PAY",
      displayTitle: payDefaults.displayTitle,
      content: payDefaults.defaultContent,
      pageOrder: payOrder,
      skipToast: true,
    });

    toast({
      title: "Invoice & Pay pages added",
      description: paymentPage
        ? "Replaced PAYMENT page with INVOICE & PAY"
        : "Invoice and checkout pages added",
    });
  };

  // Add a new page with type (for when pages list is empty)
  const handleAddPage = (pageType: PageType) => {
    // Special handling for INVOICE - add both INVOICE and PAY pages
    if (pageType === "INVOICE") {
      handleAddInvoiceAndPay();
      return;
    }

    const { defaultContent, displayTitle } = getPageTypeDefaults(pageType);

    // For PACKAGE/ADDON pages, reorder after creation to position before INVOICE
    if (pageType === "PACKAGE" || pageType === "ADDON") {
      createPageMutation.mutate(
        { pageType, displayTitle, content: defaultContent },
        {
          onSuccess: () => {
            setTimeout(() => reorderPackageBeforeInvoice(), 100);
          },
        },
      );
      return;
    }

    createPageMutation.mutate({
      pageType,
      displayTitle,
      content: defaultContent,
    });
  };

  const handleUpdatePage = (pageId: string, content: any) => {
    updatePageMutation.mutate({ pageId, updates: { content } });
  };

  const handleDeletePage = (pageId: string) => {
    const pageToDelete = pages.find((p) => p.id === pageId);
    const isLinked =
      pageToDelete?.pageType === "INVOICE" || pageToDelete?.pageType === "PAY";

    setDeleteConfirmation({ pageId, isLinked });
  };

  const confirmDeletePage = () => {
    if (!deleteConfirmation) return;

    const { pageId, isLinked } = deleteConfirmation;
    const pageToDelete = pages.find((p) => p.id === pageId);

    // Handle linked INVOICE/PAY deletion
    if (isLinked) {
      if (pageToDelete?.pageType === "INVOICE") {
        const linkedPayPage = pages.find((p) => p.pageType === "PAY");
        if (linkedPayPage) {
          deletePageMutation.mutate(linkedPayPage.id);
        }
      } else if (pageToDelete?.pageType === "PAY") {
        const linkedInvoicePage = pages.find((p) => p.pageType === "INVOICE");
        if (linkedInvoicePage) {
          deletePageMutation.mutate(linkedInvoicePage.id);
        }
      }
    }

    // Auto-select next page if needed
    if (selectedPageId === pageId && pages.length > 1) {
      const currentIndex = pages.findIndex((p) => p.id === pageId);
      const nextPage = pages[currentIndex + 1] || pages[currentIndex - 1];
      setSelectedPageId(nextPage?.id || null);
    }

    deletePageMutation.mutate(pageId);
    setDeleteConfirmation(null);
  };

  const handleDuplicatePage = (page: SmartFilePage) => {
    createPageMutation.mutate({
      pageType: page.pageType as PageType,
      displayTitle: `${page.displayTitle} (Copy)`,
      content: page.content,
    });
  };

  const handleReorder = (newOrder: SmartFilePage[]) => {
    setPages(newOrder);
    const pageOrders = newOrder.map((page, index) => ({
      id: page.id,
      pageOrder: index,
    }));
    reorderPagesMutation.mutate(pageOrders, {
      onSuccess: () => {
        // Check if CONTRACT needs to be repositioned before PAY
        setTimeout(() => reorderContractBeforePay(), 200);
      },
    });
  };

  const selectedPage = pages.find((p) => p.id === selectedPageId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2
          className="w-8 h-8 animate-spin"
          data-testid="loading-spinner"
        />
      </div>
    );
  }

  if (!smartFile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Smart File not found</h2>
          <Button
            onClick={() => setLocation("/smart-files")}
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Smart Files
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header - Full Width */}
      <header className="bg-card border-b px-4 md:px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={
                projectIdForAttachment
                  ? `/projects/${projectIdForAttachment}`
                  : "/smart-files"
              }
            >
              <Button
                variant="ghost"
                size="icon"
                data-testid="button-back-to-smart-files"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1
                className="text-xl md:text-2xl font-semibold"
                data-testid="text-smart-file-name"
              >
                {smartFile.name}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {smartFile.projectType || "Universal"} • {pages.length} pages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveStatus !== "idle" && (
              <div
                className="flex items-center gap-2 text-sm text-muted-foreground"
                data-testid="text-save-status"
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Saved</span>
                  </>
                )}
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(true)}
              data-testid="button-preview"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/smart-files")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Content Area - Editor and Sidebar side by side */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 min-w-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              {selectedPage && !isNewPage(selectedPage) ? (
                <Card>
                  <CardHeader>
                    <CardTitle data-testid="text-editor-title">
                      {PAGE_TYPES[selectedPage.pageType as PageType]?.label ||
                        selectedPage.pageType}{" "}
                      Editor
                    </CardTitle>
                    <CardDescription data-testid="text-editor-description">
                      Configure the content and settings for this page
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedPage.pageType === "TEXT" && (
                      <TextPageEditor
                        ref={textPageEditorRef}
                        page={selectedPage}
                        onUpdate={(content) =>
                          handleUpdatePage(selectedPage.id, content)
                        }
                        onAddClick={() => {
                          setTargetSectionId(null);
                          setShowLayoutPicker(true);
                        }}
                        onRequestLayoutForSection={(sectionId) => {
                          setTargetSectionId(sectionId);
                          setShowLayoutPicker(true);
                        }}
                      />
                    )}
                    {selectedPage.pageType === "PACKAGE" && (
                      <PackagePageEditor
                        page={selectedPage}
                        onUpdate={(content) =>
                          handleUpdatePage(selectedPage.id, content)
                        }
                      />
                    )}
                    {selectedPage.pageType === "ADDON" && (
                      <AddOnPageEditor
                        page={selectedPage}
                        onUpdate={(content) =>
                          handleUpdatePage(selectedPage.id, content)
                        }
                      />
                    )}
                    {selectedPage.pageType === "CONTRACT" && (
                      <ContractPageEditor
                        page={selectedPage}
                        onUpdate={(content) =>
                          handleUpdatePage(selectedPage.id, content)
                        }
                      />
                    )}
                    {selectedPage.pageType === "PAYMENT" && (
                      <PaymentPageEditor
                        page={selectedPage}
                        onUpdate={(content) =>
                          handleUpdatePage(selectedPage.id, content)
                        }
                      />
                    )}
                    {selectedPage.pageType === "INVOICE" && (
                      <InvoicePageEditor
                        page={selectedPage}
                        onUpdate={(content) =>
                          handleUpdatePage(selectedPage.id, content)
                        }
                        pages={pages}
                      />
                    )}
                    {selectedPage.pageType === "PAY" && (
                      <PayPageEditor
                        page={selectedPage}
                        onUpdate={(content) =>
                          handleUpdatePage(selectedPage.id, content)
                        }
                        pages={pages}
                      />
                    )}
                    {selectedPage.pageType === "FORM" && (
                      <FormPageEditor
                        page={selectedPage}
                        onUpdate={(content) =>
                          handleUpdatePage(selectedPage.id, content)
                        }
                      />
                    )}
                    {selectedPage.pageType === "SCHEDULING" && (
                      <SchedulingPageEditor
                        page={selectedPage}
                        onUpdate={(content) =>
                          handleUpdatePage(selectedPage.id, content)
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <div
                    className="text-center max-w-lg"
                    data-testid="text-no-page-selected"
                  >
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">
                      What would you like to add?
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Choose a page type for this page
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(PAGE_TYPES)
                        .filter(
                          ([type]) => type !== "PAYMENT" && type !== "PAY",
                        ) // Hide PAYMENT and PAY (PAY is added with INVOICE)
                        .map(([type, config]) => {
                          const Icon = config.icon;
                          return (
                            <Button
                              key={type}
                              variant="outline"
                              className="flex flex-col items-center justify-center h-20 bg-white hover:border-primary hover:bg-primary/5"
                              onClick={() => {
                                // INVOICE always needs special handling - create both Invoice + Pay
                                if (type === "INVOICE") {
                                  if (selectedPage && isNewPage(selectedPage)) {
                                    deletePageMutation.mutate(selectedPage.id);
                                  }
                                  handleAddInvoiceAndPay();
                                  return;
                                }

                                if (selectedPage && isNewPage(selectedPage)) {
                                  handleConfigureNewPage(
                                    selectedPage.id,
                                    type as PageType,
                                  );
                                } else {
                                  handleAddPage(type as PageType);
                                }
                              }}
                              disabled={updatePageMutation.isPending}
                              data-testid={`button-add-${type.toLowerCase()}-empty`}
                            >
                              <Icon className="w-5 h-5 mb-1" />
                              <span className="text-xs">{config.label}</span>
                            </Button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Sidebar - Pages List (HoneyBook-style) */}
        <div
          className={cn(
            "border-l bg-muted/40 flex flex-col overflow-hidden relative transition-all duration-300 ease-in-out",
            showLayoutPicker ? "min-w-[400px]" : "",
          )}
        >
          <ScrollArea className="flex-1 overflow-auto">
            <div className="px-2 py-3 space-y-4">
              {/* Pages Section */}
              <div>
                <h4
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2"
                  data-testid="text-pages"
                >
                  Pages ({pages.length})
                </h4>
                {pages.length === 0 ? (
                  <p
                    className="text-xs text-muted-foreground text-center py-4 px-2"
                    data-testid="text-no-pages"
                  >
                    No pages yet
                  </p>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={pages}
                    onReorder={handleReorder}
                  >
                    {pages.map((page) => (
                      <PageCard
                        key={page.id}
                        page={page}
                        isSelected={selectedPageId === page.id}
                        onSelect={() => setSelectedPageId(page.id)}
                        onDelete={() => handleDeletePage(page.id)}
                        onDuplicate={() => handleDuplicatePage(page)}
                      />
                    ))}
                  </Reorder.Group>
                )}
                {/* Add Page button directly below the last page */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs mt-2"
                  onClick={handleCreateNewPage}
                  disabled={createPageMutation.isPending}
                  data-testid="button-add-page"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Page
                </Button>
              </div>
            </div>
          </ScrollArea>

          {/* Text Layouts Picker - Overlay on top of pages */}
          {showLayoutPicker &&
            selectedPage &&
            selectedPage.pageType === "TEXT" &&
            !isNewPage(selectedPage) && (
              <div className="absolute inset-0 bg-background z-10 p-4 overflow-auto">
                <div className="flex items-center justify-between mb-4 pb-3 border-b">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setShowLayoutPicker(false);
                      setTargetSectionId(null);
                    }}
                    data-testid="button-close-layout-picker"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <h4 className="text-sm font-semibold">Add text</h4>
                  <div className="w-8" />
                </div>
                <TextLayoutPicker
                  onSelectLayout={(layout) => {
                    if (targetSectionId) {
                      // Populate existing empty section with layout blocks
                      textPageEditorRef.current?.populateSectionWithLayout(
                        targetSectionId,
                        layout,
                      );
                      setTargetSectionId(null);
                    } else {
                      // Add new section with layout blocks
                      textPageEditorRef.current?.addLayoutSection(layout);
                    }
                    setShowLayoutPicker(false);
                  }}
                />
              </div>
            )}
        </div>
      </div>

      {/* Preview Dialog - Full Screen Paginated */}
      <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (!open) setCurrentPreviewPageIndex(0);
        }}
      >
        <DialogContent className="max-w-full w-screen h-screen m-0 p-0 rounded-none flex flex-col">
          {pages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No pages added yet. Add pages to see them in the preview.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header with Logo and Page Indicator */}
              <div className="bg-card border-b px-8 py-4 flex-shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <Camera className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold">
                        {user?.businessName || "Photography Studio"}
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        Photography Proposal
                      </p>
                    </div>
                  </div>
                  {/* Page Indicator */}
                  <div className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                    Page {currentPreviewPageIndex + 1} of {pages.length}
                  </div>
                </div>
              </div>

              {/* Current Page Display - Full Screen */}
              <div className="flex-1 overflow-y-auto md:p-8">
                <div className="max-w-7xl mx-auto md:pb-8">
                  {(() => {
                    const currentPage = pages[currentPreviewPageIndex];
                    return (
                      <div className="space-y-6">
                        {/* Text Page Preview */}
                        {currentPage.pageType === "TEXT" &&
                          currentPage.content && (
                            <div className="space-y-0">
                              {/* Hero Section */}
                              {currentPage.content.hero?.backgroundImage && (
                                <div className="md:p-8">
                                  <div
                                    className="relative w-full h-[400px] flex items-center justify-center bg-cover bg-center md:border-4 md:border-border md:rounded-lg overflow-hidden"
                                    style={{
                                      backgroundImage: `url(${currentPage.content.hero.backgroundImage})`,
                                    }}
                                  >
                                    <div className="absolute inset-0 bg-black/30" />
                                    <div className="relative z-10 text-center text-white px-6 max-w-3xl">
                                      {currentPage.content.hero.title && (
                                        <h1 className="text-5xl font-bold mb-4">
                                          {currentPage.content.hero.title}
                                        </h1>
                                      )}
                                      {currentPage.content.hero.description && (
                                        <p className="text-xl">
                                          {currentPage.content.hero.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Content Sections */}
                              <div className="max-w-[800px] mx-auto space-y-6 py-6 px-4 md:px-0">
                                {currentPage.content.sections &&
                                currentPage.content.sections.length > 0 ? (
                                  // Sections-based rendering
                                  currentPage.content.sections.map(
                                    (section: Section, secIdx: number) => (
                                      <div key={secIdx}>
                                        {section.columns === 1 ? (
                                          <div className="space-y-4">
                                            {section.blocks.map(
                                              (
                                                block: ContentBlock,
                                                blockIdx: number,
                                              ) => (
                                                <div key={blockIdx}>
                                                  {block.type === "HEADING" &&
                                                    block.content && (
                                                      <h3 className="text-2xl font-bold mb-2">
                                                        {block.content}
                                                      </h3>
                                                    )}
                                                  {block.type === "TEXT" &&
                                                    block.content && (
                                                      <div
                                                        className="text-muted-foreground prose prose-sm max-w-none"
                                                        dangerouslySetInnerHTML={{
                                                          __html:
                                                            DOMPurify.sanitize(
                                                              block.content,
                                                            ),
                                                        }}
                                                      />
                                                    )}
                                                  {block.type === "SPACER" && (
                                                    <div className="py-6" />
                                                  )}
                                                  {block.type === "IMAGE" &&
                                                    block.content &&
                                                    (() => {
                                                      const imageData: ImageContent =
                                                        typeof block.content ===
                                                        "string"
                                                          ? {
                                                              url: block.content,
                                                              borderRadius:
                                                                "straight",
                                                              size: "medium",
                                                            }
                                                          : block.content;
                                                      const isRounded =
                                                        imageData.borderRadius ===
                                                        "rounded";

                                                      // Stretched image - full width with no padding
                                                      if (
                                                        imageData.size ===
                                                        "stretched"
                                                      ) {
                                                        return (
                                                          <div className="relative -mx-4 md:mx-[calc(-50vw+50%)]">
                                                            <img
                                                              src={
                                                                imageData.url
                                                              }
                                                              alt=""
                                                              className="w-full object-cover"
                                                            />
                                                          </div>
                                                        );
                                                      }

                                                      const sizeClass =
                                                        imageData.size ===
                                                        "small"
                                                          ? "h-[100px] w-[100px]"
                                                          : imageData.size ===
                                                              "large"
                                                            ? "h-[300px] w-[300px]"
                                                            : "h-[150px] w-[150px]";

                                                      if (isRounded) {
                                                        return (
                                                          <div
                                                            className={cn(
                                                              "rounded-full overflow-hidden border border-border mx-auto",
                                                              sizeClass,
                                                            )}
                                                          >
                                                            <img
                                                              src={
                                                                imageData.url
                                                              }
                                                              alt=""
                                                              className="w-full h-full object-cover"
                                                            />
                                                          </div>
                                                        );
                                                      }

                                                      const maxHeightClass =
                                                        imageData.size ===
                                                        "small"
                                                          ? "max-h-[100px]"
                                                          : imageData.size ===
                                                              "large"
                                                            ? "max-h-[300px]"
                                                            : "max-h-[150px]";
                                                      return (
                                                        <img
                                                          src={imageData.url}
                                                          alt=""
                                                          className={cn(
                                                            "w-full rounded-none object-contain border border-border",
                                                            maxHeightClass,
                                                          )}
                                                        />
                                                      );
                                                    })()}
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-4">
                                              {section.blocks
                                                .filter(
                                                  (b: ContentBlock) =>
                                                    b.column === 0,
                                                )
                                                .map(
                                                  (
                                                    block: ContentBlock,
                                                    blockIdx: number,
                                                  ) => (
                                                    <div key={blockIdx}>
                                                      {block.type ===
                                                        "HEADING" &&
                                                        block.content && (
                                                          <h3 className="text-2xl font-bold mb-2">
                                                            {block.content}
                                                          </h3>
                                                        )}
                                                      {block.type === "TEXT" &&
                                                        block.content && (
                                                          <div
                                                            className="text-muted-foreground prose prose-sm max-w-none"
                                                            dangerouslySetInnerHTML={{
                                                              __html:
                                                                DOMPurify.sanitize(
                                                                  block.content ||
                                                                    "",
                                                                ),
                                                            }}
                                                          />
                                                        )}
                                                      {block.type ===
                                                        "SPACER" && (
                                                        <div className="py-6" />
                                                      )}
                                                      {block.type === "IMAGE" &&
                                                        block.content &&
                                                        (() => {
                                                          const imageData: ImageContent =
                                                            typeof block.content ===
                                                            "string"
                                                              ? {
                                                                  url: block.content,
                                                                  borderRadius:
                                                                    "straight",
                                                                  size: "medium",
                                                                }
                                                              : block.content;
                                                          const isRounded =
                                                            imageData.borderRadius ===
                                                            "rounded";

                                                          // Stretched image - full width within column
                                                          if (
                                                            imageData.size ===
                                                            "stretched"
                                                          ) {
                                                            return (
                                                              <img
                                                                src={
                                                                  imageData.url
                                                                }
                                                                alt=""
                                                                className="w-full object-cover"
                                                              />
                                                            );
                                                          }

                                                          const sizeClass =
                                                            imageData.size ===
                                                            "small"
                                                              ? "h-[100px] w-[100px]"
                                                              : imageData.size ===
                                                                  "large"
                                                                ? "h-[300px] w-[300px]"
                                                                : "h-[150px] w-[150px]";

                                                          if (isRounded) {
                                                            return (
                                                              <div
                                                                className={cn(
                                                                  "rounded-full overflow-hidden border-4 border-border shadow-lg mx-auto",
                                                                  sizeClass,
                                                                )}
                                                              >
                                                                <img
                                                                  src={
                                                                    imageData.url
                                                                  }
                                                                  alt=""
                                                                  className="w-full h-full object-cover"
                                                                />
                                                              </div>
                                                            );
                                                          }

                                                          const maxHeightClass =
                                                            imageData.size ===
                                                            "small"
                                                              ? "max-h-[100px]"
                                                              : imageData.size ===
                                                                  "large"
                                                                ? "max-h-[300px]"
                                                                : "max-h-[150px]";
                                                          return (
                                                            <img
                                                              src={
                                                                imageData.url
                                                              }
                                                              alt=""
                                                              className={cn(
                                                                "w-full rounded-none object-contain border-2 border-border shadow-md",
                                                                maxHeightClass,
                                                              )}
                                                            />
                                                          );
                                                        })()}
                                                    </div>
                                                  ),
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                              {section.blocks
                                                .filter(
                                                  (b: ContentBlock) =>
                                                    b.column === 1,
                                                )
                                                .map(
                                                  (
                                                    block: ContentBlock,
                                                    blockIdx: number,
                                                  ) => (
                                                    <div key={blockIdx}>
                                                      {block.type ===
                                                        "HEADING" &&
                                                        block.content && (
                                                          <h3 className="text-2xl font-bold mb-2">
                                                            {block.content}
                                                          </h3>
                                                        )}
                                                      {block.type === "TEXT" &&
                                                        block.content && (
                                                          <div
                                                            className="text-muted-foreground prose prose-sm max-w-none"
                                                            dangerouslySetInnerHTML={{
                                                              __html:
                                                                DOMPurify.sanitize(
                                                                  block.content ||
                                                                    "",
                                                                ),
                                                            }}
                                                          />
                                                        )}
                                                      {block.type ===
                                                        "SPACER" && (
                                                        <div className="py-6" />
                                                      )}
                                                      {block.type === "IMAGE" &&
                                                        block.content &&
                                                        (() => {
                                                          const imageData: ImageContent =
                                                            typeof block.content ===
                                                            "string"
                                                              ? {
                                                                  url: block.content,
                                                                  borderRadius:
                                                                    "straight",
                                                                  size: "medium",
                                                                }
                                                              : block.content;
                                                          const isRounded =
                                                            imageData.borderRadius ===
                                                            "rounded";

                                                          // Stretched image - full width within column
                                                          if (
                                                            imageData.size ===
                                                            "stretched"
                                                          ) {
                                                            return (
                                                              <img
                                                                src={
                                                                  imageData.url
                                                                }
                                                                alt=""
                                                                className="w-full object-cover"
                                                              />
                                                            );
                                                          }

                                                          const sizeClass =
                                                            imageData.size ===
                                                            "small"
                                                              ? "h-[100px] w-[100px]"
                                                              : imageData.size ===
                                                                  "large"
                                                                ? "h-[300px] w-[300px]"
                                                                : "h-[150px] w-[150px]";

                                                          if (isRounded) {
                                                            return (
                                                              <div
                                                                className={cn(
                                                                  "rounded-full overflow-hidden border-4 border-border shadow-lg mx-auto",
                                                                  sizeClass,
                                                                )}
                                                              >
                                                                <img
                                                                  src={
                                                                    imageData.url
                                                                  }
                                                                  alt=""
                                                                  className="w-full h-full object-cover"
                                                                />
                                                              </div>
                                                            );
                                                          }

                                                          const maxHeightClass =
                                                            imageData.size ===
                                                            "small"
                                                              ? "max-h-[100px]"
                                                              : imageData.size ===
                                                                  "large"
                                                                ? "max-h-[300px]"
                                                                : "max-h-[150px]";
                                                          return (
                                                            <img
                                                              src={
                                                                imageData.url
                                                              }
                                                              alt=""
                                                              className={cn(
                                                                "w-full rounded-none object-contain border-2 border-border shadow-md",
                                                                maxHeightClass,
                                                              )}
                                                            />
                                                          );
                                                        })()}
                                                    </div>
                                                  ),
                                                )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ),
                                  )
                                ) : currentPage.content.blocks &&
                                  currentPage.content.blocks.length > 0 ? (
                                  // Legacy blocks format
                                  <div className="space-y-4">
                                    {currentPage.content.blocks.map(
                                      (block: ContentBlock, idx: number) => (
                                        <div key={idx}>
                                          {block.type === "HEADING" &&
                                            block.content && (
                                              <h3 className="text-2xl font-bold mb-2">
                                                {block.content}
                                              </h3>
                                            )}
                                          {block.type === "TEXT" &&
                                            block.content && (
                                              <div
                                                className="text-muted-foreground prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{
                                                  __html: DOMPurify.sanitize(
                                                    block.content || "",
                                                  ),
                                                }}
                                              />
                                            )}
                                          {block.type === "SPACER" && (
                                            <div className="py-6" />
                                          )}
                                          {block.type === "IMAGE" &&
                                            block.content &&
                                            (() => {
                                              const imageData: ImageContent =
                                                typeof block.content ===
                                                "string"
                                                  ? {
                                                      url: block.content,
                                                      borderRadius: "straight",
                                                      size: "medium",
                                                    }
                                                  : block.content;
                                              const isRounded =
                                                imageData.borderRadius ===
                                                "rounded";

                                              // Stretched image - full width with no padding
                                              if (
                                                imageData.size === "stretched"
                                              ) {
                                                return (
                                                  <div className="relative -mx-4 md:mx-[calc(-50vw+50%)]">
                                                    <img
                                                      src={imageData.url}
                                                      alt=""
                                                      className="w-full object-cover"
                                                    />
                                                  </div>
                                                );
                                              }

                                              const sizeClass =
                                                imageData.size === "small"
                                                  ? "h-[100px] w-[100px]"
                                                  : imageData.size === "large"
                                                    ? "h-[300px] w-[300px]"
                                                    : "h-[150px] w-[150px]";

                                              if (isRounded) {
                                                return (
                                                  <div
                                                    className={cn(
                                                      "rounded-full overflow-hidden border border-border mx-auto",
                                                      sizeClass,
                                                    )}
                                                  >
                                                    <img
                                                      src={imageData.url}
                                                      alt=""
                                                      className="w-full h-full object-cover"
                                                    />
                                                  </div>
                                                );
                                              }

                                              const maxHeightClass =
                                                imageData.size === "small"
                                                  ? "max-h-[100px]"
                                                  : imageData.size === "large"
                                                    ? "max-h-[300px]"
                                                    : "max-h-[150px]";
                                              return (
                                                <img
                                                  src={imageData.url}
                                                  alt=""
                                                  className={cn(
                                                    "w-full rounded-none object-contain border border-border",
                                                    maxHeightClass,
                                                  )}
                                                />
                                              );
                                            })()}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  // Legacy heading/content format
                                  <div className="space-y-4">
                                    {currentPage.content.heading && (
                                      <h3 className="text-xl font-semibold">
                                        {currentPage.content.heading}
                                      </h3>
                                    )}
                                    {currentPage.content.content && (
                                      <p className="text-muted-foreground whitespace-pre-wrap">
                                        {currentPage.content.content}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                        {/* Package Page Preview */}
                        {currentPage.pageType === "PACKAGE" &&
                          currentPage.content && (
                            <div className="space-y-6 px-4 md:px-0">
                              {currentPage.content.heading && (
                                <h3 className="text-4xl font-bold mb-4 text-center">
                                  {currentPage.content.heading}
                                </h3>
                              )}
                              {currentPage.content.description && (
                                <p className="text-xl text-muted-foreground mb-6 leading-relaxed text-center">
                                  {currentPage.content.description}
                                </p>
                              )}
                              {currentPage.content.packageIds &&
                              currentPage.content.packageIds.length > 0 ? (
                                <div className="space-y-4">
                                  {packages &&
                                    currentPage.content.packageIds.map(
                                      (pkgId: string) => {
                                        const pkg = packages.find(
                                          (p: any) => p.id === pkgId,
                                        );
                                        if (!pkg) return null;
                                        return (
                                          <Card
                                            key={pkg.id}
                                            className="overflow-hidden border-2 hover:border-primary/40 hover:shadow-lg transition-all duration-300 max-w-[800px] mx-auto"
                                          >
                                            <CardContent className="p-6">
                                              <div className="flex flex-col md:flex-row gap-6">
                                                {/* Package Image - Left Side */}
                                                {pkg.imageUrl && (
                                                  <div className="w-full md:w-48 h-48 flex-shrink-0 overflow-hidden rounded-lg border">
                                                    <img
                                                      src={pkg.imageUrl}
                                                      alt={pkg.name}
                                                      className="w-full h-full object-cover"
                                                      onError={(e) => {
                                                        e.currentTarget.style.display =
                                                          "none";
                                                      }}
                                                    />
                                                  </div>
                                                )}

                                                {/* Content - Right Side */}
                                                <div className="flex-1 flex flex-col min-w-0">
                                                  {/* Package Title */}
                                                  <h4 className="text-xl font-bold mb-4 break-words">
                                                    {pkg.name}
                                                  </h4>

                                                  {/* Package Description */}
                                                  {pkg.description && (
                                                    <div className="mb-4">
                                                      <p className="font-semibold text-sm mb-2">
                                                        Includes:
                                                      </p>
                                                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                                                        {pkg.description}
                                                      </p>
                                                    </div>
                                                  )}

                                                  {/* Package Features */}
                                                  {pkg.features &&
                                                    pkg.features.length > 0 && (
                                                      <ul className="space-y-2 mb-4">
                                                        {pkg.features.map(
                                                          (
                                                            feature: string,
                                                            idx: number,
                                                          ) => (
                                                            <li
                                                              key={idx}
                                                              className="text-sm flex items-start gap-2"
                                                            >
                                                              <span className="text-primary mt-1 flex-shrink-0">
                                                                •
                                                              </span>
                                                              <span className="break-words">
                                                                {feature}
                                                              </span>
                                                            </li>
                                                          ),
                                                        )}
                                                      </ul>
                                                    )}

                                                  {/* Price and Selection */}
                                                  <div className="flex items-center justify-between gap-4 pt-4 border-t mt-auto">
                                                    <div className="text-2xl font-bold text-primary flex-shrink-0">
                                                      $
                                                      {(
                                                        pkg.basePriceCents / 100
                                                      ).toFixed(2)}
                                                    </div>
                                                    <Button
                                                      variant="default"
                                                      size="default"
                                                      disabled
                                                      className="pointer-events-none flex-shrink-0"
                                                    >
                                                      Select
                                                    </Button>
                                                  </div>
                                                </div>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        );
                                      },
                                    )}
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2 pl-1">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    Clients will select one of these packages
                                  </p>
                                </div>
                              ) : (
                                <div className="p-6 border-2 border-dashed border-border rounded-xl text-center">
                                  <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                                  <p className="text-sm text-muted-foreground font-medium">
                                    No packages selected yet
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Add packages to show them to clients
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                        {/* Add-on Page Preview */}
                        {currentPage.pageType === "ADDON" &&
                          currentPage.content && (
                            <div className="space-y-4">
                              {currentPage.content.heading && (
                                <h3 className="text-2xl font-bold mb-2">
                                  {currentPage.content.heading}
                                </h3>
                              )}
                              {currentPage.content.description && (
                                <p className="text-muted-foreground mb-4 leading-relaxed">
                                  {currentPage.content.description}
                                </p>
                              )}
                              {currentPage.content.addOnIds &&
                              currentPage.content.addOnIds.length > 0 &&
                              addOns ? (
                                <div className="space-y-3">
                                  {addOns &&
                                    currentPage.content.addOnIds.map(
                                      (addOnId: string) => {
                                        const addon = addOns.find(
                                          (a: any) => a.id === addOnId,
                                        );
                                        if (!addon) return null;
                                        return (
                                          <div
                                            key={addon.id}
                                            className="group flex items-start justify-between gap-4 p-4 border-2 border-border rounded-xl bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300"
                                          >
                                            <div className="flex items-start gap-3 flex-1">
                                              <div className="mt-1">
                                                <Checkbox
                                                  disabled
                                                  className="pointer-events-none opacity-50"
                                                />
                                              </div>
                                              <div className="flex-1">
                                                <p className="font-bold text-base group-hover:text-primary transition-colors">
                                                  {addon.name}
                                                </p>
                                                {addon.description && (
                                                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                                                    {addon.description}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                            <div className="px-3 py-1.5 rounded-lg bg-muted font-semibold text-sm flex-shrink-0">
                                              $
                                              {(addon.priceCents / 100).toFixed(
                                                2,
                                              )}
                                            </div>
                                          </div>
                                        );
                                      },
                                    )}
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2 pl-1">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    Clients can select add-ons with quantity
                                    controls
                                  </p>
                                </div>
                              ) : (
                                <div className="p-6 border-2 border-dashed border-border rounded-xl text-center">
                                  <Plus className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                                  <p className="text-sm text-muted-foreground font-medium">
                                    No add-ons selected yet
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Select add-ons to show them to clients
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                        {/* Contract Page Preview */}
                        {currentPage.pageType === "CONTRACT" &&
                          currentPage.content && (
                            <div className="max-w-4xl mx-auto px-4 md:px-8">
                              <Card>
                                <CardHeader>
                                  <div className="flex items-center gap-3">
                                    <FileSignature className="w-6 h-6 text-primary" />
                                    <div>
                                      <CardTitle>
                                        {currentPage.content.heading ||
                                          "Service Agreement"}
                                      </CardTitle>
                                      {currentPage.content.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {currentPage.content.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                  {/* Parsed Contract */}
                                  {currentPage.content.contractTemplate ? (
                                    <div className="prose prose-sm max-w-none bg-muted/30 p-6 rounded-lg border">
                                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {parseContractVariables(
                                          currentPage.content
                                            .contractTemplate || "",
                                          {
                                            client_name: "John Smith",
                                            photographer_name:
                                              user?.businessName ||
                                              "Photography Studio",
                                            project_date: "June 15, 2025",
                                            project_type: "Wedding",
                                            selected_packages:
                                              "Premium Package ($3,500)",
                                            selected_addons:
                                              "Second Shooter (x1), Engagement Session (x1)",
                                            total_amount: "$4,800",
                                            deposit_amount: "$2,400",
                                            deposit_percent: "50%",
                                          },
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-6 border-2 border-dashed border-border rounded-xl text-center">
                                      <FileSignature className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                                      <p className="text-sm text-muted-foreground font-medium">
                                        No contract template yet
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Add a contract template to show it to
                                        clients
                                      </p>
                                    </div>
                                  )}

                                  {/* Signature Placeholders */}
                                  <div className="space-y-4 pt-4 border-t">
                                    <h4 className="text-sm font-semibold">
                                      Signatures
                                    </h4>

                                    {currentPage.content
                                      .requirePhotographerSignature !==
                                      false && (
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                          Photographer Signature
                                        </label>
                                        <div className="border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                                          [Photographer will sign before
                                          sending]
                                        </div>
                                      </div>
                                    )}

                                    {currentPage.content
                                      .requireClientSignature !== false && (
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                          Client Signature
                                        </label>
                                        <div className="border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                                          [Client will sign here]
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    This preview shows how your contract will
                                    appear with sample data
                                  </p>
                                </CardContent>
                              </Card>
                            </div>
                          )}

                        {/* Payment Page Preview */}
                        {currentPage.pageType === "PAYMENT" &&
                          currentPage.content && (
                            <div className="max-w-2xl mx-auto">
                              {/* CLIENT_CHOICE Mode Preview - Toggle between plan selection and payment methods */}
                              {currentPage.content.paymentScheduleMode ===
                              "CLIENT_CHOICE" ? (
                                <Card className="border-2">
                                  <CardContent className="p-8 space-y-6">
                                    {!showPaymentMethodsPreview ? (
                                      <>
                                        {/* STEP 1: Choose Your Payment Plan */}
                                        {/* Header */}
                                        <div className="text-center space-y-2">
                                          <h3 className="text-xl font-semibold">
                                            Choose Your Payment Plan
                                          </h3>
                                          <p className="text-sm text-muted-foreground">
                                            Select how many payments you'd like
                                            to split your total into
                                          </p>
                                        </div>

                                        {/* Sample Total */}
                                        <div className="text-center py-4 bg-muted/30 rounded-lg">
                                          <div className="text-sm text-muted-foreground mb-1">
                                            Sample Total
                                          </div>
                                          <div className="text-3xl font-bold">
                                            $3,000.00
                                          </div>
                                        </div>

                                        {/* Installment Options - mirrors public-smart-file.tsx CLIENT_CHOICE logic exactly */}
                                        {(() => {
                                          const config =
                                            currentPage.content
                                              .paymentScheduleConfig || {};
                                          const maxInstallments =
                                            config.maxInstallments || 6;
                                          const allowPayInFull =
                                            config.allowPayInFull !== false;
                                          const discountPercent =
                                            config.payInFullDiscountPercent ||
                                            0;
                                          const sampleTotal = 300000; // $3,000 sample
                                          // Match public-smart-file.tsx logic: Array.from({ length: Math.min((maxInstallments || 6) - 1, 5) }, (_, i) => i + 2)
                                          const installmentOptions = Array.from(
                                            {
                                              length: Math.min(
                                                maxInstallments - 1,
                                                5,
                                              ),
                                            },
                                            (_, i) => i + 2,
                                          );

                                          return (
                                            <div className="grid gap-3">
                                              {/* Pay in Full Option - only show if allowPayInFull is true */}
                                              {allowPayInFull && (
                                                <Button
                                                  variant="outline"
                                                  className="h-auto p-4 justify-between hover:bg-accent hover:border-primary"
                                                  disabled
                                                  data-testid="button-preview-pay-in-full"
                                                >
                                                  <div className="text-left">
                                                    <div className="font-semibold">
                                                      Pay in Full
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                      Complete payment today
                                                      {discountPercent > 0 && (
                                                        <span className="ml-1 text-green-600 dark:text-green-400 font-medium">
                                                          (Save{" "}
                                                          {discountPercent}%)
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="text-lg font-bold">
                                                    $
                                                    {(
                                                      (discountPercent > 0
                                                        ? Math.round(
                                                            sampleTotal *
                                                              (1 -
                                                                discountPercent /
                                                                  100),
                                                          )
                                                        : sampleTotal) / 100
                                                    ).toLocaleString("en-US", {
                                                      minimumFractionDigits: 2,
                                                    })}
                                                  </div>
                                                </Button>
                                              )}

                                              {/* Installment Options (2 to maxInstallments, capped at 6) */}
                                              {installmentOptions.length > 0
                                                ? installmentOptions.map(
                                                    (numPayments) => {
                                                      const firstPayment =
                                                        Math.round(
                                                          sampleTotal /
                                                            numPayments,
                                                        );
                                                      return (
                                                        <Button
                                                          key={numPayments}
                                                          variant={
                                                            previewInstallments ===
                                                            numPayments
                                                              ? "default"
                                                              : "outline"
                                                          }
                                                          className={cn(
                                                            "h-auto p-4 justify-between hover:bg-accent",
                                                            previewInstallments ===
                                                              numPayments &&
                                                              "ring-2 ring-primary ring-offset-2 border-primary",
                                                          )}
                                                          onClick={() =>
                                                            setPreviewInstallments(
                                                              numPayments,
                                                            )
                                                          }
                                                          data-testid={`button-preview-installment-${numPayments}`}
                                                        >
                                                          <div className="text-left">
                                                            <div className="font-semibold">
                                                              {numPayments}{" "}
                                                              Payments
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                              $
                                                              {(
                                                                firstPayment /
                                                                100
                                                              ).toLocaleString(
                                                                "en-US",
                                                                {
                                                                  minimumFractionDigits: 2,
                                                                },
                                                              )}
                                                              /payment • Final
                                                              payment 30 days
                                                              before event
                                                            </div>
                                                          </div>
                                                          <div className="text-lg font-bold text-muted-foreground">
                                                            $
                                                            {(
                                                              sampleTotal / 100
                                                            ).toLocaleString(
                                                              "en-US",
                                                              {
                                                                minimumFractionDigits: 2,
                                                              },
                                                            )}
                                                          </div>
                                                        </Button>
                                                      );
                                                    },
                                                  )
                                                : /* Fallback when no installment options (e.g., maxInstallments=1) */
                                                  !allowPayInFull && (
                                                    <div className="text-center text-sm text-muted-foreground py-4">
                                                      No payment options
                                                      configured. Please set
                                                      maxInstallments higher
                                                      than 1 or enable
                                                      pay-in-full.
                                                    </div>
                                                  )}
                                            </div>
                                          );
                                        })()}

                                        {/* Schedule Preview - updates when clicking different payment options */}
                                        <div
                                          key={`schedule-preview-${previewInstallments}`}
                                          className="space-y-3 pt-2"
                                        >
                                          <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium">
                                              Your Payment Schedule (
                                              {previewInstallments} Payments)
                                            </h4>
                                            <Badge
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              Preview
                                            </Badge>
                                          </div>
                                          <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                                            {(() => {
                                              const sampleTotal = 300000;
                                              const sampleEventDate = new Date(
                                                Date.now() +
                                                  180 * 24 * 60 * 60 * 1000,
                                              );
                                              const schedule =
                                                generateClientChoiceSchedule(
                                                  sampleTotal,
                                                  previewInstallments,
                                                  sampleEventDate,
                                                );
                                              return schedule.map(
                                                (installment, idx) => (
                                                  <div
                                                    key={`${previewInstallments}-${idx}`}
                                                    className="flex items-center justify-between py-2 border-b last:border-0"
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <span className="font-medium">
                                                        {
                                                          installment.description
                                                        }
                                                      </span>
                                                      <span className="text-muted-foreground text-sm">
                                                        {new Date(
                                                          installment.dueDate,
                                                        ).toLocaleDateString(
                                                          "en-US",
                                                          {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                          },
                                                        )}
                                                      </span>
                                                    </div>
                                                    <span className="font-semibold">
                                                      $
                                                      {(
                                                        installment.amountCents /
                                                        100
                                                      ).toLocaleString(
                                                        "en-US",
                                                        {
                                                          minimumFractionDigits: 2,
                                                        },
                                                      )}
                                                    </span>
                                                  </div>
                                                ),
                                              );
                                            })()}
                                          </div>
                                          <p className="text-xs text-muted-foreground italic">
                                            This schedule is flexible - clients
                                            can pay any amount at any time.
                                          </p>
                                        </div>

                                        {/* Continue Button - Click to see payment methods preview */}
                                        <Button
                                          className="w-full"
                                          onClick={() =>
                                            setShowPaymentMethodsPreview(true)
                                          }
                                          data-testid="button-preview-continue-payment"
                                        >
                                          <CreditCard className="w-4 h-4 mr-2" />
                                          Continue to First Payment
                                        </Button>

                                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                                          This is how clients will choose their
                                          payment plan
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        {/* STEP 2: Payment Methods Preview - shown after clicking Continue */}
                                        {/* Back Button */}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="mb-4"
                                          onClick={() =>
                                            setShowPaymentMethodsPreview(false)
                                          }
                                          data-testid="button-preview-back-to-plan"
                                        >
                                          <ArrowLeft className="w-4 h-4 mr-2" />
                                          Back to Payment Plan
                                        </Button>

                                        {/* Payment Header */}
                                        <div className="flex items-center justify-between pb-6 border-b">
                                          <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                                              <CreditCard className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                            <div>
                                              <div className="font-semibold text-sm">
                                                Payment 1 of{" "}
                                                {previewInstallments}
                                              </div>
                                              <div className="text-xs text-muted-foreground">
                                                Due: Today
                                              </div>
                                            </div>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-sm"
                                          >
                                            View Invoice
                                          </Button>
                                        </div>

                                        {/* Amount Due */}
                                        <div>
                                          <div className="text-sm text-muted-foreground mb-1">
                                            Amount due
                                          </div>
                                          <div className="text-4xl font-bold">
                                            $
                                            {(
                                              Math.round(
                                                300000 / previewInstallments,
                                              ) / 100
                                            ).toLocaleString("en-US", {
                                              minimumFractionDigits: 2,
                                            })}
                                          </div>
                                        </div>

                                        {/* Tip Section */}
                                        <div className="space-y-3">
                                          <div className="text-sm font-medium">
                                            Would you like to leave a tip?
                                          </div>
                                          <div className="flex gap-2 flex-wrap">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1 min-w-[80px]"
                                            >
                                              No thanks
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1 min-w-[80px]"
                                            >
                                              <div className="text-center">
                                                <div className="font-semibold">
                                                  10%
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  $
                                                  {(
                                                    Math.round(
                                                      (300000 /
                                                        previewInstallments) *
                                                        0.1,
                                                    ) / 100
                                                  ).toFixed(0)}
                                                </div>
                                              </div>
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1 min-w-[80px]"
                                            >
                                              <div className="text-center">
                                                <div className="font-semibold">
                                                  15%
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  $
                                                  {(
                                                    Math.round(
                                                      (300000 /
                                                        previewInstallments) *
                                                        0.15,
                                                    ) / 100
                                                  ).toFixed(0)}
                                                </div>
                                              </div>
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1 min-w-[80px]"
                                            >
                                              <div className="text-center">
                                                <div className="font-semibold">
                                                  20%
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  $
                                                  {(
                                                    Math.round(
                                                      (300000 /
                                                        previewInstallments) *
                                                        0.2,
                                                    ) / 100
                                                  ).toFixed(0)}
                                                </div>
                                              </div>
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1 min-w-[80px]"
                                            >
                                              Custom
                                            </Button>
                                          </div>
                                        </div>

                                        {/* Autopay Notice */}
                                        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                                          <Shield className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                          <div className="text-sm text-muted-foreground">
                                            Use Autopay, never make a late
                                            payment
                                          </div>
                                        </div>

                                        {/* Google Pay Button (Mock) */}
                                        <Button className="w-full bg-black hover:bg-black/90 text-white h-12">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                              G Pay
                                            </span>
                                            <span>•••• 7303</span>
                                          </div>
                                        </Button>

                                        {/* Divider */}
                                        <div className="relative">
                                          <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t"></div>
                                          </div>
                                          <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-card px-2 text-muted-foreground">
                                              OR
                                            </span>
                                          </div>
                                        </div>

                                        {/* Payment Method Tabs */}
                                        <div className="space-y-4">
                                          <div className="flex border rounded-lg overflow-hidden">
                                            <Button
                                              variant="ghost"
                                              className="flex-1 rounded-none border-b-2 border-primary"
                                            >
                                              Credit card
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              className="flex-1 rounded-none text-muted-foreground"
                                            >
                                              Bank account
                                            </Button>
                                          </div>

                                          {/* Card Input Fields */}
                                          <div className="space-y-4">
                                            <div className="space-y-2">
                                              <label className="text-sm font-medium">
                                                Card number
                                              </label>
                                              <div className="flex items-center border rounded-lg px-3 py-2">
                                                <input
                                                  type="text"
                                                  placeholder="1234 1234 1234 1234"
                                                  className="flex-1 bg-transparent outline-none text-sm"
                                                  disabled
                                                />
                                                <div className="flex gap-1">
                                                  <div className="w-8 h-5 bg-muted rounded"></div>
                                                  <div className="w-8 h-5 bg-muted rounded"></div>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                              <div className="space-y-2">
                                                <label className="text-sm font-medium">
                                                  Expiration
                                                </label>
                                                <input
                                                  type="text"
                                                  placeholder="MM / YY"
                                                  className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent"
                                                  disabled
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <label className="text-sm font-medium">
                                                  CVC
                                                </label>
                                                <input
                                                  type="text"
                                                  placeholder="CVC"
                                                  className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent"
                                                  disabled
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Pay Button */}
                                        <Button
                                          className="w-full h-12 text-lg"
                                          disabled
                                        >
                                          Pay $
                                          {(
                                            Math.round(
                                              300000 / previewInstallments,
                                            ) / 100
                                          ).toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                          })}
                                        </Button>

                                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                                          This is how clients will enter their
                                          payment details
                                        </p>
                                      </>
                                    )}
                                  </CardContent>
                                </Card>
                              ) : (
                                /* Standard Payment Preview for non-CLIENT_CHOICE modes */
                                <Card className="border-2">
                                  <CardContent className="p-8 space-y-6">
                                    {/* Payment Header */}
                                    <div className="flex items-center justify-between pb-6 border-b">
                                      <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                                          <CreditCard className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                        <div>
                                          <div className="font-semibold text-sm">
                                            Payment 1 of 4
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            Due: Oct 8, 2025
                                          </div>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-sm"
                                      >
                                        View Invoice
                                      </Button>
                                    </div>

                                    {/* Amount Due */}
                                    <div>
                                      <div className="text-sm text-muted-foreground mb-1">
                                        Amount due
                                      </div>
                                      <div className="text-4xl font-bold">
                                        $450.00
                                      </div>
                                    </div>

                                    {/* Tip Section */}
                                    <div className="space-y-3">
                                      <div className="text-sm font-medium">
                                        Would you like to leave a tip?
                                      </div>
                                      <div className="flex gap-2 flex-wrap">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex-1 min-w-[80px]"
                                        >
                                          No thanks
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex-1 min-w-[80px]"
                                        >
                                          <div className="text-center">
                                            <div className="font-semibold">
                                              10%
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              $45
                                            </div>
                                          </div>
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex-1 min-w-[80px]"
                                        >
                                          <div className="text-center">
                                            <div className="font-semibold">
                                              15%
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              $67.50
                                            </div>
                                          </div>
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex-1 min-w-[80px]"
                                        >
                                          <div className="text-center">
                                            <div className="font-semibold">
                                              20%
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              $90
                                            </div>
                                          </div>
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex-1 min-w-[80px]"
                                        >
                                          Custom
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Autopay Notice */}
                                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                                      <Shield className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <div className="text-sm text-muted-foreground">
                                        Use Autopay, never make a late payment
                                      </div>
                                    </div>

                                    {/* Overpay Checkbox */}
                                    <div className="flex items-start gap-2">
                                      <input type="checkbox" className="mt-1" />
                                      <label className="text-xs text-muted-foreground leading-relaxed">
                                        Overpay? Pay the invoice now. Upcoming
                                        payments will be charged automatically
                                        per the invoice payment schedule.
                                      </label>
                                    </div>

                                    {/* Google Pay Button (Mock) */}
                                    <Button className="w-full bg-black hover:bg-black/90 text-white h-12">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                          G Pay
                                        </span>
                                        <span>•••• 7303</span>
                                      </div>
                                    </Button>

                                    {/* Divider */}
                                    <div className="relative">
                                      <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t"></div>
                                      </div>
                                      <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-card px-2 text-muted-foreground">
                                          OR
                                        </span>
                                      </div>
                                    </div>

                                    {/* Payment Method Tabs */}
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        className="flex-1 h-11"
                                      >
                                        Debit or credit card
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        className="flex-1 h-11"
                                      >
                                        Bank account
                                      </Button>
                                    </div>

                                    {/* Card Input Fields (Mock) */}
                                    <div className="space-y-4">
                                      <div>
                                        <label className="text-sm font-medium mb-2 block">
                                          Card number
                                        </label>
                                        <div className="relative">
                                          <input
                                            type="text"
                                            placeholder="1234 1234 1234 1234"
                                            className="w-full px-3 py-2 border rounded-md"
                                            disabled
                                          />
                                          <div className="absolute right-3 top-2.5 flex gap-1">
                                            <CreditCard className="w-5 h-5 text-blue-600" />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="text-sm font-medium mb-2 block">
                                            Expiration date
                                          </label>
                                          <input
                                            type="text"
                                            placeholder="MM / YY"
                                            className="w-full px-3 py-2 border rounded-md"
                                            disabled
                                          />
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium mb-2 block">
                                            Security code
                                          </label>
                                          <input
                                            type="text"
                                            placeholder="CVC"
                                            className="w-full px-3 py-2 border rounded-md"
                                            disabled
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* SSL Security Badge */}
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t">
                                      <Shield className="w-4 h-4" />
                                      <span>
                                        We use the same SSL encryption
                                        technology that banks use to protect
                                        your sensitive data.
                                      </span>
                                    </div>

                                    {/* Pay Button */}
                                    <div className="flex items-center justify-end gap-3 pt-4">
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Shield className="w-3 h-3" />
                                        <span>
                                          Secured by{" "}
                                          <span className="font-semibold">
                                            HONEYBOOK
                                          </span>
                                        </span>
                                      </div>
                                      <Button className="bg-primary hover:bg-primary/90 h-11 px-8">
                                        Pay $450.00
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          )}

                        {/* INVOICE Page Preview */}
                        {currentPage.pageType === "INVOICE" &&
                          currentPage.content &&
                          (() => {
                            // Get line items for rendering
                            const lineItems =
                              currentPage.content.lineItems || [];

                            // Calculate totals using shared utility
                            const invoiceTotals = calculateInvoiceTotals(
                              lineItems,
                              currentPage.content.taxPercent || 0,
                              currentPage.content.discountAmount || 0,
                              currentPage.content.discountType || "PERCENT",
                            );
                            const { subtotal, tax, discount, total } =
                              invoiceTotals;

                            return (
                              <div className="max-w-4xl mx-auto px-4 md:px-8">
                                {/* Modern Invoice Card */}
                                <div className="bg-white rounded-lg shadow-sm border p-8 mb-4">
                                  {/* Invoice Header */}
                                  <div className="flex justify-between items-start mb-8">
                                    {/* Left: Business Info */}
                                    <div>
                                      <h1 className="text-3xl font-bold mb-2">
                                        {currentPage.content.heading ||
                                          smartFile?.photographer
                                            ?.businessName ||
                                          "Invoice"}
                                      </h1>
                                      {currentPage.content.description && (
                                        <p className="text-sm text-muted-foreground max-w-md">
                                          {currentPage.content.description}
                                        </p>
                                      )}
                                    </div>

                                    {/* Right: Invoice Details */}
                                    <div className="text-right">
                                      <div className="text-4xl font-bold text-primary mb-2">
                                        INVOICE
                                      </div>
                                      <div className="space-y-1 text-sm">
                                        {currentPage.content.invoiceNumber && (
                                          <div>
                                            <span className="text-muted-foreground">
                                              Invoice #:{" "}
                                            </span>
                                            <span className="font-medium">
                                              {
                                                currentPage.content
                                                  .invoiceNumber
                                              }
                                            </span>
                                          </div>
                                        )}
                                        {currentPage.content.dateIssued && (
                                          <div>
                                            <span className="text-muted-foreground">
                                              Date:{" "}
                                            </span>
                                            <span className="font-medium">
                                              {new Date(
                                                currentPage.content.dateIssued,
                                              ).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                              })}
                                            </span>
                                          </div>
                                        )}
                                        {currentPage.content
                                          .purchaseOrderNumber && (
                                          <div>
                                            <span className="text-muted-foreground">
                                              PO #:{" "}
                                            </span>
                                            <span className="font-medium">
                                              {
                                                currentPage.content
                                                  .purchaseOrderNumber
                                              }
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Bill To Section */}
                                  <div className="bg-muted/30 p-4 rounded-md mb-8">
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                                      Bill To
                                    </div>
                                    <div className="font-semibold">
                                      {currentPage.content.billTo ||
                                        "Client Name"}
                                    </div>
                                  </div>

                                  {/* Line Items Table - Enhanced */}
                                  {lineItems.length > 0 && (
                                    <table className="w-full mb-8">
                                      <thead>
                                        <tr className="border-b-2 border-gray-200">
                                          <th className="text-left py-3 text-sm font-semibold uppercase tracking-wide">
                                            Description
                                          </th>
                                          <th className="text-center py-3 text-sm font-semibold uppercase tracking-wide w-20">
                                            Qty
                                          </th>
                                          <th className="text-right py-3 text-sm font-semibold uppercase tracking-wide w-32">
                                            Rate
                                          </th>
                                          <th className="text-right py-3 text-sm font-semibold uppercase tracking-wide w-32">
                                            Amount
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {lineItems.map(
                                          (item: any, index: number) => (
                                            <tr
                                              key={item.id}
                                              className={
                                                index % 2 === 0
                                                  ? "bg-gray-50/50"
                                                  : ""
                                              }
                                            >
                                              <td className="py-4">
                                                <div className="font-medium">
                                                  {item.service}
                                                </div>
                                                {item.taxable && (
                                                  <div className="text-xs text-muted-foreground">
                                                    Taxable
                                                  </div>
                                                )}
                                              </td>
                                              <td className="py-4 text-center">
                                                {item.quantity}
                                              </td>
                                              <td className="py-4 text-right">
                                                $
                                                {(item.unitPrice / 100).toFixed(
                                                  2,
                                                )}
                                              </td>
                                              <td className="py-4 text-right font-semibold">
                                                $
                                                {(
                                                  (item.quantity *
                                                    item.unitPrice) /
                                                  100
                                                ).toFixed(2)}
                                              </td>
                                            </tr>
                                          ),
                                        )}
                                      </tbody>
                                    </table>
                                  )}

                                  {/* Enhanced Totals Section */}
                                  <div className="flex justify-end">
                                    <div className="w-80 space-y-2">
                                      <div className="flex justify-between py-2 text-sm">
                                        <span className="text-muted-foreground">
                                          Subtotal
                                        </span>
                                        <span className="font-medium">
                                          ${(subtotal / 100).toFixed(2)}
                                        </span>
                                      </div>

                                      {currentPage.content.taxPercent > 0 && (
                                        <div className="flex justify-between py-2 text-sm">
                                          <span className="text-muted-foreground">
                                            Tax (
                                            {currentPage.content.taxPercent}%)
                                          </span>
                                          <span className="font-medium">
                                            ${(tax / 100).toFixed(2)}
                                          </span>
                                        </div>
                                      )}

                                      {discount > 0 && (
                                        <div className="flex justify-between py-2 text-sm text-green-600">
                                          <span>
                                            Discount{" "}
                                            {currentPage.content
                                              .discountType === "PERCENT"
                                              ? `(${currentPage.content.discountAmount}%)`
                                              : ""}
                                          </span>
                                          <span className="font-medium">
                                            -${(discount / 100).toFixed(2)}
                                          </span>
                                        </div>
                                      )}

                                      <Separator />

                                      <div className="flex justify-between py-3 bg-primary/5 px-4 rounded-md">
                                        <span className="text-lg font-bold">
                                          Total
                                        </span>
                                        <span className="text-2xl font-bold text-primary">
                                          ${(total / 100).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Payment Terms Section - Preview */}
                                <div className="bg-white rounded-lg shadow-sm border p-6 mt-4">
                                  <div className="flex items-center gap-2 mb-4">
                                    <CreditCard className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-semibold">
                                      Payment Terms
                                    </h3>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant={
                                          currentPage.content
                                            .paymentScheduleMode ===
                                          "CLIENT_CHOICE"
                                            ? "default"
                                            : "secondary"
                                        }
                                      >
                                        {currentPage.content
                                          .paymentScheduleMode ===
                                        "CLIENT_CHOICE"
                                          ? "Client Selects Plan"
                                          : "Preset Plan"}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {currentPage.content
                                        .paymentScheduleMode ===
                                      "CLIENT_CHOICE" ? (
                                        <p>
                                          Client can choose up to{" "}
                                          {currentPage.content
                                            .paymentScheduleConfig
                                            ?.maxInstallments || 6}{" "}
                                          installments
                                        </p>
                                      ) : (
                                        <p>
                                          Deposit (
                                          {currentPage.content.depositPercent ||
                                            50}
                                          %) due upon acceptance, balance due
                                          before event
                                        </p>
                                      )}
                                    </div>
                                    {currentPage.content
                                      .acceptOnlinePayments && (
                                      <div className="flex items-center gap-2 text-sm text-green-600">
                                        <Check className="w-4 h-4" />
                                        <span>Online payments enabled</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                        {/* PAY Page Preview - HoneyBook Style */}
                        {currentPage.pageType === "PAY" &&
                          currentPage.content &&
                          (() => {
                            const invoicePage = pages.find(
                              (p) => p.pageType === "INVOICE",
                            );
                            const invoiceContent = invoicePage?.content as
                              | InvoicePageContent
                              | undefined;

                            // Calculate totals from invoice
                            const invoiceTotals = invoiceContent
                              ? calculateInvoiceTotals(
                                  invoiceContent.lineItems || [],
                                  invoiceContent.taxPercent || 0,
                                  invoiceContent.discountAmount || 0,
                                  invoiceContent.discountType || "PERCENT",
                                )
                              : null;

                            const total = invoiceTotals?.total || 0;
                            const depositPercent =
                              invoiceContent?.depositPercent || 50;
                            const depositAmount = Math.round(
                              total * (depositPercent / 100),
                            );
                            const totalPayments =
                              invoiceContent?.paymentScheduleMode === "SIMPLE"
                                ? 2
                                : invoiceContent?.paymentScheduleConfig
                                    ?.maxInstallments || 2;

                            return (
                              <div className="max-w-lg mx-auto px-4 md:px-0">
                                <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border overflow-hidden">
                                  {/* Header with branding */}
                                  <div className="flex items-center justify-between p-4 border-b">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                                        LOGO
                                      </div>
                                      <div>
                                        <div className="font-medium text-sm">
                                          Payment 1 of {totalPayments}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Due: Today
                                        </div>
                                      </div>
                                    </div>
                                    <button className="text-sm text-primary hover:underline">
                                      View Invoice
                                    </button>
                                  </div>

                                  <div className="p-6 space-y-6">
                                    {/* Amount Due - Dynamic from Invoice */}
                                    <div>
                                      <div className="text-sm font-medium text-primary mb-1">
                                        Amount due
                                      </div>
                                      <div className="text-4xl font-bold">
                                        {total > 0
                                          ? formatCentsAsDollars(depositAmount)
                                          : "$0.00"}
                                      </div>
                                      {total > 0 && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Total: {formatCentsAsDollars(total)} (
                                          {depositPercent}% deposit)
                                        </div>
                                      )}
                                    </div>

                                    {/* Tip Section */}
                                    <div className="space-y-3">
                                      <div className="text-sm">
                                        Would you like to leave a tip?
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex-1 flex-col h-auto py-2"
                                        >
                                          <span>No thanks</span>
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex-1 flex-col h-auto py-2"
                                        >
                                          <span>18%</span>
                                          <span className="text-xs text-muted-foreground">
                                            $225
                                          </span>
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex-1 flex-col h-auto py-2"
                                        >
                                          <span>20%</span>
                                          <span className="text-xs text-muted-foreground">
                                            $250
                                          </span>
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex-1 flex-col h-auto py-2"
                                        >
                                          <span>25%</span>
                                          <span className="text-xs text-muted-foreground">
                                            $312
                                          </span>
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex-1 flex-col h-auto py-2"
                                        >
                                          <span>Custom</span>
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Autopay Section */}
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                          <DollarSign className="w-3 h-3 text-primary" />
                                        </div>
                                        <span className="text-sm font-medium">
                                          Use Autopay, never make a late payment
                                        </span>
                                      </div>
                                      <div className="flex items-start gap-2 ml-8">
                                        <Checkbox disabled />
                                        <span className="text-xs text-muted-foreground">
                                          (Optional) Pay this amount now.
                                          Upcoming payments will be charged
                                          automatically per the invoice payment
                                          schedule.
                                        </span>
                                      </div>
                                    </div>

                                    {/* Google Pay Button */}
                                    <div className="bg-black text-white rounded-md py-3 flex items-center justify-center gap-2">
                                      <span className="font-medium">G Pay</span>
                                    </div>

                                    <div className="flex items-center gap-4">
                                      <Separator className="flex-1" />
                                      <span className="text-xs text-muted-foreground">
                                        OR
                                      </span>
                                      <Separator className="flex-1" />
                                    </div>

                                    {/* Payment Method Tabs */}
                                    <div className="flex rounded-md border overflow-hidden">
                                      <button className="flex-1 py-2 px-4 text-sm font-medium bg-gray-900 text-white">
                                        Debit or credit card
                                      </button>
                                      <button className="flex-1 py-2 px-4 text-sm text-muted-foreground border-l">
                                        Bank account
                                      </button>
                                    </div>

                                    {/* Card Form */}
                                    <div className="space-y-4">
                                      <div>
                                        <label className="text-sm text-muted-foreground mb-1 block">
                                          Card number
                                        </label>
                                        <div className="border rounded-md p-3 flex items-center justify-between">
                                          <span className="text-muted-foreground">
                                            1234 1234 1234 1234
                                          </span>
                                          <div className="flex gap-1">
                                            <div className="w-8 h-5 bg-blue-600 rounded text-white text-[8px] flex items-center justify-center font-bold">
                                              VISA
                                            </div>
                                            <div className="w-8 h-5 bg-red-500 rounded text-white text-[8px] flex items-center justify-center font-bold">
                                              MC
                                            </div>
                                            <div className="w-8 h-5 bg-blue-400 rounded text-white text-[8px] flex items-center justify-center font-bold">
                                              AMEX
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="text-sm text-muted-foreground mb-1 block">
                                            Expiration date
                                          </label>
                                          <div className="border rounded-md p-3">
                                            <span className="text-muted-foreground">
                                              MM / YY
                                            </span>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-sm text-muted-foreground mb-1 block">
                                            Security code
                                          </label>
                                          <div className="border rounded-md p-3 flex items-center justify-between">
                                            <span className="text-muted-foreground">
                                              CVC
                                            </span>
                                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Footer */}
                                  <div className="flex items-center justify-between p-4 bg-muted/30 border-t">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
                                        <Shield className="w-4 h-4 text-yellow-800" />
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        We use SSL encryption to protect your
                                        info.
                                      </span>
                                    </div>
                                    <Button
                                      className="bg-primary hover:bg-primary/90"
                                      disabled
                                    >
                                      Pay{" "}
                                      {total > 0
                                        ? formatCentsAsDollars(depositAmount)
                                        : "$0.00"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                        {/* Form Page Preview */}
                        {currentPage.pageType === "FORM" &&
                          currentPage.content && (
                            <div className="space-y-0">
                              {/* Content Sections - Same architecture as TEXT pages */}
                              <div className="max-w-[800px] mx-auto space-y-6 py-6 px-4 md:px-0">
                                {currentPage.content.sections &&
                                currentPage.content.sections.length > 0 ? (
                                  currentPage.content.sections.map(
                                    (section: Section, secIdx: number) => (
                                      <div key={secIdx}>
                                        {section.columns === 1 ? (
                                          <div className="space-y-4">
                                            {section.blocks.map(
                                              (
                                                block: ContentBlock,
                                                blockIdx: number,
                                              ) => (
                                                <div key={blockIdx}>
                                                  {block.type === "HEADING" &&
                                                    block.content && (
                                                      <h3 className="text-2xl font-bold mb-2">
                                                        {block.content}
                                                      </h3>
                                                    )}
                                                  {block.type === "TEXT" &&
                                                    block.content && (
                                                      <div
                                                        className="text-muted-foreground prose prose-sm max-w-none"
                                                        dangerouslySetInnerHTML={{
                                                          __html:
                                                            DOMPurify.sanitize(
                                                              block.content,
                                                            ),
                                                        }}
                                                      />
                                                    )}
                                                  {block.type === "SPACER" && (
                                                    <div className="py-6" />
                                                  )}
                                                  {block.type === "IMAGE" &&
                                                    block.content &&
                                                    (() => {
                                                      const imageData: ImageContent =
                                                        typeof block.content ===
                                                        "string"
                                                          ? {
                                                              url: block.content,
                                                              borderRadius:
                                                                "straight",
                                                              size: "medium",
                                                            }
                                                          : block.content;
                                                      const isRounded =
                                                        imageData.borderRadius ===
                                                        "rounded";

                                                      // Stretched image - full width with no padding
                                                      if (
                                                        imageData.size ===
                                                        "stretched"
                                                      ) {
                                                        return (
                                                          <div className="relative -mx-4 md:mx-[calc(-50vw+50%)]">
                                                            <img
                                                              src={
                                                                imageData.url
                                                              }
                                                              alt=""
                                                              className="w-full object-cover"
                                                            />
                                                          </div>
                                                        );
                                                      }

                                                      const sizeClass =
                                                        imageData.size ===
                                                        "small"
                                                          ? "h-[100px] w-[100px]"
                                                          : imageData.size ===
                                                              "large"
                                                            ? "h-[300px] w-[300px]"
                                                            : "h-[150px] w-[150px]";

                                                      if (isRounded) {
                                                        return (
                                                          <div
                                                            className={cn(
                                                              "rounded-full overflow-hidden border border-border mx-auto",
                                                              sizeClass,
                                                            )}
                                                          >
                                                            <img
                                                              src={
                                                                imageData.url
                                                              }
                                                              alt=""
                                                              className="w-full h-full object-cover"
                                                            />
                                                          </div>
                                                        );
                                                      }

                                                      const maxHeightClass =
                                                        imageData.size ===
                                                        "small"
                                                          ? "max-h-[100px]"
                                                          : imageData.size ===
                                                              "large"
                                                            ? "max-h-[300px]"
                                                            : "max-h-[150px]";
                                                      return (
                                                        <img
                                                          src={imageData.url}
                                                          alt=""
                                                          className={cn(
                                                            "w-full rounded-none object-contain border border-border",
                                                            maxHeightClass,
                                                          )}
                                                        />
                                                      );
                                                    })()}
                                                  {/* Form Field Types Preview - Disabled State */}
                                                  {block.type ===
                                                    "FORM_FIELD" &&
                                                    block.content &&
                                                    (() => {
                                                      const fieldData =
                                                        block.content;
                                                      return (
                                                        <div className="space-y-2">
                                                          <label className="text-sm font-medium flex items-center gap-1">
                                                            {fieldData.label}
                                                            {fieldData.required && (
                                                              <span className="text-destructive">
                                                                *
                                                              </span>
                                                            )}
                                                          </label>
                                                          {fieldData.fieldType ===
                                                            "TEXT_INPUT" && (
                                                            <input
                                                              type="text"
                                                              placeholder={
                                                                fieldData.placeholder ||
                                                                ""
                                                              }
                                                              className="w-full px-3 py-2 border rounded-md"
                                                              disabled
                                                            />
                                                          )}
                                                          {fieldData.fieldType ===
                                                            "TEXTAREA" && (
                                                            <textarea
                                                              placeholder={
                                                                fieldData.placeholder ||
                                                                ""
                                                              }
                                                              className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                                                              disabled
                                                            />
                                                          )}
                                                          {fieldData.fieldType ===
                                                            "EMAIL" && (
                                                            <input
                                                              type="email"
                                                              placeholder={
                                                                fieldData.placeholder ||
                                                                ""
                                                              }
                                                              className="w-full px-3 py-2 border rounded-md"
                                                              disabled
                                                            />
                                                          )}
                                                          {fieldData.fieldType ===
                                                            "NUMBER" && (
                                                            <input
                                                              type="number"
                                                              placeholder={
                                                                fieldData.placeholder ||
                                                                ""
                                                              }
                                                              className="w-full px-3 py-2 border rounded-md"
                                                              disabled
                                                            />
                                                          )}
                                                          {fieldData.fieldType ===
                                                            "DATE" && (
                                                            <input
                                                              type="date"
                                                              className="w-full px-3 py-2 border rounded-md"
                                                              disabled
                                                            />
                                                          )}
                                                          {fieldData.fieldType ===
                                                            "MULTIPLE_CHOICE" &&
                                                            fieldData.options && (
                                                              <div className="space-y-2">
                                                                {fieldData.options.map(
                                                                  (
                                                                    option: string,
                                                                    idx: number,
                                                                  ) => (
                                                                    <div
                                                                      key={idx}
                                                                      className="flex items-center gap-2"
                                                                    >
                                                                      <input
                                                                        type="radio"
                                                                        disabled
                                                                        className="cursor-not-allowed"
                                                                      />
                                                                      <span className="text-sm">
                                                                        {option}
                                                                      </span>
                                                                    </div>
                                                                  ),
                                                                )}
                                                              </div>
                                                            )}
                                                          {fieldData.fieldType ===
                                                            "CHECKBOX" &&
                                                            fieldData.options && (
                                                              <div className="space-y-2">
                                                                {fieldData.options.map(
                                                                  (
                                                                    option: string,
                                                                    idx: number,
                                                                  ) => (
                                                                    <div
                                                                      key={idx}
                                                                      className="flex items-center gap-2"
                                                                    >
                                                                      <input
                                                                        type="checkbox"
                                                                        disabled
                                                                        className="cursor-not-allowed"
                                                                      />
                                                                      <span className="text-sm">
                                                                        {option}
                                                                      </span>
                                                                    </div>
                                                                  ),
                                                                )}
                                                              </div>
                                                            )}
                                                        </div>
                                                      );
                                                    })()}
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-4">
                                              {section.blocks
                                                .filter(
                                                  (b: ContentBlock) =>
                                                    b.column === 0,
                                                )
                                                .map(
                                                  (
                                                    block: ContentBlock,
                                                    blockIdx: number,
                                                  ) => (
                                                    <div key={blockIdx}>
                                                      {block.type ===
                                                        "HEADING" &&
                                                        block.content && (
                                                          <h3 className="text-2xl font-bold mb-2">
                                                            {block.content}
                                                          </h3>
                                                        )}
                                                      {block.type === "TEXT" &&
                                                        block.content && (
                                                          <div
                                                            className="text-muted-foreground prose prose-sm max-w-none"
                                                            dangerouslySetInnerHTML={{
                                                              __html:
                                                                DOMPurify.sanitize(
                                                                  block.content ||
                                                                    "",
                                                                ),
                                                            }}
                                                          />
                                                        )}
                                                      {block.type ===
                                                        "SPACER" && (
                                                        <div className="py-6" />
                                                      )}
                                                      {block.type === "IMAGE" &&
                                                        block.content &&
                                                        (() => {
                                                          const imageData: ImageContent =
                                                            typeof block.content ===
                                                            "string"
                                                              ? {
                                                                  url: block.content,
                                                                  borderRadius:
                                                                    "straight",
                                                                  size: "medium",
                                                                }
                                                              : block.content;
                                                          const isRounded =
                                                            imageData.borderRadius ===
                                                            "rounded";

                                                          // Stretched image - full width within column
                                                          if (
                                                            imageData.size ===
                                                            "stretched"
                                                          ) {
                                                            return (
                                                              <img
                                                                src={
                                                                  imageData.url
                                                                }
                                                                alt=""
                                                                className="w-full object-cover"
                                                              />
                                                            );
                                                          }

                                                          const sizeClass =
                                                            imageData.size ===
                                                            "small"
                                                              ? "h-[100px] w-[100px]"
                                                              : imageData.size ===
                                                                  "large"
                                                                ? "h-[300px] w-[300px]"
                                                                : "h-[150px] w-[150px]";

                                                          if (isRounded) {
                                                            return (
                                                              <div
                                                                className={cn(
                                                                  "rounded-full overflow-hidden border-4 border-border shadow-lg mx-auto",
                                                                  sizeClass,
                                                                )}
                                                              >
                                                                <img
                                                                  src={
                                                                    imageData.url
                                                                  }
                                                                  alt=""
                                                                  className="w-full h-full object-cover"
                                                                />
                                                              </div>
                                                            );
                                                          }

                                                          const maxHeightClass =
                                                            imageData.size ===
                                                            "small"
                                                              ? "max-h-[100px]"
                                                              : imageData.size ===
                                                                  "large"
                                                                ? "max-h-[300px]"
                                                                : "max-h-[150px]";
                                                          return (
                                                            <img
                                                              src={
                                                                imageData.url
                                                              }
                                                              alt=""
                                                              className={cn(
                                                                "w-full rounded-none object-contain border-2 border-border shadow-md",
                                                                maxHeightClass,
                                                              )}
                                                            />
                                                          );
                                                        })()}
                                                      {/* Form Field Types Preview - Column 0 */}
                                                      {block.type ===
                                                        "FORM_FIELD" &&
                                                        block.content &&
                                                        (() => {
                                                          const fieldData =
                                                            block.content;
                                                          return (
                                                            <div className="space-y-2">
                                                              <label className="text-sm font-medium flex items-center gap-1">
                                                                {
                                                                  fieldData.label
                                                                }
                                                                {fieldData.required && (
                                                                  <span className="text-destructive">
                                                                    *
                                                                  </span>
                                                                )}
                                                              </label>
                                                              {fieldData.fieldType ===
                                                                "TEXT_INPUT" && (
                                                                <input
                                                                  type="text"
                                                                  placeholder={
                                                                    fieldData.placeholder ||
                                                                    ""
                                                                  }
                                                                  className="w-full px-3 py-2 border rounded-md"
                                                                  disabled
                                                                />
                                                              )}
                                                              {fieldData.fieldType ===
                                                                "TEXTAREA" && (
                                                                <textarea
                                                                  placeholder={
                                                                    fieldData.placeholder ||
                                                                    ""
                                                                  }
                                                                  className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                                                                  disabled
                                                                />
                                                              )}
                                                              {fieldData.fieldType ===
                                                                "EMAIL" && (
                                                                <input
                                                                  type="email"
                                                                  placeholder={
                                                                    fieldData.placeholder ||
                                                                    ""
                                                                  }
                                                                  className="w-full px-3 py-2 border rounded-md"
                                                                  disabled
                                                                />
                                                              )}
                                                              {fieldData.fieldType ===
                                                                "NUMBER" && (
                                                                <input
                                                                  type="number"
                                                                  placeholder={
                                                                    fieldData.placeholder ||
                                                                    ""
                                                                  }
                                                                  className="w-full px-3 py-2 border rounded-md"
                                                                  disabled
                                                                />
                                                              )}
                                                              {fieldData.fieldType ===
                                                                "DATE" && (
                                                                <input
                                                                  type="date"
                                                                  className="w-full px-3 py-2 border rounded-md"
                                                                  disabled
                                                                />
                                                              )}
                                                              {fieldData.fieldType ===
                                                                "MULTIPLE_CHOICE" &&
                                                                fieldData.options && (
                                                                  <div className="space-y-2">
                                                                    {fieldData.options.map(
                                                                      (
                                                                        option: string,
                                                                        idx: number,
                                                                      ) => (
                                                                        <div
                                                                          key={
                                                                            idx
                                                                          }
                                                                          className="flex items-center gap-2"
                                                                        >
                                                                          <input
                                                                            type="radio"
                                                                            disabled
                                                                            className="cursor-not-allowed"
                                                                          />
                                                                          <span className="text-sm">
                                                                            {
                                                                              option
                                                                            }
                                                                          </span>
                                                                        </div>
                                                                      ),
                                                                    )}
                                                                  </div>
                                                                )}
                                                              {fieldData.fieldType ===
                                                                "CHECKBOX" &&
                                                                fieldData.options && (
                                                                  <div className="space-y-2">
                                                                    {fieldData.options.map(
                                                                      (
                                                                        option: string,
                                                                        idx: number,
                                                                      ) => (
                                                                        <div
                                                                          key={
                                                                            idx
                                                                          }
                                                                          className="flex items-center gap-2"
                                                                        >
                                                                          <input
                                                                            type="checkbox"
                                                                            disabled
                                                                            className="cursor-not-allowed"
                                                                          />
                                                                          <span className="text-sm">
                                                                            {
                                                                              option
                                                                            }
                                                                          </span>
                                                                        </div>
                                                                      ),
                                                                    )}
                                                                  </div>
                                                                )}
                                                            </div>
                                                          );
                                                        })()}
                                                    </div>
                                                  ),
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                              {section.blocks
                                                .filter(
                                                  (b: ContentBlock) =>
                                                    b.column === 1,
                                                )
                                                .map(
                                                  (
                                                    block: ContentBlock,
                                                    blockIdx: number,
                                                  ) => (
                                                    <div key={blockIdx}>
                                                      {block.type ===
                                                        "HEADING" &&
                                                        block.content && (
                                                          <h3 className="text-2xl font-bold mb-2">
                                                            {block.content}
                                                          </h3>
                                                        )}
                                                      {block.type === "TEXT" &&
                                                        block.content && (
                                                          <div
                                                            className="text-muted-foreground prose prose-sm max-w-none"
                                                            dangerouslySetInnerHTML={{
                                                              __html:
                                                                DOMPurify.sanitize(
                                                                  block.content ||
                                                                    "",
                                                                ),
                                                            }}
                                                          />
                                                        )}
                                                      {block.type ===
                                                        "SPACER" && (
                                                        <div className="py-6" />
                                                      )}
                                                      {block.type === "IMAGE" &&
                                                        block.content &&
                                                        (() => {
                                                          const imageData: ImageContent =
                                                            typeof block.content ===
                                                            "string"
                                                              ? {
                                                                  url: block.content,
                                                                  borderRadius:
                                                                    "straight",
                                                                  size: "medium",
                                                                }
                                                              : block.content;
                                                          const isRounded =
                                                            imageData.borderRadius ===
                                                            "rounded";

                                                          // Stretched image - full width within column
                                                          if (
                                                            imageData.size ===
                                                            "stretched"
                                                          ) {
                                                            return (
                                                              <img
                                                                src={
                                                                  imageData.url
                                                                }
                                                                alt=""
                                                                className="w-full object-cover"
                                                              />
                                                            );
                                                          }

                                                          const sizeClass =
                                                            imageData.size ===
                                                            "small"
                                                              ? "h-[100px] w-[100px]"
                                                              : imageData.size ===
                                                                  "large"
                                                                ? "h-[300px] w-[300px]"
                                                                : "h-[150px] w-[150px]";

                                                          if (isRounded) {
                                                            return (
                                                              <div
                                                                className={cn(
                                                                  "rounded-full overflow-hidden border-4 border-border shadow-lg mx-auto",
                                                                  sizeClass,
                                                                )}
                                                              >
                                                                <img
                                                                  src={
                                                                    imageData.url
                                                                  }
                                                                  alt=""
                                                                  className="w-full h-full object-cover"
                                                                />
                                                              </div>
                                                            );
                                                          }

                                                          const maxHeightClass =
                                                            imageData.size ===
                                                            "small"
                                                              ? "max-h-[100px]"
                                                              : imageData.size ===
                                                                  "large"
                                                                ? "max-h-[300px]"
                                                                : "max-h-[150px]";
                                                          return (
                                                            <img
                                                              src={
                                                                imageData.url
                                                              }
                                                              alt=""
                                                              className={cn(
                                                                "w-full rounded-none object-contain border-2 border-border shadow-md",
                                                                maxHeightClass,
                                                              )}
                                                            />
                                                          );
                                                        })()}
                                                      {/* Form Field Types Preview - Column 1 */}
                                                      {block.type ===
                                                        "FORM_FIELD" &&
                                                        block.content &&
                                                        (() => {
                                                          const fieldData =
                                                            block.content;
                                                          return (
                                                            <div className="space-y-2">
                                                              <label className="text-sm font-medium flex items-center gap-1">
                                                                {
                                                                  fieldData.label
                                                                }
                                                                {fieldData.required && (
                                                                  <span className="text-destructive">
                                                                    *
                                                                  </span>
                                                                )}
                                                              </label>
                                                              {fieldData.fieldType ===
                                                                "TEXT_INPUT" && (
                                                                <input
                                                                  type="text"
                                                                  placeholder={
                                                                    fieldData.placeholder ||
                                                                    ""
                                                                  }
                                                                  className="w-full px-3 py-2 border rounded-md"
                                                                  disabled
                                                                />
                                                              )}
                                                              {fieldData.fieldType ===
                                                                "TEXTAREA" && (
                                                                <textarea
                                                                  placeholder={
                                                                    fieldData.placeholder ||
                                                                    ""
                                                                  }
                                                                  className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                                                                  disabled
                                                                />
                                                              )}
                                                              {fieldData.fieldType ===
                                                                "EMAIL" && (
                                                                <input
                                                                  type="email"
                                                                  placeholder={
                                                                    fieldData.placeholder ||
                                                                    ""
                                                                  }
                                                                  className="w-full px-3 py-2 border rounded-md"
                                                                  disabled
                                                                />
                                                              )}
                                                              {fieldData.fieldType ===
                                                                "NUMBER" && (
                                                                <input
                                                                  type="number"
                                                                  placeholder={
                                                                    fieldData.placeholder ||
                                                                    ""
                                                                  }
                                                                  className="w-full px-3 py-2 border rounded-md"
                                                                  disabled
                                                                />
                                                              )}
                                                              {fieldData.fieldType ===
                                                                "DATE" && (
                                                                <input
                                                                  type="date"
                                                                  className="w-full px-3 py-2 border rounded-md"
                                                                  disabled
                                                                />
                                                              )}
                                                              {fieldData.fieldType ===
                                                                "MULTIPLE_CHOICE" &&
                                                                fieldData.options && (
                                                                  <div className="space-y-2">
                                                                    {fieldData.options.map(
                                                                      (
                                                                        option: string,
                                                                        idx: number,
                                                                      ) => (
                                                                        <div
                                                                          key={
                                                                            idx
                                                                          }
                                                                          className="flex items-center gap-2"
                                                                        >
                                                                          <input
                                                                            type="radio"
                                                                            disabled
                                                                            className="cursor-not-allowed"
                                                                          />
                                                                          <span className="text-sm">
                                                                            {
                                                                              option
                                                                            }
                                                                          </span>
                                                                        </div>
                                                                      ),
                                                                    )}
                                                                  </div>
                                                                )}
                                                              {fieldData.fieldType ===
                                                                "CHECKBOX" &&
                                                                fieldData.options && (
                                                                  <div className="space-y-2">
                                                                    {fieldData.options.map(
                                                                      (
                                                                        option: string,
                                                                        idx: number,
                                                                      ) => (
                                                                        <div
                                                                          key={
                                                                            idx
                                                                          }
                                                                          className="flex items-center gap-2"
                                                                        >
                                                                          <input
                                                                            type="checkbox"
                                                                            disabled
                                                                            className="cursor-not-allowed"
                                                                          />
                                                                          <span className="text-sm">
                                                                            {
                                                                              option
                                                                            }
                                                                          </span>
                                                                        </div>
                                                                      ),
                                                                    )}
                                                                  </div>
                                                                )}
                                                            </div>
                                                          );
                                                        })()}
                                                    </div>
                                                  ),
                                                )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ),
                                  )
                                ) : (
                                  <div className="p-6 border-2 border-dashed border-border rounded-xl text-center">
                                    <ClipboardList className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground font-medium">
                                      No form fields added yet
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Add sections and form fields to build your
                                      questionnaire
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                        {/* Scheduling Page Preview */}
                        {currentPage.pageType === "SCHEDULING" &&
                          currentPage.content && (
                            <div className="max-w-4xl mx-auto">
                              <SchedulingCalendar
                                heading={currentPage.content.heading}
                                description={currentPage.content.description}
                                durationMinutes={
                                  currentPage.content.durationMinutes
                                }
                                bookingType={currentPage.content.bookingType}
                                bufferBefore={currentPage.content.bufferBefore}
                                bufferAfter={currentPage.content.bufferAfter}
                                allowRescheduling={
                                  currentPage.content.allowRescheduling
                                }
                                photographerName={
                                  user?.businessName || user?.name
                                }
                                photographerPhoto={null}
                                photographerId={user?.photographerId}
                                showPhotographerProfile={
                                  currentPage.content.showPhotographerProfile ??
                                  true
                                }
                                isPreview={true}
                              />
                            </div>
                          )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Navigation Buttons - Bottom Right */}
              <div className="absolute bottom-6 right-6 z-10 flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    setCurrentPreviewPageIndex(
                      Math.max(0, currentPreviewPageIndex - 1),
                    )
                  }
                  disabled={currentPreviewPageIndex === 0}
                  data-testid="button-prev-bottom"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    setCurrentPreviewPageIndex(
                      Math.min(pages.length - 1, currentPreviewPageIndex + 1),
                    )
                  }
                  disabled={currentPreviewPageIndex === pages.length - 1}
                  data-testid="button-next-bottom"
                >
                  Next
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmation !== null}
        onOpenChange={() => setDeleteConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirmation?.isLinked
                ? "Delete Invoice & Pay Pages?"
                : "Delete Page?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmation?.isLinked
                ? "This will delete both the Invoice and Pay pages. This action cannot be undone."
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
