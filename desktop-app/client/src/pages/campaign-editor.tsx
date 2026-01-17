import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Clock,
  Mail,
  Sparkles,
  Save,
  Play,
  GripVertical,
  ChevronRight,
  Loader2,
  Wand2,
  AlertCircle,
  AlertTriangle,
  Eye,
  Settings,
  Target,
  Layers,
  Check,
  Link2,
  MoreHorizontal,
  Info,
  CloudOff,
  Cloud
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { ButtonRichTextEditor } from "@/components/ButtonRichTextEditor";
import { EmailPreview } from "@/components/email-preview";
import { blocksToTemplateBody, templateBodyToHtml } from "@/lib/blocks-to-text";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProjectTypes } from "@/hooks/use-project-types";

// HTML escape helper to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Variable definitions with examples for tooltips
const TEMPLATE_VARIABLES = [
  { key: 'first_name', label: 'First Name', example: 'Sarah' },
  { key: 'last_name', label: 'Last Name', example: 'Johnson' },
  { key: 'full_name', label: 'Full Name', example: 'Sarah Johnson' },
  { key: 'email', label: 'Email', example: 'sarah@example.com' },
  { key: 'phone', label: 'Phone', example: '(555) 123-4567' },
  { key: 'project_type', label: 'Project Type', example: 'Wedding' },
  { key: 'event_date', label: 'Event Date', example: 'June 15, 2025' },
  { key: 'photographer_name', label: 'Your Name', example: 'Alex Photography' },
  { key: 'business_name', label: 'Business Name', example: 'Captured Moments Studio' },
];

type Stage = {
  id: string;
  name: string;
  displayOrder: number;
};

type CampaignEmail = {
  id: string;
  campaignId: string;
  sequenceIndex: number;
  subject: string;
  htmlBody: string;
  textBody?: string;
  templateBody?: string;
  daysAfterStart: number;
  weeksAfterStart?: number;
  sendAtHour?: number;
  delayMinutes?: number;
  includeHeader?: boolean;
  headerStyle?: string;
  includeSignature?: boolean;
  signatureStyle?: string;
  // Legacy fields (kept for backward compatibility when loading)
  emailBlocks?: string;
  useEmailBuilder?: boolean;
};

type TimingMode = 'delay' | 'schedule';

type Campaign = {
  id: string;
  name: string;
  projectType: string;
  status: string;
  isGlobal: boolean;
  targetStageIds: string[] | null;
  emails: CampaignEmail[];
};

export default function CampaignEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  // Selected email for editing
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  // Email editor state
  const [emailSubject, setEmailSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [includeHeader, setIncludeHeader] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(true);

  // Button dialog state
  const [showButtonDialog, setShowButtonDialog] = useState(false);
  const [buttonText, setButtonText] = useState("");
  const [buttonDestination, setButtonDestination] = useState("CALENDAR");
  const [buttonCustomUrl, setButtonCustomUrl] = useState("");
  const [editingButton, setEditingButton] = useState<{
    marker: string;
    text: string;
    linkType: string;
    customUrl?: string;
  } | null>(null);

  // Editor ref for inserting content
  const emailBodyRef = useRef<HTMLDivElement | null>(null);
  const [timingMode, setTimingMode] = useState<TimingMode>('schedule');
  const [daysAfterStart, setDaysAfterStart] = useState(0);
  const [sendAtHour, setSendAtHour] = useState(9);
  const [delayMinutes, setDelayMinutes] = useState(5);
  
  // AI dialog state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  
  // Add email dialog state
  const [addEmailDialogOpen, setAddEmailDialogOpen] = useState(false);
  const [newEmailSubject, setNewEmailSubject] = useState("");
  const [newEmailDays, setNewEmailDays] = useState(7);
  const [newEmailTimingMode, setNewEmailTimingMode] = useState<TimingMode>('schedule');
  const [newEmailDelayMinutes, setNewEmailDelayMinutes] = useState(5);
  
  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Activation preflight dialog state
  const [preflightDialogOpen, setPreflightDialogOpen] = useState(false);

  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const isInitialLoad = useRef(true);

  // Force editor remount when AI generates content (increment to trigger key change)
  const [editorVersion, setEditorVersion] = useState(0);

  // Track what was last saved to accurately determine unsaved changes
  const lastSavedContentRef = useRef<{ subject: string; body: string } | null>(null);

  // Debounce content changes for auto-save (1.5 seconds after user stops typing)
  const debouncedSubject = useDebounce(emailSubject, 1500);
  const debouncedBody = useDebounce(templateBody, 1500);

  // Campaign settings state - default collapsed to focus on emails
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editedProjectType, setEditedProjectType] = useState<string>("");
  const [editedTargetStageIds, setEditedTargetStageIds] = useState<string[]>([]);

  // Fetch project types from API
  const { projectTypes, isLoading: isLoadingTypes } = useProjectTypes();

  // Fetch campaign data
  const { data: campaign, isLoading, error } = useQuery<Campaign>({
    queryKey: ["/api/drip-campaigns", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/drip-campaigns/${id}`);
      if (!res.ok) throw new Error("Campaign not found");
      return await res.json();
    },
    enabled: !!id && !!user
  });

  // Fetch stages (unified pipeline - no project type filter)
  const { data: stages = [] } = useQuery<Stage[]>({
    queryKey: ["/api/stages"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stages`);
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!user
  });

  // Initialize settings when campaign loads - handle both legacy targetStageId and new targetStageIds
  useEffect(() => {
    if (campaign) {
      setEditedProjectType(campaign.projectType || "WEDDING");
      // Handle both legacy single stage and new multi-stage array
      if (campaign.targetStageIds && campaign.targetStageIds.length > 0) {
        setEditedTargetStageIds(campaign.targetStageIds);
      } else if ((campaign as any).targetStageId) {
        // Legacy single stage - convert to array
        setEditedTargetStageIds([(campaign as any).targetStageId]);
      } else {
        setEditedTargetStageIds([]);
      }
    }
  }, [campaign]);

  // Set first email as selected when campaign loads
  useEffect(() => {
    const emails = campaign?.emails;
    if (emails && emails.length > 0 && !selectedEmailId) {
      const firstEmail = emails[0];
      selectEmail(firstEmail);
    }
  }, [campaign]);

  const selectEmail = (email: CampaignEmail) => {
    setSelectedEmailId(email.id);
    setEmailSubject(email.subject);
    setDaysAfterStart(email.daysAfterStart || 0);
    setSendAtHour(email.sendAtHour || 9);
    setDelayMinutes(email.delayMinutes || 5);
    setTimingMode(email.delayMinutes !== undefined && email.delayMinutes !== null ? 'delay' : 'schedule');
    setIncludeHeader(email.includeHeader || false);
    setIncludeSignature(email.includeSignature !== false);

    // Convert to text format - try multiple sources for best content
    let bodyToSet = "";

    // 1. First try templateBody (new format)
    if (email.templateBody && email.templateBody.trim()) {
      bodyToSet = email.templateBody;
    }
    // 2. Try emailBlocks
    else if (email.emailBlocks) {
      try {
        const parsed = JSON.parse(email.emailBlocks);
        const fromBlocks = blocksToTemplateBody(parsed);
        // Check if blocks have meaningful content (not just buttons)
        const textOnly = fromBlocks.replace(/\[\[BUTTON:[^\]]+\]\]/g, '').trim();
        if (textOnly.length > 10) {
          bodyToSet = fromBlocks;
        }
      } catch (e) {
        // Failed to parse emailBlocks, will fall through to htmlBody
      }
    }

    // 3. Fall back to htmlBody if we still don't have good content
    if (!bodyToSet || bodyToSet.replace(/\[\[BUTTON:[^\]]+\]\]/g, '').trim().length < 10) {
      if (email.htmlBody && email.htmlBody.trim()) {
        // Strip HTML tags and convert to plain text
        const fromHtml = email.htmlBody
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        if (fromHtml.length > 10) {
          bodyToSet = fromHtml;
        }
      }
    }

    setTemplateBody(bodyToSet);

    // Initialize the saved content tracker
    lastSavedContentRef.current = {
      subject: email.subject,
      body: bodyToSet
    };

    // Reset initial load flag after a short delay to prevent auto-save on first load
    setTimeout(() => {
      isInitialLoad.current = false;
    }, 100);
  };

  // Auto-save effect - saves when user stops typing
  useEffect(() => {
    // Don't auto-save on initial load or if no email is selected
    if (isInitialLoad.current || !selectedEmailId || !id) return;

    // Don't save if content is empty
    if (!debouncedBody.trim() && !debouncedSubject.trim()) return;

    const selectedEmail = campaign?.emails?.find(e => e.id === selectedEmailId);
    if (!selectedEmail) return;

    // Check if anything actually changed from what's in the database
    const hasChanges = (
      debouncedSubject !== selectedEmail.subject ||
      debouncedBody !== (selectedEmail.templateBody || '')
    );

    if (!hasChanges) return;

    // Perform auto-save
    const autoSave = async () => {
      setIsSaving(true);
      try {
        // Generate HTML from templateBody directly
        const htmlBody = templateBodyToHtml(debouncedBody);

        const res = await apiRequest("PATCH", `/api/drip-campaigns/${id}/emails/${selectedEmailId}`, {
          subject: debouncedSubject,
          htmlBody,
          textBody: debouncedBody,
          templateBody: debouncedBody,
          includeHeader,
          includeSignature
        });

        if (res.ok) {
          setLastSavedAt(new Date());
          // Update our saved content tracker so hasUnsavedChanges is accurate
          lastSavedContentRef.current = {
            subject: debouncedSubject,
            body: debouncedBody
          };
          // Silently refresh data without showing toast
          queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns", id] });
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    };

    autoSave();
  }, [debouncedSubject, debouncedBody, selectedEmailId, id, campaign?.emails, includeHeader, includeSignature]);

  // Immediate save function for email switching (bypasses debounce)
  const saveImmediately = useCallback(async (emailId: string, subject: string, body: string) => {
    try {
      const htmlBody = templateBodyToHtml(body);
      await apiRequest("PATCH", `/api/drip-campaigns/${id}/emails/${emailId}`, {
        subject,
        htmlBody,
        textBody: body,
        templateBody: body,
        includeHeader,
        includeSignature
      });
      // Update saved content tracker
      lastSavedContentRef.current = { subject, body };
      queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns", id] });
      return true;
    } catch (error) {
      console.error('Save failed during email switch:', error);
      return false;
    }
  }, [id, includeHeader, includeSignature]);

  // Handle email switch - save changes in background instead of showing warning
  const handleEmailSwitch = useCallback((email: CampaignEmail) => {
    if (email.id === selectedEmailId) return; // Already selected

    // Check if current email has unsaved content changes
    const savedContent = lastSavedContentRef.current;
    const hasContentChanges = savedContent && (
      emailSubject !== savedContent.subject ||
      templateBody !== savedContent.body
    );

    // If there are unsaved changes, save them immediately in background (fire and forget)
    if (hasContentChanges && selectedEmailId) {
      saveImmediately(selectedEmailId, emailSubject, templateBody);
    }

    // Switch to new email immediately without waiting for save
    selectEmail(email);
  }, [selectedEmailId, emailSubject, templateBody, saveImmediately]);

  // Save email mutation
  const saveEmailMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmailId) throw new Error("No email selected");

      // Generate HTML from templateBody directly
      const htmlBody = templateBodyToHtml(templateBody);

      const res = await apiRequest("PATCH", `/api/drip-campaigns/${id}/emails/${selectedEmailId}`, {
        subject: emailSubject,
        htmlBody,
        textBody: templateBody,
        templateBody: templateBody,
        daysAfterStart: timingMode === 'schedule' ? daysAfterStart : 0,
        sendAtHour: timingMode === 'schedule' ? sendAtHour : null,
        delayMinutes: timingMode === 'delay' ? Math.max(1, delayMinutes) : null,
        includeHeader,
        includeSignature
      });

      if (!res.ok) throw new Error("Failed to save email");
      return await res.json();
    },
    onSuccess: () => {
      // Update saved content tracker for accurate "All changes saved" display
      lastSavedContentRef.current = {
        subject: emailSubject,
        body: templateBody
      };
      setLastSavedAt(new Date());
      toast({
        title: "Changes saved",
        description: "Your email updates are live for all contacts in this campaign."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns", id] });
    },
    onError: (error: any) => {
      toast({ title: "Couldn't save your changes", description: error.message, variant: "destructive" });
    }
  });

  // Add email mutation
  const addEmailMutation = useMutation({
    mutationFn: async () => {
      const defaultContent = "Write your email content here...";
      const res = await apiRequest("POST", `/api/drip-campaigns/${id}/emails`, {
        subject: newEmailSubject,
        htmlBody: `<p>${defaultContent}</p>`,
        textBody: defaultContent,
        templateBody: defaultContent,
        daysAfterStart: newEmailTimingMode === 'schedule' ? newEmailDays : 0,
        sendAtHour: newEmailTimingMode === 'schedule' ? 9 : null,
        delayMinutes: newEmailTimingMode === 'delay' ? Math.max(1, newEmailDelayMinutes) : null,
        sequenceIndex: campaign?.emails?.length || 0
      });

      if (!res.ok) throw new Error("Failed to add email");
      return await res.json();
    },
    onSuccess: (newEmail) => {
      toast({
        title: "New email added to sequence",
        description: `"${newEmailSubject}" is ready to customize.`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns", id] });
      setAddEmailDialogOpen(false);
      setNewEmailSubject("");
      setNewEmailTimingMode('schedule');
      setNewEmailDelayMinutes(5);
      setNewEmailDays(7);
      // Select the new email
      selectEmail(newEmail);
    },
    onError: (error: any) => {
      toast({ title: "Couldn't add email", description: error.message, variant: "destructive" });
    }
  });

  // Delete email mutation
  const deleteEmailMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const res = await apiRequest("DELETE", `/api/drip-campaigns/${id}/emails/${emailId}`);
      if (!res.ok) throw new Error("Failed to delete email");
      return emailId;
    },
    onSuccess: (deletedId) => {
      toast({
        title: "Email removed from sequence",
        description: "The email sequence has been updated."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns", id] });
      if (selectedEmailId === deletedId) {
        setSelectedEmailId(null);
        setEmailSubject("");
        setTemplateBody("");
      }
    },
    onError: (error: any) => {
      toast({ title: "Couldn't delete email", description: error.message, variant: "destructive" });
    }
  });

  // AI generate email mutation
  const generateEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/openai/generate-drip-email", {
        campaignName: campaign?.name,
        projectType: campaign?.projectType,
        prompt: aiPrompt,
        emailNumber: (campaign?.emails?.findIndex(e => e.id === selectedEmailId) ?? 0) + 1,
        totalEmails: campaign?.emails?.length || 1
      });

      if (!res.ok) throw new Error("Failed to generate email");
      return await res.json();
    },
    onSuccess: async (data) => {
      // Validate AI response has meaningful content
      const body = data.body || (data.blocks ? blocksToTemplateBody(data.blocks) : '');
      const bodyTextOnly = body.replace(/\[\[BUTTON:[^\]]+\]\]/g, '').trim();

      if (!body || bodyTextOnly.length < 20) {
        console.warn('[AI Generation] Unusually short content:', { subject: data.subject, body, bodyLength: bodyTextOnly.length });
        toast({
          title: "AI generation incomplete",
          description: "The response was too short. Please try again with more detail in your prompt.",
          variant: "destructive"
        });
        return;
      }

      // Update state
      const newSubject = data.subject || emailSubject;
      if (data.subject) setEmailSubject(data.subject);
      setTemplateBody(body);

      // Force editor to remount so button markers get converted to chips
      setEditorVersion(v => v + 1);

      setAiDialogOpen(false);
      setAiPrompt("");

      // AUTO-SAVE: Immediately save to database so content persists
      // We need to save directly since React state updates are async
      if (selectedEmailId) {
        try {
          // Generate HTML from templateBody directly
          const htmlBody = templateBodyToHtml(body);

          const res = await apiRequest("PATCH", `/api/drip-campaigns/${id}/emails/${selectedEmailId}`, {
            subject: newSubject,
            htmlBody,
            textBody: body,
            templateBody: body
          });

          if (res.ok) {
            // Update saved content tracker so "All changes saved" shows correctly
            lastSavedContentRef.current = {
              subject: newSubject,
              body: body
            };
            setLastSavedAt(new Date());
            queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns", id] });
            toast({
              title: "AI content generated & saved",
              description: "Your AI-generated email has been saved. Feel free to customize it."
            });
          } else {
            throw new Error("Save failed");
          }
        } catch (error) {
          toast({
            title: "AI draft ready (not saved)",
            description: "Click 'Save Email' to keep your changes.",
            variant: "default"
          });
        }
      }
    },
    onError: (error: any) => {
      toast({ title: "AI generation failed", description: error.message, variant: "destructive" });
    }
  });

  // Activate campaign mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/drip-campaigns/${id}/activate`);
      if (!res.ok) throw new Error("Failed to activate");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign is now live!",
        description: "Contacts entering your target stages will start receiving emails."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns", id] });
    },
    onError: (error: any) => {
      toast({ title: "Couldn't activate campaign", description: error.message, variant: "destructive" });
    }
  });

  // Save campaign settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/drip-campaigns/${id}`, {
        projectType: editedProjectType,
        targetStageIds: editedTargetStageIds
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign settings updated",
        description: "Your targeting preferences have been saved."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns", id] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    }
  });

  // Toggle stage selection
  const toggleStage = (stageId: string) => {
    setEditedTargetStageIds(prev => 
      prev.includes(stageId)
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    );
  };

  // Check if settings have changed
  const hasSettingsChanges = campaign && (
    editedProjectType !== campaign.projectType ||
    JSON.stringify(editedTargetStageIds.sort()) !== JSON.stringify((campaign.targetStageIds || []).sort())
  );

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Campaign not found</h2>
        <Button onClick={() => setLocation("/drip-campaigns")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const selectedEmail = campaign.emails?.find(e => e.id === selectedEmailId);
  const currentTimingMode: TimingMode = selectedEmail?.delayMinutes !== undefined && selectedEmail?.delayMinutes !== null ? 'delay' : 'schedule';

  // Use lastSavedContentRef for accurate unsaved changes detection
  // This ensures we compare against what was actually last saved, not stale query data
  const savedContent = lastSavedContentRef.current;
  const hasUnsavedContentChanges = savedContent && (
    emailSubject !== savedContent.subject ||
    templateBody !== savedContent.body
  );

  // For timing changes, we still compare to selectedEmail since auto-save doesn't save timing
  const hasUnsavedTimingChanges = selectedEmail && (
    timingMode !== currentTimingMode ||
    (timingMode === 'schedule' && daysAfterStart !== selectedEmail.daysAfterStart) ||
    (timingMode === 'delay' && delayMinutes !== (selectedEmail.delayMinutes || 5))
  );

  const hasUnsavedChanges = hasUnsavedContentChanges || hasUnsavedTimingChanges;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/drip-campaigns")}
                data-testid="button-back-to-campaigns"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Campaigns
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="font-semibold flex items-center gap-2">
                  {campaign.name}
                  <Badge variant={campaign.status === "ACTIVE" ? "default" : "secondary"}>
                    {campaign.status}
                  </Badge>
                </h1>
                <p className="text-xs text-muted-foreground">
                  {campaign.projectType} • {campaign.emails?.length || 0} emails
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {campaign.status === "DRAFT" && campaign.emails?.length > 0 && (
                <Button
                  onClick={() => setPreflightDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  data-testid="button-activate-campaign"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Activate Campaign
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Email List */}
        <div className="w-80 min-w-80 max-w-80 border-r bg-slate-100 dark:bg-slate-900/50 flex flex-col overflow-hidden">
          {/* Campaign Settings Section */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <div className="p-4 border-b bg-white dark:bg-slate-950">
              <CollapsibleTrigger className="flex items-center justify-between w-full group">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-medium">Campaign Settings</h2>
                  {!settingsOpen && (
                    editedTargetStageIds.length > 0 ? (
                      <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {editedTargetStageIds.length} stage{editedTargetStageIds.length !== 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        No stages
                      </Badge>
                    )
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${settingsOpen ? 'rotate-90' : ''}`} />
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="p-4 border-b space-y-4 bg-white dark:bg-slate-950">
                {/* Project Type */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Layers className="w-3.5 h-3.5" />
                    Project Type
                  </Label>
                  <Select 
                    value={editedProjectType} 
                    onValueChange={(value) => {
                      setEditedProjectType(value);
                      setEditedTargetStageIds([]);
                    }}
                  >
                    <SelectTrigger data-testid="select-project-type">
                      <SelectValue placeholder="Select project type" />
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

                {/* Target Stages */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Target className="w-3.5 h-3.5" />
                    Active Stages
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Campaign emails will be sent when contacts enter these stages
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {stages.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">
                        {editedProjectType ? "Loading stages..." : "Select a project type first"}
                      </p>
                    ) : (
                      stages.map((stage) => (
                        <div 
                          key={stage.id} 
                          className="flex items-center gap-2 py-1"
                        >
                          <Checkbox
                            id={`stage-${stage.id}`}
                            checked={editedTargetStageIds.includes(stage.id)}
                            onCheckedChange={() => toggleStage(stage.id)}
                            data-testid={`checkbox-stage-${stage.id}`}
                          />
                          <label 
                            htmlFor={`stage-${stage.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {stage.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Save Settings Button */}
                {hasSettingsChanges && (
                  <Button
                    size="sm"
                    onClick={() => saveSettingsMutation.mutate()}
                    disabled={saveSettingsMutation.isPending}
                    className="w-full"
                    data-testid="button-save-settings"
                  >
                    {saveSettingsMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Save Settings
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="p-4 border-b bg-white dark:bg-slate-950">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-medium">Email Sequence</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {campaign.emails?.length || 0} email{(campaign.emails?.length || 0) !== 1 ? 's' : ''} in sequence
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const lastEmail = campaign.emails?.[campaign.emails.length - 1];
                  setNewEmailDays((lastEmail?.daysAfterStart || 0) + 7);
                  setAddEmailDialogOpen(true);
                }}
                data-testid="button-add-email"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Email
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-4 pr-3">
              {campaign.emails?.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Mail className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No emails yet. Add your first email to get started.
                  </p>
                  <Button 
                    size="sm"
                    onClick={() => setAddEmailDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add First Email
                  </Button>
                </div>
              ) : (
                <div className="relative pl-2 pt-2 space-y-4">
                  {campaign.emails?.map((email, index) => {
                    // Extract preview text from templateBody or htmlBody (100 chars for better context)
                    const previewText = (() => {
                      if (email.templateBody) {
                        const text = email.templateBody
                          .replace(/\[\[BUTTON:[^\]]+\]\]/g, '')
                          .replace(/\{\{[^}]+\}\}/g, '...')
                          .trim();
                        return text.length > 100 ? text.slice(0, 100) + '...' : text;
                      }
                      if (email.htmlBody) {
                        const text = email.htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                        return text.length > 100 ? text.slice(0, 100) + '...' : text;
                      }
                      return '';
                    })();

                    return (
                    <div key={email.id} className="relative w-full">
                      {/* Email Node Card */}
                      <div
                        className={`relative w-full bg-white dark:bg-slate-950 border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                          selectedEmailId === email.id
                            ? "border-primary shadow-lg ring-2 ring-primary/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:shadow-md"
                        }`}
                        onClick={() => handleEmailSwitch(email)}
                        data-testid={`email-card-${index}`}
                      >
                        {/* Step number badge - polished with shadow */}
                        <div className={`absolute -top-2.5 -left-2.5 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shadow-md transition-colors ${
                          selectedEmailId === email.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-slate-700 dark:bg-slate-600 text-white"
                        }`}>
                          {index + 1}
                        </div>

                        {/* Delete button - visible on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Select this email first, then open delete dialog
                            if (selectedEmailId !== email.id) {
                              selectEmail(email);
                            }
                            setDeleteDialogOpen(true);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 transition-all z-10"
                          title="Delete email"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-start gap-3 pr-6">
                          {/* Mail Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            selectedEmailId === email.id
                              ? "bg-primary/10"
                              : "bg-slate-100 dark:bg-slate-800"
                          }`}>
                            <Mail className={`w-5 h-5 ${
                              selectedEmailId === email.id
                                ? "text-primary"
                                : "text-slate-500 dark:text-slate-400"
                            }`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {email.subject || "Untitled Email"}
                            </p>
                            {previewText && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {previewText}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-2 text-xs">
                              <Badge variant="secondary" className="text-xs font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                <Clock className="w-3 h-3 mr-1" />
                                {email.delayMinutes !== undefined && email.delayMinutes !== null ? (
                                  <span>{email.delayMinutes} min</span>
                                ) : (
                                  <span>Day {email.daysAfterStart || 0}{email.sendAtHour !== undefined ? ` @ ${email.sendAtHour}:00` : ''}</span>
                                )}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Connector Line + Add Button */}
                      {index < (campaign.emails?.length || 0) - 1 && (
                        <div className="relative flex flex-col items-center py-2">
                          {/* Top connector line with gradient */}
                          <div className="w-0.5 h-4 bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 rounded-full" />

                          {/* Add button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextEmail = campaign.emails?.[index + 1];
                              const currentUsesDelay = email.delayMinutes !== undefined && email.delayMinutes !== null;
                              const nextUsesDelay = nextEmail?.delayMinutes !== undefined && nextEmail?.delayMinutes !== null;

                              if (currentUsesDelay || nextUsesDelay) {
                                const currentDelay = email.delayMinutes || 0;
                                const nextDelay = nextEmail?.delayMinutes || currentDelay + 10;
                                setNewEmailTimingMode('delay');
                                const midDelay = Math.floor((currentDelay + nextDelay) / 2);
                                setNewEmailDelayMinutes(Math.max(currentDelay + 1, Math.min(midDelay, nextDelay - 1)));
                              } else {
                                const currentDays = email.daysAfterStart || 0;
                                const nextDays = nextEmail?.daysAfterStart || currentDays + 7;
                                if (nextDays - currentDays <= 1) {
                                  setNewEmailTimingMode('delay');
                                  setNewEmailDelayMinutes(5);
                                } else {
                                  const midDay = Math.floor((currentDays + nextDays) / 2);
                                  setNewEmailTimingMode('schedule');
                                  setNewEmailDays(Math.max(currentDays + 1, Math.min(midDay, nextDays - 1)));
                                }
                              }
                              setAddEmailDialogOpen(true);
                            }}
                            className="my-1 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
                            data-testid={`button-add-email-after-${index}`}
                            title="Insert email here"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {/* Bottom connector line with arrow */}
                          <div className="w-0.5 h-4 bg-gradient-to-b from-slate-400 to-slate-300 dark:from-slate-500 dark:to-slate-600 rounded-full" />
                          <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500 rotate-90 -mt-0.5" />
                        </div>
                      )}
                    </div>
                    );
                  })}

                  {/* Add email at end */}
                  <div className="relative flex flex-col items-center pt-3">
                    <div className="w-0.5 h-5 bg-gradient-to-b from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-full" />
                    <button
                      onClick={() => {
                        const lastEmail = campaign.emails?.[campaign.emails.length - 1];
                        setNewEmailDays((lastEmail?.daysAfterStart || 0) + 7);
                        setAddEmailDialogOpen(true);
                      }}
                      className="mt-1 w-9 h-9 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 flex items-center justify-center hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                      data-testid="button-add-email-end"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedEmail ? (
            <>
              {/* Save status indicator */}
              {isSaving ? (
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-sm text-blue-700 dark:text-blue-400">Saving...</span>
                </div>
              ) : hasUnsavedTimingChanges ? (
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-700 dark:text-amber-400">Timing changes require manual save</span>
                </div>
              ) : lastSavedAt && !hasUnsavedChanges ? (
                <div className="px-4 py-2 bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-900 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-400">All changes saved</span>
                </div>
              ) : null}

              {/* Email Header - Timing & Actions */}
              <div className="px-4 py-3 border-b bg-white dark:bg-slate-950">
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    {/* Timing controls with sentence-like flow */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Send</span>

                      {timingMode === 'delay' ? (
                        <>
                          <Input
                            type="number"
                            value={delayMinutes}
                            onChange={(e) => setDelayMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 h-8 text-center bg-white dark:bg-slate-950"
                            min={1}
                            data-testid="input-delay-minutes"
                          />
                          <span className="text-sm text-slate-600 dark:text-slate-400">minutes after start</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-slate-600 dark:text-slate-400">on</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Day</span>
                          <Input
                            type="number"
                            value={daysAfterStart}
                            onChange={(e) => setDaysAfterStart(parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-center bg-white dark:bg-slate-950"
                            min={0}
                            data-testid="input-email-day"
                          />
                          <span className="text-sm text-slate-600 dark:text-slate-400">at</span>
                          <Select
                            value={String(sendAtHour)}
                            onValueChange={(v) => setSendAtHour(parseInt(v))}
                          >
                            <SelectTrigger className="w-20 h-8 bg-white dark:bg-slate-950" data-testid="select-email-hour">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={String(i)}>
                                  {i.toString().padStart(2, "0")}:00
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}

                      {/* Mode toggle */}
                      <div className="border-l border-slate-200 dark:border-slate-700 pl-2 ml-1">
                        <Select
                          value={timingMode}
                          onValueChange={(v) => setTimingMode(v as TimingMode)}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs" data-testid="select-timing-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="delay">Delay mode</SelectItem>
                            <SelectItem value="schedule">Schedule</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help ml-1" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <p className="font-medium mb-1">Timing Modes</p>
                          <p className="text-xs"><strong>Delay:</strong> Send X minutes after contact enters the campaign</p>
                          <p className="text-xs mt-1"><strong>Schedule:</strong> Send on a specific day at a specific time</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewDialogOpen(true)}
                      data-testid="button-preview-email"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAiDialogOpen(true)}
                      data-testid="button-ai-write"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      AI Write
                    </Button>
                    {/* Overflow menu for secondary actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="button-more-actions">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteDialogOpen(true)}
                          data-testid="menu-item-delete-email"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Email
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      onClick={() => saveEmailMutation.mutate()}
                      disabled={saveEmailMutation.isPending}
                      className={hasUnsavedChanges ? "animate-pulse" : ""}
                      data-testid="button-save-email"
                    >
                      {saveEmailMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Email
                    </Button>
                  </div>
                </div>
              </div>

              {/* Email Builder */}
              <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900/30">
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Subject Line - white card with elevated visual weight */}
                  <div className="bg-white dark:bg-slate-950 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 block">
                      Subject Line
                    </Label>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="e.g., Thanks for your inquiry!"
                      className="h-12 text-lg font-medium border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      data-testid="input-email-subject"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                      Make it personal and compelling — this is what recipients see first
                    </p>
                  </div>

                  {/* Message Body - white card */}
                  <div className="bg-white dark:bg-slate-950 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 block">
                      Message Body
                    </Label>
                    <div className="relative" ref={emailBodyRef}>
                      <div className="[&_.ProseMirror]:bg-white [&_.ProseMirror]:dark:bg-slate-950 [&_.ProseMirror]:border-slate-200 [&_.ProseMirror]:dark:border-slate-700">
                        <ButtonRichTextEditor
                          key={`${selectedEmailId}-${editorVersion}`}
                          value={templateBody}
                          onChange={setTemplateBody}
                          placeholder="Hi {{first_name}},

Write your email content here..."
                          minHeight="250px"
                          onEditButton={(data) => {
                            setButtonText(data.text);
                            setButtonDestination(data.linkType);
                            setButtonCustomUrl(data.customUrl || '');
                            setEditingButton(data);
                            setShowButtonDialog(true);
                          }}
                        />
                      </div>
                      {/* AI generation loading overlay */}
                      {generateEmailMutation.isPending && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center rounded-md z-10">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>AI is writing your email...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Insert helpers section */}
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Insert:</span>
                        {/* Add Button - more prominent */}
                        <button
                          type="button"
                          onClick={() => {
                            // Save selection before dialog takes focus (so button inserts at cursor position)
                            const editor = emailBodyRef.current?.querySelector('[contenteditable="true"]');
                            if (editor && (editor as any).saveSelection) {
                              (editor as any).saveSelection();
                            }
                            setButtonText("");
                            setButtonDestination("CALENDAR");
                            setButtonCustomUrl("");
                            setShowButtonDialog(true);
                          }}
                          className="px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1.5 font-medium shadow-sm"
                          data-testid="button-add-link"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          Add Button
                        </button>
                      </div>

                      {/* Variable chips with tooltips */}
                      <TooltipProvider>
                        <div className="flex flex-wrap gap-1.5">
                          {TEMPLATE_VARIABLES.map((v) => (
                            <Tooltip key={v.key}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const variable = `{{${v.key}}}`;
                                    const editorContainer = emailBodyRef.current;
                                    if (editorContainer) {
                                      const editor = editorContainer.querySelector('[contenteditable="true"]') as HTMLDivElement & { insertText?: (text: string) => void };
                                      if (editor?.insertText) {
                                        editor.insertText(variable);
                                      } else {
                                        editor?.focus();
                                        document.execCommand('insertText', false, variable);
                                      }
                                    } else {
                                      setTemplateBody(prev => prev + variable);
                                    }
                                  }}
                                  className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                  {`{{${v.key}}}`}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs">
                                <p className="text-xs font-medium">{v.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Example: "{v.example}"
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </TooltipProvider>
                    </div>

                    {/* Header/Footer toggles */}
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={includeHeader}
                          onCheckedChange={(checked) => setIncludeHeader(!!checked)}
                          data-testid="checkbox-include-header"
                        />
                        <span className="text-sm text-muted-foreground">Include Header</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={includeSignature}
                          onCheckedChange={(checked) => setIncludeSignature(!!checked)}
                          data-testid="checkbox-include-signature"
                        />
                        <span className="text-sm text-muted-foreground">Include Signature</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Mail className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">Select an Email</h3>
                <p className="text-muted-foreground mb-4">
                  Click on an email in the sidebar to edit it
                </p>
                {campaign.emails?.length === 0 && (
                  <Button onClick={() => setAddEmailDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Email
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Email Dialog */}
      <Dialog open={addEmailDialogOpen} onOpenChange={setAddEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Email</DialogTitle>
            <DialogDescription>
              Add a new email to your campaign sequence
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                placeholder="e.g., Following up on your inquiry"
                value={newEmailSubject}
                onChange={(e) => setNewEmailSubject(e.target.value)}
                data-testid="input-new-email-subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Timing Mode</Label>
              <Select 
                value={newEmailTimingMode} 
                onValueChange={(v) => setNewEmailTimingMode(v as TimingMode)}
              >
                <SelectTrigger data-testid="select-new-email-timing-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delay">Delay (minutes after start)</SelectItem>
                  <SelectItem value="schedule">Schedule (on a specific day)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newEmailTimingMode === 'delay' ? (
              <div className="space-y-2">
                <Label>Delay (minutes)</Label>
                <Input
                  type="number"
                  value={newEmailDelayMinutes}
                  onChange={(e) => setNewEmailDelayMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  data-testid="input-new-email-delay"
                />
                <p className="text-xs text-muted-foreground">
                  Minutes after the campaign starts for this contact
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Send on Day</Label>
                <Input
                  type="number"
                  value={newEmailDays}
                  onChange={(e) => setNewEmailDays(parseInt(e.target.value) || 0)}
                  min={0}
                  data-testid="input-new-email-day"
                />
                <p className="text-xs text-muted-foreground">
                  Days after the campaign starts for this contact
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => addEmailMutation.mutate()}
              disabled={!newEmailSubject.trim() || addEmailMutation.isPending}
              data-testid="button-confirm-add-email"
            >
              {addEmailMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Write Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              AI Email Writer
            </DialogTitle>
            <DialogDescription>
              Describe what you want to say and AI will write the email for you
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>What should this email accomplish?</Label>
              <Textarea
                placeholder="e.g., Remind them about our meeting next week and share some tips for preparing..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                data-testid="textarea-ai-prompt"
              />
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">Context we'll include:</p>
              <ul className="text-muted-foreground text-xs space-y-1">
                <li>• Campaign: {campaign.name}</li>
                <li>• Project type: {campaign.projectType}</li>
                <li>• Email #{(campaign.emails?.findIndex(e => e.id === selectedEmailId) || 0) + 1} of {campaign.emails?.length}</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => generateEmailMutation.mutate()}
              disabled={!aiPrompt.trim() || generateEmailMutation.isPending}
              data-testid="button-generate-ai"
            >
              {generateEmailMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Email Preview
            </DialogTitle>
            <DialogDescription>
              Preview how this email will look to your clients
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="bg-white rounded-lg shadow-sm max-w-2xl mx-auto">
                <div className="p-4 border-b bg-muted/30 rounded-t-lg">
                  <p className="text-sm text-muted-foreground">Subject:</p>
                  <p className="font-medium">{emailSubject || "No subject"}</p>
                </div>
                <div className="p-6">
                  <EmailPreview
                    templateBody={templateBody}
                    includeHeader={includeHeader}
                    headerStyle="professional"
                    includeSignature={includeSignature}
                    signatureStyle="professional"
                    hideCardWrapper={true}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Button Dialog */}
      <Dialog open={showButtonDialog} onOpenChange={(open) => {
        setShowButtonDialog(open);
        if (!open) {
          setEditingButton(null);
          setButtonText("");
          setButtonDestination("CALENDAR");
          setButtonCustomUrl("");
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-purple-500" />
              {editingButton ? 'Edit Button' : 'Add Button'}
            </DialogTitle>
            <DialogDescription>
              {editingButton ? 'Modify your button settings' : 'Add a clickable button to your email'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="buttonText">Button Text</Label>
              <Input
                id="buttonText"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="e.g., Book Now"
                className="mt-1"
                data-testid="input-button-text"
              />
            </div>

            <div>
              <Label>Link Destination</Label>
              <Select value={buttonDestination} onValueChange={setButtonDestination}>
                <SelectTrigger className="mt-1" data-testid="select-button-destination">
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
            </div>

            {buttonDestination === "CUSTOM" && (
              <div>
                <Label htmlFor="buttonUrl">Custom URL</Label>
                <Input
                  id="buttonUrl"
                  value={buttonCustomUrl}
                  onChange={(e) => setButtonCustomUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="mt-1"
                  data-testid="input-button-url"
                />
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowButtonDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!buttonText.trim()) return;

                const sanitizedText = buttonText.replace(/[\[\]:]/g, '');

                const editorContainer = emailBodyRef.current;
                if (editorContainer) {
                  const editor = editorContainer.querySelector('[contenteditable="true"]') as HTMLDivElement & {
                    insertButton?: (linkType: string, text: string, url?: string) => void;
                    insertText?: (text: string) => void;
                    updateButton?: (oldMarker: string, newLinkType: string, newText: string, newCustomUrl?: string) => void;
                  };

                  if (editingButton) {
                    // Edit mode - update existing button
                    if (editor?.updateButton) {
                      editor.updateButton(
                        editingButton.marker,
                        buttonDestination,
                        sanitizedText,
                        buttonDestination === 'CUSTOM' ? buttonCustomUrl : undefined
                      );
                    }
                  } else {
                    // Create mode - insert new button
                    if (editor?.insertButton) {
                      editor.insertButton(buttonDestination, sanitizedText, buttonDestination === 'CUSTOM' ? buttonCustomUrl : undefined);
                    } else if (editor?.insertText) {
                      let marker: string;
                      if (buttonDestination === 'CUSTOM' && buttonCustomUrl) {
                        marker = `[[BUTTON:CUSTOM:${sanitizedText}:${buttonCustomUrl}]]`;
                      } else {
                        marker = `[[BUTTON:${buttonDestination}:${sanitizedText}]]`;
                      }
                      editor.insertText(marker);
                    } else {
                      let marker: string;
                      if (buttonDestination === 'CUSTOM' && buttonCustomUrl) {
                        marker = `[[BUTTON:CUSTOM:${sanitizedText}:${buttonCustomUrl}]]`;
                      } else {
                        marker = `[[BUTTON:${buttonDestination}:${sanitizedText}]]`;
                      }
                      editor?.focus();
                      document.execCommand('insertText', false, marker);
                    }
                  }
                } else if (!editingButton) {
                  // Fallback for create mode only
                  let marker: string;
                  if (buttonDestination === 'CUSTOM' && buttonCustomUrl) {
                    marker = `[[BUTTON:CUSTOM:${sanitizedText}:${buttonCustomUrl}]]`;
                  } else {
                    marker = `[[BUTTON:${buttonDestination}:${sanitizedText}]]`;
                  }
                  setTemplateBody(prev => prev + '\n\n' + marker);
                }

                setShowButtonDialog(false);
                setEditingButton(null);
                setButtonText("");
                setButtonDestination("CALENDAR");
                setButtonCustomUrl("");
              }}
              disabled={!buttonText.trim()}
              data-testid="button-insert-button"
            >
              {editingButton ? 'Save Changes' : 'Insert Button'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Delete Email
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedEmail?.subject || 'this email'}" from the sequence? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedEmail) {
                  deleteEmailMutation.mutate(selectedEmail.id);
                }
                setDeleteDialogOpen(false);
              }}
              disabled={deleteEmailMutation.isPending}
            >
              {deleteEmailMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activation Preflight Dialog */}
      <Dialog open={preflightDialogOpen} onOpenChange={setPreflightDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-600" />
              Ready to Activate?
            </DialogTitle>
            <DialogDescription>
              Review your campaign before going live
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {/* Emails check */}
            <div className="flex items-start gap-3">
              {(campaign?.emails?.length || 0) > 0 ? (
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-emerald-600" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-3 h-3 text-red-600" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{campaign?.emails?.length || 0} emails configured</p>
                <p className="text-xs text-muted-foreground">Emails will send in sequence based on timing</p>
              </div>
            </div>

            {/* Stages check */}
            <div className="flex items-start gap-3">
              {editedTargetStageIds.length > 0 ? (
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-emerald-600" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">
                  {editedTargetStageIds.length > 0
                    ? `${editedTargetStageIds.length} trigger stage${editedTargetStageIds.length !== 1 ? 's' : ''} selected`
                    : 'No trigger stages selected'
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  {editedTargetStageIds.length > 0
                    ? 'Campaign starts when contacts enter these stages'
                    : 'Campaign won\'t trigger without stages'
                  }
                </p>
              </div>
            </div>

            {/* Subject lines check */}
            {(() => {
              const emailsWithoutSubject = campaign?.emails?.filter(e => !e.subject || !e.subject.trim()) || [];
              return (
                <div className="flex items-start gap-3">
                  {emailsWithoutSubject.length === 0 ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-600" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {emailsWithoutSubject.length === 0
                        ? 'All emails have subject lines'
                        : `${emailsWithoutSubject.length} email${emailsWithoutSubject.length !== 1 ? 's' : ''} missing subject`
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">Subject lines help with open rates</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Warning if no stages */}
          {editedTargetStageIds.length === 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-2">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Warning:</strong> Without trigger stages, this campaign won't automatically send to anyone. Configure stages in Campaign Settings first.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreflightDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setPreflightDialogOpen(false);
                activateMutation.mutate();
              }}
              disabled={activateMutation.isPending || editedTargetStageIds.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {activateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Activate Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
