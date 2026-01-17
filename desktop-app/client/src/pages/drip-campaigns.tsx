import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Sparkles, 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  Calendar,
  Edit,
  Trash2,
  Play,
  Pause,
  Eye,
  MoreHorizontal,
  Save,
  Globe
} from "lucide-react";
import { type DripCampaignEmail as SchemaDripCampaignEmail } from "@shared/schema";
import { useProjectTypes } from "@/hooks/use-project-types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ButtonRichTextEditor } from "@/components/ButtonRichTextEditor";
import { EmailPreview } from "@/components/email-preview";
import { blocksToTemplateBody, templateBodyToHtml, type ContentBlock } from "@/lib/blocks-to-text";
import { generateEmailHeader, generateEmailSignature } from "@shared/email-branding-shared";
import { CampaignBuilderWizard } from "@/components/campaign-builder-wizard";
import { AICampaignWizard } from "@/components/ai-campaign-wizard";

// Types
type DripCampaign = {
  id: string;
  name: string;
  projectType: string;
  targetStageId: string | null;
  targetStageIds: string[] | null;
  isGlobal: boolean;
  isStaticTemplate: boolean;
  status: "DRAFT" | "APPROVED" | "ACTIVE" | "PAUSED";
  emailCount: number;
  emailFrequencyWeeks: number;
  maxDurationMonths: number;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  emails?: DripCampaignEmail[];
  subscriptionsCount?: number;
};

// Use schema type with all proper fields including approvalStatus
type DripCampaignEmail = SchemaDripCampaignEmail & {
  delayWeeks: number; // Frontend computed field
  content: string; // Fallback for content display
};


export default function DripCampaigns() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedProjectType, setSelectedProjectType] = useState<string>("");
  
  // Fetch project types from API
  const { projectTypes, isLoading: isLoadingTypes } = useProjectTypes();
  
  // Initialize selectedProjectType when project types load
  useEffect(() => {
    if (projectTypes.length > 0 && !selectedProjectType) {
      const defaultType = projectTypes.find(t => t.isDefault) || projectTypes[0];
      setSelectedProjectType(defaultType.slug);
    }
  }, [projectTypes, selectedProjectType]);
  const [selectedEmailForPreview, setSelectedEmailForPreview] = useState<any>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  // Email edit modal state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [emailBeingEdited, setEmailBeingEdited] = useState<any>(null);
  const [editEmailSubject, setEditEmailSubject] = useState("");
  const [editTemplateBody, setEditTemplateBody] = useState("");
  const [editDaysAfterStart, setEditDaysAfterStart] = useState(0);
  const [editSendAtHour, setEditSendAtHour] = useState<number | null>(null);
  const [previewTab, setPreviewTab] = useState<'builder' | 'preview'>('builder');
  // Email branding state
  const [editIncludeHeader, setEditIncludeHeader] = useState(false);
  const [editHeaderStyle, setEditHeaderStyle] = useState('professional');
  const [editIncludeSignature, setEditIncludeSignature] = useState(false);
  const [editSignatureStyle, setEditSignatureStyle] = useState('professional');
  
  // Compact edit dialog states
  const [timingDialogOpen, setTimingDialogOpen] = useState(false);
  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  
  // Email toggle states for direct static template display
  const [emailToggles, setEmailToggles] = useState<Record<string, boolean>>({});
  const [campaignEnabled, setCampaignEnabled] = useState<Record<string, boolean>>({});
  
  // Campaign builder wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [aiWizardOpen, setAiWizardOpen] = useState(false);

  // Load campaign settings for the selected project type
  const { data: campaignSettings } = useQuery({
    queryKey: ["/api/static-campaign-settings", selectedProjectType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/static-campaign-settings/${selectedProjectType}`);
      return await res.json();
    },
  });

  // Mutation for saving campaign settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { projectType: string; campaignEnabled: boolean; emailToggles: Record<string, boolean> }) => {
      const res = await apiRequest("POST", "/api/static-campaign-settings", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/static-campaign-settings"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    }
  });

  // Mutation for updating email content
  const updateEmailMutation = useMutation({
    mutationFn: async (data: {
      campaignId: string;
      emailId: string;
      subject: string;
      htmlBody: string;
      textBody: string;
      templateBody: string;
      sendAtHour: number | null;
      daysAfterStart: number;
      includeHeader: boolean;
      headerStyle: string;
      includeSignature: boolean;
      signatureStyle: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/drip-campaigns/${data.campaignId}/emails/${data.emailId}`, {
        subject: data.subject,
        htmlBody: data.htmlBody,
        textBody: data.textBody,
        templateBody: data.templateBody,
        sendAtHour: data.sendAtHour,
        daysAfterStart: data.daysAfterStart,
        includeHeader: data.includeHeader,
        headerStyle: data.headerStyle,
        includeSignature: data.includeSignature,
        signatureStyle: data.signatureStyle
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Email updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns/static-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns"] });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update email", description: error.message, variant: "destructive" });
    }
  });

  // Initialize settings from backend when data loads
  useEffect(() => {
    if (campaignSettings) {
      setCampaignEnabled(prev => ({
        ...prev,
        [selectedProjectType]: campaignSettings.campaignEnabled || false
      }));
      
      if (campaignSettings.emailToggles) {
        try {
          const parsedToggles = JSON.parse(campaignSettings.emailToggles);
          setEmailToggles(prev => ({
            ...prev,
            ...parsedToggles
          }));
        } catch (error) {
          console.error('Failed to parse email toggles:', error);
        }
      }
    }
  }, [campaignSettings, selectedProjectType]);

  // Get stages (unified pipeline - no project type filter)
  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ["/api/stages"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stages`);
      return await res.json();
    },
    enabled: !!user?.photographerId
  });

  // Query for static campaign templates (read-only)
  const { data: staticCampaign, isLoading: campaignsLoading } = useQuery<any>({
    queryKey: ["/api/drip-campaigns/static-templates", selectedProjectType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/drip-campaigns/static-templates?projectType=${selectedProjectType}`);
      return await res.json();
    },
    enabled: !!user?.photographerId
  });

  // Query for draft campaigns (has saved branding)
  const { data: draftCampaigns = [] } = useQuery<any[]>({
    queryKey: ["/api/drip-campaigns", selectedProjectType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/drip-campaigns?projectType=${selectedProjectType}`);
      return await res.json();
    },
    enabled: !!user?.photographerId
  });

  const { data: subscriptions = [] } = useQuery<any[]>({
    queryKey: ["/api/drip-subscriptions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/drip-subscriptions");
      return await res.json();
    },
    enabled: !!user?.photographerId
  });

  // Query for photographer data (for branding preview)
  const { data: photographerData } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: editDialogOpen
  });

  // Branding style definitions
  const headerStyles = [
    { value: 'minimal', label: 'Minimal', description: 'Clean and simple centered header' },
    { value: 'professional', label: 'Professional', description: 'Centered with bottom border' },
    { value: 'bold', label: 'Bold', description: 'Eye-catching gradient background' },
    { value: 'classic', label: 'Classic', description: 'Traditional layout with text' }
  ];

  const signatureStyles = [
    { value: 'simple', label: 'Simple', description: 'Clean text-based signature' },
    { value: 'professional', label: 'Professional', description: 'Includes headshot and social icons' },
    { value: 'detailed', label: 'Detailed', description: 'Full contact card with all details' },
    { value: 'branded', label: 'Branded', description: 'Brand-focused with color accents' }
  ];

  const brandingData = photographerData ? {
    photographerName: photographerData.photographerName || '',
    businessName: photographerData.businessName || '',
    email: photographerData.email || '',
    phone: photographerData.phone || '',
    website: photographerData.website || '',
    address: photographerData.address || '',
    city: photographerData.city || '',
    state: photographerData.state || '',
    zip: photographerData.zip || '',
    logoUrl: photographerData.logoUrl || '',
    headshotUrl: photographerData.headshotUrl || '',
    facebook: photographerData.facebook || '',
    instagram: photographerData.instagram || '',
    twitter: photographerData.twitter || '',
    linkedin: photographerData.linkedin || ''
  } : null;

  // Merge draft emails with static template (draft takes precedence for branding)
  const mergedEmails = useMemo(() => {
    if (!staticCampaign?.emails) return [];
    
    const draftCampaign = draftCampaigns?.find((c: any) => c.projectType === selectedProjectType && c.isStaticTemplate);
    if (!draftCampaign?.emails || draftCampaign.emails.length === 0) return staticCampaign.emails;
    
    // If draft has fewer emails than static template (custom campaign), 
    // only return the draft emails (don't merge with all 24 static emails)
    if (draftCampaign.emails.length < staticCampaign.emails.length) {
      return draftCampaign.emails.map((draftEmail: any) => {
        const staticEmail = staticCampaign.emails.find((s: any) => s.sequenceIndex === draftEmail.sequenceIndex);
        return {
          ...staticEmail,
          ...draftEmail,
          id: draftEmail.id
        };
      });
    }
    
    // Map static emails and overlay draft data if it exists
    return staticCampaign.emails.map((staticEmail: any) => {
      const draftEmail = draftCampaign.emails.find((d: any) => d.sequenceIndex === staticEmail.sequenceIndex);
      if (draftEmail) {
        // Use draft email data (has saved branding)
        return {
          ...staticEmail,
          ...draftEmail,
          id: draftEmail.id // Make sure we have the draft email ID
        };
      }
      return staticEmail;
    });
  }, [staticCampaign, draftCampaigns, selectedProjectType]);






  // Handler for opening edit dialog
  const handleEditEmail = (email: any) => {
    setEmailBeingEdited(email);
    setEditEmailSubject(email.subject);
    setEditDaysAfterStart(email.daysAfterStart || 0);
    setEditSendAtHour(email.sendAtHour ?? null);
    
    // Load template body - prefer templateBody, fall back to converting emailBlocks
    if (email.templateBody) {
      setEditTemplateBody(email.templateBody);
    } else if (email.emailBlocks) {
      try {
        const blocks = JSON.parse(email.emailBlocks);
        setEditTemplateBody(blocksToTemplateBody(blocks));
      } catch (error) {
        console.error('Failed to parse email blocks:', error);
        setEditTemplateBody('');
      }
    } else {
      setEditTemplateBody('');
    }
    
    // Load branding preferences
    setEditIncludeHeader(email.includeHeader || false);
    setEditHeaderStyle(email.headerStyle || 'professional');
    setEditIncludeSignature(email.includeSignature || false);
    setEditSignatureStyle(email.signatureStyle || 'professional');
    
    setPreviewTab('builder');
    setEditDialogOpen(true);
  };

  // Handler for saving edited email
  const handleSaveEmail = async () => {
    if (!emailBeingEdited || !staticCampaign || !user?.photographerId) return;

    try {
      // Get the first stage as target (unified pipeline)
      const stagesRes = await apiRequest("GET", `/api/stages`);
      const stagesData = await stagesRes.json();
      const firstStage = stagesData[0];

      if (!firstStage) {
        toast({ title: "Error", description: "No stages found. Please create a stage first.", variant: "destructive" });
        return;
      }

      // Always call create-draft-from-template - it will create missing emails if needed
      const draftRes = await apiRequest("POST", "/api/drip-campaigns/create-draft-from-template", {
        projectType: staticCampaign.projectType,
        targetStageId: firstStage.id
      });
      const draftCampaign = await draftRes.json();

      console.log("=== DEBUG EMAIL SAVE ===");
      console.log("Looking for email with sequenceIndex:", emailBeingEdited.sequenceIndex);
      console.log("Draft campaign emails:", draftCampaign.emails);
      console.log("Draft campaign emails count:", draftCampaign.emails?.length);
      console.log("Email sequence indexes:", draftCampaign.emails?.map((e: any) => e.sequenceIndex));

      // Find the corresponding email in the draft campaign BY SEQUENCE INDEX
      const draftEmail = draftCampaign.emails?.find((e: any) => e.sequenceIndex === emailBeingEdited.sequenceIndex);

      console.log("Found draft email:", draftEmail);

      if (!draftEmail) {
        console.error("EMAIL NOT FOUND! emailBeingEdited:", emailBeingEdited);
        toast({ title: "Error", description: "Email not found in draft campaign", variant: "destructive" });
        return;
      }

      // Now we can update the email with proper IDs
      // Generate HTML from templateBody
      const htmlBody = templateBodyToHtml(editTemplateBody);
      updateEmailMutation.mutate({
        campaignId: draftCampaign.id,
        emailId: draftEmail.id,
        subject: editEmailSubject,
        htmlBody,
        textBody: editTemplateBody,
        templateBody: editTemplateBody,
        sendAtHour: editSendAtHour,
        daysAfterStart: editDaysAfterStart,
        includeHeader: editIncludeHeader,
        headerStyle: editHeaderStyle,
        includeSignature: editIncludeSignature,
        signatureStyle: editSignatureStyle
      });
    } catch (error) {
      console.error('Error saving email:', error);
      toast({ title: "Error", description: "Failed to save email. Please try again.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      DRAFT: "secondary",
      APPROVED: "outline", 
      ACTIVE: "default",
      PAUSED: "destructive"
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || "secondary"}>{status}</Badge>;
  };

  const getActionButton = (campaign: DripCampaign) => {
    switch (campaign.status) {
      case "DRAFT":
        return (
          <Button 
            size="sm" 
            onClick={() => handleApproveCampaign(campaign.id)}
            data-testid={`button-approve-${campaign.id}`}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
        );
      case "APPROVED":
        return (
          <Button 
            size="sm" 
            onClick={() => handleActivateExistingCampaign(campaign.id)}
            data-testid={`button-activate-${campaign.id}`}
          >
            <Play className="h-4 w-4 mr-1" />
            Activate
          </Button>
        );
      case "ACTIVE":
        return (
          <Button 
            size="sm" 
            variant="secondary"
            data-testid={`button-pause-${campaign.id}`}
          >
            <Pause className="h-4 w-4 mr-1" />
            Pause
          </Button>
        );
      default:
        return null;
    }
  };

  if (authLoading || !user?.photographerId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-drip-campaigns">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-drip-campaigns">Drip Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            Automated email sequences to nurture your leads into bookings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {mergedEmails.length || staticCampaign?.emails?.length || 24} Templates
          </Badge>
          <Button 
            variant="outline"
            onClick={() => setAiWizardOpen(true)}
            data-testid="button-create-ai-campaign"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Create with AI
          </Button>
          <Button 
            onClick={() => setWizardOpen(true)}
            data-testid="button-create-campaign"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>
      
      {/* Campaign Builder Wizard */}
      <CampaignBuilderWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        projectType={selectedProjectType}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns"] })}
      />
      
      {/* AI Campaign Wizard */}
      <AICampaignWizard
        open={aiWizardOpen}
        onOpenChange={setAiWizardOpen}
        onCampaignCreated={async (campaignId) => {
          try {
            // Invalidate both the list and the specific campaign query
            await queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns"] });
            // Pre-fetch the campaign data before redirecting (with timeout)
            await Promise.race([
              queryClient.prefetchQuery({
                queryKey: ["/api/drip-campaigns", campaignId],
                queryFn: async () => {
                  const res = await apiRequest("GET", `/api/drip-campaigns/${campaignId}`);
                  if (!res.ok) throw new Error("Campaign not found");
                  return await res.json();
                }
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))
            ]);
          } catch (e) {
            // Prefetch failed or timed out, but we still redirect - data will be fetched on page load
            console.log("Campaign prefetch warning:", e);
          }
          setLocation(`/drip-campaigns/${campaignId}/edit`);
        }}
      />

      {/* Project Type Selection */}
      <div>
        {/* Desktop Tabs */}
        <Tabs value={selectedProjectType} onValueChange={setSelectedProjectType} className="hidden md:block">
          <TabsList data-testid="tabs-project-type" className="grid w-full grid-cols-6">
            <TabsTrigger value="WEDDING">Wedding</TabsTrigger>
            <TabsTrigger value="PORTRAIT">Portrait</TabsTrigger>
            <TabsTrigger value="COMMERCIAL">Commercial</TabsTrigger>
            <TabsTrigger value="ENGAGEMENT">Engagement</TabsTrigger>
            <TabsTrigger value="MATERNITY">Maternity</TabsTrigger>
            <TabsTrigger value="FAMILY">Family</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Mobile Dropdown */}
        <div className="md:hidden">
          <Label htmlFor="mobile-project-type" className="text-sm font-medium">Project Type</Label>
          <Select value={selectedProjectType} onValueChange={setSelectedProjectType}>
            <SelectTrigger className="w-full mt-2" data-testid="select-mobile-project-type">
              <SelectValue placeholder="Select project type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WEDDING">💒 Wedding</SelectItem>
              <SelectItem value="PORTRAIT">🎭 Portrait</SelectItem>
              <SelectItem value="COMMERCIAL">📸 Commercial</SelectItem>
              <SelectItem value="ENGAGEMENT">💍 Engagement</SelectItem>
              <SelectItem value="MATERNITY">🤱 Maternity</SelectItem>
              <SelectItem value="FAMILY">👨‍👩‍👧‍👦 Family</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={selectedProjectType} onValueChange={setSelectedProjectType}>

        <TabsContent value={selectedProjectType} className="mt-6">
          {/* Campaigns Section */}
          {(() => {
            const customCampaigns = (draftCampaigns || []).filter((c: any) => !c.isStaticTemplate);
            
            if (customCampaigns.length === 0) {
              return (
                <Card>
                  <CardContent className="text-center py-12">
                    <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Campaigns Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first email campaign to nurture {selectedProjectType.toLowerCase()} leads automatically.
                    </p>
                    <Button onClick={() => setWizardOpen(true)} data-testid="button-create-first-campaign">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Campaign
                    </Button>
                  </CardContent>
                </Card>
              );
            }
            
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Your Campaigns</h2>
                    <p className="text-sm text-muted-foreground">
                      Email sequences for {selectedProjectType.toLowerCase()} projects
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-4">
                  {customCampaigns.map((campaign: any) => (
                    <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-600' :
                              campaign.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              <Mail className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold">{campaign.name}</h3>
                                <Badge variant={
                                  campaign.status === 'ACTIVE' ? 'default' :
                                  campaign.status === 'DRAFT' ? 'secondary' :
                                  'outline'
                                }>
                                  {campaign.status}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {campaign.projectType || 'WEDDING'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {campaign.emails?.length || 0} emails
                                </span>
                                {campaign.isGlobal ? (
                                  <span className="flex items-center gap-1 text-blue-600">
                                    <Globe className="w-3 h-3" />
                                    All stages
                                  </span>
                                ) : campaign.targetStageIds?.length > 0 ? (
                                  <span className="flex items-center gap-1 text-green-600">
                                    {campaign.targetStageIds.length} stage{campaign.targetStageIds.length !== 1 ? 's' : ''} selected
                                  </span>
                                ) : campaign.targetStageId ? (
                                  <span className="flex items-center gap-1 text-green-600">
                                    1 stage selected
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-orange-600">
                                    No stages selected
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setLocation(`/drip-campaigns/${campaign.id}/edit`)}
                              data-testid={`button-edit-custom-${campaign.id}`}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            {campaign.status === 'DRAFT' && (
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={async () => {
                                  try {
                                    await apiRequest("POST", `/api/drip-campaigns/${campaign.id}/activate`);
                                    toast({ title: "Campaign activated!" });
                                    queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns"] });
                                  } catch (error) {
                                    toast({ title: "Failed to activate", variant: "destructive" });
                                  }
                                }}
                                data-testid={`button-activate-custom-${campaign.id}`}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Activate
                              </Button>
                            )}
                            {campaign.status === 'ACTIVE' && (
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={async () => {
                                  try {
                                    await apiRequest("POST", `/api/drip-campaigns/${campaign.id}/pause`);
                                    toast({ title: "Campaign paused" });
                                    queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns"] });
                                  } catch (error) {
                                    toast({ title: "Failed to pause", variant: "destructive" });
                                  }
                                }}
                                data-testid={`button-pause-custom-${campaign.id}`}
                              >
                                <Pause className="w-4 h-4 mr-1" />
                                Pause
                              </Button>
                            )}
                            {campaign.status === 'PAUSED' && (
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={async () => {
                                  try {
                                    await apiRequest("POST", `/api/drip-campaigns/${campaign.id}/activate`);
                                    toast({ title: "Campaign resumed!" });
                                    queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns"] });
                                  } catch (error) {
                                    toast({ title: "Failed to resume", variant: "destructive" });
                                  }
                                }}
                                data-testid={`button-resume-custom-${campaign.id}`}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Resume
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={async () => {
                                if (!confirm("Are you sure you want to delete this campaign?")) return;
                                try {
                                  await apiRequest("DELETE", `/api/drip-campaigns/${campaign.id}`);
                                  toast({ title: "Campaign deleted" });
                                  queryClient.invalidateQueries({ queryKey: ["/api/drip-campaigns"] });
                                } catch (error) {
                                  toast({ title: "Failed to delete", variant: "destructive" });
                                }
                              }}
                              data-testid={`button-delete-custom-${campaign.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Email sequence preview */}
                        {campaign.emails && campaign.emails.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                              {campaign.emails.slice(0, 5).map((email: any, idx: number) => (
                                <div 
                                  key={email.id} 
                                  className="flex-shrink-0 bg-muted rounded-lg px-3 py-2 text-xs"
                                  title={email.subject}
                                >
                                  <div className="font-medium truncate max-w-[150px]">{email.subject}</div>
                                  <div className="text-muted-foreground">Day {email.daysAfterStart}</div>
                                </div>
                              ))}
                              {campaign.emails.length > 5 && (
                                <div className="flex-shrink-0 bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
                                  +{campaign.emails.length - 5} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog for Individual Emails */}
      {selectedEmailForPreview && (
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="w-full max-w-[100vw] md:max-w-4xl max-h-[90vh] md:max-h-[80vh] p-4 md:p-6">
            <DialogHeader>
              <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">Email Preview</span>
                </div>
                <Badge variant="outline" className="text-xs w-fit">Day {selectedEmailForPreview.daysAfterStart}</Badge>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm break-words">
                {selectedEmailForPreview.subject}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 h-[calc(90vh-120px)] md:h-[calc(80vh-120px)]">
              {/* Email Content Display */}
              <div className="h-full">
                <ScrollArea className="h-full border rounded-lg">
                  <div className="p-3 md:p-4">
                    {(() => {
                      // Prefer templateBody, then convert from emailBlocks, then fall back to htmlBody
                      let bodyContent = selectedEmailForPreview.templateBody;

                      if (!bodyContent && selectedEmailForPreview.emailBlocks) {
                        try {
                          const blocks = JSON.parse(selectedEmailForPreview.emailBlocks);
                          bodyContent = blocksToTemplateBody(blocks);
                        } catch (error) {
                          console.error('Failed to parse email blocks:', error);
                        }
                      }

                      // Use EmailPreview with templateBody if we have content
                      if (bodyContent) {
                        return (
                          <EmailPreview
                            templateBody={bodyContent}
                            includeHeader={selectedEmailForPreview.includeHeader || false}
                            headerStyle={selectedEmailForPreview.headerStyle || 'professional'}
                            includeSignature={selectedEmailForPreview.includeSignature || false}
                            signatureStyle={selectedEmailForPreview.signatureStyle || 'professional'}
                            hideCardWrapper={true}
                          />
                        );
                      }

                      // Fall back to raw HTML if no templateBody
                      return (
                        <div
                          dangerouslySetInnerHTML={{ __html: selectedEmailForPreview.htmlBody || '' }}
                          className="prose prose-sm max-w-none text-sm"
                        />
                      );
                    })()}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Email Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-full max-w-[100vw] md:max-w-[95vw] h-[95vh] flex flex-col p-4 md:p-6">
          {/* Builder/Preview Side-by-Side Layout (Desktop) / Tabs (Mobile) */}
          <div className="flex-1 min-h-0">
            {/* Mobile Tabs */}
            <div className="lg:hidden">
              <div className="space-y-3 mb-4">
                {/* Header */}
                <div className="pb-2 border-b">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Edit Email
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customize this email with the visual builder, set timing, and preview changes
                  </p>
                </div>

                {/* Settings Container */}
                <div className="bg-slate-200 dark:bg-slate-800/60 rounded-lg p-4 space-y-3 border border-slate-400 dark:border-slate-500">
                  <div>
                    <Label htmlFor="edit-subject" className="text-sm">Email Subject</Label>
                    <Input
                      id="edit-subject"
                      value={editEmailSubject}
                      onChange={(e) => setEditEmailSubject(e.target.value)}
                      placeholder="Enter email subject"
                      className="mt-1 bg-background"
                      data-testid="input-edit-subject"
                    />
                  </div>

                  {/* Settings Cards */}
                  <div className="space-y-3">
                  {/* Timing Card */}
                  <div className="border rounded-lg p-3 bg-card">
                    <Label className="text-xs text-muted-foreground">Timing</Label>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-sm font-medium">
                        Day {editDaysAfterStart}{editSendAtHour !== null ? ` at ${editSendAtHour === 0 ? '12' : editSendAtHour > 12 ? editSendAtHour - 12 : editSendAtHour}:00 ${editSendAtHour >= 12 ? 'PM' : 'AM'}` : ''}
                      </div>
                      <Dialog open={timingDialogOpen} onOpenChange={setTimingDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="ghost" size="sm" data-testid="button-edit-timing" className="h-8 w-8 p-0">
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit Timing</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div>
                              <Label htmlFor="timing-days">Days After Start</Label>
                              <Input
                                id="timing-days"
                                type="number"
                                min="0"
                                value={editDaysAfterStart}
                                onChange={(e) => setEditDaysAfterStart(parseInt(e.target.value) || 0)}
                                placeholder="0"
                                data-testid="input-timing-days"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Days after start
                              </p>
                            </div>

                            <div>
                              <Label htmlFor="timing-hour">Send At Time</Label>
                              <Select
                                value={editSendAtHour !== null ? editSendAtHour.toString() : "none"}
                                onValueChange={(value) => setEditSendAtHour(value === "none" ? null : parseInt(value))}
                              >
                                <SelectTrigger data-testid="select-timing-hour">
                                  <SelectValue placeholder="Any time" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Any time</SelectItem>
                                  <SelectItem value="7">7:00 AM</SelectItem>
                                  <SelectItem value="8">8:00 AM</SelectItem>
                                  <SelectItem value="9">9:00 AM</SelectItem>
                                  <SelectItem value="10">10:00 AM</SelectItem>
                                  <SelectItem value="11">11:00 AM</SelectItem>
                                  <SelectItem value="12">12:00 PM</SelectItem>
                                  <SelectItem value="13">1:00 PM</SelectItem>
                                  <SelectItem value="14">2:00 PM</SelectItem>
                                  <SelectItem value="15">3:00 PM</SelectItem>
                                  <SelectItem value="16">4:00 PM</SelectItem>
                                  <SelectItem value="17">5:00 PM</SelectItem>
                                  <SelectItem value="18">6:00 PM</SelectItem>
                                  <SelectItem value="19">7:00 PM</SelectItem>
                                  <SelectItem value="20">8:00 PM</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex justify-end">
                              <Button 
                                type="button" 
                                onClick={() => setTimingDialogOpen(false)}
                                data-testid="button-timing-done"
                              >
                                Done
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Header Card */}
                  <div className="border rounded-lg p-3 bg-card">
                    <Label className="text-xs text-muted-foreground">Header</Label>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-sm font-medium">
                        {editIncludeHeader ? `${editHeaderStyle.charAt(0).toUpperCase() + editHeaderStyle.slice(1)}` : 'None'}
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setHeaderModalOpen(true)}
                        data-testid="button-edit-header-mobile"
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Signature Card */}
                  <div className="border rounded-lg p-3 bg-card">
                    <Label className="text-xs text-muted-foreground">Signature</Label>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-sm font-medium">
                        {editIncludeSignature ? `${editSignatureStyle.charAt(0).toUpperCase() + editSignatureStyle.slice(1)}` : 'None'}
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSignatureModalOpen(true)}
                        data-testid="button-edit-signature-mobile"
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                </div>
              </div>

              {/* Build Email Container */}
              <div className="bg-blue-200 dark:bg-slate-800/60 rounded-lg p-4 border border-blue-400 dark:border-slate-600">

              <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as 'builder' | 'preview')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="builder" data-testid="tab-builder">Build Email</TabsTrigger>
                  <TabsTrigger value="preview" data-testid="tab-preview">Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="builder" className="mt-4">
                      {/* Variable insertion chips */}
                      <div className="mb-3">
                        <Label className="text-xs text-muted-foreground mb-2 block">Insert Variables:</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { key: 'first_name', label: 'First Name' },
                            { key: 'last_name', label: 'Last Name' },
                            { key: 'full_name', label: 'Full Name' },
                            { key: 'email', label: 'Email' },
                            { key: 'project_type', label: 'Project Type' },
                            { key: 'event_date', label: 'Event Date' },
                          ].map((variable) => (
                            <Button
                              key={variable.key}
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs px-2"
                              onClick={() => {
                                setEditTemplateBody(prev => prev + `{{${variable.key}}}`);
                              }}
                            >
                              {variable.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <ButtonRichTextEditor
                        value={editTemplateBody}
                        onChange={setEditTemplateBody}
                        placeholder="Hi {{first_name}},\n\nWrite your email content here..."
                        minHeight="200px"
                      />
                    </TabsContent>

                    <TabsContent value="preview" className="mt-4">
                      <EmailPreview
                        subject={editEmailSubject}
                        templateBody={editTemplateBody}
                        includeHeader={editIncludeHeader}
                        headerStyle={editHeaderStyle}
                        includeSignature={editIncludeSignature}
                        signatureStyle={editSignatureStyle}
                      />
                    </TabsContent>
                  </Tabs>
              </div>
            </div>

            {/* Desktop Side-by-Side */}
            <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6 h-full">
              {/* Left: Settings + Builder */}
              <div className="overflow-auto pr-2">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="pb-2 border-b">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Edit className="h-5 w-5" />
                      Edit Email
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Customize this email with the visual builder, set timing, and preview changes
                    </p>
                  </div>

                  {/* Settings Container */}
                  <div className="bg-slate-200 dark:bg-slate-800/60 rounded-lg p-4 space-y-3 border border-slate-400 dark:border-slate-500">
                    {/* Email Subject */}
                    <div>
                      <Label htmlFor="edit-subject-desktop" className="text-sm">Email Subject</Label>
                      <Input
                        id="edit-subject-desktop"
                        value={editEmailSubject}
                        onChange={(e) => setEditEmailSubject(e.target.value)}
                        placeholder="Enter email subject"
                        className="mt-1 bg-background"
                        data-testid="input-edit-subject-desktop"
                      />
                    </div>

                    {/* Settings Cards */}
                    <div className="grid grid-cols-3 gap-3">
                    {/* Timing Card */}
                    <div className="border rounded-lg p-3 bg-card">
                      <Label className="text-xs text-muted-foreground">Timing</Label>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-sm font-medium">
                          Day {editDaysAfterStart}{editSendAtHour !== null ? ` at ${editSendAtHour === 0 ? '12' : editSendAtHour > 12 ? editSendAtHour - 12 : editSendAtHour}:00 ${editSendAtHour >= 12 ? 'PM' : 'AM'}` : ''}
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setTimingDialogOpen(true)}
                          data-testid="button-edit-timing-desktop"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Header Card */}
                    <div className="border rounded-lg p-3 bg-card">
                      <Label className="text-xs text-muted-foreground">Header</Label>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-sm font-medium">
                          {editIncludeHeader ? `${editHeaderStyle.charAt(0).toUpperCase() + editHeaderStyle.slice(1)}` : 'None'}
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setHeaderModalOpen(true)}
                          data-testid="button-edit-header-desktop"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Signature Card */}
                    <div className="border rounded-lg p-3 bg-card">
                      <Label className="text-xs text-muted-foreground">Signature</Label>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-sm font-medium">
                          {editIncludeSignature ? `${editSignatureStyle.charAt(0).toUpperCase() + editSignatureStyle.slice(1)}` : 'None'}
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSignatureModalOpen(true)}
                          data-testid="button-edit-signature-desktop"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    </div>
                  </div>

                  {/* Build Email Container */}
                  <div className="bg-blue-200 dark:bg-slate-800/60 rounded-lg p-4 border border-blue-400 dark:border-slate-600">
                    <div>
                      <h3 className="text-sm font-medium mb-3">Build Email</h3>
                      {/* Variable insertion chips */}
                      <div className="mb-3">
                        <Label className="text-xs text-muted-foreground mb-2 block">Insert Variables:</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { key: 'first_name', label: 'First Name' },
                            { key: 'last_name', label: 'Last Name' },
                            { key: 'full_name', label: 'Full Name' },
                            { key: 'email', label: 'Email' },
                            { key: 'project_type', label: 'Project Type' },
                            { key: 'event_date', label: 'Event Date' },
                          ].map((variable) => (
                            <Button
                              key={variable.key}
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs px-2"
                              onClick={() => {
                                setEditTemplateBody(prev => prev + `{{${variable.key}}}`);
                              }}
                            >
                              {variable.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <ButtonRichTextEditor
                        value={editTemplateBody}
                        onChange={setEditTemplateBody}
                        placeholder="Hi {{first_name}},\n\nWrite your email content here..."
                        minHeight="200px"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Preview (Full Height) */}
              <div className="overflow-auto border rounded-lg">
                <div className="p-4">
                  <EmailPreview
                    subject={editEmailSubject}
                    templateBody={editTemplateBody}
                    includeHeader={editIncludeHeader}
                    headerStyle={editHeaderStyle}
                    includeSignature={editIncludeSignature}
                    signatureStyle={editSignatureStyle}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Branding Edit Dialogs */}
          <Dialog open={headerModalOpen} onOpenChange={setHeaderModalOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select Email Header Style</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditIncludeHeader(false);
                    setHeaderModalOpen(false);
                  }}
                  className={`w-full p-4 border-2 rounded-lg text-left hover:border-primary transition-colors ${!editIncludeHeader ? 'border-primary bg-primary/5' : ''}`}
                  data-testid="option-header-none"
                >
                  <div className="font-medium mb-1">None</div>
                  <div className="text-sm text-muted-foreground">No header in emails</div>
                </button>
                {headerStyles.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => {
                      setEditIncludeHeader(true);
                      setEditHeaderStyle(style.value);
                      setHeaderModalOpen(false);
                    }}
                    className={`w-full p-4 border-2 rounded-lg text-left hover:border-primary transition-colors ${editIncludeHeader && editHeaderStyle === style.value ? 'border-primary bg-primary/5' : ''}`}
                    data-testid={`option-header-${style.value}`}
                  >
                    <div className="font-medium mb-1">{style.label}</div>
                    <div className="text-sm text-muted-foreground mb-3">{style.description}</div>
                    {brandingData && (
                      <div 
                        className="border rounded overflow-hidden bg-white"
                        dangerouslySetInnerHTML={{ __html: generateEmailHeader(style.value, brandingData) }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={signatureModalOpen} onOpenChange={setSignatureModalOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select Email Signature Style</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditIncludeSignature(false);
                    setSignatureModalOpen(false);
                  }}
                  className={`w-full p-4 border-2 rounded-lg text-left hover:border-primary transition-colors ${!editIncludeSignature ? 'border-primary bg-primary/5' : ''}`}
                  data-testid="option-signature-none"
                >
                  <div className="font-medium mb-1">None</div>
                  <div className="text-sm text-muted-foreground">No signature in emails</div>
                </button>
                {signatureStyles.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => {
                      setEditIncludeSignature(true);
                      setEditSignatureStyle(style.value);
                      setSignatureModalOpen(false);
                    }}
                    className={`w-full p-4 border-2 rounded-lg text-left hover:border-primary transition-colors ${editIncludeSignature && editSignatureStyle === style.value ? 'border-primary bg-primary/5' : ''}`}
                    data-testid={`option-signature-${style.value}`}
                  >
                    <div className="font-medium mb-1">{style.label}</div>
                    <div className="text-sm text-muted-foreground mb-3">{style.description}</div>
                    {brandingData && (
                      <div 
                        className="border rounded overflow-hidden bg-white"
                        dangerouslySetInnerHTML={{ __html: generateEmailSignature(style.value, brandingData) }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Footer Actions */}
          <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateEmailMutation.isPending}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEmail}
              disabled={updateEmailMutation.isPending || !editEmailSubject}
              data-testid="button-save-edit"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateEmailMutation.isPending ? 'Saving...' : 'Save Email'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}