import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Globe,
  Sparkles,
  Target,
  Loader2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Stage = {
  id: string;
  name: string;
  color: string;
  orderIndex: number;
};

type CampaignBuilderWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectType: string;
  onSuccess?: () => void;
};

export function CampaignBuilderWizard({ 
  open, 
  onOpenChange, 
  projectType,
  onSuccess 
}: CampaignBuilderWizardProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  
  // Step 1: Campaign basics
  const [campaignName, setCampaignName] = useState("");
  
  // Step 2: Stage selection
  const [isGlobal, setIsGlobal] = useState(false);
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);

  // Fetch stages (unified pipeline - no project type filter)
  const { data: stages = [] } = useQuery<Stage[]>({
    queryKey: ["/api/stages"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stages`);
      return await res.json();
    },
    enabled: open
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setCampaignName("");
      setIsGlobal(false);
      setSelectedStageIds([]);
    }
  }, [open]);

  // Create campaign mutation (without emails - we add them on the full page)
  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: campaignName,
        projectType,
        isGlobal,
        targetStageIds: isGlobal ? null : selectedStageIds,
        status: "DRAFT",
        maxDurationMonths: 12,
        emailFrequencyDays: 7,
        emails: [] // No emails initially - add on full page editor
      };
      
      const res = await apiRequest("POST", "/api/drip-campaigns", payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create campaign");
      }
      return await res.json();
    },
    onSuccess: (campaign) => {
      toast({ title: "Campaign created!", description: "Now let's add your emails." });
      queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns"] });
      onOpenChange(false);
      onSuccess?.();
      // Navigate to full-page editor
      setLocation(`/drip-campaigns/${campaign.id}/edit`);
    },
    onError: (error: any) => {
      toast({ title: "Failed to create campaign", description: error.message, variant: "destructive" });
    }
  });

  const toggleStage = (stageId: string) => {
    setSelectedStageIds(prev => 
      prev.includes(stageId) 
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return campaignName.trim().length >= 3;
      case 2:
        return isGlobal || selectedStageIds.length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      createCampaignMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Create New Campaign
          </DialogTitle>
          <DialogDescription>
            Set up your campaign, then add emails on the next page
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps - Now only 2 steps */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step > s 
                    ? "bg-green-500 text-white" 
                    : step === s 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 2 && (
                <div className={`w-16 h-0.5 mx-2 ${step > s ? "bg-green-500" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-12 text-xs text-muted-foreground mb-4">
          <span className={step === 1 ? "text-foreground font-medium" : ""}>Name</span>
          <span className={step === 2 ? "text-foreground font-medium" : ""}>Target Stages</span>
        </div>

        <Separator />

        {/* Step 1: Campaign Name */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name" className="text-sm font-medium">
                Campaign Name
              </Label>
              <Input
                id="campaign-name"
                placeholder="e.g., Wedding Inquiry Follow-up"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="text-lg"
                autoFocus
                data-testid="input-campaign-name"
              />
              <p className="text-xs text-muted-foreground">
                Give your campaign a descriptive name to help you find it later
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Project Type</h4>
                  <p className="text-sm text-muted-foreground">
                    This campaign will target <span className="font-medium text-foreground">{projectType.charAt(0) + projectType.slice(1).toLowerCase()}</span> projects
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Stage Selection */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                When should this campaign trigger?
              </Label>
              <p className="text-xs text-muted-foreground">
                Select which pipeline stages will start this email sequence
              </p>
            </div>

            {/* Global Toggle */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                isGlobal ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
              }`}
              onClick={() => {
                setIsGlobal(!isGlobal);
                if (!isGlobal) setSelectedStageIds([]);
              }}
              data-testid="toggle-global-campaign"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isGlobal ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">All Stages</h4>
                  <p className="text-xs text-muted-foreground">
                    Trigger for any project entering any stage
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isGlobal ? "border-primary bg-primary" : "border-muted-foreground/30"
                }`}>
                  {isGlobal && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">or select specific stages</span>
              </div>
            </div>

            {/* Stage Chips */}
            <ScrollArea className={`${isGlobal ? "opacity-50 pointer-events-none" : ""}`}>
              <div className="flex flex-wrap gap-2 max-h-[200px]">
                {stages.map((stage) => {
                  const isSelected = selectedStageIds.includes(stage.id);
                  return (
                    <Badge
                      key={stage.id}
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer py-2 px-4 text-sm transition-all ${
                        isSelected 
                          ? "bg-primary hover:bg-primary/90" 
                          : "hover:bg-muted"
                      }`}
                      onClick={() => toggleStage(stage.id)}
                      data-testid={`stage-chip-${stage.id}`}
                    >
                      <span 
                        className="w-2 h-2 rounded-full mr-2" 
                        style={{ backgroundColor: stage.color || "#888" }} 
                      />
                      {stage.name}
                      {isSelected && <Check className="w-3 h-3 ml-2" />}
                    </Badge>
                  );
                })}
              </div>
            </ScrollArea>

            {!isGlobal && selectedStageIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedStageIds.length} stage{selectedStageIds.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <Button
            variant="ghost"
            onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed() || createCampaignMutation.isPending}
            data-testid="button-next"
          >
            {createCampaignMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : step === 2 ? (
              <>
                Create & Add Emails
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
