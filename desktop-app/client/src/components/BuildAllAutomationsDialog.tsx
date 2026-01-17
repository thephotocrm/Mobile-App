import { useState, useMemo, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Mail, Smartphone, ArrowRight, AlertCircle, Loader2, ChevronDown, ChevronUp, X, Link2, Eye, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ButtonRichTextEditor } from "@/components/ButtonRichTextEditor";
import { EmailPreview } from "@/components/email-preview";

// Template variables available for email/SMS content
const TEMPLATE_VARIABLES = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'event_date', label: 'Event Date' },
  { key: 'photographer_name', label: 'Your Name' },
  { key: 'business_name', label: 'Business' },
];

// Types matching the API response
interface GeneratedAutomationPreview {
  id: string;
  name: string;
  description: string;
  stageId: string;
  stageName: string;
  stageIntent: string;
  automationType: "COMMUNICATION" | "STAGE_CHANGE" | "COUNTDOWN";
  channel: "EMAIL" | "SMS" | null;
  triggerType: string | null;
  targetStageId: string | null;
  targetStageName: string | null;
  delayMinutes: number;
  delayDays: number;
  sendAtHour: number | null;
  emailSubject: string | null;
  emailBody: string | null;
  contentBlocks: any[] | null;
  smsContent: string | null;
  enabled: boolean;
  hasConflict: boolean;
  conflictAutomationId: string | null;
}

interface StagePreview {
  stageId: string;
  stageName: string;
  orderIndex: number;
  intent: string;
  intentConfidence: number;
  existingAutomationCount: number;
  suggestedAutomations: GeneratedAutomationPreview[];
}

interface GenerateAllStagesResponse {
  stages: StagePreview[];
  totalSuggested: number;
  totalExisting: number;
}

interface BulkCreateResponse {
  created: { id: string; name: string; stageId: string }[];
  failed: { name: string; error: string }[];
  totalCreated: number;
  totalFailed: number;
}

interface BuildAllAutomationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectType: string;
}

// Format timing for display
function formatTiming(delayMinutes: number, delayDays?: number): string {
  const days = delayDays || Math.floor(Math.abs(delayMinutes) / 1440);
  const remainingMinutes = Math.abs(delayMinutes) % 1440;
  const isBefore = delayMinutes < 0;

  if (delayMinutes === 0) return "Immediately";

  let timeStr = "";
  if (days >= 1) {
    timeStr = `${days} day${days > 1 ? 's' : ''}`;
  } else if (remainingMinutes >= 60) {
    const hours = Math.floor(remainingMinutes / 60);
    timeStr = `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    timeStr = `${remainingMinutes} min`;
  }

  return isBefore ? `${timeStr} before` : `${timeStr} later`;
}

// Intent badge colors
const intentColors: Record<string, string> = {
  INQUIRY: "bg-blue-100 text-blue-700 border-blue-200",
  QUALIFICATION: "bg-purple-100 text-purple-700 border-purple-200",
  PROPOSAL: "bg-amber-100 text-amber-700 border-amber-200",
  BOOKING: "bg-green-100 text-green-700 border-green-200",
  PRE_EVENT: "bg-cyan-100 text-cyan-700 border-cyan-200",
  POST_EVENT: "bg-pink-100 text-pink-700 border-pink-200",
  NURTURE: "bg-rose-100 text-rose-700 border-rose-200"
};

// Strip HTML tags for plain text display
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n').trim();
}

// Convert HTML to templateBody format (plain text preserving variables and button markers)
function htmlToTemplateBody(html: string): string {
  if (!html) return '';
  return html
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '') // Strip remaining HTML tags
    .trim();
}

export function BuildAllAutomationsDialog({ open, onOpenChange, projectType }: BuildAllAutomationsDialogProps) {
  const { toast } = useToast();
  const [automationStates, setAutomationStates] = useState<Record<string, boolean>>({});
  const [automationEdits, setAutomationEdits] = useState<Record<string, Partial<GeneratedAutomationPreview>>>({});
  const [originalContent, setOriginalContent] = useState<Record<string, Partial<GeneratedAutomationPreview>>>({});
  const [expandedAutomation, setExpandedAutomation] = useState<string | null>(null);
  const [previewAutomation, setPreviewAutomation] = useState<GeneratedAutomationPreview | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [data, setData] = useState<GenerateAllStagesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastProjectType, setLastProjectType] = useState<string>("");

  // Fetch all stage automations
  const fetchAutomations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/automations/generate-all-stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectType }),
        credentials: "include"
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error ${response.status}: ${text.substring(0, 200)}`);
      }

      const result = await response.json();
      setData(result);
      setLastProjectType(projectType);

      // Initialize states and store original content for undo
      const initialStates: Record<string, boolean> = {};
      const initialOriginals: Record<string, Partial<GeneratedAutomationPreview>> = {};
      result.stages?.forEach((stage: StagePreview) => {
        stage.suggestedAutomations.forEach((auto: GeneratedAutomationPreview) => {
          initialStates[auto.id] = auto.enabled;
          // Store original content for reset functionality
          initialOriginals[auto.id] = {
            emailSubject: auto.emailSubject,
            emailBody: auto.emailBody,
            smsContent: auto.smsContent
          };
        });
      });
      setAutomationStates(initialStates);
      setAutomationEdits({});
      setOriginalContent(initialOriginals);
    } catch (err) {
      console.error("Failed to generate automations:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [projectType]);

  // Fetch when dialog opens or project type changes
  useEffect(() => {
    if (open && (projectType !== lastProjectType || !data)) {
      fetchAutomations();
    }
  }, [open, projectType, lastProjectType, data, fetchAutomations]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setExpandedAutomation(null);
    }
  }, [open]);

  // Get edited automation data
  const getAutomationData = (auto: GeneratedAutomationPreview) => {
    const edits = automationEdits[auto.id] || {};
    return {
      ...auto,
      ...edits
    };
  };

  // Update automation edit
  const updateAutomationEdit = (id: string, field: keyof GeneratedAutomationPreview, value: any) => {
    setAutomationEdits(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  // Reset automation to original AI-generated content
  const resetAutomation = (id: string) => {
    const original = originalContent[id];
    if (original) {
      setAutomationEdits(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      toast({
        title: "Reset to original",
        description: "Content restored to AI-generated version",
      });
    }
  };

  // Check if an automation has been edited
  const hasEdits = (id: string) => {
    return Object.keys(automationEdits[id] || {}).length > 0;
  };

  // Bulk create mutation
  const bulkCreateMutation = useMutation<BulkCreateResponse, Error, GeneratedAutomationPreview[]>({
    mutationFn: async (automations) => {
      const response = await fetch("/api/automations/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          automations: automations.map(a => {
            const editedData = getAutomationData(a);
            return {
              name: editedData.name,
              description: editedData.description,
              stageId: editedData.stageId,
              automationType: editedData.automationType,
              channel: editedData.channel,
              triggerType: editedData.triggerType,
              targetStageId: editedData.targetStageId,
              targetStageName: editedData.targetStageName, // Fallback for stage resolution
              delayMinutes: editedData.delayMinutes,
              emailSubject: editedData.emailSubject,
              emailBody: editedData.emailBody,
              contentBlocks: editedData.contentBlocks,
              smsContent: editedData.smsContent,
              anchorType: editedData.delayMinutes < 0 ? "BOOKING_START" : "STAGE_ENTRY"
            };
          }),
          projectType
        }),
        credentials: "include"
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to create automations: ${text.substring(0, 100)}`);
      }

      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({
        title: "Automations Created",
        description: `Successfully created ${result.totalCreated} automations${result.totalFailed > 0 ? `. ${result.totalFailed} failed.` : '.'}`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create automations",
        variant: "destructive",
      });
    }
  });

  // Count enabled automations
  const enabledCount = useMemo(() => {
    return Object.values(automationStates).filter(Boolean).length;
  }, [automationStates]);

  // Count enabled automations with conflicts
  const conflictCount = useMemo(() => {
    if (!data?.stages) return 0;
    return data.stages.flatMap(stage =>
      stage.suggestedAutomations.filter(auto => automationStates[auto.id] && auto.hasConflict)
    ).length;
  }, [data, automationStates]);

  // Get all enabled automations for creation
  const getEnabledAutomations = () => {
    if (!data?.stages) return [];
    return data.stages.flatMap(stage =>
      stage.suggestedAutomations.filter(auto => automationStates[auto.id])
    );
  };

  // Toggle individual automation
  const toggleAutomation = (id: string, enabled: boolean) => {
    setAutomationStates(prev => ({ ...prev, [id]: enabled }));
  };

  // Toggle all automations
  const toggleAll = (enabled: boolean) => {
    if (!data?.stages) return;
    const newStates: Record<string, boolean> = {};
    data.stages.forEach(stage => {
      stage.suggestedAutomations.forEach(auto => {
        newStates[auto.id] = enabled;
      });
    });
    setAutomationStates(newStates);
  };

  // Handle create all
  const handleCreateAll = async () => {
    const enabledAutomations = getEnabledAutomations();
    if (enabledAutomations.length === 0) return;

    setIsCreating(true);
    try {
      await bulkCreateMutation.mutateAsync(enabledAutomations);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Build All Automations with AI
          </DialogTitle>
          <DialogDescription>
            Generate a complete automation sequence for your <span className="font-medium">{projectType.toLowerCase()}</span> pipeline. Review and customize before creating.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mb-4" />
            <p className="text-muted-foreground">Analyzing your pipeline stages...</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-600 font-medium">Failed to generate automations</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md text-center">{error.message}</p>
            <Button variant="outline" onClick={fetchAutomations} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* Summary Bar */}
            <div className="flex justify-between items-center py-3 px-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-sm">
                  {enabledCount} automations selected
                </Badge>
                <span className="text-xs text-muted-foreground">
                  across {data.stages.length} stages
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAll(true)}
                  className="text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAll(false)}
                  className="text-xs"
                >
                  None
                </Button>
              </div>
            </div>

            {/* Conflict Warning Banner */}
            {conflictCount > 0 && (
              <div className="flex items-center gap-3 py-3 px-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {conflictCount} automation{conflictCount > 1 ? 's' : ''} may duplicate existing ones
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Creating these will add similar automations to ones you already have
                  </p>
                </div>
              </div>
            )}

            {/* Scrollable Stage Accordion */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              <Accordion type="multiple" defaultValue={data.stages.map(s => s.stageId)} className="space-y-2">
                {data.stages.map((stage) => (
                  <AccordionItem
                    key={stage.stageId}
                    value={stage.stageId}
                    className="border rounded-lg overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="font-medium">{stage.stageName}</span>
                        <Badge variant="outline" className={cn("text-xs", intentColors[stage.intent])}>
                          {stage.intent}
                        </Badge>
                        {stage.existingAutomationCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({stage.existingAutomationCount} existing)
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto mr-2">
                          {stage.suggestedAutomations.filter(a => automationStates[a.id]).length} / {stage.suggestedAutomations.length}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3 pt-1">
                      <div className="space-y-2">
                        {stage.suggestedAutomations.map((auto) => (
                          <AutomationPreviewRow
                            key={auto.id}
                            automation={getAutomationData(auto)}
                            enabled={automationStates[auto.id] ?? auto.enabled}
                            expanded={expandedAutomation === auto.id}
                            hasBeenEdited={hasEdits(auto.id)}
                            onToggle={(enabled) => toggleAutomation(auto.id, enabled)}
                            onExpand={() => setExpandedAutomation(expandedAutomation === auto.id ? null : auto.id)}
                            onEdit={(field, value) => updateAutomationEdit(auto.id, field, value)}
                            onPreview={() => setPreviewAutomation(getAutomationData(auto))}
                            onReset={() => resetAutomation(auto.id)}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t mt-4">
              <div className="text-sm text-muted-foreground">
                {data.totalExisting > 0 && (
                  <span>{data.totalExisting} automations already exist</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAll}
                  disabled={enabledCount === 0 || isCreating}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Create {enabledCount} Automations
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>

      {/* Email Preview Dialog */}
      <Dialog open={!!previewAutomation} onOpenChange={(open) => !open && setPreviewAutomation(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              Email Preview
            </DialogTitle>
            <DialogDescription>
              {previewAutomation?.name}
            </DialogDescription>
          </DialogHeader>
          {previewAutomation?.channel === 'EMAIL' && (
            <EmailPreview
              subject={previewAutomation.emailSubject || ""}
              templateBody={previewAutomation.emailBody ? htmlToTemplateBody(previewAutomation.emailBody) : ""}
              includeHeader={true}
              includeSignature={true}
              hideCardWrapper={true}
            />
          )}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setPreviewAutomation(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

// Sub-component for each automation row with expandable editor
function AutomationPreviewRow({
  automation,
  enabled,
  expanded,
  hasBeenEdited,
  onToggle,
  onExpand,
  onEdit,
  onPreview,
  onReset,
}: {
  automation: GeneratedAutomationPreview;
  enabled: boolean;
  expanded: boolean;
  hasBeenEdited: boolean;
  onToggle: (enabled: boolean) => void;
  onExpand: () => void;
  onEdit: (field: keyof GeneratedAutomationPreview, value: any) => void;
  onPreview: () => void;
  onReset: () => void;
}) {
  const isEmail = automation.channel === 'EMAIL';
  const isSms = automation.channel === 'SMS';
  const isStageChange = automation.automationType === 'STAGE_CHANGE';

  // Get preview text
  const getPreviewText = () => {
    if (isEmail && automation.emailSubject) {
      return automation.emailSubject;
    }
    if (isSms && automation.smsContent) {
      return automation.smsContent.substring(0, 60) + (automation.smsContent.length > 60 ? '...' : '');
    }
    if (isStageChange && automation.targetStageName) {
      return `Move to "${automation.targetStageName}"`;
    }
    return automation.description || "No content";
  };

  return (
    <div
      className={cn(
        "rounded-lg border-2 transition-all",
        enabled && automation.hasConflict
          ? "bg-amber-50/50 border-amber-400 dark:bg-amber-950/20 dark:border-amber-600"
          : enabled
          ? "bg-green-50/50 border-green-200 dark:bg-green-950/20"
          : "bg-gray-50 border-gray-200 opacity-60 dark:bg-gray-900/50"
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-green-500 shrink-0"
          />
          {isEmail ? (
            <Mail className="h-4 w-4 text-blue-500 shrink-0" />
          ) : isSms ? (
            <Smartphone className="h-4 w-4 text-green-500 shrink-0" />
          ) : (
            <ArrowRight className="h-4 w-4 text-purple-500 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{automation.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {formatTiming(automation.delayMinutes, automation.delayDays)} • {getPreviewText()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {automation.hasConflict && (
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Similar automation already exists</p>
              </TooltipContent>
            </Tooltip>
          )}
          {(isEmail || isSms) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExpand}
              className="h-7 px-2"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Editor */}
      {expanded && (isEmail || isSms) && (
        <div className="px-3 pb-3 pt-1 border-t bg-white dark:bg-gray-950">
          {isEmail && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Subject</Label>
                <Input
                  value={automation.emailSubject || ""}
                  onChange={(e) => onEdit("emailSubject", e.target.value)}
                  placeholder="Email subject line"
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Body</Label>
                <ButtonRichTextEditor
                  value={automation.emailBody ? htmlToTemplateBody(automation.emailBody) : ""}
                  onChange={(value) => onEdit("emailBody", value)}
                  placeholder="Hi {{first_name}},&#10;&#10;Write your email content here..."
                  minHeight="120px"
                />
                {/* Variable insertion chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => {
                        const currentBody = automation.emailBody ? htmlToTemplateBody(automation.emailBody) : "";
                        onEdit("emailBody", currentBody + `{{${v.key}}}`);
                      }}
                      className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      {v.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const currentBody = automation.emailBody ? htmlToTemplateBody(automation.emailBody) : "";
                      onEdit("emailBody", currentBody + "\n\n[[BUTTON:CALENDAR:Book a Call]]");
                    }}
                    className="px-2 py-0.5 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1"
                  >
                    <Link2 className="w-3 h-3" />
                    Add Button
                  </button>
                </div>
                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPreview}
                    className="h-7 text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                  {hasBeenEdited && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onReset}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset to Original
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          {isSms && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">SMS Message</Label>
              <Textarea
                value={automation.smsContent || ""}
                onChange={(e) => onEdit("smsContent", e.target.value)}
                placeholder="SMS message content"
                className="mt-1 min-h-[80px] text-sm"
                maxLength={320}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(automation.smsContent?.length || 0)}/320 characters • Variables: {"{{first_name}}"}, {"{{photographer_name}}"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BuildAllAutomationsDialog;
