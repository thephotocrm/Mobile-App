import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Plus,
  Zap,
  Clock,
  Mail,
  Smartphone,
  Settings,
  Edit2,
  ArrowRight,
  Calendar,
  Users,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Target,
  CheckCircle2,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw,
  FileText,
  PauseCircle,
  MessageSquare,
  HelpCircle,
  Layers,
  Link2,
  Eye,
  Pencil,
  MoreHorizontal,
  Play,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  insertAutomationSchema,
  automationTypeEnum,
  triggerTypeEnum,
  insertAutomationBusinessTriggerSchema,
} from "@shared/schema";
import { useProjectTypes } from "@/hooks/use-project-types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EmailPreview } from "@/components/email-preview";
import { ButtonRichTextEditor } from "@/components/ButtonRichTextEditor";
import {
  blocksToTemplateBody,
  templateBodyToHtml,
  type ContentBlock,
} from "@/lib/blocks-to-text";
import {
  DelayTimingEditor,
  type DelayTimingValue,
} from "@/components/delay-timing-editor";
import AutomationWizard from "@/components/AutomationWizard";
import BuildAllAutomationsDialog from "@/components/BuildAllAutomationsDialog";

// Create form schema based on insertAutomationSchema but without photographerId (auto-added by backend)
const createAutomationFormSchema = insertAutomationSchema.omit({
  photographerId: true,
});
type CreateAutomationFormData = z.infer<typeof createAutomationFormSchema>;

// Business trigger form schema
const createBusinessTriggerFormSchema =
  insertAutomationBusinessTriggerSchema.omit({ automationId: true });
type CreateBusinessTriggerFormData = z.infer<
  typeof createBusinessTriggerFormSchema
>;

// Template variables available for personalization in emails/SMS
const TEMPLATE_VARIABLES = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "photographer_name", label: "Your Name" },
  { key: "event_date", label: "Event Date" },
] as const;

// Unified timing formatter for automation steps
function formatStepTiming(step: {
  delayDays?: number | null;
  sendAtHour?: number | null;
  sendAtMinute?: number | null;
  delayMinutes: number;
  anchorType?: string | null;
}): string {
  const anchorType = step.anchorType || "STAGE_ENTRY";
  const isBookingRelative =
    anchorType === "BOOKING_START" || anchorType === "BOOKING_END";
  const anchorLabel =
    anchorType === "BOOKING_START"
      ? "booking start"
      : anchorType === "BOOKING_END"
        ? "booking end"
        : "stage entry";

  // Check for negative delays (before booking)
  const delayDays = step.delayDays || 0;
  const delayMinutes = step.delayMinutes || 0;
  const isBeforeBooking = delayDays < 0 || delayMinutes < 0;
  const absDelayDays = Math.abs(delayDays);
  const absDelayMinutes = Math.abs(delayMinutes);

  // Day-based delay with specific send time
  if (
    absDelayDays >= 1 &&
    step.sendAtHour !== null &&
    step.sendAtHour !== undefined
  ) {
    const hour = step.sendAtHour;
    const minute = step.sendAtMinute || 0;
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayMinute = String(minute).padStart(2, "0");
    const dayText = absDelayDays === 1 ? "day" : "days";

    if (isBookingRelative) {
      if (isBeforeBooking) {
        return `${absDelayDays} ${dayText} before ${anchorLabel} at ${displayHour}:${displayMinute} ${period}`;
      }
      return `${absDelayDays} ${dayText} after ${anchorLabel} at ${displayHour}:${displayMinute} ${period}`;
    }
    return `In ${absDelayDays} ${dayText} at ${displayHour}:${displayMinute} ${period}`;
  }

  // Immediate (no delay)
  if (absDelayMinutes === 0 && absDelayDays === 0) {
    if (isBookingRelative) {
      return `At ${anchorLabel}`;
    }
    return "Immediately";
  }

  // Exact delay (minutes-based)
  const totalMinutes = absDelayMinutes;

  if (totalMinutes < 60) {
    if (isBookingRelative) {
      if (isBeforeBooking) {
        return `${totalMinutes} min${totalMinutes !== 1 ? "s" : ""} before ${anchorLabel}`;
      }
      return `${totalMinutes} min${totalMinutes !== 1 ? "s" : ""} after ${anchorLabel}`;
    }
    return `After ${totalMinutes} minute${totalMinutes !== 1 ? "s" : ""}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours < 24) {
    let timeText = `${hours}h`;
    if (mins > 0) {
      timeText += ` ${mins}m`;
    }

    if (isBookingRelative) {
      if (isBeforeBooking) {
        return `${timeText} before ${anchorLabel}`;
      }
      return `${timeText} after ${anchorLabel}`;
    }

    if (mins > 0) {
      return `After ${hours} hour${hours !== 1 ? "s" : ""} ${mins} minute${mins !== 1 ? "s" : ""}`;
    }
    return `After ${hours} hour${hours !== 1 ? "s" : ""}`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  let timeText = `${days} day${days !== 1 ? "s" : ""}`;
  if (remainingHours > 0) {
    timeText += ` ${remainingHours}h`;
  }

  if (isBookingRelative) {
    if (isBeforeBooking) {
      return `${timeText} before ${anchorLabel}`;
    }
    return `${timeText} after ${anchorLabel}`;
  }

  if (remainingHours > 0) {
    return `After ${days} day${days !== 1 ? "s" : ""} ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`;
  }
  return `After ${days} day${days !== 1 ? "s" : ""}`;
}

// AutomationStepManager Component
function AutomationStepManager({
  automation,
  onDelete,
}: {
  automation: any;
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editForm, setEditForm] = useState({
    name: automation.name,
    stageId: automation.stageId || "global",
    channel: automation.channel,
    enabled: automation.enabled,
  });

  // State for editing template content
  const [editingTemplate, setEditingTemplate] = useState<{
    id: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    templateBody: string;
    includeHeader: boolean;
    headerStyle: string;
    includeSignature: boolean;
    signatureStyle: string;
  } | null>(null);
  const [templateEditDialogOpen, setTemplateEditDialogOpen] = useState(false);

  // State for editing email builder content
  const [editingEmailBuilder, setEditingEmailBuilder] = useState<{
    automationId: string;
    subject: string;
    templateBody: string;
    includeHeader: boolean;
    headerStyle: string;
    includeSignature: boolean;
    signatureStyle: string;
  } | null>(null);
  const [emailBuilderEditDialogOpen, setEmailBuilderEditDialogOpen] =
    useState(false);

  // State for editing SMS step content
  const [editingSmsStep, setEditingSmsStep] = useState<{
    stepId: string;
    content: string;
  } | null>(null);
  const [smsEditDialogOpen, setSmsEditDialogOpen] = useState(false);

  // State for editing step timing
  const [editingStepTiming, setEditingStepTiming] = useState<{
    stepId: string;
    delayDays: number;
    delayHours: number;
    delayMinutes: number;
    sendAtHour?: number;
    sendAtMinute?: number;
    anchorType?: "STAGE_ENTRY" | "BOOKING_START" | "BOOKING_END";
  } | null>(null);
  const [timingEditDialogOpen, setTimingEditDialogOpen] = useState(false);

  const { data: steps = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/automations", automation.id, "steps"],
    enabled: !!automation.id,
  });

  // Fetch template details for the automation
  const { data: templates } = useQuery<any[]>({
    queryKey: ["/api/templates"],
    enabled: !!automation.id,
  });

  // Fetch Smart File templates for the automation
  const { data: smartFiles } = useQuery<any[]>({
    queryKey: ["/api/smart-files"],
    enabled: !!automation.id,
  });

  // Delete step mutation
  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      return apiRequest("DELETE", `/api/automation-steps/${stepId}`);
    },
    onSuccess: () => {
      toast({ title: "Step deleted successfully" });
      queryClient.invalidateQueries({
        queryKey: ["/api/automations", automation.id, "steps"],
      });
    },
    onError: () => {
      toast({ title: "Failed to delete step", variant: "destructive" });
    },
  });

  const handleDeleteStep = (stepId: string) => {
    if (confirm("Are you sure you want to delete this step?")) {
      deleteStepMutation.mutate(stepId);
    }
  };

  // Toggle automation mutation
  const toggleAutomationMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return apiRequest("PATCH", `/api/automations/${automation.id}`, {
        enabled,
      });
    },
    onSuccess: () => {
      toast({ title: "Automation updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
    },
    onError: () => {
      toast({ title: "Failed to update automation", variant: "destructive" });
    },
  });

  // Toggle step mutation
  const toggleStepMutation = useMutation({
    mutationFn: async ({
      stepId,
      enabled,
    }: {
      stepId: string;
      enabled: boolean;
    }) => {
      return apiRequest("PATCH", `/api/automation-steps/${stepId}`, {
        enabled,
      });
    },
    onSuccess: () => {
      toast({ title: "Step updated successfully" });
      queryClient.invalidateQueries({
        queryKey: ["/api/automations", automation.id, "steps"],
      });
    },
    onError: () => {
      toast({ title: "Failed to update step", variant: "destructive" });
    },
  });

  // Update automation mutation
  const updateAutomationMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const stageId =
        updatedData.stageId && updatedData.stageId !== "global"
          ? updatedData.stageId
          : null;
      return apiRequest("PUT", `/api/automations/${automation.id}`, {
        ...updatedData,
        stageId,
      });
    },
    onSuccess: () => {
      toast({ title: "Automation updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to update automation", variant: "destructive" });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (templateData: {
      id: string;
      subject?: string;
      htmlBody?: string;
      textBody?: string;
      templateBody?: string;
      includeHeader?: boolean;
      headerStyle?: string;
      includeSignature?: boolean;
      signatureStyle?: string;
    }) => {
      // Generate HTML from templateBody
      const htmlBody = templateData.templateBody
        ? templateBodyToHtml(templateData.templateBody)
        : templateData.htmlBody;
      return apiRequest("PUT", `/api/templates/${templateData.id}`, {
        subject: templateData.subject,
        htmlBody,
        textBody: templateData.templateBody || templateData.textBody,
        templateBody: templateData.templateBody,
        includeHeader: templateData.includeHeader,
        headerStyle: templateData.headerStyle,
        includeSignature: templateData.includeSignature,
        signatureStyle: templateData.signatureStyle,
      });
    },
    onSuccess: () => {
      toast({ title: "Email template updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/automations", automation.id, "steps"],
      });
      setEditingTemplate(null);
      setTemplateEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Failed to update email template",
        variant: "destructive",
      });
    },
  });

  // Update email builder mutation
  const updateEmailBuilderMutation = useMutation({
    mutationFn: async (builderData: {
      automationId: string;
      subject: string;
      templateBody: string;
      includeHeader: boolean;
      headerStyle: string;
      includeSignature: boolean;
      signatureStyle: string;
    }) => {
      // Generate HTML from templateBody
      const htmlBody = templateBodyToHtml(builderData.templateBody);
      return apiRequest("PUT", `/api/automations/${builderData.automationId}`, {
        emailSubject: builderData.subject,
        htmlBody,
        templateBody: builderData.templateBody,
        includeHeader: builderData.includeHeader,
        headerStyle: builderData.headerStyle,
        includeSignature: builderData.includeSignature,
        signatureStyle: builderData.signatureStyle,
      });
    },
    onSuccess: () => {
      toast({ title: "Email builder message updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setEditingEmailBuilder(null);
      setEmailBuilderEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Failed to update email builder message",
        variant: "destructive",
      });
    },
  });

  // Update SMS step mutation
  const updateSmsStepMutation = useMutation({
    mutationFn: async (smsData: { stepId: string; content: string }) => {
      return apiRequest("PATCH", `/api/automation-steps/${smsData.stepId}`, {
        customSmsContent: smsData.content,
      });
    },
    onSuccess: () => {
      toast({ title: "SMS message updated successfully" });
      queryClient.invalidateQueries({
        queryKey: ["/api/automations", automation.id, "steps"],
      });
      setEditingSmsStep(null);
      setSmsEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to update SMS message", variant: "destructive" });
    },
  });

  // Update step timing mutation
  const updateStepTimingMutation = useMutation({
    mutationFn: async (timingData: DelayTimingValue & { stepId: string }) => {
      // Calculate total delayMinutes for exact delays
      // For day-based delays (|delayDays| >= 1), delayMinutes should be 0
      // For booking-relative timing, negative values indicate "before" the event
      const absDays = Math.abs(timingData.delayDays);
      const totalMinutes =
        absDays >= 1 ? 0 : timingData.delayHours * 60 + timingData.delayMinutes;

      return apiRequest("PATCH", `/api/automation-steps/${timingData.stepId}`, {
        delayDays: timingData.delayDays,
        delayMinutes: totalMinutes,
        sendAtHour: timingData.sendAtHour,
        sendAtMinute: timingData.sendAtMinute,
        anchorType: timingData.anchorType || "STAGE_ENTRY",
      });
    },
    onSuccess: () => {
      toast({ title: "Step timing updated successfully" });
      queryClient.invalidateQueries({
        queryKey: ["/api/automations", automation.id, "steps"],
      });
      setEditingStepTiming(null);
      setTimingEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to update step timing", variant: "destructive" });
    },
  });

  const handleToggleAutomation = (enabled: boolean) => {
    toggleAutomationMutation.mutate(enabled);
  };

  const handleToggleStep = (stepId: string, enabled: boolean) => {
    toggleStepMutation.mutate({ stepId, enabled });
  };

  const handleSaveEdit = () => {
    updateAutomationMutation.mutate(editForm);
  };

  const handleCancelEdit = () => {
    setEditForm({
      name: automation.name,
      stageId: automation.stageId || "global",
      channel: automation.channel,
      enabled: automation.enabled,
    });
    setEditDialogOpen(false);
  };

  return (
    <div className="group bg-white dark:bg-gray-800/80 rounded-xl shadow-sm hover:shadow-md border border-gray-200/80 dark:border-gray-700/50 overflow-hidden min-w-[350px] max-w-[400px] mx-auto transition-all duration-200 hover:-translate-y-0.5">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-700 px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex-1 truncate pr-2">
          {automation.name}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 h-8 px-3"
            data-testid={`button-edit-automation-${automation.id}`}
            onClick={() => setEditDialogOpen(true)}
          >
            Edit
          </Button>
          <Switch
            checked={automation.enabled}
            disabled={toggleAutomationMutation.isPending}
            data-testid={`switch-automation-${automation.id}`}
            onCheckedChange={handleToggleAutomation}
          />
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            {/* Type Badge: Immediate, Time-Based, or Trigger-Based */}
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              Trigger:
            </span>
            {automation.automationType === "COUNTDOWN" ? (
              // Countdown automation (date-based)
              <Badge className="bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 border-0 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <Clock className="w-3 h-3 mr-1" />
                {automation.daysBefore} day
                {automation.daysBefore !== 1 ? "s" : ""}{" "}
                {automation.triggerTiming === "AFTER" ? "after" : "before"}{" "}
                event
              </Badge>
            ) : (automation.businessTriggers &&
                automation.businessTriggers.length > 0) ||
              automation.triggerType ? (
              // Trigger-based automation (check businessTriggers first, fallback to triggerType)
              <Badge className="bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border-0 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <Target className="w-3 h-3 mr-1" />
                {(
                  automation.businessTriggers?.[0]?.triggerType ||
                  automation.triggerType ||
                  ""
                )
                  .replace(/_/g, " ")
                  .toLowerCase()
                  .replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </Badge>
            ) : steps.length > 0 &&
              (steps[0].delayMinutes > 0 ||
                (steps[0].delayDays && steps[0].delayDays >= 1)) ? (
              // Time-based automation (has delay)
              <Badge className="bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 border-0 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <Clock className="w-3 h-3 mr-1" />
                {formatStepTiming(steps[0])}
              </Badge>
            ) : steps.length > 0 &&
              steps[0].delayMinutes === 0 &&
              !steps[0].delayDays ? (
              // Immediate automation (delay is 0)
              <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-0 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <Zap className="w-3 h-3 mr-1" />
                Immediately
              </Badge>
            ) : null}
          </div>

          {/* Action badges */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              Action:
            </span>
            {automation.automationType === "COUNTDOWN" &&
            automation.useEmailBuilder ? (
              <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-0 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <Mail className="w-3 h-3 mr-1" />
                Email
              </Badge>
            ) : null}
            {automation.automationType === "COUNTDOWN" &&
            steps.length > 0 &&
            steps[0].actionType === "SMS" ? (
              <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border-0 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <Smartphone className="w-3 h-3 mr-1" />
                SMS
              </Badge>
            ) : null}
            {/* Check channel OR step action type for EMAIL */}
            {(automation.channel === "EMAIL" ||
              (steps.length > 0 && steps[0].actionType === "EMAIL")) &&
              automation.automationType !== "COUNTDOWN" && (
                <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-0 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  <Mail className="w-3 h-3 mr-1" />
                  Email
                </Badge>
              )}
            {/* Check channel OR step action type for SMS */}
            {(automation.channel === "SMS" ||
              (steps.length > 0 && steps[0].actionType === "SMS")) &&
              automation.automationType !== "COUNTDOWN" && (
                <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border-0 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  <Smartphone className="w-3 h-3 mr-1" />
                  SMS
                </Badge>
              )}
          </div>
        </div>

        {/* View Details button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors pt-1"
          data-testid={`button-expand-automation-${automation.id}`}
        >
          <span className="font-medium">View Details</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Details Section */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          {/* Description */}
          {automation.description && (
            <div className="bg-muted/30 border border-border/50 rounded-md p-3">
              <p className="text-sm text-foreground/90 leading-relaxed">
                {automation.description}
              </p>
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading steps...</p>
          ) : automation.useEmailBuilder && automation.templateBody ? (
            // Show templateBody content for automations using email builder (new pattern)
            <div className="bg-muted/50 border rounded-md p-3 text-sm">
              <p className="font-semibold mb-2">Email Message:</p>
              {automation.emailSubject && (
                <p className="font-medium mb-2 text-muted-foreground">
                  Subject: {automation.emailSubject}
                </p>
              )}
              <div className="text-muted-foreground whitespace-pre-wrap">
                {automation.templateBody
                  .split("\n")
                  .map((line: string, idx: number) => {
                    // Render button markers as styled buttons
                    if (line.match(/\[\[BUTTON:/)) {
                      const match = line.match(
                        /\[\[BUTTON:([^:]+):([^\]]+)\]\]/,
                      );
                      if (match) {
                        return (
                          <p
                            key={idx}
                            className="text-blue-600 dark:text-blue-400 my-1"
                          >
                            🔘 Button: {match[2]}
                          </p>
                        );
                      }
                    }
                    return (
                      <span key={idx}>
                        {line}
                        {idx < automation.templateBody.split("\n").length - 1
                          ? "\n"
                          : ""}
                      </span>
                    );
                  })}
              </div>
            </div>
          ) : automation.useEmailBuilder &&
            automation.emailBlocks &&
            Array.isArray(automation.emailBlocks) &&
            automation.emailBlocks.length > 0 ? (
            // Legacy: Show emailBlocks content for older automations
            <div className="bg-muted/50 border rounded-md p-3 text-sm">
              <p className="font-semibold mb-2">Email Message:</p>
              {automation.emailSubject && (
                <p className="font-medium mb-2 text-muted-foreground">
                  Subject: {automation.emailSubject}
                </p>
              )}
              <div className="text-muted-foreground space-y-2">
                {automation.emailBlocks.map((block: any, idx: number) => {
                  if (block.type === "HEADING") {
                    return (
                      <p key={idx} className="font-bold text-base">
                        {block.content}
                      </p>
                    );
                  } else if (block.type === "TEXT") {
                    const textContent =
                      typeof block.content === "object"
                        ? block.content.text
                        : block.content;
                    return (
                      <p key={idx} className="whitespace-pre-wrap">
                        {textContent}
                      </p>
                    );
                  } else if (block.type === "BUTTON") {
                    const buttonText =
                      typeof block.content === "object"
                        ? block.content.text
                        : block.content;
                    return (
                      <p key={idx} className="text-blue-600 dark:text-blue-400">
                        🔘 Button: {buttonText}
                      </p>
                    );
                  } else if (block.type === "SPACER") {
                    return <div key={idx} className="h-4" />;
                  } else if (block.type === "HEADER") {
                    return (
                      <p key={idx} className="text-sm text-muted-foreground">
                        📧 Header: {block.style}
                      </p>
                    );
                  } else if (block.type === "SIGNATURE") {
                    return (
                      <p key={idx} className="text-sm text-muted-foreground">
                        ✍️ Signature: {block.style}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ) : steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No steps configured</p>
          ) : (
            steps.map((step: any, index: number) => {
              const template = templates?.find((t) => t.id === step.templateId);
              const smartFile = smartFiles?.find(
                (sf) => sf.id === step.smartFileTemplateId,
              );
              const isSmartFile =
                step.actionType === "SMART_FILE" ||
                automation.channel === "SMART_FILE";

              return (
                <div key={step.id}>
                  {/* Smart File Preview */}
                  {smartFile && isSmartFile && (
                    <div className="bg-muted/50 border rounded-md p-3 text-sm">
                      <p className="font-semibold mb-2">
                        📄 Smart File: {smartFile.name}
                      </p>
                      <p className="text-muted-foreground">
                        Will send a smart file template to the client
                      </p>
                    </div>
                  )}

                  {/* Email Builder Content (for EMAIL steps with no template) - new templateBody pattern */}
                  {!template &&
                    !isSmartFile &&
                    step.actionType === "EMAIL" &&
                    automation.useEmailBuilder &&
                    automation.templateBody && (
                      <div className="bg-muted/50 border rounded-md p-3 text-sm">
                        <p className="font-semibold mb-2">Email Message:</p>
                        {automation.emailSubject && (
                          <p className="font-medium mb-2 text-muted-foreground">
                            Subject: {automation.emailSubject}
                          </p>
                        )}
                        <div className="text-muted-foreground whitespace-pre-wrap">
                          {automation.templateBody
                            .split("\n")
                            .map((line: string, idx: number) => {
                              if (line.match(/\[\[BUTTON:/)) {
                                const match = line.match(
                                  /\[\[BUTTON:([^:]+):([^\]]+)\]\]/,
                                );
                                if (match) {
                                  return (
                                    <p
                                      key={idx}
                                      className="text-blue-600 dark:text-blue-400 my-1"
                                    >
                                      🔘 Button: {match[2]}
                                    </p>
                                  );
                                }
                              }
                              return (
                                <span key={idx}>
                                  {line}
                                  {idx <
                                  automation.templateBody.split("\n").length - 1
                                    ? "\n"
                                    : ""}
                                </span>
                              );
                            })}
                        </div>
                      </div>
                    )}

                  {/* Legacy: Email Builder Content with emailBlocks */}
                  {!template &&
                    !isSmartFile &&
                    step.actionType === "EMAIL" &&
                    automation.useEmailBuilder &&
                    !automation.templateBody &&
                    automation.emailBlocks && (
                      <div className="bg-muted/50 border rounded-md p-3 text-sm">
                        <p className="font-semibold mb-2">Email Message:</p>
                        {automation.emailSubject && (
                          <p className="font-medium mb-2 text-muted-foreground">
                            Subject: {automation.emailSubject}
                          </p>
                        )}
                        <div className="text-muted-foreground space-y-2">
                          {automation.emailBlocks.map(
                            (block: any, idx: number) => {
                              if (block.type === "HEADING") {
                                return (
                                  <p key={idx} className="font-bold text-base">
                                    {block.content}
                                  </p>
                                );
                              } else if (block.type === "TEXT") {
                                const textContent =
                                  typeof block.content === "object"
                                    ? block.content.text
                                    : block.content;
                                return (
                                  <p key={idx} className="whitespace-pre-wrap">
                                    {textContent}
                                  </p>
                                );
                              } else if (block.type === "BUTTON") {
                                const buttonText =
                                  typeof block.content === "object"
                                    ? block.content.text
                                    : block.content;
                                return (
                                  <p
                                    key={idx}
                                    className="text-blue-600 dark:text-blue-400"
                                  >
                                    🔘 Button: {buttonText}
                                  </p>
                                );
                              } else if (block.type === "SPACER") {
                                return <div key={idx} className="h-4" />;
                              } else if (block.type === "HEADER") {
                                return (
                                  <p
                                    key={idx}
                                    className="text-sm text-muted-foreground"
                                  >
                                    📧 Header: {block.style}
                                  </p>
                                );
                              } else if (block.type === "SIGNATURE") {
                                return (
                                  <p
                                    key={idx}
                                    className="text-sm text-muted-foreground"
                                  >
                                    ✍️ Signature: {block.style}
                                  </p>
                                );
                              }
                              return null;
                            },
                          )}
                        </div>
                      </div>
                    )}

                  {/* Template-based Message Preview */}
                  {template && !isSmartFile && (
                    <div className="bg-muted/50 border rounded-md p-3 text-sm">
                      <p className="font-semibold mb-2">
                        {automation.channel === "EMAIL"
                          ? "Email Message:"
                          : "Text Message:"}
                      </p>
                      {template.subject && automation.channel === "EMAIL" && (
                        <p className="font-medium mb-2 text-muted-foreground">
                          Subject: {template.subject}
                        </p>
                      )}
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {template.textBody || "No message content"}
                      </p>
                    </div>
                  )}

                  {/* Custom SMS Content */}
                  {!template && !isSmartFile && step.actionType === "SMS" && (
                    <div className="bg-muted/50 border rounded-md p-3 text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">Text Message:</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingSmsStep({
                              stepId: step.id,
                              content: step.customSmsContent || "",
                            });
                            setSmsEditDialogOpen(true);
                          }}
                          className="h-6 w-6 p-0"
                          data-testid={`button-edit-sms-${step.id}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                      {step.customSmsContent ? (
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {step.customSmsContent}
                        </p>
                      ) : (
                        <p className="text-muted-foreground/60 italic text-xs">
                          No message set - click edit to add message content
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Edit Automation Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Communication Automation</DialogTitle>
            <DialogDescription>
              Modify the automation settings. The automation type, trigger, and
              communication steps cannot be changed after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Settings */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Automation Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="Enter automation name"
                data-testid={`input-edit-name-${automation.id}`}
              />
            </div>

            {/* Automation Configuration Overview */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-primary" />
                <Label className="font-medium">Automation Configuration</Label>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Type:</span>
                  <Badge
                    variant="outline"
                    className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                  >
                    Communication
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Channel:</span>
                  <Badge
                    variant="outline"
                    className={
                      automation.channel === "EMAIL"
                        ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                        : "bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
                    }
                  >
                    {automation.channel === "EMAIL" ? "📧 Email" : "📱 SMS"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Trigger:</span>
                  <span className="text-muted-foreground">
                    {automation.stageId
                      ? `When entering ${automation.stage?.name || "stage"}`
                      : "Global automation"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Steps:</span>
                  <Badge variant="secondary">{steps.length}</Badge>
                </div>
              </div>
            </div>

            {/* Communication Steps Timeline */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Message Steps Timeline
              </Label>
              <div className="border rounded-lg p-3 bg-background max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Loading steps...
                    </p>
                  </div>
                ) : steps.length > 0 ? (
                  <div className="space-y-3">
                    {steps.map((step: any, index: number) => {
                      const template = templates?.find(
                        (t) => t.id === step.templateId,
                      );
                      const smartFile = smartFiles?.find(
                        (sf) => sf.id === step.smartFileTemplateId,
                      );
                      const isSmartFile =
                        step.actionType === "SMART_FILE" ||
                        automation.channel === "SMART_FILE";

                      return (
                        <div
                          key={step.id}
                          className="relative pl-6 pb-3 border-l-2 border-primary/30 last:border-0"
                        >
                          {/* Step Number Badge */}
                          <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>

                          <div className="space-y-1.5">
                            {/* Timing */}
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatStepTiming(step)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  →
                                </span>
                                <span className="text-xs font-medium">
                                  {isSmartFile
                                    ? "📄 Send Smart File"
                                    : automation.channel === "EMAIL"
                                      ? "📧 Send Email"
                                      : "📱 Send SMS"}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Convert step data to DelayTimingValue format
                                  const totalMinutes = step.delayMinutes || 0;
                                  const hours = Math.floor(
                                    Math.abs(totalMinutes) / 60,
                                  );
                                  const minutes = Math.abs(totalMinutes) % 60;

                                  setEditingStepTiming({
                                    stepId: step.id,
                                    delayDays: step.delayDays || 0,
                                    delayHours:
                                      Math.abs(step.delayDays || 0) >= 1
                                        ? 0
                                        : totalMinutes < 0
                                          ? -hours
                                          : hours,
                                    delayMinutes:
                                      Math.abs(step.delayDays || 0) >= 1
                                        ? 0
                                        : totalMinutes < 0
                                          ? -minutes
                                          : minutes,
                                    sendAtHour: step.sendAtHour,
                                    sendAtMinute: step.sendAtMinute,
                                    anchorType:
                                      step.anchorType || "STAGE_ENTRY",
                                  });
                                  setTimingEditDialogOpen(true);
                                }}
                                className="h-7 text-xs"
                                data-testid={`button-edit-timing-${step.id}`}
                              >
                                Edit Timing
                              </Button>
                            </div>

                            {/* Smart File Template Selector */}
                            {isSmartFile &&
                              smartFiles &&
                              smartFiles.length > 0 && (
                                <div className="space-y-2">
                                  <Label className="text-xs">
                                    Smart File Template
                                  </Label>
                                  <Select
                                    value={step.smartFileTemplateId || ""}
                                    onValueChange={(value) => {
                                      // Update the step with new Smart File template
                                      apiRequest(
                                        "PATCH",
                                        `/api/automation-steps/${step.id}`,
                                        {
                                          smartFileTemplateId: value,
                                        },
                                      )
                                        .then(() => {
                                          toast({
                                            title:
                                              "Smart File template updated",
                                          });
                                          queryClient.invalidateQueries({
                                            queryKey: [
                                              "/api/automations",
                                              automation.id,
                                              "steps",
                                            ],
                                          });
                                        })
                                        .catch(() => {
                                          toast({
                                            title: "Failed to update template",
                                            variant: "destructive",
                                          });
                                        });
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Select Smart File template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {smartFiles.map((sf: any) => (
                                        <SelectItem
                                          key={sf.id}
                                          value={sf.id}
                                          className="text-xs"
                                        >
                                          {sf.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {smartFile && (
                                    <p className="text-xs text-muted-foreground">
                                      Currently selected: {smartFile.name}
                                    </p>
                                  )}
                                </div>
                              )}

                            {/* Template Info or Custom Message or Email Builder Content */}
                            {template && !isSmartFile ? (
                              // VIEW MODE - Show with edit button
                              <div className="bg-muted/50 rounded-md p-2 text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium">{template.name}</p>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      // Get templateBody - prefer existing templateBody, then convert blocks, then use textBody
                                      let body = template.templateBody || "";
                                      if (
                                        !body &&
                                        template.contentBlocks &&
                                        Array.isArray(template.contentBlocks)
                                      ) {
                                        body = blocksToTemplateBody(
                                          template.contentBlocks as ContentBlock[],
                                        );
                                      }
                                      if (!body && template.textBody) {
                                        body = template.textBody;
                                      }

                                      setEditingTemplate({
                                        id: template.id,
                                        subject: template.subject || "",
                                        htmlBody: template.htmlBody || "",
                                        textBody: template.textBody || "",
                                        templateBody: body,
                                        includeHeader:
                                          template.includeHeader ?? false,
                                        headerStyle:
                                          template.headerStyle ||
                                          "professional",
                                        includeSignature:
                                          template.includeSignature ?? true,
                                        signatureStyle:
                                          template.signatureStyle ||
                                          "professional",
                                      });
                                      setTemplateEditDialogOpen(true);
                                    }}
                                    className="h-6 w-6 p-0"
                                    data-testid={`button-edit-template-${template.id}`}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                {template.subject && (
                                  <p className="text-muted-foreground">
                                    <span className="font-medium">
                                      Subject:
                                    </span>{" "}
                                    {template.subject}
                                  </p>
                                )}
                                <p className="text-muted-foreground line-clamp-2">
                                  {template.textBody || "No message content"}
                                </p>
                              </div>
                            ) : automation.useEmailBuilder &&
                              (automation.templateBody ||
                                automation.emailBlocks) &&
                              !isSmartFile ? (
                              // Email Builder Content (supports both templateBody and legacy emailBlocks)
                              <div className="bg-muted/50 rounded-md p-2 text-xs space-y-1">
                                <div className="flex items-start justify-between">
                                  <p className="font-medium text-primary">
                                    Email Builder Message
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      // Get templateBody - prefer existing templateBody, then convert emailBlocks
                                      let body = automation.templateBody || "";
                                      if (
                                        !body &&
                                        automation.emailBlocks &&
                                        Array.isArray(automation.emailBlocks)
                                      ) {
                                        body = blocksToTemplateBody(
                                          automation.emailBlocks as ContentBlock[],
                                        );
                                      }

                                      setEditingEmailBuilder({
                                        automationId: automation.id,
                                        subject: automation.emailSubject || "",
                                        templateBody: body,
                                        includeHeader:
                                          automation.includeHeader ?? false,
                                        headerStyle:
                                          automation.headerStyle ||
                                          "professional",
                                        includeSignature:
                                          automation.includeSignature ?? true,
                                        signatureStyle:
                                          automation.signatureStyle ||
                                          "professional",
                                      });
                                      setEmailBuilderEditDialogOpen(true);
                                    }}
                                    className="h-6 w-6 p-0"
                                    data-testid={`button-edit-email-builder-${automation.id}`}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                {automation.emailSubject && (
                                  <p className="text-muted-foreground">
                                    <span className="font-medium">
                                      Subject:
                                    </span>{" "}
                                    {automation.emailSubject}
                                  </p>
                                )}
                                {automation.templateBody ? (
                                  // New templateBody pattern
                                  <div className="text-muted-foreground">
                                    <p className="line-clamp-3 text-xs whitespace-pre-wrap">
                                      {automation.templateBody
                                        .replace(
                                          /\[\[BUTTON:[^\]]+\]\]/g,
                                          "[Button]",
                                        )
                                        .substring(0, 150)}
                                      {automation.templateBody.length > 150 &&
                                        "..."}
                                    </p>
                                  </div>
                                ) : automation.emailBlocks ? (
                                  // Legacy emailBlocks pattern
                                  <div className="text-muted-foreground space-y-1">
                                    {automation.emailBlocks
                                      .slice(0, 3)
                                      .map((block: any, idx: number) => {
                                        if (block.type === "TEXT") {
                                          const textContent =
                                            typeof block.content === "object"
                                              ? block.content.text
                                              : block.content;
                                          return (
                                            <p
                                              key={idx}
                                              className="line-clamp-2 text-xs"
                                            >
                                              {textContent}
                                            </p>
                                          );
                                        } else if (block.type === "HEADER") {
                                          return (
                                            <p key={idx} className="text-xs">
                                              📧 Header: {block.style}
                                            </p>
                                          );
                                        } else if (block.type === "SIGNATURE") {
                                          return (
                                            <p key={idx} className="text-xs">
                                              ✍️ Signature: {block.style}
                                            </p>
                                          );
                                        }
                                        return null;
                                      })}
                                    {automation.emailBlocks.length > 3 && (
                                      <p className="text-xs text-muted-foreground italic">
                                        +{automation.emailBlocks.length - 3}{" "}
                                        more blocks...
                                      </p>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            ) : step.actionType === "SMS" &&
                              !isSmartFile &&
                              !template ? (
                              <div className="bg-muted/50 rounded-md p-2 text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-primary">
                                    SMS Message
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingSmsStep({
                                        stepId: step.id,
                                        content: step.customSmsContent || "",
                                      });
                                      setSmsEditDialogOpen(true);
                                    }}
                                    className="h-6 w-6 p-0"
                                    data-testid={`button-edit-sms-${step.id}`}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                {step.customSmsContent ? (
                                  <p className="text-muted-foreground line-clamp-3">
                                    {step.customSmsContent}
                                  </p>
                                ) : (
                                  <p className="text-muted-foreground/60 italic">
                                    No message set - click edit to add content
                                  </p>
                                )}
                              </div>
                            ) : !isSmartFile &&
                              !template &&
                              !automation.useEmailBuilder &&
                              step.actionType !== "SMS" ? (
                              <p className="text-xs text-muted-foreground italic">
                                No message configured
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No message steps configured
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {steps.some(
                  (s: any) =>
                    s.actionType === "SMART_FILE" ||
                    automation.channel === "SMART_FILE",
                )
                  ? "Smart File templates can be changed directly above. To modify other settings, delete this automation and create a new one."
                  : "To modify steps, delete this automation and create a new one with the desired configuration."}
              </p>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-background">
              <Switch
                checked={editForm.enabled}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, enabled: checked })
                }
                data-testid={`switch-edit-enabled-${automation.id}`}
              />
              <div className="flex-1">
                <Label className="cursor-pointer">Enable automation</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, this automation will run automatically
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="destructive"
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to delete this automation? This cannot be undone.",
                  )
                ) {
                  onDelete(automation.id);
                  setEditDialogOpen(false);
                }
              }}
              disabled={updateAutomationMutation.isPending}
              data-testid={`button-delete-automation-${automation.id}`}
            >
              Delete
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={updateAutomationMutation.isPending}
                data-testid={`button-cancel-edit-${automation.id}`}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={
                  updateAutomationMutation.isPending || !editForm.name.trim()
                }
                data-testid={`button-save-edit-${automation.id}`}
              >
                {updateAutomationMutation.isPending
                  ? "Saving..."
                  : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Template Edit Dialog */}
      <Dialog
        open={templateEditDialogOpen}
        onOpenChange={setTemplateEditDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
            <DialogDescription>
              Use the visual email builder to customize your automation email
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              {/* Subject Line */}
              <div className="space-y-2">
                <Label htmlFor="template-subject">Email Subject</Label>
                <Input
                  id="template-subject"
                  value={editingTemplate.subject}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      subject: e.target.value,
                    })
                  }
                  placeholder="Email subject line..."
                  data-testid="input-template-subject-edit"
                />
              </div>

              {/* Email Builder and Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Email Content</Label>
                  {/* Variable insertion chips */}
                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Insert Variables:
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPLATE_VARIABLES.map((variable) => (
                        <Button
                          key={variable.key}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => {
                            setEditingTemplate({
                              ...editingTemplate,
                              templateBody:
                                editingTemplate.templateBody +
                                `{{${variable.key}}}`,
                            });
                          }}
                        >
                          {variable.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <ButtonRichTextEditor
                    value={editingTemplate.templateBody}
                    onChange={(value) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        templateBody: value,
                      })
                    }
                    placeholder="Hi {{first_name}},\n\nWrite your email content here..."
                    minHeight="200px"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Preview</Label>
                  <EmailPreview
                    subject={editingTemplate.subject}
                    templateBody={editingTemplate.templateBody}
                    includeHeader={editingTemplate.includeHeader}
                    headerStyle={editingTemplate.headerStyle}
                    includeSignature={editingTemplate.includeSignature}
                    signatureStyle={editingTemplate.signatureStyle}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingTemplate(null);
                    setTemplateEditDialogOpen(false);
                  }}
                  disabled={updateTemplateMutation.isPending}
                  data-testid="button-cancel-template-edit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateTemplateMutation.mutate(editingTemplate)}
                  disabled={updateTemplateMutation.isPending}
                  data-testid="button-save-template-edit"
                >
                  {updateTemplateMutation.isPending
                    ? "Saving..."
                    : "Save Template"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Builder Edit Dialog */}
      <Dialog
        open={emailBuilderEditDialogOpen}
        onOpenChange={setEmailBuilderEditDialogOpen}
      >
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Email Builder Message</DialogTitle>
            <DialogDescription>
              Use the visual email builder to customize your automation email
            </DialogDescription>
          </DialogHeader>
          {editingEmailBuilder && (
            <div className="space-y-4">
              {/* Subject Line */}
              <div className="space-y-2">
                <Label htmlFor="email-builder-subject">Email Subject</Label>
                <Input
                  id="email-builder-subject"
                  value={editingEmailBuilder.subject}
                  onChange={(e) =>
                    setEditingEmailBuilder({
                      ...editingEmailBuilder,
                      subject: e.target.value,
                    })
                  }
                  placeholder="Email subject line..."
                  data-testid="input-email-builder-subject-edit"
                />
              </div>

              {/* Email Builder and Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Email Content</Label>
                  {/* Variable insertion chips */}
                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Insert Variables:
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPLATE_VARIABLES.map((variable) => (
                        <Button
                          key={variable.key}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => {
                            setEditingEmailBuilder({
                              ...editingEmailBuilder,
                              templateBody:
                                editingEmailBuilder.templateBody +
                                `{{${variable.key}}}`,
                            });
                          }}
                        >
                          {variable.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <ButtonRichTextEditor
                    value={editingEmailBuilder.templateBody}
                    onChange={(value) =>
                      setEditingEmailBuilder({
                        ...editingEmailBuilder,
                        templateBody: value,
                      })
                    }
                    placeholder="Hi {{first_name}},\n\nWrite your email content here..."
                    minHeight="200px"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Preview</Label>
                  <EmailPreview
                    subject={editingEmailBuilder.subject}
                    templateBody={editingEmailBuilder.templateBody}
                    includeHeader={editingEmailBuilder.includeHeader}
                    headerStyle={editingEmailBuilder.headerStyle}
                    includeSignature={editingEmailBuilder.includeSignature}
                    signatureStyle={editingEmailBuilder.signatureStyle}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingEmailBuilder(null);
                    setEmailBuilderEditDialogOpen(false);
                  }}
                  disabled={updateEmailBuilderMutation.isPending}
                  data-testid="button-cancel-email-builder-edit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    updateEmailBuilderMutation.mutate(editingEmailBuilder)
                  }
                  disabled={updateEmailBuilderMutation.isPending}
                  data-testid="button-save-email-builder-edit"
                >
                  {updateEmailBuilderMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SMS Edit Dialog */}
      <Dialog open={smsEditDialogOpen} onOpenChange={setSmsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit SMS Message</DialogTitle>
            <DialogDescription>
              Update the text message content for this automation
            </DialogDescription>
          </DialogHeader>
          {editingSmsStep && (
            <div className="space-y-4">
              {/* SMS Content Textarea */}
              <div className="space-y-2">
                <Label htmlFor="sms-content">Message Content</Label>
                <Textarea
                  id="sms-content"
                  value={editingSmsStep.content}
                  onChange={(e) =>
                    setEditingSmsStep({
                      ...editingSmsStep,
                      content: e.target.value,
                    })
                  }
                  placeholder="Enter your SMS message..."
                  rows={8}
                  className="resize-none"
                  data-testid="textarea-sms-content-edit"
                />
                <p className="text-xs text-muted-foreground">
                  You can use variables like {`{{first_name}}`},{" "}
                  {`{{event_date}}`}, {`{{scheduler_link}}`}, etc.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingSmsStep(null);
                    setSmsEditDialogOpen(false);
                  }}
                  disabled={updateSmsStepMutation.isPending}
                  data-testid="button-cancel-sms-edit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateSmsStepMutation.mutate(editingSmsStep)}
                  disabled={updateSmsStepMutation.isPending}
                  data-testid="button-save-sms-edit"
                >
                  {updateSmsStepMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Step Timing Edit Dialog */}
      <Dialog
        open={timingEditDialogOpen}
        onOpenChange={setTimingEditDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Step Timing</DialogTitle>
            <DialogDescription>
              Adjust when this automation step should send
            </DialogDescription>
          </DialogHeader>
          {editingStepTiming && (
            <div className="space-y-4">
              <DelayTimingEditor
                value={{
                  delayDays: editingStepTiming.delayDays,
                  delayHours: editingStepTiming.delayHours,
                  delayMinutes: editingStepTiming.delayMinutes,
                  sendAtHour: editingStepTiming.sendAtHour,
                  sendAtMinute: editingStepTiming.sendAtMinute,
                  anchorType: editingStepTiming.anchorType,
                }}
                onChange={(newValue) => {
                  setEditingStepTiming({
                    ...editingStepTiming,
                    ...newValue,
                  });
                }}
                allowImmediate={true}
                disabled={updateStepTimingMutation.isPending}
                showAnchorType={true}
              />

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingStepTiming(null);
                    setTimingEditDialogOpen(false);
                  }}
                  disabled={updateStepTimingMutation.isPending}
                  data-testid="button-cancel-timing-edit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    updateStepTimingMutation.mutate(editingStepTiming)
                  }
                  disabled={updateStepTimingMutation.isPending}
                  data-testid="button-save-timing-edit"
                >
                  {updateStepTimingMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// BoardAutomationCard Component - NovaBoard style clean white cards
function BoardAutomationCard({
  automation,
  onEdit,
  onToggle,
  isPipelineMove = false,
  targetStageName,
  targetStageColor,
}: {
  automation: any;
  onEdit: () => void;
  onToggle?: (id: string, enabled: boolean) => void;
  isPipelineMove?: boolean;
  targetStageName?: string;
  targetStageColor?: string;
}) {
  // Get timing category for badge color
  const getTimingCategory = () => {
    if (isPipelineMove) return "pipeline";
    if (automation.businessTriggers?.length > 0 || automation.triggerType)
      return "trigger";
    if (automation.automationType === "COUNTDOWN") return "countdown";
    const delay = automation.steps?.[0]?.delayMinutes || 0;
    if (delay === 0) return "immediate";
    return "delayed";
  };

  const timingCategory = getTimingCategory();

  // Trigger badge colors - muted to not compete with title
  const badgeColors = {
    immediate: "text-emerald-500/70",
    delayed: "text-sky-500/70",
    trigger: "text-violet-500/70",
    countdown: "text-orange-500/70",
    pipeline: "text-indigo-400/80",
  };

  // Determine timing/trigger line text
  const getTimingLine = () => {
    // Trigger labels for display
    const triggerLabels: Record<string, string> = {
      APPOINTMENT_BOOKED: "Call Booked",
      DEPOSIT_PAID: "Deposit Paid",
      FULL_PAYMENT_MADE: "Paid in Full",
      CONTRACT_SIGNED: "Contract Signed",
      PROPOSAL_SIGNED: "Proposal Signed",
      SMART_FILE_SENT: "Smart File Sent",
      SMART_FILE_VIEWED: "Smart File Viewed",
      SMART_FILE_ACCEPTED: "Smart File Accepted",
      ANY_PAYMENT_MADE: "Payment Made",
    };

    // For pipeline moves, show the trigger at the top
    if (isPipelineMove) {
      const trigger = automation.businessTriggers?.[0];
      if (trigger) {
        return (
          triggerLabels[trigger.triggerType] ||
          trigger.triggerType.replace(/_/g, " ").toLowerCase()
        );
      }
      // Fallback to automation-level triggerType
      if (automation.triggerType) {
        return (
          triggerLabels[automation.triggerType] ||
          automation.triggerType.replace(/_/g, " ").toLowerCase()
        );
      }
      return "Stage Change";
    }

    // Check businessTriggers first
    const trigger = automation.businessTriggers?.[0];
    if (trigger) {
      const whenLabels: Record<string, string> = {
        APPOINTMENT_BOOKED: "When booked",
        DEPOSIT_PAID: "When deposit paid",
        FULL_PAYMENT_MADE: "When paid in full",
        CONTRACT_SIGNED: "When contract signed",
        PROPOSAL_SIGNED: "When proposal signed",
        ANY_PAYMENT_MADE: "When payment made",
        SMART_FILE_SENT: "When quote sent",
        SMART_FILE_ACCEPTED: "When quote accepted",
      };
      return (
        whenLabels[trigger.triggerType] ||
        `When ${trigger.triggerType.replace(/_/g, " ").toLowerCase()}`
      );
    }

    // Fallback to automation-level triggerType
    if (automation.triggerType) {
      const whenLabels: Record<string, string> = {
        APPOINTMENT_BOOKED: "When booked",
        DEPOSIT_PAID: "When deposit paid",
        FULL_PAYMENT_MADE: "When paid in full",
        CONTRACT_SIGNED: "When contract signed",
        PROPOSAL_SIGNED: "When proposal signed",
        ANY_PAYMENT_MADE: "When payment made",
        SMART_FILE_SENT: "When quote sent",
        SMART_FILE_ACCEPTED: "When quote accepted",
      };
      return (
        whenLabels[automation.triggerType] ||
        `When ${automation.triggerType.replace(/_/g, " ").toLowerCase()}`
      );
    }
    if (automation.automationType === "COUNTDOWN") {
      return `${automation.daysBefore}d before event`;
    }
    const delay = automation.steps?.[0]?.delayMinutes || 0;
    if (delay === 0) return "Immediately";
    if (delay < 60) return `After ${delay}m`;
    if (delay < 1440) return `After ${Math.round(delay / 60)}h`;
    return `After ${Math.round(delay / 1440)}d`;
  };

  // Get timing explanation for tooltip
  const getTimingExplanation = () => {
    const explanations: Record<string, string> = {
      APPOINTMENT_BOOKED:
        "Runs automatically when a client books an appointment.",
      DEPOSIT_PAID: "Runs automatically when a client pays their deposit.",
      FULL_PAYMENT_MADE: "Runs automatically when a client pays in full.",
      ANY_PAYMENT_MADE: "Runs automatically when any payment is received.",
      CONTRACT_SIGNED: "Runs automatically when a client signs the contract.",
      PROPOSAL_SIGNED: "Runs automatically when a client signs the proposal.",
      SMART_FILE_SENT: "Runs automatically when a quote/proposal is sent.",
      SMART_FILE_ACCEPTED:
        "Runs automatically when a quote/proposal is accepted.",
    };

    if (isPipelineMove && targetStageName) {
      const trigger =
        automation.businessTriggers?.[0]?.triggerType || automation.triggerType;
      if (trigger && explanations[trigger]) {
        return `${explanations[trigger]} This will move the project to "${targetStageName}".`;
      }
      return `When triggered, this automation will move the project to the "${targetStageName}" stage.`;
    }

    // Check businessTriggers first
    const trigger = automation.businessTriggers?.[0];
    if (trigger) {
      return (
        explanations[trigger.triggerType] ||
        "Runs when the specified event occurs."
      );
    }

    // Fallback to automation-level triggerType
    if (automation.triggerType) {
      return (
        explanations[automation.triggerType] ||
        "Runs when the specified event occurs."
      );
    }

    if (automation.automationType === "COUNTDOWN") {
      return `Runs ${automation.daysBefore} days before the scheduled event date.`;
    }
    const delay = automation.steps?.[0]?.delayMinutes || 0;
    if (delay === 0) return "Runs instantly when a project enters this stage.";
    if (delay < 60)
      return `Runs ${delay} minutes after a project enters this stage.`;
    if (delay < 1440)
      return `Runs ${Math.round(delay / 60)} hours after a project enters this stage.`;
    return `Runs ${Math.round(delay / 1440)} days after a project enters this stage.`;
  };

  // Get preview text
  const getPreviewText = () => {
    const firstStep = automation.steps?.[0];
    // New format: templateBody is a string
    if (automation.useEmailBuilder && automation.templateBody) {
      // Strip variables and button markers, just show first bit of text
      const cleanText = automation.templateBody
        .replace(/\{\{[^}]+\}\}/g, "") // Remove {{variables}}
        .replace(/\[\[BUTTON:[^\]]+\]\]/g, "") // Remove [[BUTTON:...]]
        .trim();
      if (cleanText) {
        return cleanText.substring(0, 60);
      }
    }
    // Legacy format: emailBlocks is array
    if (automation.useEmailBuilder && automation.emailBlocks?.length > 0) {
      const textBlock = automation.emailBlocks.find(
        (b: any) => b.type === "text",
      );
      if (textBlock?.content?.text) {
        return textBlock.content.text.substring(0, 60);
      }
    }
    // emailSubject is on the automation level, not step level
    if (automation.emailSubject) {
      return automation.emailSubject.substring(0, 60);
    }
    // SMS content is stored as customSmsContent on steps
    if (firstStep?.customSmsContent) {
      return firstStep.customSmsContent.substring(0, 60);
    }
    return null;
  };

  // Get action info
  const steps = automation.steps || [];
  const stepCount = steps.length || 1;
  const firstStep = steps[0];
  // actionType can be: EMAIL, SMS, SMART_FILE (or legacy SEND_EMAIL, SEND_SMS)
  const isEmail =
    firstStep?.actionType === "SEND_EMAIL" ||
    firstStep?.actionType === "EMAIL" ||
    automation.useEmailBuilder;
  const isSms =
    firstStep?.actionType === "SEND_SMS" ||
    firstStep?.actionType === "SMS" ||
    firstStep?.customSmsContent ||
    automation.actionType === "SMS";

  // Get trigger label for display
  const getTriggerLabel = () => {
    if (isPipelineMove) return null;
    if (automation.businessTriggers?.length > 0) {
      const trigger = automation.businessTriggers[0];
      const labels: Record<string, string> = {
        APPOINTMENT_BOOKED: "Booked",
        DEPOSIT_PAID: "Deposit",
        FULL_PAYMENT_MADE: "Paid",
        ANY_PAYMENT_MADE: "Payment",
        CONTRACT_SIGNED: "Signed",
        PROPOSAL_SIGNED: "Signed",
        SMART_FILE_SENT: "Sent",
        SMART_FILE_ACCEPTED: "Accepted",
      };
      return labels[trigger.triggerType] || "Event";
    }
    if (automation.automationType === "COUNTDOWN") return "Countdown";
    return "Stage Entry";
  };

  const previewText = getPreviewText();
  const isEnabled = automation.enabled !== false;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
      className={cn(
        "rounded-xl p-4 cursor-pointer group",
        "hover:-translate-y-0.5",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
        isPipelineMove
          ? "bg-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.3),0_6px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.4),0_12px_32px_rgba(0,0,0,0.3)]"
          : "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.08)]",
        !isEnabled && "opacity-60",
      )}
    >
      {/* Header with title and menu */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4
          className={cn(
            "text-sm font-medium line-clamp-2 flex-1",
            isPipelineMove ? "text-white" : "text-gray-900",
          )}
        >
          {automation.name}
        </h4>
        {onToggle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(automation.id, !isEnabled);
                }}
                className={cn(
                  "opacity-0 group-hover:opacity-100 p-1 -m-1 rounded transition-all",
                  isPipelineMove
                    ? isEnabled
                      ? "text-white/60 hover:text-white"
                      : "text-white/40 hover:text-white/70"
                    : isEnabled
                      ? "text-gray-400 hover:text-gray-600"
                      : "text-gray-300 hover:text-gray-500",
                )}
              >
                {isEnabled ? (
                  <Zap className="w-4 h-4" />
                ) : (
                  <PauseCircle className="w-4 h-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              {isEnabled ? "Click to pause" : "Click to activate"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {/* Timing/Trigger tag - inverted colors for pipeline cards */}
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
            isPipelineMove
              ? "bg-white/20 text-white"
              : "bg-gray-800 text-white",
          )}
        >
          {timingCategory === "immediate" && <Zap className="w-3 h-3" />}
          {timingCategory === "delayed" && <Clock className="w-3 h-3" />}
          {timingCategory === "trigger" && <Target className="w-3 h-3" />}
          {timingCategory === "countdown" && <Calendar className="w-3 h-3" />}
          {timingCategory === "pipeline" && <ArrowRight className="w-3 h-3" />}
          {getTimingLine()}
        </span>

        {/* Action type tag */}
        {isPipelineMove ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
            style={{ backgroundColor: targetStageColor || "#a855f7" }}
          >
            <ArrowRight className="w-3 h-3" />
            Move to {targetStageName}
          </span>
        ) : isEmail ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
            <Mail className="w-3 h-3" />
            Email
          </span>
        ) : isSms ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
            <Smartphone className="w-3 h-3" />
            SMS
          </span>
        ) : null}
      </div>

      {/* Preview text for email/SMS cards */}
      {!isPipelineMove && previewText && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">
          {previewText}...
        </p>
      )}

      {/* Metadata Row */}
      <div
        className={cn(
          "flex items-center justify-between pt-2 border-t",
          isPipelineMove ? "border-white/10" : "border-gray-100",
        )}
      >
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs",
            isPipelineMove ? "text-white/60" : "text-gray-500",
          )}
        >
          {automation.lastRunAt ? (
            `Last run: ${new Date(automation.lastRunAt).toLocaleDateString()}`
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Active
            </>
          )}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 text-xs",
            isPipelineMove ? "text-white/40" : "text-gray-400",
          )}
        >
          <Play className="w-3 h-3" />
          {automation.runCount || 0}
        </span>
      </div>
    </div>
  );
}

// AutomationsBoardView Component - Kanban-style board showing all stages
function AutomationsBoardView({
  stages,
  automations,
  onAddAutomation,
  onEditAutomation,
  onToggleAutomation,
  stageFilter = null,
}: {
  stages: any[];
  automations: any[];
  onAddAutomation: (stageId: string) => void;
  onEditAutomation: (automation: any) => void;
  onToggleAutomation?: (id: string, enabled: boolean) => void;
  stageFilter?: string | null;
}) {
  // Scroll container ref and state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll state
  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1,
    );
  }, []);

  // Update scroll state on mount and resize
  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [updateScrollState]);

  // Update scroll state when stages change
  useEffect(() => {
    // Small delay to let the DOM update
    const timeout = setTimeout(updateScrollState, 100);
    return () => clearTimeout(timeout);
  }, [stages, stageFilter, updateScrollState]);

  // Scroll by one column
  const scrollByColumn = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const columnWidth = 250 + 16; // column width + gap
    const scrollAmount = direction === "left" ? -columnWidth : columnWidth;

    container.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  };

  // Filter stages based on stageFilter prop
  const visibleStages = stageFilter
    ? stages.filter((s) => s.id === stageFilter)
    : stages;
  const isSingleStage = stageFilter !== null;
  // Check if automation is a pipeline movement (changes stage)
  // Valid automationType values: COMMUNICATION, STAGE_CHANGE, COUNTDOWN, NURTURE
  const isPipelineMovement = (automation: any) => {
    // STAGE_CHANGE automations with targetStageId are pipeline movements
    if (
      automation.automationType === "STAGE_CHANGE" &&
      automation.targetStageId
    ) {
      return true;
    }
    // Also check targetStage field (may be used in some cases)
    if (automation.targetStage) {
      return true;
    }
    return false;
  };

  // Get target stage info (name and color) for pipeline movement
  const getTargetStageInfo = (
    automation: any,
  ): { name: string; color: string } => {
    // Check automation-level targetStageId
    if (automation.targetStageId) {
      const targetStage = stages.find((s) => s.id === automation.targetStageId);
      return {
        name: targetStage?.name || "Next stage",
        color: targetStage?.color || "#a855f7", // fallback to purple
      };
    }
    // Check targetStage field (may contain id or object)
    if (automation.targetStage) {
      const stageId =
        typeof automation.targetStage === "string"
          ? automation.targetStage
          : automation.targetStage?.id;
      if (stageId) {
        const targetStage = stages.find((s) => s.id === stageId);
        return {
          name: targetStage?.name || "Next stage",
          color: targetStage?.color || "#a855f7",
        };
      }
    }
    return { name: "Next stage", color: "#a855f7" };
  };

  // Get delay value for sorting (returns minutes)
  const getDelayValue = (
    automation: any,
    checkPipeline: boolean = true,
  ): number => {
    // Pipeline movements get a special high value to sort to bottom
    if (checkPipeline && isPipelineMovement(automation)) {
      return Infinity;
    }
    // Countdown automations: convert daysBefore to minutes
    if (automation.automationType === "COUNTDOWN") {
      return (automation.daysBefore || 0) * 1440;
    }
    // Business triggers fire on event - sort after immediate but before delayed
    if (automation.businessTriggers?.length > 0) {
      return 0.5;
    }
    // Regular automations: use first step delay
    const firstStep = automation.steps?.[0];
    return firstStep?.delayMinutes || 0;
  };

  // Memoize grouped and sorted automations by stage
  const automationsByStage = useMemo(() => {
    const grouped: Record<string, any[]> = {};

    // Initialize empty arrays for all stages
    stages.forEach((s) => {
      grouped[s.id] = [];
    });

    // Group automations by stage
    automations.forEach((a: any) => {
      const stageId = a.stageCondition || a.stageId;
      if (stageId && grouped[stageId]) {
        grouped[stageId].push(a);
      }
    });

    // Sort each group: immediate → timed → pipeline movements
    Object.keys(grouped).forEach((stageId) => {
      grouped[stageId].sort((a, b) => getDelayValue(a) - getDelayValue(b));
    });

    return grouped;
  }, [automations, stages]);

  // Dynamic color palette for stages - cycles through colors based on position
  const colorPalette = [
    {
      bgColor: "bg-amber-100/50 dark:bg-amber-900/20",
      dotColor: "bg-amber-500",
      borderColor: "border-amber-200/50 dark:border-amber-800/30",
      shadowColor: "shadow-amber-200/40 dark:shadow-amber-900/20",
    },
    {
      bgColor: "bg-orange-100/50 dark:bg-orange-900/20",
      dotColor: "bg-orange-500",
      borderColor: "border-orange-200/50 dark:border-orange-800/30",
      shadowColor: "shadow-orange-200/40 dark:shadow-orange-900/20",
    },
    {
      bgColor: "bg-teal-100/50 dark:bg-teal-900/20",
      dotColor: "bg-teal-500",
      borderColor: "border-teal-200/50 dark:border-teal-800/30",
      shadowColor: "shadow-teal-200/40 dark:shadow-teal-900/20",
    },
    {
      bgColor: "bg-cyan-100/50 dark:bg-cyan-900/20",
      dotColor: "bg-cyan-500",
      borderColor: "border-cyan-200/50 dark:border-cyan-800/30",
      shadowColor: "shadow-cyan-200/40 dark:shadow-cyan-900/20",
    },
    {
      bgColor: "bg-violet-100/50 dark:bg-violet-900/20",
      dotColor: "bg-violet-500",
      borderColor: "border-violet-200/50 dark:border-violet-800/30",
      shadowColor: "shadow-violet-200/40 dark:shadow-violet-900/20",
    },
    {
      bgColor: "bg-rose-100/50 dark:bg-rose-900/20",
      dotColor: "bg-rose-500",
      borderColor: "border-rose-200/50 dark:border-rose-800/30",
      shadowColor: "shadow-rose-200/40 dark:shadow-rose-900/20",
    },
    {
      bgColor: "bg-emerald-100/50 dark:bg-emerald-900/20",
      dotColor: "bg-emerald-500",
      borderColor: "border-emerald-200/50 dark:border-emerald-800/30",
      shadowColor: "shadow-emerald-200/40 dark:shadow-emerald-900/20",
    },
    {
      bgColor: "bg-indigo-100/50 dark:bg-indigo-900/20",
      dotColor: "bg-indigo-500",
      borderColor: "border-indigo-200/50 dark:border-indigo-800/30",
      shadowColor: "shadow-indigo-200/40 dark:shadow-indigo-900/20",
    },
  ];

  // Get stage config by index - cycles through color palette
  const getStageConfig = (stageIndex: number) => {
    const colors = colorPalette[stageIndex % colorPalette.length];
    return {
      ...colors,
      example: "e.g., Send an email when a client enters this stage",
    };
  };

  return (
    <div className="relative">
      {/* Upper Navigation Arrows - only show when multiple stages and scrollable */}
      {!isSingleStage && (canScrollLeft || canScrollRight) && (
        <div className="flex items-center justify-end gap-1 mb-3 pr-1">
          <button
            onClick={() => scrollByColumn("left")}
            disabled={!canScrollLeft}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
              canScrollLeft
                ? "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:scale-105"
                : "opacity-40 cursor-not-allowed text-gray-400",
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scrollByColumn("right")}
            disabled={!canScrollRight}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
              canScrollRight
                ? "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:scale-105"
                : "opacity-40 cursor-not-allowed text-gray-400",
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
      <motion.div
        ref={scrollContainerRef}
        onScroll={updateScrollState}
        className={cn(
          "pb-4",
          isSingleStage
            ? "flex justify-center px-4"
            : "overflow-x-auto scrollbar-hide",
        )}
        layout
      >
        {/* Single scrollable container with stage headers + columns */}
        <motion.div
          className={cn(
            "flex items-stretch gap-4",
            isSingleStage ? "w-full max-w-[500px]" : "min-w-max",
          )}
          layout
        >
          <AnimatePresence mode="popLayout">
            {visibleStages.map((stage) => {
              const stageAutomations = automationsByStage[stage.id] || [];
              const isEmpty = stageAutomations.length === 0;
              // Use original stage index for consistent colors even when filtered
              const originalIndex = stages.findIndex((s) => s.id === stage.id);
              const config = getStageConfig(
                originalIndex >= 0 ? originalIndex : 0,
              );

              return (
                <motion.div
                  key={stage.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cn(
                    "flex-shrink-0",
                    isSingleStage ? "w-full" : "w-[260px]",
                  )}
                >
                  {/* Stage Header */}
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-semibold text-[15px] text-gray-900 dark:text-foreground">
                      {stage.name}
                    </h3>
                    <button className="ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Cards Container - button inside so it sits right after last card */}
                  <div className="space-y-3">
                    {isEmpty ? (
                      <button
                        onClick={() => onAddAutomation(stage.id)}
                        className="w-full flex flex-col items-center justify-center py-12 px-4 text-center bg-white dark:bg-card rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center mb-3",
                            config.dotColor,
                          )}
                        >
                          <Plus className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                          Add an automation
                        </p>
                        <p className="text-xs text-gray-400 max-w-[200px]">
                          {config.example}
                        </p>
                      </button>
                    ) : (
                      <>
                        {stageAutomations.map((automation: any) => {
                          const isMove = isPipelineMovement(automation);
                          const targetInfo = isMove
                            ? getTargetStageInfo(automation)
                            : null;
                          return (
                            <BoardAutomationCard
                              key={automation.id}
                              automation={automation}
                              onEdit={() => onEditAutomation(automation)}
                              onToggle={onToggleAutomation}
                              isPipelineMove={isMove}
                              targetStageName={targetInfo?.name}
                              targetStageColor={targetInfo?.color}
                            />
                          );
                        })}
                        {/* Add Button - sits right after last card */}
                        <button
                          onClick={() => onAddAutomation(stage.id)}
                          className="w-full py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
                        >
                          <Plus className="w-4 h-4 inline mr-1.5" />
                          Add Automation
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Navigation Arrows - only show when multiple stages and scrollable */}
      {!isSingleStage && (canScrollLeft || canScrollRight) && (
        <div className="flex items-center gap-1 justify-end mt-3 pr-1">
          <button
            onClick={() => scrollByColumn("left")}
            disabled={!canScrollLeft}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
              canScrollLeft
                ? "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:scale-105"
                : "opacity-40 cursor-not-allowed text-gray-400",
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scrollByColumn("right")}
            disabled={!canScrollRight}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
              canScrollRight
                ? "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:scale-105"
                : "opacity-40 cursor-not-allowed text-gray-400",
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// StageChangeAutomationCard Component
function StageChangeAutomationCard({
  automation,
  onDelete,
}: {
  automation: any;
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: automation.name,
    enabled: automation.enabled,
  });

  // Toggle automation mutation
  const toggleAutomationMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return apiRequest("PATCH", `/api/automations/${automation.id}`, {
        enabled,
      });
    },
    onSuccess: () => {
      toast({ title: "Pipeline automation updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
    },
    onError: () => {
      toast({
        title: "Failed to update pipeline automation",
        variant: "destructive",
      });
    },
  });

  // Update automation mutation
  const updateAutomationMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      return apiRequest(
        "PUT",
        `/api/automations/${automation.id}`,
        updatedData,
      );
    },
    onSuccess: () => {
      toast({ title: "Pipeline automation updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Failed to update pipeline automation",
        variant: "destructive",
      });
    },
  });

  const handleToggleAutomation = (enabled: boolean) => {
    toggleAutomationMutation.mutate(enabled);
  };

  const handleSaveEdit = () => {
    updateAutomationMutation.mutate(editForm);
  };

  const handleCancelEdit = () => {
    setEditForm({
      name: automation.name,
      enabled: automation.enabled,
    });
    setEditDialogOpen(false);
  };

  const getTriggerLabel = (triggerType: string) => {
    const triggers = {
      ANY_PAYMENT_MADE: "💰 Any Payment",
      DEPOSIT_PAID: "💳 Deposit Payment",
      FULL_PAYMENT_MADE: "✅ Full Payment",
      PROJECT_BOOKED: "📋 Project Booked",
      SMART_FILE_ACCEPTED: "📄 Smart File Accepted",
      SMART_FILE_SENT: "📤 Smart File Sent",
      CONTRACT_SIGNED: "✍️ Contract Signed",
      PROPOSAL_SIGNED: "✍️ Proposal Signed",
      EVENT_DATE_REACHED: "📅 Event Date",
      PROJECT_DELIVERED: "📦 Project Delivered",
      CLIENT_ONBOARDED: "🎯 Client Onboarded",
      APPOINTMENT_BOOKED: "📅 Appointment Booked",
      GALLERY_SHARED: "🖼️ Gallery Shared",
    };
    return triggers[triggerType as keyof typeof triggers] || triggerType;
  };

  return (
    <div className="group bg-white dark:bg-gray-800/80 rounded-xl shadow-sm hover:shadow-md border border-gray-200/80 dark:border-gray-700/50 overflow-hidden min-w-[350px] max-w-[400px] mx-auto transition-all duration-200 hover:-translate-y-0.5">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-700 px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-700/50">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex-1 truncate pr-2">
          {automation.name}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 h-8 px-3"
            onClick={() => setEditDialogOpen(true)}
            data-testid={`button-edit-automation-${automation.id}`}
          >
            Edit
          </Button>
          <Switch
            checked={automation.enabled}
            onCheckedChange={handleToggleAutomation}
            disabled={toggleAutomationMutation.isPending}
            data-testid={`switch-toggle-automation-${automation.id}`}
          />
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              Trigger:
            </span>
            <Badge className="bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border-0 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              <Target className="w-3 h-3 mr-1" />
              {automation.triggerType
                ? getTriggerLabel(automation.triggerType)
                : automation.businessTriggers?.[0]?.triggerType
                    ?.replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
                  "Stage Entry"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              Action:
            </span>
            <Badge className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 border-0 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              {(automation.conditionStage || automation.stage) &&
                automation.targetStage && (
                  <>
                    <span>
                      {(automation.conditionStage || automation.stage).name}
                    </span>
                    <ArrowRight className="w-3 h-3" />
                  </>
                )}
              <span>{automation.targetStage?.name || "Unknown Stage"}</span>
            </Badge>
          </div>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent
          className="sm:max-w-2xl"
          data-testid={`dialog-edit-automation-${automation.id}`}
        >
          <DialogHeader>
            <DialogTitle>Edit Pipeline Automation</DialogTitle>
            <DialogDescription>
              Modify the automation settings. The trigger type and destination
              stage cannot be changed after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Settings */}
            <div>
              <Label htmlFor={`edit-name-${automation.id}`}>
                Automation Name
              </Label>
              <Input
                id={`edit-name-${automation.id}`}
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="Enter automation name"
                data-testid={`input-edit-name-${automation.id}`}
              />
            </div>

            {/* Pipeline Automation Configuration Overview */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-4 h-4 text-primary" />
                <Label className="font-medium">Automation Configuration</Label>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Type:</span>
                  <Badge
                    variant="outline"
                    className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                  >
                    Pipeline Change
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Trigger:</span>
                  <Badge
                    variant="outline"
                    className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  >
                    {automation.businessTriggers?.[0]?.triggerType
                      ?.replace(/_/g, " ")
                      .toLowerCase()
                      .replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
                      getTriggerLabel(automation.triggerType) ||
                      "Unknown"}
                  </Badge>
                </div>

                {(automation.conditionStage || automation.stage) &&
                  automation.targetStage && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Stage Flow:</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-xs">
                          {(automation.conditionStage || automation.stage).name}
                        </Badge>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <Badge variant="secondary" className="text-xs">
                          {automation.targetStage.name}
                        </Badge>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Action Details */}
            <div className="space-y-2 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                <Label className="font-medium text-green-900 dark:text-green-100">
                  Pipeline Action
                </Label>
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Action:</span>
                  <div className="mt-1 p-2 bg-background border rounded-md">
                    Move project to{" "}
                    <span className="font-medium text-green-600 dark:text-green-400">
                      "{automation.targetStage?.name || "Unknown Stage"}"
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  When this automation triggers, projects will automatically
                  move to the destination stage. To change the destination,
                  delete this automation and create a new one.
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-background">
              <Switch
                checked={editForm.enabled}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, enabled: checked })
                }
                data-testid={`switch-edit-enabled-${automation.id}`}
              />
              <div className="flex-1">
                <Label className="cursor-pointer">Enable automation</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, this automation will run automatically
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="destructive"
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to delete this automation? This cannot be undone.",
                  )
                ) {
                  onDelete(automation.id);
                  setEditDialogOpen(false);
                }
              }}
              disabled={updateAutomationMutation.isPending}
              data-testid={`button-delete-automation-${automation.id}`}
            >
              Delete
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={updateAutomationMutation.isPending}
                data-testid={`button-cancel-edit-${automation.id}`}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={
                  updateAutomationMutation.isPending || !editForm.name.trim()
                }
                data-testid={`button-save-edit-${automation.id}`}
              >
                {updateAutomationMutation.isPending
                  ? "Saving..."
                  : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit Automation Details Component
function EditAutomationDetails({
  automationId,
  automation,
}: {
  automationId: string;
  automation: any;
}) {
  const { data: steps = [] } = useQuery<any[]>({
    queryKey: ["/api/automations", automationId, "steps"],
    enabled: !!automationId && automation.automationType === "COMMUNICATION",
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/templates"],
    enabled: !!automationId && automation.automationType === "COMMUNICATION",
  });

  const { data: smartFiles = [] } = useQuery<any[]>({
    queryKey: ["/api/smart-files"],
    enabled: !!automationId && automation.automationType === "COMMUNICATION",
  });

  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ["/api/stages"],
    enabled: !!automationId,
  });

  const { data: businessTriggers = [] } = useQuery<any[]>({
    queryKey: ["/api/automations", automationId, "business-triggers"],
    enabled: !!automationId,
  });

  // Find trigger stage if this is a stage-based automation
  const triggerStage =
    automation.stageId && Array.isArray(stages)
      ? stages.find((s) => s.id === automation.stageId)
      : null;

  return (
    <div className="space-y-4">
      {/* Trigger Conditions Section - Always show */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Trigger Conditions</Label>
        <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
          {/* Stage Requirement */}
          {triggerStage ? (
            <div className="flex items-start space-x-3">
              <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-950">
                <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Stage Requirement</p>
                <p className="text-sm text-muted-foreground">
                  Triggers when client enters:{" "}
                  <span className="font-semibold text-foreground">
                    "{triggerStage.name}"
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-3">
              <div className="p-1.5 rounded bg-purple-100 dark:bg-purple-950">
                <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Global Automation</p>
                <p className="text-sm text-muted-foreground">
                  No specific stage requirement - runs independently
                </p>
              </div>
            </div>
          )}

          {/* Business Event Triggers */}
          {businessTriggers.length > 0 && (
            <div className="flex items-start space-x-3">
              <div className="p-1.5 rounded bg-green-100 dark:bg-green-950">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Business Events</p>
                <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                  {businessTriggers.map((trigger: any) => (
                    <li
                      key={trigger.id}
                      className="flex items-center space-x-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span>
                        {trigger.triggerType.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Countdown/Time-based info */}
          {automation.daysBefore && (
            <div className="flex items-start space-x-3">
              <div className="p-1.5 rounded bg-orange-100 dark:bg-orange-950">
                <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Time-Based Trigger</p>
                <p className="text-sm text-muted-foreground">
                  Sends {automation.daysBefore} day
                  {automation.daysBefore !== 1 ? "s" : ""}{" "}
                  {automation.triggerTiming === "BEFORE" ? "before" : "after"}{" "}
                  event date
                </p>
              </div>
            </div>
          )}

          {/* Project Type */}
          <div className="flex items-start space-x-3">
            <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800">
              <Briefcase className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Project Type</p>
              <p className="text-sm text-muted-foreground">
                {automation.projectType || "WEDDING"}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Communication Steps */}
      {automation.automationType === "COMMUNICATION" && steps.length > 0 && (
        <div className="space-y-2">
          <Label>Communication Steps ({steps.length})</Label>
          <div className="border rounded-lg p-3 bg-muted max-h-64 overflow-y-auto space-y-2">
            {steps.map((step: any, index: number) => {
              const template = templates.find((t) => t.id === step.templateId);
              const smartFile = smartFiles.find(
                (sf) => sf.id === step.smartFileTemplateId,
              );
              const isSmartFile =
                step.actionType === "SMART_FILE" ||
                automation.channel === "SMART_FILE";

              console.log("🔍 Step data:", {
                stepId: step.id,
                actionType: step.actionType,
                smartFileTemplateId: step.smartFileTemplateId,
                templateId: step.templateId,
                isSmartFile,
                smartFileFound: !!smartFile,
                smartFileName: smartFile?.name,
              });

              return (
                <div
                  key={step.id}
                  className="bg-background border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded font-medium">
                      {index + 1}
                    </span>
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">
                        {formatStepTiming(step)}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span>
                        {isSmartFile
                          ? "📄 Smart File"
                          : automation.channel === "EMAIL"
                            ? "📧 Email"
                            : "📱 SMS"}
                      </span>
                    </div>
                  </div>

                  {template && !isSmartFile && (
                    <div className="pl-7 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Message:
                      </p>
                      <div className="bg-accent border rounded p-2 text-xs">
                        {template.subject && (
                          <p className="font-semibold mb-1 text-foreground">
                            📋 {template.subject}
                          </p>
                        )}
                        <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                          {template.textBody || "No message content"}
                        </p>
                      </div>
                    </div>
                  )}

                  {smartFile && isSmartFile && (
                    <div className="pl-7 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Smart File Template:
                      </p>
                      <div className="bg-accent border rounded p-2 text-xs">
                        <p className="font-semibold text-foreground">
                          📄 {smartFile.name}
                        </p>
                        <p className="text-muted-foreground text-xs mt-1">
                          Will send a{" "}
                          {smartFile.isTemplate ? "template" : "file"} to the
                          client
                        </p>
                      </div>
                    </div>
                  )}

                  {!template && !smartFile && (
                    <div className="pl-7 space-y-1">
                      <p className="text-xs text-muted-foreground italic">
                        No content configured
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Pipeline Action */}
      {automation.automationType === "PIPELINE" && automation.targetStageId && (
        <div className="space-y-2">
          <Label>Pipeline Action</Label>
          <div className="border rounded-lg p-3 bg-muted">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">Target Stage:</span>
                <span className="font-semibold">
                  {Array.isArray(stages)
                    ? stages.find((s) => s.id === automation.targetStageId)
                        ?.name || "Unknown Stage"
                    : "Unknown Stage"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Clients will be automatically moved to this stage when the
                automation triggers.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Automation Steps Display Component
function AutomationStepsDisplay({
  automationId,
  channel,
}: {
  automationId: string;
  channel: string;
}) {
  const { data: steps = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/automations", automationId, "steps"],
    enabled: !!automationId,
  });

  const { data: templates } = useQuery<any[]>({
    queryKey: ["/api/templates"],
    enabled: !!automationId,
  });

  if (isLoading) {
    return (
      <div className="border-t p-4 bg-accent/5">
        <p className="text-sm text-muted-foreground">Loading steps...</p>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="border-t p-4 bg-accent/5">
        <p className="text-sm text-muted-foreground">No steps configured</p>
      </div>
    );
  }

  return (
    <div className="border-t p-4 bg-accent/5 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Steps:
      </p>
      {steps.map((step: any, index: number) => {
        const template = templates?.find((t) => t.id === step.templateId);

        return (
          <div
            key={step.id}
            className="bg-background border rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded font-medium">
                {index + 1}
              </span>
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium">{formatStepTiming(step)}</span>
                <span className="text-muted-foreground">→</span>
                <span>{channel === "EMAIL" ? "📧 Email" : "📱 SMS"}</span>
              </div>
            </div>

            {template && (
              <div className="pl-7 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Message Preview:
                </p>
                <div className="bg-muted border rounded p-2.5 text-xs">
                  {template.subject && (
                    <p className="font-semibold mb-1.5 text-foreground">
                      📋 {template.subject}
                    </p>
                  )}
                  <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                    {template.textBody || "No message content"}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Business Triggers Manager Component
function BusinessTriggersManager({ automation }: { automation: any }) {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTrigger, setEditTrigger] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch project types from API
  const { projectTypes } = useProjectTypes();

  // Fetch business triggers for this automation
  const { data: businessTriggers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/automations", automation.id, "business-triggers"],
    enabled: !!automation.id,
  });

  // Create business trigger form
  const createForm = useForm<CreateBusinessTriggerFormData>({
    resolver: zodResolver(createBusinessTriggerFormSchema),
    defaultValues: {
      triggerType: "DEPOSIT_PAID",
      enabled: true,
      minAmountCents: undefined,
      projectType: undefined,
    },
  });

  // Edit business trigger form
  const editForm = useForm<CreateBusinessTriggerFormData>({
    resolver: zodResolver(createBusinessTriggerFormSchema),
    defaultValues: {
      triggerType: "DEPOSIT_PAID",
      enabled: true,
      minAmountCents: undefined,
      projectType: undefined,
    },
  });

  // Create business trigger mutation
  const createTriggerMutation = useMutation({
    mutationFn: async (data: CreateBusinessTriggerFormData) => {
      return apiRequest("POST", "/api/business-triggers", {
        ...data,
        automationId: automation.id,
      });
    },
    onSuccess: () => {
      toast({ title: "Business trigger created successfully" });
      queryClient.invalidateQueries({
        queryKey: ["/api/automations", automation.id, "business-triggers"],
      });
      setAddDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create business trigger",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Update business trigger mutation
  const updateTriggerMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: CreateBusinessTriggerFormData;
    }) => {
      return apiRequest("PUT", `/api/business-triggers/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Business trigger updated successfully" });
      queryClient.invalidateQueries({
        queryKey: ["/api/automations", automation.id, "business-triggers"],
      });
      setEditDialogOpen(false);
      setEditTrigger(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update business trigger",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Delete business trigger mutation
  const deleteTriggerMutation = useMutation({
    mutationFn: async (triggerId: string) => {
      return apiRequest("DELETE", `/api/business-triggers/${triggerId}`);
    },
    onSuccess: () => {
      toast({ title: "Business trigger deleted successfully" });
      queryClient.invalidateQueries({
        queryKey: ["/api/automations", automation.id, "business-triggers"],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete business trigger",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleCreateTrigger = (data: CreateBusinessTriggerFormData) => {
    createTriggerMutation.mutate(data);
  };

  const handleEditTrigger = (trigger: any) => {
    setEditTrigger(trigger);
    editForm.reset({
      triggerType: trigger.triggerType,
      enabled: trigger.enabled,
      minAmountCents: trigger.minAmountCents || undefined,
      projectType: trigger.projectType || undefined,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateTrigger = (data: CreateBusinessTriggerFormData) => {
    if (editTrigger) {
      updateTriggerMutation.mutate({ id: editTrigger.id, data });
    }
  };

  const handleDeleteTrigger = (triggerId: string) => {
    if (confirm("Are you sure you want to delete this business trigger?")) {
      deleteTriggerMutation.mutate(triggerId);
    }
  };

  const formatTriggerType = (triggerType: string) => {
    return triggerType
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-purple-500" />
          <h4 className="text-sm font-medium">Business Triggers</h4>
          <Badge variant="outline" className="text-xs">
            {businessTriggers.length} configured
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          data-testid={`button-add-business-trigger-${automation.id}`}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Trigger
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-muted-foreground mt-1">
            Loading triggers...
          </p>
        </div>
      ) : businessTriggers.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border rounded-lg">
          <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            No business triggers configured
          </p>
          <p className="text-xs text-muted-foreground">
            Add triggers to execute this automation based on business events
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {businessTriggers.map((trigger: any) => (
            <div
              key={trigger.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-accent/20"
              data-testid={`business-trigger-${trigger.id}`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`p-1.5 rounded-full ${trigger.enabled ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
                >
                  <Zap className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {formatTriggerType(trigger.triggerType)}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    {trigger.minAmountCents && (
                      <span>Min: {formatAmount(trigger.minAmountCents)}</span>
                    )}
                    {trigger.projectType && (
                      <span>Type: {trigger.projectType}</span>
                    )}
                    <Badge
                      variant={trigger.enabled ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {trigger.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditTrigger(trigger)}
                  data-testid={`button-edit-trigger-${trigger.id}`}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTrigger(trigger.id)}
                  data-testid={`button-delete-trigger-${trigger.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Trigger Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Business Trigger</DialogTitle>
            <DialogDescription>
              Configure a business event that will trigger this automation.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(handleCreateTrigger)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="triggerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger Event</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-trigger-type">
                          <SelectValue placeholder="Select trigger event" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(triggerTypeEnum).map((trigger) => (
                          <SelectItem key={trigger} value={trigger}>
                            {formatTriggerType(trigger)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="minAmountCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Amount (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 500 for $5.00"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                        data-testid="input-min-amount"
                      />
                    </FormControl>
                    <FormDescription>
                      Amount in cents. Trigger only when payment meets this
                      minimum.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type Filter (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "ALL_TYPES"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-project-type">
                          <SelectValue placeholder="All project types" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL_TYPES">
                          All project types
                        </SelectItem>
                        {projectTypes.map((type) => (
                          <SelectItem key={type.id} value={type.slug}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Limit trigger to specific project types only.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Trigger</FormLabel>
                      <FormDescription>
                        Trigger will be active and can execute the automation.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-trigger-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                  data-testid="button-cancel-add-trigger"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTriggerMutation.isPending}
                  data-testid="button-save-trigger"
                >
                  {createTriggerMutation.isPending
                    ? "Saving..."
                    : "Save Trigger"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Trigger Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Business Trigger</DialogTitle>
            <DialogDescription>
              Modify the business event trigger configuration.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleUpdateTrigger)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="triggerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger Event</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-trigger-type">
                          <SelectValue placeholder="Select trigger event" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(triggerTypeEnum).map((trigger) => (
                          <SelectItem key={trigger} value={trigger}>
                            {formatTriggerType(trigger)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="minAmountCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Amount (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 500 for $5.00"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                        data-testid="input-edit-min-amount"
                      />
                    </FormControl>
                    <FormDescription>
                      Amount in cents. Trigger only when payment meets this
                      minimum.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type Filter (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "ALL_TYPES"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-project-type">
                          <SelectValue placeholder="All project types" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL_TYPES">
                          All project types
                        </SelectItem>
                        {projectTypes.map((type) => (
                          <SelectItem key={type.id} value={type.slug}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Limit trigger to specific project types only.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Trigger</FormLabel>
                      <FormDescription>
                        Trigger will be active and can execute the automation.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-trigger-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-cancel-edit-trigger"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateTriggerMutation.isPending}
                  data-testid="button-update-trigger"
                >
                  {updateTriggerMutation.isPending
                    ? "Updating..."
                    : "Update Trigger"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Automations() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // ALL STATE HOOKS MUST BE BEFORE ANY CONDITIONAL RETURNS
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Conversational AI state
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [currentChatMessage, setCurrentChatMessage] = useState("");
  const [conversationState, setConversationState] = useState<any>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const [buildAllDialogOpen, setBuildAllDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [manageRulesDialogOpen, setManageRulesDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<any>(null);
  const [timingMode, setTimingMode] = useState<"immediate" | "delayed" | null>(
    null,
  );
  const [activeProjectType, setActiveProjectType] = useState<string>("");
  const [isSettingUpDefaults, setIsSettingUpDefaults] = useState(false);
  const [enableCommunication, setEnableCommunication] = useState(true);
  const [enablePipeline, setEnablePipeline] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<any>(null);
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [boardStageFilter, setBoardStageFilter] = useState<string | null>(null);
  // Edit form states
  const [editEnableCommunication, setEditEnableCommunication] = useState(true);
  const [editEnablePipeline, setEditEnablePipeline] = useState(false);
  const [editTimingMode, setEditTimingMode] = useState<"immediate" | "delayed">(
    "immediate",
  );

  // Email builder states
  const [emailBuilderMode, setEmailBuilderMode] = useState<"select" | "build">(
    "select",
  );
  const [customEmailSubject, setCustomEmailSubject] = useState("");
  const [customTemplateBody, setCustomTemplateBody] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [includeHeroImage, setIncludeHeroImage] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [includeHeader, setIncludeHeader] = useState(false);
  const [headerStyle, setHeaderStyle] = useState("professional");
  const [includeSignature, setIncludeSignature] = useState(true);
  const [signatureStyle, setSignatureStyle] = useState("professional");

  // State for editing email builder content in edit dialog (uses templateBody string like wizard)
  const [editingEmailBuilder, setEditingEmailBuilder] = useState<{
    automationId: string;
    subject: string;
    templateBody: string; // String with button markers like [[BUTTON:CALENDAR:Book Now]]
    includeHeader: boolean;
    includeFooter: boolean;
  } | null>(null);
  const [emailBuilderEditDialogOpen, setEmailBuilderEditDialogOpen] =
    useState(false);
  const [showEmailPreviewInEditDialog, setShowEmailPreviewInEditDialog] =
    useState(false);

  // State for editing SMS step content in edit dialog
  const [editingSmsStep, setEditingSmsStep] = useState<{
    stepId: string;
    content: string;
  } | null>(null);
  const [smsEditDialogOpen, setSmsEditDialogOpen] = useState(false);

  // State for Add Button popover in email edit dialog
  const [showEmailButtonPopover, setShowEmailButtonPopover] = useState(false);
  const [emailButtonText, setEmailButtonText] = useState("");
  const [emailButtonDestination, setEmailButtonDestination] =
    useState("CALENDAR");
  const [emailButtonCustomUrl, setEmailButtonCustomUrl] = useState("");

  // Update email builder mutation (for main component's email edit dialog)
  const updateEmailBuilderMutation = useMutation({
    mutationFn: async (builderData: {
      automationId: string;
      subject: string;
      templateBody: string;
      includeHeader: boolean;
      includeFooter: boolean;
    }) => {
      const htmlBody = templateBodyToHtml(builderData.templateBody);
      return apiRequest("PUT", `/api/automations/${builderData.automationId}`, {
        emailSubject: builderData.subject,
        htmlBody,
        templateBody: builderData.templateBody,
        includeHeader: builderData.includeHeader,
        includeSignature: builderData.includeFooter,
      });
    },
    onSuccess: () => {
      toast({ title: "Email message updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setEditingEmailBuilder(null);
      setEmailBuilderEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Failed to update email message",
        variant: "destructive",
      });
    },
  });

  // Wizard state for step-by-step automation creation
  const [wizardStep, setWizardStep] = useState(1);
  const [cachedAutoName, setCachedAutoName] = useState<string>(""); // Cached auto-generated name for Step 5

  // Fetch photographer settings for email branding (must be before useEffects that use it)
  const { data: photographer } = useQuery<any>({
    queryKey: ["/api/photographer"],
    queryFn: () => fetch(`/api/photographer`).then((res) => res.json()),
    enabled: !!user,
  });

  // Fetch project types from API
  const {
    projectTypes,
    isLoading: isLoadingTypes,
    getProjectTypeName,
  } = useProjectTypes();

  // Initialize activeProjectType when project types load
  useEffect(() => {
    if (projectTypes.length > 0 && !activeProjectType) {
      const defaultType =
        projectTypes.find((t) => t.isDefault) || projectTypes[0];
      setActiveProjectType(defaultType.slug);
    }
  }, [projectTypes, activeProjectType]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  // Auto-scroll chat to bottom when new messages appear
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Handle ?new=true query param to auto-open wizard
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("new") === "true") {
      setCreateDialogOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Reset modal state when dialog opens (basic reset only)
  useEffect(() => {
    if (createDialogOpen) {
      // Reset wizard step to beginning
      setWizardStep(1);
      // Reset toggle states to default
      setEnableCommunication(true);
      setEnablePipeline(false);
      setTimingMode(null);
      setCachedAutoName(""); // Reset cached auto-name
      // Reset email builder states
      setEmailBuilderMode("select");
      setCustomEmailSubject("");
      setCustomTemplateBody(""); // Reset template body
      setSaveAsTemplate(false);
      setNewTemplateName("");
      setIncludeHeroImage(false);
      setHeroImageUrl("");
      setIncludeHeader(false);
      setHeaderStyle("professional");
      setIncludeSignature(true);
      setSignatureStyle("professional");
    }
  }, [createDialogOpen]);

  // Set branding checkbox states when dialog opens based on photographer settings
  useEffect(() => {
    if (createDialogOpen && photographer) {
      // Set branding checkbox states from photographer settings
      // Header/signature are now controlled via checkboxes, not blocks
      setIncludeHeader(photographer.emailIncludeHeader || false);
      setHeaderStyle(photographer.emailHeaderStyle || "professional");
      setIncludeSignature(photographer.emailIncludeSignature !== false);
      setSignatureStyle(photographer.emailSignatureStyle || "professional");
    }
  }, [createDialogOpen, photographer]);

  // Unified form schema that supports all three automation types with optional sections
  const unifiedFormSchema = createAutomationFormSchema
    .extend({
      // Unified trigger settings
      triggerMode: z.enum(["STAGE", "BUSINESS", "TIME"]).default("STAGE"),
      triggerStageId: z.string().optional(), // For stage-based triggers
      triggerEvent: z.string().optional(), // For business event triggers
      // Time-based trigger fields
      daysBefore: z.coerce.number().min(1).max(365).optional(),
      triggerTiming: z.enum(["BEFORE", "AFTER"]).default("BEFORE"),
      triggerHour: z.coerce.number().min(0).max(23).default(9),
      triggerMinute: z.coerce.number().min(0).max(59).default(0),
      eventType: z.string().optional(),
      stageCondition: z.string().optional(),
      eventDateCondition: z.string().optional(),
      // Countdown action type (send message or move to stage)
      countdownAction: z.enum(["MESSAGE", "STAGE_CHANGE"]).default("MESSAGE"),
      // OR LESS - trigger immediately if already within threshold
      orLess: z.boolean().default(false),
      // Optional automation type flags
      enableCommunication: z.boolean().default(true),
      enablePipeline: z.boolean().default(false),
      // Communication automation fields
      channel: z.string().default("EMAIL"),
      templateId: z.string().optional(),
      smartFileTemplateId: z.string().optional(),
      smsMessageType: z
        .enum(["template", "custom"])
        .default("template")
        .optional(),
      customSmsContent: z.string().optional(),
      delayMinutes: z.coerce.number().min(0).default(0),
      delayHours: z.coerce.number().min(0).default(0),
      delayDays: z.coerce.number().min(0).default(0),
      sendAtHour: z.coerce.number().min(0).max(23).optional(),
      sendAtMinute: z.coerce.number().min(0).max(59).optional(),
      questionnaireTemplateId: z.string().optional(),
      // Booking-relative timing anchor
      anchorType: z
        .enum(["STAGE_ENTRY", "BOOKING_START", "BOOKING_END"])
        .default("STAGE_ENTRY"),
      // Pipeline automation fields (simplified - only target stage)
      targetStageId: z.string().optional(),
      // Email builder state fields (synced from React state for validation)
      emailBuilderMode: z
        .enum(["select", "build"])
        .default("select")
        .optional(),
      customEmailSubject: z.string().optional(),
      customTemplateBody: z.string().optional(), // String template body with {{variables}} and [[BUTTON:...]]
    })
    .refine(
      (data) => {
        // Check if this is a countdown stage change automation
        const isCountdownStageChange =
          data.triggerMode === "TIME" &&
          data.countdownAction === "STAGE_CHANGE";

        // At least one automation type must be enabled (countdown stage change counts as pipeline)
        if (
          !data.enableCommunication &&
          !data.enablePipeline &&
          !isCountdownStageChange
        ) {
          return false;
        }
        // Validate trigger settings
        if (data.triggerMode === "STAGE") {
          if (!data.triggerStageId) {
            return false;
          }
        } else if (data.triggerMode === "BUSINESS") {
          if (!data.triggerEvent) {
            return false;
          }
        } else if (data.triggerMode === "TIME") {
          if (!data.daysBefore || !data.eventType) {
            return false;
          }
          // For countdown stage change, require target stage
          if (isCountdownStageChange && !data.targetStageId) {
            return false;
          }
        }
        // If communication is enabled and NOT a countdown stage change, require template, questionnaire, or Smart File
        if (data.enableCommunication && !isCountdownStageChange) {
          const hasTemplate =
            data.templateId &&
            data.templateId.length > 0 &&
            data.templateId !== "unavailable";
          const hasQuestionnaire =
            data.questionnaireTemplateId &&
            data.questionnaireTemplateId.length > 0 &&
            data.questionnaireTemplateId !== "none" &&
            data.questionnaireTemplateId !== "unavailable";
          const hasSmartFile =
            data.smartFileTemplateId &&
            data.smartFileTemplateId.length > 0 &&
            data.smartFileTemplateId !== "unavailable" &&
            data.smartFileTemplateId !== "none";
          const hasCustomSms =
            data.customSmsContent && data.customSmsContent.length > 0;
          const hasCustomEmailBuilder =
            data.emailBuilderMode === "build" &&
            data.customEmailSubject &&
            data.customEmailSubject.trim().length > 0 &&
            typeof data.customTemplateBody === "string" &&
            data.customTemplateBody.trim().length > 0;

          // For SMART_FILE channel, only smartFileTemplateId is required
          if (data.channel === "SMART_FILE") {
            if (!hasSmartFile) {
              return false;
            }
          } else if (data.channel === "SMS") {
            // For SMS, require template, custom content, or questionnaire
            if (!hasTemplate && !hasCustomSms && !hasQuestionnaire) {
              return false;
            }
          } else if (data.channel === "EMAIL") {
            // For EMAIL, require template, questionnaire, OR custom email builder
            if (!hasTemplate && !hasQuestionnaire && !hasCustomEmailBuilder) {
              return false;
            }
          }
        }
        // If pipeline is enabled, require target stage
        if (data.enablePipeline) {
          if (!data.targetStageId) {
            return false;
          }
        }
        return true;
      },
      {
        message:
          "Please enable at least one automation type and complete all required fields",
        path: ["enableCommunication"],
      },
    );

  type UnifiedFormData = z.infer<typeof unifiedFormSchema>;

  // Create form setup
  const form = useForm<UnifiedFormData>({
    resolver: zodResolver(unifiedFormSchema),
    defaultValues: {
      name: "",
      stageId: "", // Legacy field for backend compatibility
      triggerMode: "STAGE" as const,
      triggerStageId: "",
      triggerEvent: "",
      daysBefore: 7,
      triggerTiming: "BEFORE" as const,
      triggerHour: 9,
      triggerMinute: 0,
      eventType: "placeholder",
      stageCondition: "all",
      eventDateCondition: "",
      countdownAction: "MESSAGE" as const,
      orLess: false,
      channel: "EMAIL",
      enabled: true,
      automationType: "COMMUNICATION", // Still needed for backend compatibility
      enableCommunication: true,
      enablePipeline: false,
      templateId: "",
      smartFileTemplateId: "",
      delayMinutes: 0,
      delayHours: 0,
      delayDays: 0,
      questionnaireTemplateId: "",
      targetStageId: "",
      smsMessageType: "template",
      customSmsContent: "",
      anchorType: "STAGE_ENTRY" as const,
      // Email builder fields
      emailBuilderMode: "select",
      customEmailSubject: "",
      customTemplateBody: [],
    },
  });

  // Dynamic total steps - countdown stage changes only need 3 steps (name, trigger with stage, review)
  // Must be defined after form hook is initialized
  const isCountdownStageChange =
    form.watch("triggerMode") === "TIME" &&
    form.watch("countdownAction") === "STAGE_CHANGE";
  const totalSteps = isCountdownStageChange ? 3 : 5;

  // Edit form setup
  const editForm = useForm<UnifiedFormData>({
    resolver: zodResolver(unifiedFormSchema),
    defaultValues: {
      name: "",
      stageId: "",
      triggerMode: "STAGE" as const,
      triggerStageId: "",
      triggerEvent: "",
      daysBefore: 7,
      triggerTiming: "BEFORE" as const,
      triggerHour: 9,
      triggerMinute: 0,
      eventType: "placeholder",
      stageCondition: "all",
      eventDateCondition: "",
      countdownAction: "MESSAGE" as const,
      orLess: false,
      channel: "EMAIL",
      enabled: true,
      automationType: "COMMUNICATION",
      enableCommunication: true,
      enablePipeline: false,
      templateId: "",
      smartFileTemplateId: "",
      delayMinutes: 0,
      delayHours: 0,
      delayDays: 0,
      questionnaireTemplateId: "",
      targetStageId: "",
      smsMessageType: "template",
      customSmsContent: "",
      anchorType: "STAGE_ENTRY" as const,
    },
  });

  // Update form values when enable flags change
  useEffect(() => {
    form.clearErrors();
    // Sync enable flags with form
    form.setValue("enableCommunication", enableCommunication);
    form.setValue("enablePipeline", enablePipeline);

    // Reset fields that don't apply to disabled automation types
    if (!enableCommunication) {
      form.setValue("templateId", "");
      form.setValue("delayMinutes", 0);
      form.setValue("delayHours", 0);
      form.setValue("delayDays", 0);
      form.setValue("questionnaireTemplateId", "");
      form.setValue("channel", "EMAIL");
    }
    if (!enablePipeline) {
      form.setValue("targetStageId", "");
    }
  }, [enableCommunication, enablePipeline, form]);

  // Auto-switch to delayed mode when user enters delay values
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (
        name === "delayMinutes" ||
        name === "delayHours" ||
        name === "delayDays"
      ) {
        const hasDelay =
          (value.delayDays && value.delayDays > 0) ||
          (value.delayHours && value.delayHours > 0) ||
          (value.delayMinutes && value.delayMinutes > 0);
        if (hasDelay && timingMode === "immediate") {
          setTimingMode("delayed");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, timingMode]);

  // Sync email builder state into form for validation
  useEffect(() => {
    form.setValue("emailBuilderMode", emailBuilderMode);
    form.setValue("customEmailSubject", customEmailSubject);
    form.setValue("customTemplateBody", customTemplateBody);
  }, [emailBuilderMode, customEmailSubject, customTemplateBody, form]);

  // Populate edit form when editing automation changes
  useEffect(() => {
    if (editingAutomation && editDialogOpen) {
      const auto = editingAutomation;

      // Determine trigger mode
      let triggerMode: "STAGE" | "BUSINESS" | "TIME" = "STAGE";
      if (auto.daysBefore !== null && auto.daysBefore !== undefined) {
        triggerMode = "TIME";
      } else if (auto.businessTriggers && auto.businessTriggers.length > 0) {
        triggerMode = "BUSINESS";
      }

      // Set enable flags based on automation type
      const isComm = auto.automationType === "COMMUNICATION";
      const isPipe = auto.automationType === "PIPELINE_CHANGE";
      setEditEnableCommunication(isComm);
      setEditEnablePipeline(isPipe);

      // Populate form - use nullish coalescing to preserve 0 values
      editForm.reset({
        name: auto.name ?? "",
        stageId: auto.stageId ?? "",
        triggerMode: triggerMode,
        triggerStageId: auto.stageId ?? "",
        triggerEvent: auto.businessTriggers?.[0]?.triggerType ?? "",
        daysBefore: auto.daysBefore ?? 7,
        triggerTiming: auto.triggerTiming ?? "BEFORE",
        triggerHour: auto.triggerHour ?? 9,
        triggerMinute: auto.triggerMinute ?? 0,
        eventType: auto.eventType ?? "placeholder",
        stageCondition: auto.stageCondition ?? "all",
        eventDateCondition: auto.eventDateCondition ?? "",
        channel: auto.channel ?? "EMAIL",
        enabled: auto.enabled ?? true,
        automationType: auto.automationType ?? "COMMUNICATION",
        enableCommunication: isComm,
        enablePipeline: isPipe,
        templateId: auto.templateId ?? "",
        delayMinutes: 0,
        delayHours: 0,
        delayDays: 0,
        questionnaireTemplateId: auto.questionnaireTemplateId ?? "",
        // Extract ID from targetStage object (could be string ID or object with id property)
        targetStageId:
          typeof auto.targetStage === "string"
            ? auto.targetStage
            : (auto.targetStage?.id ?? ""),
      });

      // Load email builder state if this automation uses email builder
      if (auto.useEmailBuilder && auto.emailBlocks) {
        // Parse email blocks
        let blocks =
          typeof auto.emailBlocks === "string"
            ? JSON.parse(auto.emailBlocks)
            : auto.emailBlocks;

        // Filter out any legacy HEADER/SIGNATURE blocks - these are now controlled via checkboxes only
        blocks = blocks.filter(
          (b: any) => b.type !== "HEADER" && b.type !== "SIGNATURE",
        );

        setCustomTemplateBody(blocksToTemplateBody(blocks));
        setCustomEmailSubject(auto.emailSubject || "");
        setEmailBuilderMode("build");

        // Set branding states from saved automation flags (not blocks)
        setIncludeHeader(auto.includeHeader || false);
        setHeaderStyle(
          auto.headerStyle || photographer?.emailHeaderStyle || "professional",
        );
        setIncludeSignature(auto.includeSignature !== false);
        setSignatureStyle(
          auto.signatureStyle ||
            photographer?.emailSignatureStyle ||
            "professional",
        );
      }

      // Set timing mode based on steps (will be handled separately)
      setEditTimingMode("immediate");
    }
  }, [editingAutomation, editDialogOpen, editForm, photographer]);

  // Update edit form when edit enable flags change
  useEffect(() => {
    editForm.clearErrors();
    editForm.setValue("enableCommunication", editEnableCommunication);
    editForm.setValue("enablePipeline", editEnablePipeline);

    if (!editEnableCommunication) {
      editForm.setValue("templateId", "");
      editForm.setValue("delayMinutes", 0);
      editForm.setValue("delayHours", 0);
      editForm.setValue("delayDays", 0);
      editForm.setValue("questionnaireTemplateId", "");
      editForm.setValue("channel", "EMAIL");
    }
    if (!editEnablePipeline) {
      editForm.setValue("targetStageId", "");
    }
  }, [editEnableCommunication, editEnablePipeline, editForm]);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONALS
  // Stages are now unified per photographer (no project type filter)
  const {
    data: stages = [],
    isError: stagesError,
    isLoading: stagesLoading,
  } = useQuery<any[]>({
    queryKey: ["/api/stages"],
    queryFn: async () => {
      const res = await fetch(`/api/stages`);
      if (!res.ok) {
        throw new Error(`Failed to fetch stages: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!user,
  });

  const { data: automations = [], isLoading: automationsLoading } = useQuery<
    any[]
  >({
    queryKey: ["/api/automations", activeProjectType],
    queryFn: async () => {
      const res = await fetch(
        `/api/automations?projectType=${activeProjectType}`,
      );
      if (!res.ok) {
        throw new Error("Failed to fetch automations");
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user && !!activeProjectType,
  });

  // Query for total automation count across ALL project types (for first-automation confirmation)
  // Uses dedicated endpoint that always returns 200 to avoid 304 cache issues
  const { data: automationCountData, isLoading: isAutomationCountLoading } =
    useQuery<{ total: number }>({
      queryKey: ["/api/automations/count"],
      enabled: !!user,
      staleTime: 60000, // Cache for 1 minute to avoid unnecessary refetches
    });
  // Use undefined while loading to properly signal loading state to the wizard
  const totalAutomationCount = automationCountData?.total;

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/templates"],
    queryFn: () => fetch(`/api/templates`).then((res) => res.json()),
    enabled: !!user,
  });

  const { data: questionnaireTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/questionnaire-templates"],
    queryFn: () =>
      fetch(`/api/questionnaire-templates`).then((res) => res.json()),
    enabled: !!user,
  });

  const { data: smartFiles = [] } = useQuery<any[]>({
    queryKey: ["/api/smart-files"],
    queryFn: () => fetch(`/api/smart-files`).then((res) => res.json()),
    enabled: !!user,
  });

  const { data: stageTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/automations/stage-templates"],
    queryFn: () =>
      fetch(`/api/automations/stage-templates`).then((res) => res.json()),
    enabled: !!user,
  });

  // Set initial selected stage when stages load, or reset when stages change
  useEffect(() => {
    if (stages && stages.length > 0) {
      // Check if current selectedStageId is valid for the new stages (or is 'global')
      const isValidStage =
        selectedStageId === "global" ||
        stages.some((s: any) => s.id === selectedStageId);
      if (!selectedStageId || !isValidStage) {
        setSelectedStageId(stages[0].id);
      }
    }
  }, [stages]);

  // Delete automation mutation
  const deleteAutomationMutation = useMutation({
    mutationFn: async (automationId: string) => {
      return apiRequest("DELETE", `/api/automations/${automationId}`);
    },
    onSuccess: () => {
      toast({ title: "Automation deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/automations/count"] }); // Invalidate count for first-automation check
    },
    onError: () => {
      toast({ title: "Failed to delete automation", variant: "destructive" });
    },
  });

  // Apply stage template mutation
  const applyTemplatesMutation = useMutation({
    mutationFn: async (stageId: string) => {
      return apiRequest(
        "POST",
        `/api/automations/stages/${stageId}/apply-template`,
      );
    },
    onSuccess: (data: any) => {
      toast({
        title: "Automations Applied!",
        description:
          data.message || `Successfully applied recommended automations`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to apply automations",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Create unified automation mutation - handles both automation types
  const createAutomationMutation = useMutation({
    mutationFn: async (data: UnifiedFormData) => {
      const createdAutomations: any[] = [];

      try {
        // Check if this is a countdown stage change automation
        const isCountdownStageChange =
          data.triggerMode === "TIME" &&
          data.countdownAction === "STAGE_CHANGE";

        // Handle countdown stage change automations FIRST (no communication needed)
        if (isCountdownStageChange && data.targetStageId) {
          const countdownStageAutomation = {
            name: data.name,
            stageId: null,
            enabled: data.enabled,
            projectType: activeProjectType,
            automationType: "COUNTDOWN" as const,
            channel: null, // No channel for stage-change-only countdowns
            daysBefore: data.daysBefore,
            triggerTiming: data.triggerTiming,
            triggerHour: data.triggerHour || 9,
            triggerMinute: data.triggerMinute || 0,
            eventType: data.eventType,
            stageCondition:
              data.stageCondition && data.stageCondition !== "all"
                ? data.stageCondition
                : null,
            targetStageId: data.targetStageId,
            orLess: data.orLess || false,
          };

          const countdownResponse = await apiRequest(
            "POST",
            "/api/automations",
            countdownStageAutomation,
          );
          const countdownAuto = await countdownResponse.json();
          createdAutomations.push(countdownAuto);

          // Return early - countdown stage changes don't need any other automation types
          return createdAutomations;
        }

        // Create communication automation if enabled (skip for countdown stage changes)
        if (data.enableCommunication && !isCountdownStageChange) {
          // Validate communication automation data
          if (data.templateId && data.templateId !== "unavailable") {
            const channelTemplates = templates.filter(
              (t: any) => t.channel === data.channel,
            );
            if (channelTemplates.length === 0) {
              throw new Error(
                `No ${data.channel?.toLowerCase() || "selected"} templates available. Please create templates first.`,
              );
            }
            const selectedTemplate = channelTemplates.find(
              (t: any) => t.id === data.templateId,
            );
            if (!selectedTemplate) {
              throw new Error("Selected template is not valid");
            }
          }

          // Map unified trigger to communication automation format
          const stageId =
            data.triggerMode === "STAGE"
              ? data.triggerStageId && data.triggerStageId !== "global"
                ? data.triggerStageId
                : null
              : null;

          const commAutomationData: any = {
            name: data.name + (data.enablePipeline ? " (Communication)" : ""),
            stageId: stageId,
            enabled: data.enabled,
            projectType: activeProjectType,
            automationType: "COMMUNICATION" as const,
            channel: data.channel,
            templateId:
              data.templateId && data.templateId !== "unavailable"
                ? data.templateId
                : null,
            questionnaireTemplateId:
              data.questionnaireTemplateId &&
              data.questionnaireTemplateId !== "unavailable" &&
              data.questionnaireTemplateId !== "none"
                ? data.questionnaireTemplateId
                : null,
            eventDateCondition: data.eventDateCondition || null,
            smartFileTemplateId:
              (data as any).smartFileTemplateId &&
              (data as any).smartFileTemplateId !== "unavailable" &&
              (data as any).smartFileTemplateId !== "none"
                ? (data as any).smartFileTemplateId
                : null,
          };

          // Include custom email builder data if present
          if ((data as any).useEmailBuilder) {
            commAutomationData.useEmailBuilder = true;
            commAutomationData.emailSubject = (data as any).emailSubject;
            commAutomationData.templateBody = (data as any).templateBody;
            commAutomationData.htmlBody = (data as any).htmlBody;
            commAutomationData.includeHeroImage = (
              data as any
            ).includeHeroImage;
            commAutomationData.heroImageUrl = (data as any).heroImageUrl;
            commAutomationData.includeHeader = (data as any).includeHeader;
            commAutomationData.headerStyle = (data as any).headerStyle;
            commAutomationData.includeSignature = (
              data as any
            ).includeSignature;
            commAutomationData.signatureStyle = (data as any).signatureStyle;
          }

          // Add stageCondition for business event triggers
          if (
            data.triggerMode === "BUSINESS" &&
            data.stageCondition &&
            data.stageCondition !== "all"
          ) {
            commAutomationData.stageCondition = data.stageCondition;
          }

          const commResponse = await apiRequest(
            "POST",
            "/api/automations",
            commAutomationData,
          );
          const commAutomation = await commResponse.json();
          createdAutomations.push(commAutomation);

          // Create business trigger if this is a business event trigger
          if (data.triggerMode === "BUSINESS" && data.triggerEvent) {
            await apiRequest("POST", "/api/business-triggers", {
              automationId: commAutomation.id,
              triggerType: data.triggerEvent,
              enabled: true,
            });
          }

          // Create automation step for communication (with templates, questionnaires, or Smart Files)
          const hasTemplate =
            data.templateId && data.templateId !== "unavailable";
          const hasSmartFile =
            data.smartFileTemplateId &&
            data.smartFileTemplateId !== "unavailable";
          const hasQuestionnaire =
            data.questionnaireTemplateId &&
            data.questionnaireTemplateId !== "unavailable" &&
            data.questionnaireTemplateId !== "none";
          const hasCustomSms =
            data.customSmsContent && data.customSmsContent.length > 0;

          if (hasTemplate || hasSmartFile || hasQuestionnaire || hasCustomSms) {
            // Calculate delay based on scheduling mode
            let totalDelayMinutes;
            if (timingMode === "immediate") {
              totalDelayMinutes = 0;
            } else if (data.delayDays >= 1) {
              // Day-based scheduling: delayMinutes stores the day count for backward compatibility
              totalDelayMinutes = data.delayDays * 24 * 60;
            } else {
              // Exact delays: calculate total minutes
              totalDelayMinutes = data.delayHours * 60 + data.delayMinutes;
            }

            const stepData: any = {
              stepIndex: 0,
              delayMinutes: totalDelayMinutes,
              enabled: true,
              actionType: data.channel, // EMAIL, SMS, or SMART_FILE
              anchorType: data.anchorType || "STAGE_ENTRY", // Booking-relative timing support
            };

            // Add day-based scheduling fields when using day delays
            if (data.delayDays >= 1) {
              stepData.delayDays = data.delayDays;
              stepData.sendAtHour = data.sendAtHour ?? 9; // Default to 9 AM if not set
              stepData.sendAtMinute = data.sendAtMinute ?? 0;
            }

            // Add templateId for EMAIL/SMS or smartFileTemplateId for SMART_FILE
            if (hasTemplate) {
              stepData.templateId = data.templateId;
            } else if (hasSmartFile) {
              stepData.smartFileTemplateId = data.smartFileTemplateId;
            } else if (hasCustomSms) {
              stepData.customSmsContent = data.customSmsContent;
            }

            await apiRequest(
              "POST",
              `/api/automations/${commAutomation.id}/steps`,
              stepData,
            );
          }
        }

        // Handle time-based triggers - update automation with time fields
        if (data.triggerMode === "TIME" && createdAutomations.length > 0) {
          // Update the created automation(s) with time-based trigger fields
          for (const automation of createdAutomations) {
            const timeData: any = {
              daysBefore: data.daysBefore,
              triggerTiming: data.triggerTiming,
              triggerHour: data.triggerHour,
              triggerMinute: data.triggerMinute,
              eventType: data.eventType,
              stageCondition:
                data.stageCondition && data.stageCondition !== "all"
                  ? data.stageCondition
                  : null,
              eventDateCondition: null, // Countdown automations always require event dates, so no condition filtering
              orLess: data.orLess || false, // OR LESS for immediate triggering
            };

            await apiRequest(
              "PATCH",
              `/api/automations/${automation.id}`,
              timeData,
            );
          }
        }

        // Create pipeline automation if enabled
        if (data.enablePipeline) {
          // Phase 1: Only support business event triggers for pipeline automations
          if (data.triggerMode === "STAGE") {
            throw new Error(
              "Stage-based pipeline automations are coming soon. Please use business event triggers for pipeline automations for now.",
            );
          }

          // Map business event trigger to pipeline automation format
          const triggerType = data.triggerEvent || "";
          if (!triggerType) {
            throw new Error(
              "Business event trigger is required for pipeline automations",
            );
          }

          const pipelineAutomationData = {
            name: data.name + (data.enableCommunication ? " (Pipeline)" : ""),
            stageId: null, // Pipeline automations don't use stageId
            stageCondition:
              data.stageCondition && data.stageCondition !== "all"
                ? data.stageCondition
                : null,
            enabled: data.enabled,
            projectType: activeProjectType,
            automationType: "STAGE_CHANGE" as const,
            triggerType: triggerType,
            targetStageId: data.targetStageId,
            eventDateCondition: data.eventDateCondition || null,
          };

          const pipelineResponse = await apiRequest(
            "POST",
            "/api/automations",
            pipelineAutomationData,
          );
          const pipelineAutomation = await pipelineResponse.json();
          createdAutomations.push(pipelineAutomation);

          // Create business trigger for pipeline automation
          if (data.triggerEvent) {
            await apiRequest("POST", "/api/business-triggers", {
              automationId: pipelineAutomation.id,
              triggerType: data.triggerEvent,
              enabled: true,
            });
          }
        }

        return createdAutomations;
      } catch (error) {
        // Rollback: delete any created automations
        for (const automation of createdAutomations) {
          try {
            await apiRequest("DELETE", `/api/automations/${automation.id}`);
          } catch (rollbackError) {
            console.error(
              "Failed to rollback automation creation:",
              rollbackError,
            );
          }
        }
        throw error;
      }
    },
    onSuccess: (createdAutomations) => {
      const count = createdAutomations.length;
      console.log("✅ Automation(s) created successfully:", createdAutomations);
      toast({
        title: `${count > 1 ? "Automations" : "Automation"} created successfully`,
        description: `Created ${count} automation${count > 1 ? "s" : ""} successfully.`,
      });
      console.log(
        '🔄 Invalidating queries with key: ["/api/automations", activeProjectType]',
      );
      queryClient.invalidateQueries({
        queryKey: ["/api/automations", activeProjectType],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] }); // Also invalidate base key for safety
      queryClient.invalidateQueries({ queryKey: ["/api/automations/count"] }); // Invalidate count for first-automation check
      console.log("🚪 Closing dialog and resetting form");
      setCreateDialogOpen(false);
      form.reset();
      setTimingMode(null);
      setEnableCommunication(true);
      setEnablePipeline(false);
    },
    onError: (error: any) => {
      console.error("Create automation error:", error);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      toast({
        title: "Failed to create automation",
        description: error?.message || "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Handler for the new modern wizard - converts wizard data to mutation format
  // The mutation handles different trigger modes with specialized logic
  const handleWizardSubmit = (wizardData: {
    name: string;
    triggerMode: "STAGE" | "BUSINESS" | "TIME";
    triggerStageId: string | null;
    triggerEvent: string | null;
    stageCondition?: string | null;
    channel: "EMAIL" | "SMS";
    enableCommunication: boolean;
    enablePipeline: boolean;
    moveToStageId: string | null;
    templateSubject: string;
    templateBody: string;
    delayDays: number;
    delayHours: number;
    delayMinutes: number;
    timingMode: "immediate" | "delayed" | null;
    daysBefore: number;
    triggerTiming: "BEFORE" | "AFTER";
    includeHeader: boolean;
    includeFooter: boolean;
  }) => {
    console.log("🚀 handleWizardSubmit - Input wizard data:", wizardData);

    const isImmediate = wizardData.timingMode === "immediate";

    // Calculate delays based on trigger mode
    // For STAGE triggers: consolidate into delayDays (mutation calculates total minutes from delayDays)
    // For TIME triggers: use daysBefore field
    // For BUSINESS triggers: no delay (fires on event)
    let computedDelayDays = 0;
    let computedDelayHours = 0;
    let computedDelayMinutes = 0;

    if (wizardData.triggerMode === "STAGE" && !isImmediate) {
      // Consolidate to delayDays if 1+ days, otherwise use hours/minutes
      if (wizardData.delayDays >= 1) {
        computedDelayDays = wizardData.delayDays;
        computedDelayHours = 0;
        computedDelayMinutes = 0;
      } else {
        computedDelayDays = 0;
        computedDelayHours = wizardData.delayHours;
        computedDelayMinutes = wizardData.delayMinutes;
      }
    }

    // Determine anchorType based on trigger mode
    // STAGE: STAGE_ENTRY (fires when contact enters stage)
    // TIME/BEFORE: BOOKING_START (fires relative to booking start)
    // TIME/AFTER: BOOKING_END (fires relative to booking end)
    let anchorType: "STAGE_ENTRY" | "BOOKING_START" | "BOOKING_END" =
      "STAGE_ENTRY";
    if (wizardData.triggerMode === "TIME") {
      anchorType =
        wizardData.triggerTiming === "BEFORE" ? "BOOKING_START" : "BOOKING_END";
    }

    // Determine countdownAction for TIME triggers
    const countdownAction =
      wizardData.triggerMode === "TIME" &&
      wizardData.enablePipeline &&
      !wizardData.enableCommunication
        ? "STAGE_CHANGE"
        : "MESSAGE";

    // Set component state for timingMode so mutation can use it
    // (The mutation references component state for timing calculations)
    setTimingMode(isImmediate ? "immediate" : "delayed");

    // Build the form data that the mutation expects
    const formData: any = {
      // Basic info
      name: wizardData.name,
      enabled: true,

      // Trigger configuration
      triggerMode: wizardData.triggerMode,
      triggerStageId: wizardData.triggerStageId || "",
      triggerEvent: wizardData.triggerEvent || "",

      // Action flags
      enableCommunication: wizardData.enableCommunication,
      enablePipeline: wizardData.enablePipeline,

      // Channel for communication
      channel: wizardData.channel,

      // Target stage for pipeline actions
      targetStageId: wizardData.moveToStageId || "",

      // Delay configuration (consolidated for mutation's calculations)
      delayDays: computedDelayDays,
      delayHours: computedDelayHours,
      delayMinutes: computedDelayMinutes,
      anchorType: anchorType,

      // TIME trigger specific fields (for COUNTDOWN automations)
      daysBefore: wizardData.daysBefore,
      triggerTiming: wizardData.triggerTiming,
      triggerHour: 9,
      triggerMinute: 0,
      countdownAction: countdownAction,
      eventType:
        wizardData.triggerMode === "BUSINESS"
          ? wizardData.triggerEvent || "placeholder"
          : "placeholder",
      stageCondition: wizardData.stageCondition || "all",
      orLess: false,

      // SMS configuration - provide custom message for SMS
      customSmsContent:
        wizardData.channel === "SMS"
          ? wizardData.templateBody ||
            "Hi {{contact_first_name}}, thank you for reaching out! We will be in touch soon."
          : "",

      // Email configuration - use templateBody format
      useEmailBuilder:
        wizardData.channel === "EMAIL" && wizardData.templateBody.trim() !== "",
      emailSubject:
        wizardData.channel === "EMAIL" ? wizardData.templateSubject : "",
      templateBody:
        wizardData.channel === "EMAIL" ? wizardData.templateBody : "",
      htmlBody:
        wizardData.channel === "EMAIL" && wizardData.templateBody.trim() !== ""
          ? templateBodyToHtml(wizardData.templateBody)
          : "",

      // Email branding settings
      includeHeader: wizardData.includeHeader ?? false,
      includeSignature: wizardData.includeFooter ?? true,

      // Template placeholders - wizard creates basic automations
      // Users can add templates later via edit form
      templateId: "",
      smartFileTemplateId: "",
      questionnaireTemplateId: "",
    };

    console.log("🚀 handleWizardSubmit - Converted to form data:", formData);
    console.log(
      "🔧 Component timingMode set to:",
      isImmediate ? "immediate" : "scheduled",
    );

    // Use existing mutation which handles all the complex logic
    createAutomationMutation.mutate(formData);
  };

  const handleCreateAutomation = async (data: UnifiedFormData) => {
    console.log("🚀 handleCreateAutomation called with data:", data);
    console.log("📋 Channel:", data.channel);
    console.log("📁 Smart File Template ID:", data.smartFileTemplateId);

    // Use cached auto-generated name or generate new one if no name was provided
    if (!data.name || data.name.trim() === "") {
      data.name = cachedAutoName || generateAutomationName();
    }

    // If using custom email builder, add email blocks directly to automation
    if (data.channel === "EMAIL" && emailBuilderMode === "build") {
      try {
        // Validate custom email
        if (!customEmailSubject.trim()) {
          toast({
            title: "Subject required",
            description: "Please enter an email subject line",
            variant: "destructive",
          });
          return;
        }

        if (!customTemplateBody || !customTemplateBody.trim()) {
          toast({
            title: "Content required",
            description: "Please add content to your email",
            variant: "destructive",
          });
          return;
        }

        // Add template body and generate HTML for automation data
        (data as any).useEmailBuilder = true;
        (data as any).emailSubject = customEmailSubject;
        (data as any).templateBody = customTemplateBody;
        (data as any).htmlBody = templateBodyToHtml(customTemplateBody);
        (data as any).includeHeroImage = includeHeroImage;
        (data as any).heroImageUrl = includeHeroImage
          ? heroImageUrl
          : undefined;
        (data as any).includeHeader = includeHeader;
        (data as any).headerStyle = includeHeader ? headerStyle : undefined;
        (data as any).includeSignature = includeSignature;
        (data as any).signatureStyle = includeSignature
          ? signatureStyle
          : undefined;

        // Optionally save as template if user requested
        if (saveAsTemplate && newTemplateName.trim()) {
          try {
            await apiRequest("POST", "/api/templates", {
              name: newTemplateName,
              channel: "EMAIL",
              subject: customEmailSubject,
              templateBody: customTemplateBody,
              htmlBody: templateBodyToHtml(customTemplateBody),
              includeHeroImage,
              heroImageUrl: includeHeroImage ? heroImageUrl : undefined,
              includeHeader,
              headerStyle: includeHeader ? headerStyle : undefined,
              includeSignature,
              signatureStyle: includeSignature ? signatureStyle : undefined,
            });

            toast({
              title: "Template saved",
              description: `"${newTemplateName}" has been saved to your templates`,
            });
          } catch (error: any) {
            // Don't fail the automation creation if template save fails
            console.error("Failed to save template:", error);
          }
        }
      } catch (error: any) {
        toast({
          title: "Validation failed",
          description:
            error.message || "An error occurred while validating the email",
          variant: "destructive",
        });
        return;
      }
    }

    // Normalize smartFileTemplateId: convert empty string to null/undefined
    if (
      data.smartFileTemplateId === "" ||
      data.smartFileTemplateId === "none"
    ) {
      (data as any).smartFileTemplateId = undefined;
    }

    createAutomationMutation.mutate(data);
  };

  const handleDeleteAutomation = (automationId: string) => {
    deleteAutomationMutation.mutate(automationId);
  };

  // Conversational AI chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/automations/chat", {
        message,
        conversationHistory: chatMessages,
        currentState: conversationState,
        projectType: activeProjectType,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      // Add AI's response to chat
      const aiMessage = {
        role: "assistant" as const,
        content: data.state.nextQuestion,
      };
      setChatMessages((prev) => [...prev, aiMessage]);
      setConversationState(data.state);
      setCurrentChatMessage("");

      // If automation was created, show success in chat with action buttons
      if (data.created) {
        queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/automations/count"] });
        // Reset state but keep dialog open with success message
        setConversationState({
          ...data.state,
          showSuccessActions: true,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to process message",
        variant: "destructive",
      });
    },
  });

  const handleSendChatMessage = () => {
    if (!currentChatMessage.trim()) return;

    // Add user message to chat
    const userMessage = { role: "user" as const, content: currentChatMessage };
    setChatMessages((prev) => [...prev, userMessage]);

    // Send to AI
    chatMutation.mutate(currentChatMessage);
  };

  const startConversationalAI = () => {
    const firstName = photographer?.name?.split(" ")[0] || "";
    const greeting = firstName
      ? `Hi ${firstName}! I'll help you create an automation.`
      : "Hi! I'll help you create an automation.";

    setChatMessages([
      {
        role: "assistant",
        content: `${greeting} What would you like to automate?\n\nYou can describe it naturally, like:\n- "Send a thank you email 1 day after booking"\n- "Text them 5 minutes after inquiry"\n- "Send proposal when they enter consultation"`,
      },
    ]);
    setConversationState(null);
    setChatDialogOpen(true);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    const userMessage = { role: "user" as const, content: prompt };
    setChatMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(prompt);
  };

  const resetConversation = () => {
    const firstName = photographer?.name?.split(" ")[0] || "";
    const greeting = firstName
      ? `Hi ${firstName}! I'll help you create an automation.`
      : "Hi! I'll help you create an automation.";

    setChatMessages([
      {
        role: "assistant",
        content: `${greeting} What would you like to automate?\n\nYou can describe it naturally, like:\n- "Send a thank you email 1 day after booking"\n- "Text them 5 minutes after inquiry"\n- "Send proposal when they enter consultation"`,
      },
    ]);
    setConversationState(null);
    setCurrentChatMessage("");
  };

  // Toggle automation mutation
  const toggleAutomationMutation = useMutation({
    mutationFn: async ({
      automationId,
      enabled,
    }: {
      automationId: string;
      enabled: boolean;
    }) => {
      return apiRequest("PATCH", `/api/automations/${automationId}`, {
        enabled,
      });
    },
    onSuccess: () => {
      toast({ title: "Automation updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/automations/count"] }); // Invalidate count for first-automation check
    },
    onError: () => {
      toast({ title: "Failed to update automation", variant: "destructive" });
    },
  });

  // Delete all automations mutation
  const deleteAllAutomationsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/automations/project-type/${activeProjectType}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation: "delete" }),
          credentials: "include",
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete automations");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "All Automations Deleted",
        description: `Successfully removed ${data.deletedCount} automations`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/automations/count"] });
      setDeleteAllDialogOpen(false);
      setDeleteConfirmation("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete automations",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit automation mutation - comprehensive update
  const editAutomationMutation = useMutation({
    mutationFn: async (data: UnifiedFormData) => {
      if (!editingAutomation) throw new Error("No automation selected");

      const automationId = editingAutomation.id;

      // Build update data based on form values
      const updateData: any = {
        name: data.name,
        enabled: data.enabled,
        eventDateCondition: data.eventDateCondition || null,
      };

      // Add trigger-specific fields
      if (data.triggerMode === "STAGE") {
        updateData.stageId =
          data.triggerStageId && data.triggerStageId !== "global"
            ? data.triggerStageId
            : null;
      } else if (data.triggerMode === "BUSINESS") {
        updateData.stageCondition =
          data.stageCondition && data.stageCondition !== "all"
            ? data.stageCondition
            : null;
      } else if (data.triggerMode === "TIME") {
        updateData.daysBefore = data.daysBefore;
        updateData.triggerTiming = data.triggerTiming;
        updateData.triggerHour = data.triggerHour;
        updateData.triggerMinute = data.triggerMinute;
        updateData.eventType = data.eventType;
        updateData.stageCondition =
          data.stageCondition && data.stageCondition !== "all"
            ? data.stageCondition
            : null;
        updateData.eventDateCondition = null; // Countdown automations can't have this condition
      }

      // Add communication-specific fields
      if (editingAutomation.automationType === "COMMUNICATION") {
        updateData.channel = data.channel;
        updateData.templateId =
          data.templateId && data.templateId !== "unavailable"
            ? data.templateId
            : null;
        updateData.questionnaireTemplateId =
          data.questionnaireTemplateId &&
          data.questionnaireTemplateId !== "unavailable" &&
          data.questionnaireTemplateId !== "none"
            ? data.questionnaireTemplateId
            : null;
      }

      // Add pipeline-specific fields
      if (editingAutomation.automationType === "PIPELINE_CHANGE") {
        updateData.targetStage = data.targetStageId;
      }

      return apiRequest(
        "PATCH",
        `/api/automations/${automationId}`,
        updateData,
      );
    },
    onSuccess: () => {
      toast({ title: "Automation updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/automations/count"] }); // Invalidate count for first-automation check
      setEditDialogOpen(false);
      setEditingAutomation(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update automation",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Note: updateEmailBuilderMutation is defined at the top of the component

  // Update SMS step content mutation
  const updateSmsStepMutation = useMutation({
    mutationFn: async (smsData: { stepId: string; content: string }) => {
      return apiRequest("PATCH", `/api/automation-steps/${smsData.stepId}`, {
        customSmsContent: smsData.content,
      });
    },
    onSuccess: () => {
      toast({ title: "SMS message updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      setEditingSmsStep(null);
      setSmsEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to update SMS message", variant: "destructive" });
    },
  });

  const handleToggleAutomation = (automationId: string, enabled: boolean) => {
    toggleAutomationMutation.mutate({ automationId, enabled });
  };

  const handleEditAutomation = (automation: any) => {
    setEditingAutomation(automation);
    setEditDialogOpen(true);
  };

  // Helper function to auto-generate automation name from trigger + action + timing
  const generateAutomationName = () => {
    const triggerMode = form.watch("triggerMode");
    const triggerStageId = form.watch("triggerStageId");
    const triggerEvent = form.watch("triggerEvent");
    const daysBefore = form.watch("daysBefore");
    const triggerTiming = form.watch("triggerTiming");
    const eventType = form.watch("eventType");
    const channel = form.watch("channel");

    // Build trigger part
    let triggerPart = "";
    if (triggerMode === "STAGE") {
      if (triggerStageId === "global") {
        triggerPart = "Any Stage";
      } else {
        const stage = stages?.find((s: any) => s.id === triggerStageId);
        triggerPart = stage?.name || "Stage";
      }
    } else if (triggerMode === "BUSINESS") {
      const eventLabels: Record<string, string> = {
        ANY_PAYMENT_MADE: "Payment",
        DEPOSIT_PAID: "Deposit",
        FULL_PAYMENT_MADE: "Full Payment",
        PROJECT_BOOKED: "Booked",
        SMART_FILE_ACCEPTED: "Proposal Accepted",
        SMART_FILE_SENT: "Proposal Sent",
        EVENT_DATE_REACHED: "Event Date",
        PROJECT_DELIVERED: "Delivered",
        CLIENT_ONBOARDED: "Onboarded",
        APPOINTMENT_BOOKED: "Appointment",
        GALLERY_SHARED: "Gallery Shared",
      };
      triggerPart = eventLabels[triggerEvent || ""] || "Event";
    } else if (triggerMode === "TIME") {
      const timing = triggerTiming === "BEFORE" ? "before" : "after";
      triggerPart = `${daysBefore || "?"}d ${timing}`;
    }

    // Build action part
    let actionPart = "";
    if (enableCommunication) {
      if (channel === "EMAIL") actionPart = "Email";
      else if (channel === "SMS") actionPart = "SMS";
      else if (channel === "SMART_FILE") actionPart = "Smart File";
      else actionPart = "Message";
    }
    if (enablePipeline) {
      const targetStageId = form.watch("targetStageId");
      const targetStage = stages?.find((s: any) => s.id === targetStageId);
      actionPart += actionPart ? ` + Move` : "Move";
      if (targetStage) actionPart += ` to ${targetStage.name}`;
    }

    // Build timing part
    let timingPart = "";
    if (timingMode === "immediate") {
      timingPart = "(Immediate)";
    } else if (timingMode === "delayed") {
      const days = form.watch("delayDays") || 0;
      const hours = form.watch("delayHours") || 0;
      if (days > 0) timingPart = `(+${days}d)`;
      else if (hours > 0) timingPart = `(+${hours}h)`;
      else timingPart = "(Delayed)";
    }

    // Combine parts
    const parts = [triggerPart, actionPart, timingPart].filter(Boolean);
    return parts.join(" → ") || "New Automation";
  };

  // Helper function to get trigger summary for breadcrumb display
  const getTriggerSummary = () => {
    const triggerMode = form.watch("triggerMode");
    const triggerStageId = form.watch("triggerStageId");
    const triggerEvent = form.watch("triggerEvent");
    const daysBefore = form.watch("daysBefore");
    const triggerTiming = form.watch("triggerTiming");
    const eventType = form.watch("eventType");

    if (triggerMode === "STAGE") {
      if (triggerStageId === "global") {
        return { icon: "🎯", text: "Any Stage Entry" };
      }
      const stage = stages?.find((s: any) => s.id === triggerStageId);
      return {
        icon: "🎯",
        text: stage ? `Stage: ${stage.name}` : "Stage Entry",
      };
    } else if (triggerMode === "BUSINESS") {
      const eventLabels: Record<string, string> = {
        ANY_PAYMENT_MADE: "Any Payment Made",
        DEPOSIT_PAID: "Deposit Payment",
        FULL_PAYMENT_MADE: "Full Payment",
        PROJECT_BOOKED: "Project Booked",
        SMART_FILE_ACCEPTED: "Smart File Accepted",
        SMART_FILE_SENT: "Smart File Sent",
        EVENT_DATE_REACHED: "Event Date Reached",
        PROJECT_DELIVERED: "Project Delivered",
        CLIENT_ONBOARDED: "Client Onboarded",
        APPOINTMENT_BOOKED: "Appointment Booked",
        GALLERY_SHARED: "Gallery Shared",
      };
      return {
        icon: "💼",
        text: eventLabels[triggerEvent || ""] || "Business Event",
      };
    } else if (triggerMode === "TIME") {
      const eventLabels: Record<string, string> = {
        EVENT_DATE: "Event Date",
        BOOKING_START: "Booking Start",
        BOOKING_END: "Booking End",
      };
      const timing = triggerTiming === "BEFORE" ? "before" : "after";
      const event = eventLabels[eventType || ""] || "date";
      return {
        icon: "⏰",
        text: `${daysBefore || "?"} days ${timing} ${event}`,
      };
    }
    return { icon: "🔔", text: "Not configured" };
  };

  // Wizard navigation functions
  const canProceedToStep2 = () => {
    // Step 1 is now just an intro - always allow proceeding
    return true;
  };

  const canProceedToStep3 = () => {
    const triggerMode = form.watch("triggerMode");
    if (triggerMode === "STAGE") {
      return !!form.watch("triggerStageId");
    } else if (triggerMode === "BUSINESS") {
      return !!form.watch("triggerEvent");
    } else if (triggerMode === "TIME") {
      const hasBasicTimeFields =
        !!form.watch("daysBefore") &&
        !!form.watch("eventType") &&
        form.watch("eventType") !== "placeholder";
      // For countdown stage changes, also require target stage
      if (form.watch("countdownAction") === "STAGE_CHANGE") {
        return hasBasicTimeFields && !!form.watch("targetStageId");
      }
      return hasBasicTimeFields;
    }
    return false;
  };

  const canProceedToStep4 = () => {
    // Countdown stage changes skip steps 3-4 entirely
    if (isCountdownStageChange) return true;
    // At least one action type must be enabled
    return enableCommunication || enablePipeline;
  };

  const canProceedToStep5 = () => {
    // Countdown stage changes skip steps 3-4 entirely
    if (isCountdownStageChange) return true;
    // Validate content based on what's enabled
    if (enableCommunication) {
      // Require explicit timing selection
      if (timingMode === null) return false;

      const channel = form.watch("channel");
      if (channel === "SMART_FILE") {
        return (
          !!form.watch("smartFileTemplateId") &&
          form.watch("smartFileTemplateId") !== "unavailable"
        );
      } else if (channel === "SMS") {
        const hasTemplate =
          form.watch("templateId") &&
          form.watch("templateId") !== "unavailable";
        const hasCustom =
          form.watch("smsMessageType") === "custom" &&
          !!form.watch("customSmsContent");
        return hasTemplate || hasCustom;
      } else if (channel === "EMAIL") {
        const hasTemplate =
          form.watch("templateId") &&
          form.watch("templateId") !== "unavailable";
        const builderMode = form.watch("emailBuilderMode");
        const blocks = form.watch("customTemplateBody");
        const subject = form.watch("customEmailSubject");
        const hasCustom =
          builderMode === "build" &&
          blocks &&
          Array.isArray(blocks) &&
          blocks.length > 0 &&
          subject &&
          subject.trim().length > 0;
        return hasTemplate || hasCustom;
      }
    }
    if (enablePipeline) {
      return !!form.watch("targetStageId");
    }
    return false;
  };

  // Determine if "Next" button should be enabled based on current step
  const canProceedFromCurrentStep = () => {
    if (wizardStep === 1) return canProceedToStep2();
    if (wizardStep === 2) {
      // For countdown stage changes, validate target stage is selected then skip to review
      if (isCountdownStageChange) {
        return !!form.watch("targetStageId");
      }
      return canProceedToStep3();
    }
    // For countdown stage changes, steps 3 and 4 don't exist - step 3 is the review step
    if (isCountdownStageChange) {
      return true; // Already at review step
    }
    if (wizardStep === 3) return canProceedToStep4();
    if (wizardStep === 4) return canProceedToStep5();
    return true;
  };

  // Reset wizardStep when switching to countdown stage change (fewer steps)
  useEffect(() => {
    if (isCountdownStageChange && wizardStep > totalSteps) {
      setWizardStep(totalSteps);
    }
  }, [isCountdownStageChange, totalSteps, wizardStep]);

  const handleNextStep = () => {
    if (wizardStep < totalSteps) {
      const nextStep = wizardStep + 1;
      // When entering the final step (Review), cache the auto-generated name if user hasn't set one
      if (nextStep === totalSteps && !form.watch("name")) {
        const autoName = generateAutomationName();
        setCachedAutoName(autoName);
        form.setValue("name", autoName);
      }
      setWizardStep(nextStep);
    }
  };

  const handlePrevStep = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Return null if not authenticated (redirect handled by useEffect)
  if (!user) {
    return null;
  }

  // Calculate board width based on visible stages
  // Single stage: 500px, Multiple stages: each column ~250px + 16px gaps
  const visibleStagesCount = boardStageFilter ? 1 : stages?.length || 5;
  const boardWidth = boardStageFilter
    ? 500 // Single stage max width
    : Math.max(800, visibleStagesCount * 250 + (visibleStagesCount - 1) * 16);

  return (
    <div>
      {/* Header */}
      <header className="px-4 md:px-6 pt-4 pb-2 relative">
        <div className="max-w-[1140px]">
          <h1 className="text-xl md:text-2xl font-semibold">Automations</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Set up automated email and SMS workflows for each stage
          </p>
        </div>
      </header>
      {/* New Modern Automation Wizard */}
      <AutomationWizard
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleWizardSubmit}
        isPending={createAutomationMutation.isPending}
        stages={
          Array.isArray(stages)
            ? stages.map((s: any) => ({ id: s.id, name: s.name }))
            : []
        }
        projectTypeName={activeProjectType}
        automationCount={totalAutomationCount}
        isAutomationCountLoading={isAutomationCountLoading}
        onOpenAiBuilder={startConversationalAI}
      />

      {/* Legacy Create Automation Dialog - Kept for reference but not rendered */}
      {false && (
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent
            className={`w-[95vw] ${emailBuilderMode === "build" && form.watch("channel") === "EMAIL" ? "max-w-7xl" : "sm:max-w-2xl"} max-h-[92vh] p-0 flex flex-col overflow-hidden`}
          >
            <DialogHeader className="sticky top-0 z-10 bg-background px-6 py-4 border-b">
              <DialogTitle>
                Create new {activeProjectType.toLowerCase()} automation
              </DialogTitle>
              <DialogDescription>
                Save time by automating routine tasks for your clients
              </DialogDescription>
              {/* Progress Indicator */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>
                    Step {wizardStep} of {totalSteps}
                  </span>
                  <span className="text-xs">
                    {wizardStep === 1 && "Getting Started"}
                    {wizardStep === 2 && "When to Trigger"}
                    {isCountdownStageChange ? (
                      wizardStep === 3 && "Review & Activate"
                    ) : (
                      <>
                        {wizardStep === 3 && "Choose an Action"}
                        {wizardStep === 4 && "Configure Action"}
                        {wizardStep === 5 && "Review & Activate"}
                      </>
                    )}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(wizardStep / totalSteps) * 100}%` }}
                  />
                </div>
              </div>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={(e) => {
                  e.preventDefault(); // Always prevent default form submission
                  console.log(
                    "📝 Form onSubmit fired, wizardStep:",
                    wizardStep,
                    "totalSteps:",
                    totalSteps,
                  );

                  // Only allow submission at step 5
                  if (wizardStep !== totalSteps) {
                    console.log("🚫 Not at final step, blocking submission");
                    return false;
                  }

                  console.log(
                    "✅ At final step, calling handleCreateAutomation",
                  );
                  form.handleSubmit(handleCreateAutomation)(e);
                }}
                onKeyDown={(e) => {
                  // Prevent Enter key from submitting the form unless at step 5
                  if (e.key === "Enter" && wizardStep !== totalSteps) {
                    e.preventDefault();
                    console.log("🚫 Enter key blocked - not at final step");
                  }
                }}
                className="flex flex-col min-h-0 flex-1"
              >
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-8">
                  {/* Step 1: Getting Started - Skip naming, just intro */}
                  {wizardStep === 1 && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
                          1
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">
                            Let's Create an Automation
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            We'll guide you through setting up an automated
                            workflow
                          </p>
                        </div>
                      </div>

                      <div className="ml-11 p-4 border rounded-lg bg-card">
                        <div className="space-y-4">
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <span className="text-2xl">🎯</span>
                            <div>
                              <p className="font-medium">Step-by-step setup</p>
                              <p className="text-sm text-muted-foreground">
                                We'll walk you through choosing a trigger,
                                action, and timing. Your automation name will be
                                generated automatically based on your choices.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <span className="text-2xl">✨</span>
                            <div>
                              <p className="font-medium">Smart naming</p>
                              <p className="text-sm text-muted-foreground">
                                No need to think of a name now — we'll create a
                                descriptive name for you, and you can edit it at
                                the end if you'd like.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: When (Trigger) */}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
                          2
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">
                            When should this happen?
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Choose what event will start this automation
                          </p>
                        </div>
                      </div>

                      <div className="ml-11 space-y-4 p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                        {/* Trigger Mode Radio Buttons */}
                        <FormField
                          control={form.control}
                          name="triggerMode"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="flex flex-col space-y-2"
                                  data-testid="radio-trigger-mode"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value="STAGE"
                                      id="trigger-stage"
                                      data-testid="radio-trigger-stage"
                                    />
                                    <Label
                                      htmlFor="trigger-stage"
                                      className="flex items-center space-x-2 cursor-pointer"
                                    >
                                      <Users className="h-4 w-4" />
                                      <span>When a client enters a stage</span>
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value="BUSINESS"
                                      id="trigger-business"
                                      data-testid="radio-trigger-business"
                                    />
                                    <Label
                                      htmlFor="trigger-business"
                                      className="flex items-center space-x-2 cursor-pointer"
                                    >
                                      <Zap className="h-4 w-4" />
                                      <span>When a business event happens</span>
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem
                                      value="TIME"
                                      id="trigger-time"
                                      data-testid="radio-trigger-time"
                                    />
                                    <Label
                                      htmlFor="trigger-time"
                                      className="flex items-center space-x-2 cursor-pointer"
                                    >
                                      <Clock className="h-4 w-4" />
                                      <span>Based on event date</span>
                                    </Label>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Stage-based Trigger Fields */}
                        {form.watch("triggerMode") === "STAGE" && (
                          <FormField
                            control={form.control}
                            name="triggerStageId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Which stage triggers this?
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value || ""}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-trigger-stage">
                                      <SelectValue placeholder="Select the stage that triggers this" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="global">
                                      All Stages (Global trigger)
                                    </SelectItem>
                                    {Array.isArray(stages) &&
                                      stages.map((stage: any) => (
                                        <SelectItem
                                          key={stage.id}
                                          value={stage.id}
                                        >
                                          {stage.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  The automation starts when a client moves into
                                  this stage
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Business Event Trigger Fields */}
                        {form.watch("triggerMode") === "BUSINESS" && (
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="triggerEvent"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Which business event?</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-trigger-event">
                                        <SelectValue placeholder="Select the business event" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="ANY_PAYMENT_MADE">
                                        💰 Any Payment Made
                                      </SelectItem>
                                      <SelectItem value="DEPOSIT_PAID">
                                        💳 Deposit Payment Received
                                      </SelectItem>
                                      <SelectItem value="FULL_PAYMENT_MADE">
                                        ✅ Full Payment Completed
                                      </SelectItem>
                                      <SelectItem value="PROJECT_BOOKED">
                                        📋 Project Booked/Contract Signed
                                      </SelectItem>
                                      <SelectItem value="SMART_FILE_ACCEPTED">
                                        📄 Smart File Accepted
                                      </SelectItem>
                                      <SelectItem value="SMART_FILE_SENT">
                                        📤 Smart File Sent
                                      </SelectItem>
                                      <SelectItem value="EVENT_DATE_REACHED">
                                        📅 Event Date Reached
                                      </SelectItem>
                                      <SelectItem value="PROJECT_DELIVERED">
                                        📦 Project Delivered
                                      </SelectItem>
                                      <SelectItem value="CLIENT_ONBOARDED">
                                        🎯 Client Onboarded
                                      </SelectItem>
                                      <SelectItem value="APPOINTMENT_BOOKED">
                                        📅 Appointment Booked
                                      </SelectItem>
                                      <SelectItem value="GALLERY_SHARED">
                                        🖼️ Gallery Shared
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    The automation starts when this happens in
                                    your business
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="stageCondition"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    Only trigger when client is in stage
                                    (optional)
                                  </FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value || "all"}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-stage-condition">
                                        <SelectValue placeholder="Select a stage or leave as 'All Stages'" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="all">
                                        All Stages
                                      </SelectItem>
                                      {stages?.map((stage: any) => (
                                        <SelectItem
                                          key={stage.id}
                                          value={stage.id}
                                        >
                                          {stage.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Limit this trigger to only fire when the
                                    client is in a specific stage
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {/* Time-based Trigger Fields */}
                        {form.watch("triggerMode") === "TIME" && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="daysBefore"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Number of Days</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="1"
                                        max="365"
                                        placeholder="e.g., 7"
                                        data-testid="input-days-before"
                                        {...field}
                                        onChange={(e) =>
                                          field.onChange(
                                            parseInt(e.target.value) || 0,
                                          )
                                        }
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="triggerTiming"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Before or After?</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger data-testid="select-trigger-timing">
                                          <SelectValue placeholder="Select timing" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="BEFORE">
                                          Before
                                        </SelectItem>
                                        <SelectItem value="AFTER">
                                          After
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name="eventType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Based on which date?</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-event-type">
                                        <SelectValue placeholder="Choose which date to count from" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="placeholder" disabled>
                                        Select a reference date...
                                      </SelectItem>
                                      <SelectItem value="EVENT_DATE">
                                        📅 Event/Wedding Date
                                      </SelectItem>
                                      <SelectItem value="BOOKING_START">
                                        📞 Scheduled Booking Start
                                      </SelectItem>
                                      <SelectItem value="BOOKING_END">
                                        📞 Scheduled Booking End
                                      </SelectItem>
                                      <SelectItem value="DELIVERY_DATE">
                                        📦 Delivery Date
                                      </SelectItem>
                                      <SelectItem value="CONSULTATION_DATE">
                                        💬 Consultation Date
                                      </SelectItem>
                                      <SelectItem value="SHOOT_DATE">
                                        📸 Shoot Date
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    {form.watch("eventType") ===
                                      "BOOKING_START" ||
                                    form.watch("eventType") === "BOOKING_END"
                                      ? "The automation will trigger relative to your scheduled booking/call time"
                                      : "The automation will count days from this date"}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="triggerHour"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>At what time? (Hour)</FormLabel>
                                    <Select
                                      onValueChange={(value) =>
                                        field.onChange(parseInt(value))
                                      }
                                      value={field.value?.toString()}
                                    >
                                      <FormControl>
                                        <SelectTrigger data-testid="select-trigger-hour">
                                          <SelectValue placeholder="Select hour" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {Array.from({ length: 24 }, (_, i) => (
                                          <SelectItem
                                            key={i}
                                            value={i.toString()}
                                          >
                                            {i.toString().padStart(2, "0")}:00{" "}
                                            {i < 12 ? "AM" : "PM"}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="triggerMinute"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Minute</FormLabel>
                                    <Select
                                      onValueChange={(value) =>
                                        field.onChange(parseInt(value))
                                      }
                                      value={field.value?.toString()}
                                    >
                                      <FormControl>
                                        <SelectTrigger data-testid="select-trigger-minute">
                                          <SelectValue placeholder="Select minute" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {[0, 15, 30, 45].map((minute) => (
                                          <SelectItem
                                            key={minute}
                                            value={minute.toString()}
                                          >
                                            :
                                            {minute.toString().padStart(2, "0")}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name="stageCondition"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    Only for clients in (Optional)
                                  </FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-stage-condition">
                                        <SelectValue placeholder="Leave blank for all clients, or choose a stage" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="all">
                                        All Stages
                                      </SelectItem>
                                      {stages?.map((stage: any) => (
                                        <SelectItem
                                          key={stage.id}
                                          value={stage.id}
                                        >
                                          {stage.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Leave blank to include all clients, or pick
                                    a specific stage
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Countdown Action Type Selector */}
                            <FormField
                              control={form.control}
                              name="countdownAction"
                              render={({ field }) => (
                                <FormItem className="space-y-3">
                                  <FormLabel>
                                    What should happen at this time?
                                  </FormLabel>
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={field.onChange}
                                      value={field.value}
                                      className="flex flex-col space-y-2"
                                      data-testid="radio-countdown-action"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem
                                          value="MESSAGE"
                                          id="countdown-message"
                                          data-testid="radio-countdown-message"
                                        />
                                        <Label
                                          htmlFor="countdown-message"
                                          className="flex items-center space-x-2 cursor-pointer"
                                        >
                                          <Mail className="h-4 w-4" />
                                          <span>
                                            Send a message (Email/SMS)
                                          </span>
                                        </Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem
                                          value="STAGE_CHANGE"
                                          id="countdown-stage"
                                          data-testid="radio-countdown-stage"
                                        />
                                        <Label
                                          htmlFor="countdown-stage"
                                          className="flex items-center space-x-2 cursor-pointer"
                                        >
                                          <ArrowRight className="h-4 w-4" />
                                          <span>
                                            Automatically move to a different
                                            stage
                                          </span>
                                        </Label>
                                      </div>
                                    </RadioGroup>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Target Stage for Stage Change Action */}
                            {form.watch("countdownAction") ===
                              "STAGE_CHANGE" && (
                              <FormField
                                control={form.control}
                                name="targetStageId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Move client to which stage?
                                    </FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value || ""}
                                    >
                                      <FormControl>
                                        <SelectTrigger data-testid="select-countdown-target-stage">
                                          <SelectValue placeholder="Select target stage" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {stages?.map((stage: any) => (
                                          <SelectItem
                                            key={stage.id}
                                            value={stage.id}
                                          >
                                            {stage.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormDescription>
                                      The client will automatically be moved to
                                      this stage
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            {/* OR LESS Toggle */}
                            <FormField
                              control={form.control}
                              name="orLess"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                  <div className="space-y-0.5">
                                    <FormLabel>
                                      Trigger immediately if already within
                                      threshold
                                    </FormLabel>
                                    <FormDescription>
                                      When enabled, if a client books{" "}
                                      {form.watch("daysBefore") || 7} days or
                                      less before their event, the automation
                                      triggers immediately
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-or-less"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Choose an Action - Skip for countdown stage changes which go straight to review */}
                  {wizardStep === 3 && !isCountdownStageChange && (
                    <div className="space-y-4">
                      {/* Trigger Breadcrumb - Persistent context */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border text-sm">
                        <span className="text-muted-foreground">Trigger:</span>
                        <span className="font-medium">
                          {getTriggerSummary().icon} {getTriggerSummary().text}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
                          3
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">
                            Choose an Action
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Select what this automation should do when triggered
                          </p>
                        </div>
                      </div>

                      <div className="ml-11 space-y-4 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={enableCommunication}
                              onCheckedChange={setEnableCommunication}
                              data-testid="switch-enable-communication"
                            />
                            <Label
                              className="flex items-center space-x-2 cursor-pointer"
                              onClick={() =>
                                setEnableCommunication(!enableCommunication)
                              }
                            >
                              <Mail className="h-4 w-4" />
                              <span className="font-medium">
                                Send a message (Email/SMS/Smart File)
                              </span>
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={enablePipeline}
                              onCheckedChange={setEnablePipeline}
                              data-testid="switch-enable-pipeline"
                            />
                            <Label
                              className="flex items-center space-x-2 cursor-pointer"
                              onClick={() => setEnablePipeline(!enablePipeline)}
                            >
                              <ArrowRight className="h-4 w-4" />
                              <span className="font-medium">
                                Move client to a different stage
                              </span>
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Configure Action - Only show when on Step 4 (skip for countdown stage changes) */}
                  {wizardStep === 4 && !isCountdownStageChange && (
                    <div className="space-y-4">
                      {/* Step 4: Configure Action */}
                      <div className="space-y-4">
                        {/* Trigger Breadcrumb - Persistent context */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border text-sm">
                          <span className="text-muted-foreground">
                            Trigger:
                          </span>
                          <span className="font-medium">
                            {getTriggerSummary().icon}{" "}
                            {getTriggerSummary().text}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
                            4
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">
                              Configure Action
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Set up the details for your automation action
                            </p>
                          </div>
                        </div>

                        <div className="ml-11 space-y-4">
                          {/* Communication Actions Toggle */}
                          <div className="flex items-center space-x-2 p-3 border rounded-lg">
                            <Switch
                              checked={enableCommunication}
                              onCheckedChange={setEnableCommunication}
                              data-testid="switch-enable-communication"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <Mail className="h-4 w-4" />
                                <Label className="font-medium">
                                  Send Messages
                                </Label>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Send emails, texts, or assign forms to clients
                              </p>
                            </div>
                          </div>

                          {/* Pipeline Actions Toggle */}
                          <div className="flex items-center space-x-2 p-3 border rounded-lg">
                            <Switch
                              checked={enablePipeline}
                              onCheckedChange={setEnablePipeline}
                              data-testid="switch-enable-pipeline"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <ArrowRight className="h-4 w-4" />
                                <Label className="font-medium">
                                  Move Projects
                                </Label>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {enablePipeline
                                  ? "Move projects to the next stage automatically"
                                  : "Automatically move projects through your pipeline"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Current Limitations Info */}
                        {enablePipeline &&
                        form.watch("triggerMode") === "STAGE" ? (
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                <p className="font-medium mb-1">
                                  Current Limitations:
                                </p>
                                <ul className="text-xs space-y-1">
                                  <li>
                                    • Stage-based triggers for pipeline actions
                                    are coming soon
                                  </li>
                                </ul>
                                <p className="text-xs mt-2 opacity-75">
                                  Currently supported: Stage triggers for
                                  communication, Business events for pipeline
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {/* Communication Automation Fields */}
                        {enableCommunication && (
                          <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-blue-600" />
                              <Label className="font-medium text-blue-900 dark:text-blue-100">
                                Message Settings
                              </Label>
                            </div>

                            <FormField
                              control={form.control}
                              name="channel"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Action Type</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-channel">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="EMAIL">
                                        📧 Send Email
                                      </SelectItem>
                                      <SelectItem value="SMS">
                                        📱 Send SMS
                                      </SelectItem>
                                      <SelectItem value="SMART_FILE">
                                        📄 Send Smart File
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {form.watch("channel") === "SMS" && (
                              <>
                                <FormField
                                  control={form.control}
                                  name="smsMessageType"
                                  render={({ field }) => (
                                    <FormItem className="space-y-3">
                                      <FormLabel>Message Type</FormLabel>
                                      <FormControl>
                                        <RadioGroup
                                          onValueChange={(value) => {
                                            field.onChange(value);
                                            // Clear the other field when switching
                                            if (value === "custom") {
                                              form.setValue("templateId", "");
                                            } else {
                                              form.setValue(
                                                "customSmsContent",
                                                "",
                                              );
                                            }
                                          }}
                                          value={field.value || "template"}
                                          className="flex flex-col space-y-1"
                                        >
                                          <div className="flex items-center space-x-2">
                                            <RadioGroupItem
                                              value="template"
                                              id="template"
                                            />
                                            <Label
                                              htmlFor="template"
                                              className="font-normal cursor-pointer"
                                            >
                                              Use Template
                                            </Label>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <RadioGroupItem
                                              value="custom"
                                              id="custom"
                                            />
                                            <Label
                                              htmlFor="custom"
                                              className="font-normal cursor-pointer"
                                            >
                                              Custom Message
                                            </Label>
                                          </div>
                                        </RadioGroup>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {form.watch("smsMessageType") === "custom" ? (
                                  <FormField
                                    control={form.control}
                                    name="customSmsContent"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>
                                          Custom SMS Message
                                        </FormLabel>
                                        <FormControl>
                                          <Textarea
                                            placeholder="Type your SMS message here... (supports variables like {{firstName}}, {{lastName}}, {{projectType}})"
                                            className="min-h-[100px]"
                                            {...field}
                                            data-testid="textarea-custom-sms"
                                          />
                                        </FormControl>
                                        <FormDescription>
                                          You can use variables: {"{{"}{" "}
                                          firstName {"}}"}, {"{{"} lastName{" "}
                                          {"}}"}, {"{{"} projectType {"}}"},{" "}
                                          {"{{"} eventDate {"}}"}
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                ) : (
                                  <FormField
                                    control={form.control}
                                    name="templateId"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>SMS Template</FormLabel>
                                        <Select
                                          onValueChange={field.onChange}
                                          value={field.value || ""}
                                        >
                                          <FormControl>
                                            <SelectTrigger data-testid="select-template">
                                              <SelectValue placeholder="Choose a message template" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {templates
                                              .filter(
                                                (t: any) => t.channel === "SMS",
                                              )
                                              .map((template: any) => (
                                                <SelectItem
                                                  key={template.id}
                                                  value={template.id}
                                                >
                                                  {template.name}
                                                </SelectItem>
                                              ))}
                                            {templates.filter(
                                              (t: any) => t.channel === "SMS",
                                            ).length === 0 && (
                                              <SelectItem
                                                value="unavailable"
                                                disabled
                                              >
                                                No SMS templates available -
                                                create templates first
                                              </SelectItem>
                                            )}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                )}
                              </>
                            )}

                            {form.watch("channel") === "EMAIL" && (
                              <div className="space-y-4">
                                {/* Mode Toggle */}
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant={
                                      emailBuilderMode === "select"
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      setEmailBuilderMode("select")
                                    }
                                    data-testid="button-mode-select"
                                  >
                                    📋 Select Template
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={
                                      emailBuilderMode === "build"
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() => setEmailBuilderMode("build")}
                                    data-testid="button-mode-build"
                                  >
                                    ✨ Build Custom Email
                                  </Button>
                                </div>

                                {emailBuilderMode === "select" ? (
                                  <FormField
                                    control={form.control}
                                    name="templateId"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Email Template</FormLabel>
                                        <Select
                                          onValueChange={field.onChange}
                                          value={field.value || ""}
                                        >
                                          <FormControl>
                                            <SelectTrigger data-testid="select-template">
                                              <SelectValue placeholder="Choose a message template" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {templates
                                              .filter(
                                                (t: any) =>
                                                  t.channel === "EMAIL",
                                              )
                                              .map((template: any) => (
                                                <SelectItem
                                                  key={template.id}
                                                  value={template.id}
                                                >
                                                  {template.name}
                                                </SelectItem>
                                              ))}
                                            {templates.filter(
                                              (t: any) => t.channel === "EMAIL",
                                            ).length === 0 && (
                                              <SelectItem
                                                value="unavailable"
                                                disabled
                                              >
                                                No email templates available -
                                                create templates first
                                              </SelectItem>
                                            )}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                ) : (
                                  <div className="space-y-4">
                                    {/* Settings Container */}
                                    <div className="bg-slate-200 dark:bg-slate-800/60 rounded-lg p-4 space-y-3 border border-slate-400 dark:border-slate-500">
                                      <div className="space-y-2">
                                        <Label htmlFor="custom-email-subject">
                                          Email Subject
                                        </Label>
                                        <Input
                                          id="custom-email-subject"
                                          value={customEmailSubject}
                                          onChange={(e) =>
                                            setCustomEmailSubject(
                                              e.target.value,
                                            )
                                          }
                                          placeholder="e.g., Welcome to our studio!"
                                          className="bg-background"
                                          data-testid="input-custom-subject"
                                        />
                                      </div>
                                    </div>

                                    {/* Build Email Container */}
                                    <div className="bg-blue-200 dark:bg-slate-800/60 rounded-lg p-4 border border-blue-400 dark:border-slate-600">
                                      {/* Email Builder (2-column layout) */}
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div>
                                          <Label className="mb-2 block">
                                            Email Content
                                          </Label>
                                          {/* Variable insertion chips */}
                                          <div className="mb-3">
                                            <Label className="text-xs text-muted-foreground mb-2 block">
                                              Insert Variables:
                                            </Label>
                                            <div className="flex flex-wrap gap-1.5">
                                              {TEMPLATE_VARIABLES.map(
                                                (variable) => (
                                                  <Button
                                                    key={variable.key}
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 text-xs px-2"
                                                    onClick={() => {
                                                      setCustomTemplateBody(
                                                        (prev) =>
                                                          prev +
                                                          `{{${variable.key}}}`,
                                                      );
                                                    }}
                                                  >
                                                    {variable.label}
                                                  </Button>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                          <ButtonRichTextEditor
                                            value={customTemplateBody}
                                            onChange={setCustomTemplateBody}
                                            placeholder="Hi {{first_name}},\n\nWrite your email content here..."
                                            minHeight="200px"
                                          />
                                        </div>
                                        <div>
                                          <Label className="mb-2 block">
                                            Preview
                                          </Label>
                                          <EmailPreview
                                            subject={customEmailSubject}
                                            templateBody={customTemplateBody}
                                            includeHeroImage={includeHeroImage}
                                            heroImageUrl={heroImageUrl}
                                            includeHeader={includeHeader}
                                            headerStyle={headerStyle}
                                            includeSignature={includeSignature}
                                            signatureStyle={signatureStyle}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Save as Template Option */}
                                    <div className="flex items-center space-x-2 p-3 border rounded-lg bg-background">
                                      <Switch
                                        checked={saveAsTemplate}
                                        onCheckedChange={setSaveAsTemplate}
                                        data-testid="switch-save-as-template"
                                      />
                                      <Label
                                        className="flex-1 cursor-pointer"
                                        onClick={() =>
                                          setSaveAsTemplate(!saveAsTemplate)
                                        }
                                      >
                                        Save as reusable template
                                      </Label>
                                    </div>

                                    {saveAsTemplate && (
                                      <div className="space-y-2">
                                        <Label htmlFor="template-name">
                                          Template Name
                                        </Label>
                                        <Input
                                          id="template-name"
                                          value={newTemplateName}
                                          onChange={(e) =>
                                            setNewTemplateName(e.target.value)
                                          }
                                          placeholder="e.g., Welcome Email Template"
                                          data-testid="input-template-name"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {(form.watch("channel") === "SMART_FILE" ||
                              form.watch("channel") === "EMAIL") && (
                              <FormField
                                control={form.control}
                                name="smartFileTemplateId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {form.watch("channel") === "SMART_FILE"
                                        ? "Smart File Template"
                                        : "Include Smart File Link (Optional)"}
                                    </FormLabel>
                                    {form.watch("channel") === "EMAIL" && (
                                      <p className="text-sm text-muted-foreground mb-2">
                                        Optionally include a link to a Smart
                                        File in your email. The Smart File will
                                        be created and the link will be
                                        available as{" "}
                                        <code className="bg-muted px-1 rounded">
                                          &#123;&#123;smart_file_link&#125;&#125;
                                        </code>{" "}
                                        in your email template.
                                      </p>
                                    )}
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value || undefined}
                                    >
                                      <FormControl>
                                        <SelectTrigger data-testid="select-smartfile-template">
                                          <SelectValue
                                            placeholder={
                                              form.watch("channel") ===
                                              "SMART_FILE"
                                                ? "Choose a Smart File template"
                                                : "Choose a Smart File template (optional)"
                                            }
                                          />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {form.watch("channel") === "EMAIL" && (
                                          <SelectItem value="none">
                                            No Smart File
                                          </SelectItem>
                                        )}
                                        {smartFiles?.map((smartFile: any) => (
                                          <SelectItem
                                            key={smartFile.id}
                                            value={smartFile.id}
                                          >
                                            📄 {smartFile.name}
                                          </SelectItem>
                                        ))}
                                        {(!smartFiles ||
                                          smartFiles.length === 0) && (
                                          <SelectItem
                                            value="unavailable"
                                            disabled
                                          >
                                            No Smart File templates available -
                                            create Smart Files first
                                          </SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            <FormField
                              control={form.control}
                              name="questionnaireTemplateId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    Forms to send (Optional)
                                  </FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-questionnaire">
                                        <SelectValue placeholder="Choose a form to send (optional)" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        No forms to send
                                      </SelectItem>
                                      {questionnaireTemplates?.map(
                                        (questionnaire: any) => (
                                          <SelectItem
                                            key={questionnaire.id}
                                            value={questionnaire.id}
                                          >
                                            📋 {questionnaire.name}
                                          </SelectItem>
                                        ),
                                      )}
                                      {questionnaireTemplates?.length === 0 && (
                                        <SelectItem
                                          value="unavailable"
                                          disabled
                                        >
                                          No questionnaire templates available -
                                          create questionnaires first
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="space-y-3">
                              <FormLabel className="flex items-center gap-1">
                                Send Timing{" "}
                                <span className="text-destructive">*</span>
                                {timingMode === "delayed" && (
                                  <span className="text-blue-600 dark:text-blue-400 font-semibold ml-1">
                                    (Delay Active)
                                  </span>
                                )}
                              </FormLabel>
                              {timingMode === null && (
                                <p className="text-xs text-muted-foreground">
                                  Please select when this automation should send
                                </p>
                              )}
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  type="button"
                                  variant={
                                    timingMode === "immediate"
                                      ? "default"
                                      : "outline"
                                  }
                                  className={`w-full ${timingMode === null ? "border-dashed" : ""}`}
                                  onClick={() => {
                                    setTimingMode("immediate");
                                    form.setValue("delayMinutes", 0);
                                    form.setValue("delayHours", 0);
                                    form.setValue("delayDays", 0);
                                  }}
                                  data-testid="button-timing-immediate"
                                >
                                  Send Immediately
                                </Button>
                                <Button
                                  type="button"
                                  variant={
                                    timingMode === "delayed"
                                      ? "default"
                                      : "outline"
                                  }
                                  className={`w-full ${timingMode === null ? "border-dashed" : ""}`}
                                  onClick={() => setTimingMode("delayed")}
                                  data-testid="button-timing-delayed"
                                >
                                  Send After Delay
                                </Button>
                              </div>

                              {timingMode === "delayed" && (
                                <div className="space-y-3 p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                                  {/* Days Input - Always shown for delayed timing */}
                                  <FormField
                                    control={form.control}
                                    name="delayDays"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">
                                          Delay (Days)
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            data-testid="input-delay-days"
                                            {...field}
                                            onChange={(e) => {
                                              const days =
                                                parseInt(e.target.value) || 0;
                                              field.onChange(days);

                                              if (days >= 1) {
                                                // Switching to day-based scheduling: clear exact delays, set time defaults
                                                form.setValue("delayHours", 0);
                                                form.setValue(
                                                  "delayMinutes",
                                                  0,
                                                );
                                                form.setValue("sendAtHour", 9); // Default 9 AM
                                                form.setValue(
                                                  "sendAtMinute",
                                                  0,
                                                );
                                              } else {
                                                // Switching to exact delays: clear time-of-day fields
                                                form.setValue(
                                                  "sendAtHour",
                                                  undefined,
                                                );
                                                form.setValue(
                                                  "sendAtMinute",
                                                  undefined,
                                                );
                                              }
                                            }}
                                          />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground">
                                          {form.watch("delayDays") >= 1
                                            ? "Sends on the next calendar day at a specific time"
                                            : "Use hours/minutes for exact delays under 1 day"}
                                        </p>
                                      </FormItem>
                                    )}
                                  />

                                  {/* Conditional: Time Picker (when days >= 1) */}
                                  {form.watch("delayDays") >= 1 && (
                                    <div className="space-y-2">
                                      <FormLabel className="text-xs">
                                        Send At (Time of Day)
                                      </FormLabel>
                                      <div className="grid grid-cols-2 gap-2">
                                        <FormField
                                          control={form.control}
                                          name="sendAtHour"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel className="text-xs">
                                                Hour (0-23)
                                              </FormLabel>
                                              <FormControl>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  max="23"
                                                  placeholder="9"
                                                  data-testid="input-send-at-hour"
                                                  {...field}
                                                  value={field.value ?? 9}
                                                  onChange={(e) =>
                                                    field.onChange(
                                                      parseInt(e.target.value),
                                                    )
                                                  }
                                                />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                        <FormField
                                          control={form.control}
                                          name="sendAtMinute"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel className="text-xs">
                                                Minute (0-59)
                                              </FormLabel>
                                              <FormControl>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  max="59"
                                                  placeholder="0"
                                                  data-testid="input-send-at-minute"
                                                  {...field}
                                                  value={field.value ?? 0}
                                                  onChange={(e) =>
                                                    field.onChange(
                                                      parseInt(e.target.value),
                                                    )
                                                  }
                                                />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        Example: "1 day @ 9:00 AM" sends the
                                        next day at 9:00 AM
                                      </p>
                                    </div>
                                  )}

                                  {/* Conditional: Hours/Minutes (when days = 0) */}
                                  {form.watch("delayDays") === 0 && (
                                    <div className="space-y-2">
                                      <p className="text-xs text-muted-foreground">
                                        Exact delay time
                                      </p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <FormField
                                          control={form.control}
                                          name="delayHours"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel className="text-xs">
                                                Hours
                                              </FormLabel>
                                              <FormControl>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  max="23"
                                                  placeholder="0"
                                                  data-testid="input-delay-hours"
                                                  {...field}
                                                  onChange={(e) =>
                                                    field.onChange(
                                                      parseInt(
                                                        e.target.value,
                                                      ) || 0,
                                                    )
                                                  }
                                                />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                        <FormField
                                          control={form.control}
                                          name="delayMinutes"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel className="text-xs">
                                                Minutes
                                              </FormLabel>
                                              <FormControl>
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  max="59"
                                                  placeholder="0"
                                                  data-testid="input-delay-minutes"
                                                  {...field}
                                                  onChange={(e) =>
                                                    field.onChange(
                                                      parseInt(
                                                        e.target.value,
                                                      ) || 0,
                                                    )
                                                  }
                                                />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        Sends exactly this amount of time after
                                        the trigger
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Pipeline Action Fields - Simplified */}
                        {enablePipeline && (
                          <div className="space-y-4 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
                            <div className="flex items-center space-x-2">
                              <ArrowRight className="h-4 w-4 text-green-600" />
                              <Label className="font-medium text-green-900 dark:text-green-100">
                                Pipeline Action
                              </Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Configure what stage the project should move to
                              when this automation triggers
                            </p>

                            <FormField
                              control={form.control}
                              name="targetStageId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Move Project To Stage</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-target-stage">
                                        <SelectValue placeholder="Select destination stage" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {stages?.map((stage: any) => (
                                        <SelectItem
                                          key={stage.id}
                                          value={stage.id}
                                        >
                                          {stage.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Projects will automatically move to this
                                    stage when the automation triggers
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 5: Review & Activate (or Step 3 for countdown stage changes) */}
                  {((wizardStep === 5 && !isCountdownStageChange) ||
                    (wizardStep === 3 && isCountdownStageChange)) && (
                    <div className="space-y-4">
                      {/* Trigger Breadcrumb - Persistent context */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border text-sm">
                        <span className="text-muted-foreground">Trigger:</span>
                        <span className="font-medium">
                          {getTriggerSummary().icon} {getTriggerSummary().text}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
                          {isCountdownStageChange ? 3 : 5}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">
                            Review & Activate
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Review your automation before activating
                          </p>
                        </div>
                      </div>

                      <div className="ml-11 space-y-4 p-4 border rounded-lg bg-card">
                        <div className="space-y-3">
                          {/* Editable automation name with auto-generated default */}
                          <div className="py-2 border-b">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                Automation Name
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs h-6 px-2"
                                onClick={() => {
                                  const autoName = generateAutomationName();
                                  setCachedAutoName(autoName);
                                  form.setValue("name", autoName);
                                }}
                                data-testid="button-reset-name"
                              >
                                Reset to auto-generated
                              </Button>
                            </div>
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter automation name..."
                                      className="font-medium"
                                      data-testid="input-automation-name"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              You can customize the name or use the
                              auto-generated one
                            </p>
                          </div>
                          <div className="flex items-start justify-between py-2 border-b">
                            <span className="text-sm font-medium text-muted-foreground">
                              Trigger
                            </span>
                            <span className="text-sm">
                              {form.watch("triggerMode") === "STAGE"
                                ? `Stage: ${stages?.find((s) => s.id === form.watch("triggerStageId"))?.name || "(Select stage)"}`
                                : form.watch("triggerMode") === "BUSINESS"
                                  ? `Business Event: ${form.watch("triggerEvent")?.replace(/_/g, " ") || "(Select event)"}`
                                  : `Time-based: ${form.watch("daysBefore")} days`}
                            </span>
                          </div>
                          <div className="flex items-start justify-between py-2 border-b">
                            <span className="text-sm font-medium text-muted-foreground">
                              Actions
                            </span>
                            <div className="text-sm text-right">
                              {isCountdownStageChange ? (
                                <div>
                                  ✓ Move to stage:{" "}
                                  {stages?.find(
                                    (s) => s.id === form.watch("targetStageId"),
                                  )?.name || "(Select stage)"}
                                </div>
                              ) : (
                                <>
                                  {enableCommunication && (
                                    <div>✓ Send {form.watch("channel")}</div>
                                  )}
                                  {enablePipeline && <div>✓ Move to stage</div>}
                                </>
                              )}
                            </div>
                          </div>

                          {/* OR LESS indicator for countdown automations */}
                          {isCountdownStageChange && form.watch("orLess") && (
                            <div className="flex items-start justify-between py-2 border-b">
                              <span className="text-sm font-medium text-muted-foreground">
                                Immediate Trigger
                              </span>
                              <span className="text-sm text-green-600">
                                ✓ Enabled (triggers if already within{" "}
                                {form.watch("daysBefore")} days)
                              </span>
                            </div>
                          )}

                          {/* Message Preview (hide for countdown stage changes) */}
                          {!isCountdownStageChange &&
                            enableCommunication &&
                            form.watch("templateId") &&
                            form.watch("templateId") !== "unavailable" &&
                            (() => {
                              const template = templates?.find(
                                (t: any) => t.id === form.watch("templateId"),
                              );
                              if (!template) return null;

                              return (
                                <div className="py-2 border-b">
                                  <span className="text-sm font-medium text-muted-foreground mb-2 block">
                                    {form.watch("channel") === "EMAIL"
                                      ? "Email Content"
                                      : "SMS Message"}
                                  </span>
                                  <div className="mt-2 p-3 bg-muted/50 rounded text-sm space-y-2">
                                    {template.subject &&
                                      form.watch("channel") === "EMAIL" && (
                                        <div>
                                          <span className="font-medium">
                                            Subject:{" "}
                                          </span>
                                          <span className="text-muted-foreground">
                                            {template.subject}
                                          </span>
                                        </div>
                                      )}
                                    <div>
                                      <span className="font-medium">
                                        Message:{" "}
                                      </span>
                                      <div className="text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">
                                        {template.body || "(No content)"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                          {/* Timing (hide for countdown stage changes) */}
                          {!isCountdownStageChange && enableCommunication && (
                            <div className="flex items-start justify-between py-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                Timing
                              </span>
                              <span className="text-sm text-right">
                                {form.watch("delayDays") || 0} days,{" "}
                                {form.watch("delayHours") || 0} hours
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Execution Rules - How automation runs */}
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 text-lg">
                              ℹ️
                            </span>
                            <div className="text-sm text-blue-800 dark:text-blue-200">
                              <p className="font-medium mb-1">
                                How this automation runs:
                              </p>
                              {form.watch("triggerMode") === "STAGE" ? (
                                <p>
                                  Each time a project enters the trigger stage,
                                  this automation will run once for that
                                  project.
                                </p>
                              ) : form.watch("triggerMode") === "BUSINESS" ? (
                                <p>
                                  This automation runs once each time the
                                  business event occurs. If a client triggers
                                  the same event again, the automation will run
                                  again.
                                </p>
                              ) : (
                                <p>
                                  This automation runs once per project when the
                                  countdown condition is met.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wizard Navigation Footer */}
                  <div className="sticky bottom-0 bg-background px-6 py-4 border-t flex justify-between">
                    <div>
                      {(() => {
                        const showBackButton = wizardStep !== 1;
                        return (
                          showBackButton && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handlePrevStep}
                              data-testid="button-wizard-back"
                            >
                              Back
                            </Button>
                          )
                        );
                      })()}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCreateDialogOpen(false)}
                        data-testid="button-cancel-automation"
                      >
                        Cancel
                      </Button>
                      {(() => {
                        const isNotLastStep = wizardStep !== totalSteps;
                        return isNotLastStep ? (
                          <Button
                            type="button"
                            onClick={handleNextStep}
                            disabled={!canProceedFromCurrentStep()}
                            data-testid="button-wizard-next"
                          >
                            Next
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            disabled={createAutomationMutation.isPending}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log(
                                "🔍 Create button explicitly clicked",
                              );
                              console.log(
                                "Form errors:",
                                form.formState.errors,
                              );
                              console.log("Form values:", form.getValues());
                              form.handleSubmit(handleCreateAutomation)(e);
                            }}
                            data-testid="button-submit-automation"
                          >
                            {createAutomationMutation.isPending
                              ? "Creating..."
                              : (() => {
                                  // Special label for countdown stage changes
                                  if (isCountdownStageChange) {
                                    return "Create Stage Movement Automation";
                                  }

                                  const actions = [];
                                  if (enableCommunication)
                                    actions.push("Communication");
                                  if (enablePipeline) actions.push("Pipeline");

                                  if (actions.length === 0) {
                                    return "Create Automation";
                                  }

                                  const suffix =
                                    actions.length !== 1 ? "s" : "";
                                  return `Create ${actions.join(" + ")} Automation${suffix}`;
                                })()}
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
      {/* Edit Automation Sheet - Comprehensive Edit */}
      {editingAutomation && (
        <Sheet open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <SheetContent
            side="right"
            className="w-full sm:w-[600px] lg:w-[700px] sm:max-w-none p-0 flex flex-col overflow-hidden"
          >
            {/* Contextual Header with Icon */}
            <SheetHeader className="sticky top-0 z-10 bg-background px-6 py-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                {editingAutomation.automationType === "COMMUNICATION" ? (
                  editingAutomation.channel === "SMS" ||
                  editingAutomation.actionType === "SMS" ? (
                    <Smartphone className="w-5 h-5 text-green-600" />
                  ) : (
                    <Mail className="w-5 h-5 text-blue-600" />
                  )
                ) : (
                  <ArrowRight className="w-5 h-5 text-purple-600" />
                )}
                Edit{" "}
                {editingAutomation.automationType === "COMMUNICATION"
                  ? (editingAutomation.channel === "SMS" ||
                    editingAutomation.actionType === "SMS"
                      ? "SMS"
                      : "Email") + " Automation"
                  : "Pipeline Automation"}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 text-sm">
                {/* Trigger info */}
                {(() => {
                  const trigger = editingAutomation.businessTriggers?.[0];
                  const triggerLabels: Record<string, string> = {
                    APPOINTMENT_BOOKED: "When booked",
                    DEPOSIT_PAID: "When deposit paid",
                    FULL_PAYMENT_MADE: "When paid in full",
                    ANY_PAYMENT_MADE: "When payment made",
                    CONTRACT_SIGNED: "When contract signed",
                    PROPOSAL_SIGNED: "When proposal signed",
                    SMART_FILE_SENT: "When quote sent",
                    SMART_FILE_ACCEPTED: "When quote accepted",
                  };
                  if (trigger) {
                    return (
                      <span>
                        {triggerLabels[trigger.triggerType] || "On event"}
                      </span>
                    );
                  }
                  // Also check automation-level triggerType for STAGE_CHANGE automations
                  if (editingAutomation.triggerType) {
                    return (
                      <span>
                        {triggerLabels[editingAutomation.triggerType] ||
                          "On event"}
                      </span>
                    );
                  }
                  if (editingAutomation.automationType === "COUNTDOWN") {
                    return (
                      <span>
                        {editingAutomation.daysBefore} days before event
                      </span>
                    );
                  }
                  const delay = editingAutomation.steps?.[0]?.delayMinutes || 0;
                  if (delay === 0)
                    return <span>Immediately on stage entry</span>;
                  if (delay < 60)
                    return <span>{delay} min after stage entry</span>;
                  if (delay < 1440)
                    return (
                      <span>{Math.round(delay / 60)}h after stage entry</span>
                    );
                  return (
                    <span>{Math.round(delay / 1440)}d after stage entry</span>
                  );
                })()}
                <span className="text-muted-foreground">·</span>
                <span
                  className={
                    editingAutomation.enabled
                      ? "text-teal-600"
                      : "text-muted-foreground"
                  }
                >
                  {editingAutomation.enabled ? "Active" : "Paused"}
                </span>
              </SheetDescription>
            </SheetHeader>

            {/* Visual Flow Preview */}
            <div className="px-6 py-3 bg-gradient-to-r from-muted/30 to-muted/10 border-b">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                {/* Trigger */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-100 dark:bg-violet-900/30 rounded-md text-violet-700 dark:text-violet-300">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="font-medium text-xs">
                    {(() => {
                      const trigger = editingAutomation.businessTriggers?.[0];
                      if (trigger) {
                        const labels: Record<string, string> = {
                          APPOINTMENT_BOOKED: "Booked",
                          DEPOSIT_PAID: "Deposit Paid",
                          FULL_PAYMENT_MADE: "Paid in Full",
                          ANY_PAYMENT_MADE: "Payment Made",
                          CONTRACT_SIGNED: "Contract Signed",
                          PROPOSAL_SIGNED: "Proposal Signed",
                          SMART_FILE_SENT: "Quote Sent",
                          SMART_FILE_ACCEPTED: "Quote Accepted",
                        };
                        return labels[trigger.triggerType] || "Event";
                      }
                      // Also check automation-level triggerType for STAGE_CHANGE automations
                      if (editingAutomation.triggerType) {
                        const labels: Record<string, string> = {
                          APPOINTMENT_BOOKED: "Booked",
                          DEPOSIT_PAID: "Deposit Paid",
                          FULL_PAYMENT_MADE: "Paid in Full",
                          ANY_PAYMENT_MADE: "Payment Made",
                          CONTRACT_SIGNED: "Contract Signed",
                          PROPOSAL_SIGNED: "Proposal Signed",
                          SMART_FILE_SENT: "Quote Sent",
                          SMART_FILE_ACCEPTED: "Quote Accepted",
                        };
                        return labels[editingAutomation.triggerType] || "Event";
                      }
                      if (editingAutomation.automationType === "COUNTDOWN")
                        return "Countdown";
                      return "Stage Entry";
                    })()}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                {/* Timing */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-100 dark:bg-sky-900/30 rounded-md text-sky-700 dark:text-sky-300">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-medium text-xs">
                    {(() => {
                      if (editingAutomation.automationType === "COUNTDOWN") {
                        return `${editingAutomation.daysBefore}d before`;
                      }
                      const delay =
                        editingAutomation.steps?.[0]?.delayMinutes || 0;
                      if (delay === 0) return "Immediately";
                      if (delay < 60) return `${delay}m delay`;
                      if (delay < 1440)
                        return `${Math.round(delay / 60)}h delay`;
                      return `${Math.round(delay / 1440)}d delay`;
                    })()}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                {/* Action */}
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md",
                    editingAutomation.automationType === "COMMUNICATION"
                      ? editingAutomation.channel === "SMS" ||
                        editingAutomation.actionType === "SMS"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
                  )}
                >
                  {editingAutomation.automationType === "COMMUNICATION" ? (
                    editingAutomation.channel === "SMS" ||
                    editingAutomation.actionType === "SMS" ? (
                      <Smartphone className="w-3.5 h-3.5" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" />
                    )
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                  <span className="font-medium text-xs">
                    {editingAutomation.automationType === "COMMUNICATION"
                      ? editingAutomation.channel === "SMS" ||
                        editingAutomation.actionType === "SMS"
                        ? "Send SMS"
                        : "Send Email"
                      : "Move Stage"}
                  </span>
                </div>
              </div>
            </div>

            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit((data) =>
                  editAutomationMutation.mutate(data),
                )}
                className="flex flex-col min-h-0 flex-1"
              >
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
                  {/* Message Content Preview - Communication only */}
                  {editingAutomation.automationType === "COMMUNICATION" && (
                    <div
                      className={cn(
                        "border rounded-xl p-4",
                        editingAutomation.channel === "SMS" ||
                          editingAutomation.actionType === "SMS"
                          ? "bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/10 border-green-200/50 dark:border-green-800/30"
                          : "bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10 border-blue-200/50 dark:border-blue-800/30",
                      )}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {editingAutomation.channel === "SMS" ||
                        editingAutomation.actionType === "SMS" ? (
                          <Smartphone className="w-4 h-4 text-green-600" />
                        ) : (
                          <Mail className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="text-sm font-semibold text-foreground">
                          Message Preview
                        </span>
                      </div>
                      {/* Show email subject or SMS content */}
                      {(() => {
                        const firstStep = editingAutomation.steps?.[0];
                        // emailSubject is on the automation level, not step level
                        const emailSubject = editingAutomation.emailSubject;
                        // SMS content is stored as customSmsContent on steps
                        const smsMessage = firstStep?.customSmsContent;
                        const templateId =
                          editingAutomation.templateId || firstStep?.templateId;

                        if (
                          editingAutomation.useEmailBuilder &&
                          (editingAutomation.templateBody ||
                            editingAutomation.emailBlocks?.length > 0)
                        ) {
                          // Get text content - prefer new templateBody format, fall back to legacy blocks
                          let textContent = "";
                          let loadTemplateBody = "";

                          if (editingAutomation.templateBody) {
                            // New format: templateBody is a string
                            textContent = editingAutomation.templateBody
                              .replace(/\{\{[^}]+\}\}/g, "") // Remove {{variables}}
                              .replace(/\[\[BUTTON:[^\]]+\]\]/g, "") // Remove [[BUTTON:...]]
                              .trim();
                            loadTemplateBody = editingAutomation.templateBody;
                          } else if (
                            editingAutomation.emailBlocks?.length > 0
                          ) {
                            // Legacy format: emailBlocks is array
                            textContent = editingAutomation.emailBlocks
                              .filter(
                                (b: any) =>
                                  b.type === "TEXT" || b.type === "HEADING",
                              )
                              .map((b: any) => b.content?.text)
                              .filter(Boolean)
                              .join(" ");
                            loadTemplateBody = blocksToTemplateBody(
                              editingAutomation.emailBlocks || [],
                            );
                          }

                          return (
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground/90">
                                  {editingAutomation.emailSubject ||
                                    "Custom Email"}
                                </p>
                                {textContent && (
                                  <p className="text-xs text-muted-foreground/80 line-clamp-2">
                                    {textContent.substring(0, 120)}
                                    {textContent.length > 120 ? "..." : ""}
                                  </p>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEmailBuilder({
                                    automationId: editingAutomation.id,
                                    subject:
                                      editingAutomation.emailSubject || "",
                                    templateBody: loadTemplateBody,
                                    includeHeader:
                                      editingAutomation.includeHeader ?? false,
                                    includeFooter:
                                      editingAutomation.includeSignature ??
                                      true,
                                  });
                                  setEmailBuilderEditDialogOpen(true);
                                }}
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                Edit Message
                              </Button>
                            </div>
                          );
                        }
                        if (emailSubject) {
                          return (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground/90">
                                {emailSubject}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Email will be sent with this subject line
                              </p>
                            </div>
                          );
                        }
                        if (smsMessage) {
                          return (
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <p className="text-sm text-foreground/90 line-clamp-3">
                                  {smsMessage.substring(0, 150)}
                                  {smsMessage.length > 150 ? "..." : ""}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {smsMessage.length} characters
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const stepId = firstStep?.id;
                                  if (stepId) {
                                    setEditingSmsStep({
                                      stepId,
                                      content: smsMessage,
                                    });
                                    setSmsEditDialogOpen(true);
                                  }
                                }}
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                Edit Message
                              </Button>
                            </div>
                          );
                        }
                        if (templateId) {
                          return (
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">
                                Using saved template
                              </p>
                              <p className="text-xs text-muted-foreground/80">
                                Template content will be used
                              </p>
                            </div>
                          );
                        }
                        return (
                          <p className="text-sm text-muted-foreground italic">
                            No message content configured
                          </p>
                        );
                      })()}
                    </div>
                  )}

                  {/* Multi-Step Display */}
                  {editingAutomation.steps?.length > 1 && (
                    <div className="border rounded-xl p-4 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/10 dark:to-orange-950/5 border-amber-200/50 dark:border-amber-800/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Layers className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-semibold text-foreground">
                          Multi-Step Automation
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {editingAutomation.steps.length} steps
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {editingAutomation.steps
                          .slice(0, 4)
                          .map((step: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-800 dark:text-amber-200 font-medium text-[10px]">
                                {idx + 1}
                              </span>
                              <span className="text-muted-foreground">
                                {step.actionType === "EMAIL" ||
                                step.actionType === "SEND_EMAIL"
                                  ? "Send Email"
                                  : step.actionType === "SMS" ||
                                      step.actionType === "SEND_SMS"
                                    ? "Send SMS"
                                    : "Action"}
                              </span>
                              <span className="text-muted-foreground/60">
                                ·
                              </span>
                              <span className="text-muted-foreground/80">
                                {step.delayMinutes === 0
                                  ? "Immediately"
                                  : step.delayMinutes < 60
                                    ? `${step.delayMinutes}m later`
                                    : step.delayMinutes < 1440
                                      ? `${Math.round(step.delayMinutes / 60)}h later`
                                      : `${Math.round(step.delayMinutes / 1440)}d later`}
                              </span>
                            </div>
                          ))}
                        {editingAutomation.steps.length > 4 && (
                          <p className="text-xs text-muted-foreground pl-7">
                            +{editingAutomation.steps.length - 4} more steps
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Automation Name */}
                  <div className="space-y-2">
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Automation Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Welcome Email, Follow-up SMS"
                              data-testid="input-edit-automation-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Enhanced Enable/Disable Toggle */}
                  <FormField
                    control={editForm.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem
                        className={cn(
                          "flex flex-row items-center justify-between rounded-xl border p-4 transition-colors",
                          field.value
                            ? "bg-gradient-to-r from-teal-50 to-emerald-50/50 dark:from-teal-950/20 dark:to-emerald-950/10 border-teal-200/50 dark:border-teal-800/30"
                            : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800",
                        )}
                      >
                        <div className="space-y-1 flex-1">
                          <FormLabel className="text-sm font-medium flex items-center gap-2">
                            {field.value ? (
                              <>
                                <Zap className="w-4 h-4 text-teal-600" />
                                Automation Active
                              </>
                            ) : (
                              <>
                                <PauseCircle className="w-4 h-4 text-gray-500" />
                                Automation Paused
                              </>
                            )}
                          </FormLabel>
                          <FormDescription className="text-xs">
                            {field.value
                              ? "This automation will run for new clients entering this stage"
                              : "This automation is paused and won't send to new clients"}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            data-testid="switch-edit-enabled"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Channel Display (read-only - changing channel requires recreating automation) */}
                  {editingAutomation.automationType === "COMMUNICATION" && (
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-4",
                        editingAutomation.channel === "SMS" ||
                          editingAutomation.actionType === "SMS"
                          ? "bg-green-50/50 dark:bg-green-950/10 border-green-200/50 dark:border-green-800/30"
                          : "bg-blue-50/50 dark:bg-blue-950/10 border-blue-200/50 dark:border-blue-800/30",
                      )}
                    >
                      {editingAutomation.channel === "SMS" ||
                      editingAutomation.actionType === "SMS" ? (
                        <Smartphone className="w-5 h-5 text-green-600" />
                      ) : (
                        <Mail className="w-5 h-5 text-blue-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {editingAutomation.channel === "SMS" ||
                          editingAutomation.actionType === "SMS"
                            ? "SMS Text Message"
                            : "Email"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Delivery channel cannot be changed after creation
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Wedding Date Condition - only for non-countdown automations */}
                  {(!editingAutomation.daysBefore ||
                    editingAutomation.daysBefore === null) && (
                    <div className="space-y-3">
                      <FormField
                        control={editForm.control}
                        name="eventDateCondition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Who Receives This
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || "NO_CONDITION"}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-event-date-condition">
                                  <SelectValue placeholder="All clients" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="NO_CONDITION">
                                  All clients in this stage
                                </SelectItem>
                                <SelectItem value="HAS_EVENT_DATE">
                                  Only clients with a wedding date set
                                </SelectItem>
                                <SelectItem value="NO_EVENT_DATE">
                                  Only clients without a wedding date
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">
                              Filter which clients receive this automation
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex justify-between">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (
                        confirm(
                          "Are you sure you want to delete this automation? This cannot be undone.",
                        )
                      ) {
                        handleDeleteAutomation(editingAutomation.id);
                        setEditDialogOpen(false);
                      }
                    }}
                    disabled={
                      editAutomationMutation.isPending ||
                      deleteAutomationMutation.isPending
                    }
                    data-testid="button-delete-automation"
                  >
                    {deleteAutomationMutation.isPending
                      ? "Deleting..."
                      : "Delete"}
                  </Button>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditDialogOpen(false)}
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={editAutomationMutation.isPending}
                      data-testid="button-save-edit"
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {editAutomationMutation.isPending
                        ? "Saving..."
                        : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      )}

      {/* Email Builder Edit Dialog - Uses ButtonRichTextEditor like wizard */}
      <Dialog
        open={emailBuilderEditDialogOpen}
        onOpenChange={(open) => {
          setEmailBuilderEditDialogOpen(open);
          if (!open) {
            // Reset button modal state when dialog closes
            setShowEmailButtonPopover(false);
            setEmailButtonText("");
            setEmailButtonDestination("CALENDAR");
            setEmailButtonCustomUrl("");
            setShowEmailPreviewInEditDialog(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Edit Email Message
            </DialogTitle>
            <DialogDescription>Edit your email content</DialogDescription>
          </DialogHeader>
          {editingEmailBuilder && (
            <div className="space-y-4">
              {/* Subject Line - editable in edit mode, read-only display in preview mode */}
              {!showEmailPreviewInEditDialog ? (
                <div className="space-y-2">
                  <Label>Subject Line</Label>
                  <Input
                    value={editingEmailBuilder.subject}
                    onChange={(e) =>
                      setEditingEmailBuilder({
                        ...editingEmailBuilder,
                        subject: e.target.value,
                      })
                    }
                    placeholder="Email subject line..."
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Subject
                  </Label>
                  <p className="text-sm font-medium">
                    {editingEmailBuilder.subject || "(No subject)"}
                  </p>
                </div>
              )}

              {/* Toggle between Edit Mode and Preview Mode */}
              {!showEmailPreviewInEditDialog ? (
                <>
                  {/* Message Body - Using ButtonRichTextEditor like wizard */}
                  <div className="space-y-2">
                    <Label>Message Body</Label>
                    <ButtonRichTextEditor
                      value={editingEmailBuilder.templateBody}
                      onChange={(value) =>
                        setEditingEmailBuilder({
                          ...editingEmailBuilder,
                          templateBody: value,
                        })
                      }
                      placeholder="Hi {{first_name}},

Thank you for reaching out! I'm excited to learn more about your special day..."
                      minHeight="120px"
                      maxHeight="250px"
                    />
                    {/* Variable chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {TEMPLATE_VARIABLES.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => {
                            const variable = `{{${v.key}}}`;
                            setEditingEmailBuilder({
                              ...editingEmailBuilder,
                              templateBody:
                                editingEmailBuilder.templateBody + variable,
                            });
                          }}
                          className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                    {/* Add a Button chip - opens modal to insert button */}
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailButtonText("");
                          setEmailButtonDestination("CALENDAR");
                          setEmailButtonCustomUrl("");
                          setShowEmailButtonPopover(true);
                        }}
                        className="px-3 py-1.5 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1.5 font-medium"
                      >
                        <Link2 className="w-3 h-3" />
                        Add a Button
                      </button>
                    </div>
                  </div>

                  {/* Header/Footer toggles */}
                  <div className="flex gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingEmailBuilder.includeHeader}
                        onChange={(e) =>
                          setEditingEmailBuilder({
                            ...editingEmailBuilder,
                            includeHeader: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-muted-foreground">
                        Include Header
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingEmailBuilder.includeFooter}
                        onChange={(e) =>
                          setEditingEmailBuilder({
                            ...editingEmailBuilder,
                            includeFooter: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-muted-foreground">
                        Include Footer
                      </span>
                    </label>
                  </div>
                </>
              ) : (
                /* Preview Mode - replaces editor */
                <div className="border rounded-lg bg-muted/30 overflow-hidden">
                  <div className="px-3 py-2 bg-muted/50 border-b flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Preview Mode
                    </span>
                  </div>
                  <div className="p-4">
                    <EmailPreview
                      subject={editingEmailBuilder.subject}
                      templateBody={editingEmailBuilder.templateBody}
                      includeHeader={editingEmailBuilder.includeHeader}
                      includeSignature={editingEmailBuilder.includeFooter}
                      hideCardWrapper={true}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant={showEmailPreviewInEditDialog ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setShowEmailPreviewInEditDialog(
                      !showEmailPreviewInEditDialog,
                    )
                  }
                  className={cn(
                    "gap-1",
                    showEmailPreviewInEditDialog &&
                      "bg-teal-600 hover:bg-teal-700",
                  )}
                >
                  {showEmailPreviewInEditDialog ? (
                    <>
                      <Pencil className="w-4 h-4" />
                      Edit
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Preview
                    </>
                  )}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingEmailBuilder(null);
                      setEmailBuilderEditDialogOpen(false);
                      setShowEmailPreviewInEditDialog(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      updateEmailBuilderMutation.mutate(editingEmailBuilder)
                    }
                    disabled={
                      updateEmailBuilderMutation.isPending ||
                      !editingEmailBuilder?.subject?.trim() ||
                      !editingEmailBuilder?.templateBody?.trim()
                    }
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {updateEmailBuilderMutation.isPending
                      ? "Saving..."
                      : "Save Changes"}
                  </Button>
                </div>
              </div>
              {(!editingEmailBuilder?.subject?.trim() ||
                !editingEmailBuilder?.templateBody?.trim()) && (
                <p className="text-xs text-amber-600 text-right">
                  Subject and message body are required
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Button Modal for Email Edit */}
      <Dialog
        open={showEmailButtonPopover}
        onOpenChange={setShowEmailButtonPopover}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-purple-500" />
              Add Button
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-medium">Button Text</Label>
              <Input
                value={emailButtonText}
                onChange={(e) => {
                  // Remove special characters that would break the button marker format
                  const sanitized = e.target.value.replace(/[\[\]:]/g, "");
                  setEmailButtonText(sanitized);
                }}
                placeholder="e.g., Book Your Call"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Link Destination</Label>
              <Select
                value={emailButtonDestination}
                onValueChange={setEmailButtonDestination}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALENDAR">Booking Calendar</SelectItem>
                  <SelectItem value="SMART_FILE">View Proposal</SelectItem>
                  <SelectItem value="GALLERY">View Gallery</SelectItem>
                  <SelectItem value="TESTIMONIALS">Leave Review</SelectItem>
                  <SelectItem value="CUSTOM">Custom URL</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {emailButtonDestination === "CALENDAR" &&
                  "Your booking/scheduling page"}
                {emailButtonDestination === "SMART_FILE" &&
                  "Client's proposal or invoice"}
                {emailButtonDestination === "GALLERY" &&
                  "Client's photo gallery"}
                {emailButtonDestination === "TESTIMONIALS" &&
                  "Review/testimonial submission page"}
                {emailButtonDestination === "CUSTOM" && "Enter your own link"}
              </p>
            </div>

            {emailButtonDestination === "CUSTOM" && (
              <div>
                <Label className="text-sm font-medium">URL</Label>
                <Input
                  value={emailButtonCustomUrl}
                  onChange={(e) => setEmailButtonCustomUrl(e.target.value)}
                  placeholder="https://example.com"
                  className={cn(
                    "mt-1",
                    emailButtonCustomUrl &&
                      !emailButtonCustomUrl.match(/^https?:\/\/.+/) &&
                      "border-red-500",
                  )}
                />
                {emailButtonCustomUrl &&
                  !emailButtonCustomUrl.match(/^https?:\/\/.+/) && (
                    <p className="text-xs text-red-500 mt-1">
                      Please enter a valid URL starting with http:// or https://
                    </p>
                  )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEmailButtonPopover(false);
                  setEmailButtonText("");
                  setEmailButtonDestination("CALENDAR");
                  setEmailButtonCustomUrl("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (
                    emailButtonText.trim() &&
                    (emailButtonDestination !== "CUSTOM" ||
                      emailButtonCustomUrl.match(/^https?:\/\/.+/))
                  ) {
                    // Build the button marker and append to templateBody
                    const marker =
                      emailButtonDestination === "CUSTOM"
                        ? `[[BUTTON:CUSTOM:${emailButtonText.trim()}:${emailButtonCustomUrl.trim()}]]`
                        : `[[BUTTON:${emailButtonDestination}:${emailButtonText.trim()}]]`;

                    if (editingEmailBuilder) {
                      setEditingEmailBuilder({
                        ...editingEmailBuilder,
                        templateBody:
                          editingEmailBuilder.templateBody + "\n\n" + marker,
                      });
                    }

                    setShowEmailButtonPopover(false);
                    setEmailButtonText("");
                    setEmailButtonDestination("CALENDAR");
                    setEmailButtonCustomUrl("");
                  }
                }}
                disabled={
                  !emailButtonText.trim() ||
                  (emailButtonDestination === "CUSTOM" &&
                    !emailButtonCustomUrl.match(/^https?:\/\/.+/))
                }
                className="bg-purple-600 hover:bg-purple-700"
              >
                Insert Button
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMS Edit Dialog */}
      <Dialog open={smsEditDialogOpen} onOpenChange={setSmsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-green-600" />
              Edit SMS Message
            </DialogTitle>
            <DialogDescription>
              Edit your text message content
            </DialogDescription>
          </DialogHeader>
          {editingSmsStep && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Message Content</Label>
                <Textarea
                  value={editingSmsStep.content}
                  onChange={(e) =>
                    setEditingSmsStep({
                      ...editingSmsStep,
                      content: e.target.value,
                    })
                  }
                  placeholder="Enter your SMS message..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {editingSmsStep.content.length} characters
                  {editingSmsStep.content.length > 160 && (
                    <span className="text-amber-600 ml-2">
                      ({Math.ceil(editingSmsStep.content.length / 160)} SMS
                      segments)
                    </span>
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingSmsStep(null);
                    setSmsEditDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateSmsStepMutation.mutate(editingSmsStep)}
                  disabled={updateSmsStepMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {updateSmsStepMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Rules Modal */}
      <Dialog
        open={manageRulesDialogOpen}
        onOpenChange={setManageRulesDialogOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage Rules - {selectedStage?.name} Stage
            </DialogTitle>
            <DialogDescription>
              Configure automation rules for clients in the{" "}
              {selectedStage?.name} stage
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Existing automations for this stage */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Current Rules</h4>
              <div className="space-y-2">
                {(() => {
                  const stageAutomations = (automations ?? []).filter(
                    (a: any) => a.stageId === selectedStage?.id,
                  );
                  return automations === undefined ? (
                    <p className="text-muted-foreground text-center py-4">
                      Loading automation rules...
                    </p>
                  ) : stageAutomations.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No automation rules configured for this stage yet.
                    </p>
                  ) : (
                    stageAutomations.map((automation: any) =>
                      automation.automationType === "COMMUNICATION" ? (
                        <AutomationStepManager
                          key={automation.id}
                          automation={automation}
                          onDelete={handleDeleteAutomation}
                        />
                      ) : (
                        <StageChangeAutomationCard
                          key={automation.id}
                          automation={automation}
                          onDelete={handleDeleteAutomation}
                        />
                      ),
                    )
                  );
                })()}
              </div>
            </div>

            {/* Add new rule section */}
            <div className="text-center py-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                To add more automation rules for this stage, use the main
                "Create Automation" button.
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setManageRulesDialogOpen(false)}
                data-testid="button-close-manage-rules"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="min-h-screen bg-[#FAFBFC] dark:bg-background">
        <div className="p-3 sm:p-6 space-y-0">
          {/* Wrapper to sync toolbar and board widths */}
          <div
            className="flex flex-col"
            style={{
              width: boardStageFilter ? "100%" : `${boardWidth}px`,
              maxWidth: "100%",
            }}
          >
            {/* Toolbar - matches board width */}
            <div className="mb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Left: Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Project Type Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Project Type:
                    </span>
                    <Select
                      value={activeProjectType}
                      onValueChange={setActiveProjectType}
                      disabled={isLoadingTypes || !projectTypes.length}
                    >
                      <SelectTrigger
                        className="w-[140px] h-8 rounded-full text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        data-testid="select-project-type"
                      >
                        <SelectValue
                          placeholder={
                            isLoadingTypes ? "Loading..." : "Select type"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {projectTypes.map((type) => (
                          <SelectItem key={type.id} value={type.slug}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stage Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Show Stage:
                    </span>
                    <Select
                      value={boardStageFilter ?? "all"}
                      onValueChange={(v) =>
                        setBoardStageFilter(v === "all" ? null : v)
                      }
                    >
                      <SelectTrigger className="w-[160px] h-8 rounded-full text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="All Stages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        {(stages || []).map((stage: any) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear All - visible when filtering to single stage */}
                  {boardStageFilter &&
                    (() => {
                      const stageAutomations = automations.filter(
                        (a: any) =>
                          a.stageCondition === boardStageFilter ||
                          (!a.stageCondition && a.stageId === boardStageFilter),
                      );
                      const selectedStageName =
                        stages?.find((s: any) => s.id === boardStageFilter)
                          ?.name || "this stage";

                      return stageAutomations.length > 0 ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive hover:border-destructive rounded-full h-8"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Clear All ({stageAutomations.length})
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Clear All Automations for This Stage
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will stop and remove all{" "}
                                {stageAutomations.length} automations from "
                                {selectedStageName}". Your clients won't receive
                                these automated messages anymore.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  try {
                                    await apiRequest(
                                      "DELETE",
                                      `/api/automations/stage/${boardStageFilter}`,
                                    );
                                    queryClient.invalidateQueries({
                                      queryKey: ["/api/automations"],
                                    });
                                    toast({
                                      title: "Automations Removed",
                                      description: `Successfully removed all automations from "${selectedStageName}"`,
                                    });
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description:
                                        "Failed to remove automations. Please try again.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Yes, Clear All
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null;
                    })()}
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Delete All (only show when automations exist) */}
                  {automations.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteAllDialogOpen(true)}
                      data-testid="button-delete-all"
                      className="rounded-full h-8 text-muted-foreground hover:text-destructive hover:border-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete All
                    </Button>
                  )}
                  {/* Build All with AI */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBuildAllDialogOpen(true)}
                    data-testid="button-build-all-ai"
                    className="rounded-full h-8 border-purple-300 hover:bg-purple-50 hover:border-purple-400"
                  >
                    <Layers className="w-4 h-4 mr-2 text-purple-500" />
                    Build All
                  </Button>
                  {/* Build with AI */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startConversationalAI}
                    data-testid="button-chat-ai-automation"
                    className="rounded-full h-8"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Build with AI
                  </Button>
                  {/* New Automation Button */}
                  <Button
                    size="sm"
                    onClick={() => setCreateDialogOpen(true)}
                    data-testid="button-create-automation"
                    className="!bg-gray-900 hover:!bg-black dark:!bg-white dark:hover:!bg-gray-100 text-white dark:text-gray-900 rounded-full h-8"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Automation
                  </Button>
                </div>
              </div>
            </div>

            {/* Board View - full width, floats on page background */}
            {activeProjectType && (
              <div className="pt-4 pb-6">
                {automationsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto" />
                    <p className="text-muted-foreground mt-3">
                      Loading automations...
                    </p>
                  </div>
                ) : automations.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-card rounded-xl shadow-sm">
                    <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No automations yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first automation to streamline your workflow
                    </p>
                    <Button
                      onClick={() => setCreateDialogOpen(true)}
                      className="!bg-teal-500 hover:!bg-teal-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Automation
                    </Button>
                  </div>
                ) : (
                  <AutomationsBoardView
                    stages={stages || []}
                    automations={automations}
                    stageFilter={boardStageFilter}
                    onAddAutomation={(stageId) => {
                      setSelectedStageId(stageId);
                      setCreateDialogOpen(true);
                    }}
                    onEditAutomation={(automation) => {
                      setEditingAutomation(automation);
                      setEditDialogOpen(true);
                    }}
                    onToggleAutomation={(automationId, enabled) => {
                      toggleAutomationMutation.mutate({
                        automationId,
                        enabled,
                      });
                    }}
                  />
                )}
              </div>
            )}
          </div>
          {/* End wrapper */}
        </div>
      </div>

      {/* Build All Automations Dialog */}
      <BuildAllAutomationsDialog
        open={buildAllDialogOpen}
        onOpenChange={setBuildAllDialogOpen}
        projectType={activeProjectType || "WEDDING"}
      />

      {/* Delete All Automations Confirmation Dialog */}
      <Dialog
        open={deleteAllDialogOpen}
        onOpenChange={(open) => {
          setDeleteAllDialogOpen(open);
          if (!open) setDeleteConfirmation("");
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete All Automations
            </DialogTitle>
            <DialogDescription className="pt-2">
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {automations.length} automations
              </span>{" "}
              for {activeProjectType} projects. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label
              htmlFor="delete-confirmation"
              className="text-sm font-medium"
            >
              Type{" "}
              <span className="font-mono bg-muted px-1 rounded">delete</span> to
              confirm
            </Label>
            <Input
              id="delete-confirmation"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="delete"
              className="mt-2"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteAllDialogOpen(false);
                setDeleteConfirmation("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAllAutomationsMutation.mutate()}
              disabled={
                deleteConfirmation !== "delete" ||
                deleteAllAutomationsMutation.isPending
              }
            >
              {deleteAllAutomationsMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Automations
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conversational AI Chat Dialog */}
      <Dialog open={chatDialogOpen} onOpenChange={setChatDialogOpen}>
        <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Automation Builder
              </DialogTitle>
              {chatMessages.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetConversation}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Start Over
                </Button>
              )}
            </div>
            <DialogDescription>
              Describe what you want to happen and I'll help you set it up
            </DialogDescription>
          </DialogHeader>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ul]:ml-4 [&>ol]:my-1 [&>ol]:ml-4">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Animated thinking indicator */}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Suggested starter prompts - only show when chat just started */}
            {chatMessages.length === 1 &&
              !chatMutation.isPending &&
              !conversationState?.options && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Quick start:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleSuggestedPrompt(
                          "Send a thank you email 1 day after booking",
                        )
                      }
                      className="text-xs rounded-full bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300 dark:bg-purple-950/30 dark:border-purple-800 dark:hover:bg-purple-900/50"
                    >
                      Thank you after booking
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleSuggestedPrompt(
                          "Text them 5 minutes after inquiry",
                        )
                      }
                      className="text-xs rounded-full bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300 dark:bg-purple-950/30 dark:border-purple-800 dark:hover:bg-purple-900/50"
                    >
                      Quick SMS follow-up
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleSuggestedPrompt(
                          "Send proposal when they enter consultation stage",
                        )
                      }
                      className="text-xs rounded-full bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300 dark:bg-purple-950/30 dark:border-purple-800 dark:hover:bg-purple-900/50"
                    >
                      Auto-send proposal
                    </Button>
                  </div>
                </div>
              )}

            {/* Clickable option buttons */}
            {conversationState?.options &&
              conversationState.options.length > 0 &&
              !chatMutation.isPending &&
              !conversationState?.showSuccessActions && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {conversationState.options.map(
                    (
                      option: { label: string; value: string },
                      optIdx: number,
                    ) => (
                      <Button
                        key={optIdx}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const userMessage = {
                            role: "user" as const,
                            content: option.label,
                          };
                          setChatMessages((prev) => [...prev, userMessage]);
                          chatMutation.mutate(option.label);
                        }}
                        className="text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                        data-testid={`button-option-${optIdx}`}
                      >
                        {option.label}
                      </Button>
                    ),
                  )}
                </div>
              )}

            {/* Success action buttons */}
            {conversationState?.showSuccessActions &&
              !chatMutation.isPending && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      resetConversation();
                    }}
                    className="text-xs rounded-full"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Create Another
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setChatDialogOpen(false);
                      setChatMessages([]);
                      setConversationState(null);
                    }}
                    className="text-xs rounded-full"
                  >
                    Done
                  </Button>
                </div>
              )}

            {/* Scroll anchor */}
            <div ref={chatMessagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Describe what you want to automate..."
                value={currentChatMessage}
                onChange={(e) => setCurrentChatMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChatMessage();
                  }
                }}
                data-testid="input-chat-message"
                disabled={chatMutation.isPending}
              />
              <Button
                onClick={handleSendChatMessage}
                disabled={chatMutation.isPending || !currentChatMessage.trim()}
                data-testid="button-send-chat"
              >
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
