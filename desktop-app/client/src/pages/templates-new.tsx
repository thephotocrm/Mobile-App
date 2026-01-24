import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Mail,
  Smartphone,
  Edit,
  Trash2,
  ArrowLeft,
  Link2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ButtonRichTextEditor } from "@/components/ButtonRichTextEditor";
import {
  blocksToTemplateBody,
  parseTemplateBodyToBlocks,
  type ContentBlock,
} from "@/lib/blocks-to-text";

// Template variables for email personalization
const TEMPLATE_VARIABLES = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "full_name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "project_type", label: "Project Type" },
  { key: "event_date", label: "Event Date" },
  { key: "photographer_name", label: "Your Name" },
  { key: "business_name", label: "Business Name" },
];

// Button destination options
const BUTTON_DESTINATIONS = [
  {
    key: "CALENDAR",
    label: "Booking Calendar",
    description: "Your booking/scheduling page",
  },
  {
    key: "SMART_FILE",
    label: "View Proposal",
    description: "Client's proposal or invoice",
  },
  {
    key: "GALLERY",
    label: "View Gallery",
    description: "Client's photo gallery",
  },
  {
    key: "TESTIMONIALS",
    label: "Leave Review",
    description: "Review/testimonial submission page",
  },
  { key: "CUSTOM", label: "Custom URL", description: "Enter your own link" },
];

interface Template {
  id: string;
  name: string;
  channel: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  templateBody?: string;
  contentBlocks?: ContentBlock[];
  includeHeader?: boolean;
  includeSignature?: boolean;
  createdAt: string;
}

export default function TemplatesNew() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const emailBodyRef = useRef<HTMLDivElement | null>(null);

  const [showBuilder, setShowBuilder] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("EMAIL");
  const [subject, setSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");

  // Email branding options - simplified
  const [includeHeader, setIncludeHeader] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(true);

  // Button dialog state
  const [showButtonDialog, setShowButtonDialog] = useState(false);
  const [buttonText, setButtonText] = useState("");
  const [buttonDestination, setButtonDestination] = useState("CALENDAR");
  const [buttonCustomUrl, setButtonCustomUrl] = useState("");

  const { data: templates, isLoading } = useQuery({
    queryKey: ["/api/templates"],
    enabled: !!user,
  });

  // Handle ?new=true query param to auto-open builder
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("new") === "true") {
      setShowBuilder(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      if (isEditMode && editingTemplateId) {
        await apiRequest(
          "PUT",
          `/api/templates/${editingTemplateId}`,
          templateData,
        );
      } else {
        await apiRequest("POST", "/api/templates", templateData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      resetForm();
      toast({
        title: isEditMode ? "Template updated" : "Template created",
        description: isEditMode
          ? "Template has been updated successfully."
          : "New template has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? "update" : "create"} template. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      await apiRequest("DELETE", `/api/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template deleted",
        description: "Template has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setShowBuilder(false);
    setIsEditMode(false);
    setEditingTemplateId(null);
    setName("");
    setChannel("EMAIL");
    setSubject("");
    setTemplateBody("");
    setIncludeHeader(false);
    setIncludeSignature(true);
    setButtonText("");
    setButtonDestination("CALENDAR");
    setButtonCustomUrl("");
  };

  const handleEdit = (template: Template) => {
    setIsEditMode(true);
    setEditingTemplateId(template.id);
    setName(template.name);
    setChannel(template.channel);
    setSubject(template.subject || "");
    // Convert blocks to text if needed
    if (template.templateBody) {
      setTemplateBody(template.templateBody);
    } else if (template.contentBlocks && template.contentBlocks.length > 0) {
      setTemplateBody(blocksToTemplateBody(template.contentBlocks));
    } else {
      setTemplateBody("");
    }
    setIncludeHeader(template.includeHeader || false);
    setIncludeSignature(template.includeSignature !== false);
    setShowBuilder(true);
  };

  // Insert variable at cursor position
  const insertVariable = (variableKey: string) => {
    const variable = `{{${variableKey}}}`;
    const editorContainer = emailBodyRef.current;
    if (editorContainer) {
      const editor = editorContainer.querySelector(
        '[contenteditable="true"]',
      ) as HTMLDivElement & { insertText?: (text: string) => void };
      if (editor?.insertText) {
        editor.insertText(variable);
      } else {
        editor?.focus();
        document.execCommand("insertText", false, variable);
      }
    } else {
      setTemplateBody((prev) => prev + variable);
    }
  };

  // Insert button marker
  const insertButton = () => {
    if (!buttonText.trim()) return;

    const sanitizedText = buttonText.replace(/[\[\]:]/g, "");
    let marker: string;
    if (buttonDestination === "CUSTOM" && buttonCustomUrl) {
      marker = `[[BUTTON:CUSTOM:${sanitizedText}:${buttonCustomUrl}]]`;
    } else {
      marker = `[[BUTTON:${buttonDestination}:${sanitizedText}]]`;
    }

    const editorContainer = emailBodyRef.current;
    if (editorContainer) {
      const editor = editorContainer.querySelector(
        '[contenteditable="true"]',
      ) as HTMLDivElement & {
        insertButton?: (text: string, linkType: string, url?: string) => void;
        insertText?: (text: string) => void;
      };
      if (editor?.insertButton) {
        editor.insertButton(
          sanitizedText,
          buttonDestination,
          buttonDestination === "CUSTOM" ? buttonCustomUrl : undefined,
        );
      } else if (editor?.insertText) {
        editor.insertText(marker);
      } else {
        editor?.focus();
        document.execCommand("insertText", false, marker);
      }
    } else {
      setTemplateBody((prev) => prev + "\n\n" + marker);
    }

    setShowButtonDialog(false);
    setButtonText("");
    setButtonDestination("CALENDAR");
    setButtonCustomUrl("");
  };

  const handleDelete = (templateId: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  const handleSave = () => {
    if (!name || !channel) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (channel === "EMAIL" && !templateBody.trim()) {
      toast({
        title: "No content",
        description: "Please add some content to your email",
        variant: "destructive",
      });
      return;
    }

    createTemplateMutation.mutate({
      name,
      channel,
      subject: channel === "EMAIL" ? subject : undefined,
      templateBody: channel === "EMAIL" ? templateBody : undefined,
      contentBlocks:
        channel === "EMAIL"
          ? parseTemplateBodyToBlocks(templateBody)
          : undefined,
      includeHeader: channel === "EMAIL" ? includeHeader : undefined,
      includeSignature: channel === "EMAIL" ? includeSignature : undefined,
    });
  };

  const emailTemplates = (templates || []).filter(
    (t: Template) => t.channel === "EMAIL",
  );
  const smsTemplates = (templates || []).filter(
    (t: Template) => t.channel === "SMS",
  );

  if (showBuilder) {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-card border-b border-border px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForm}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold">
                  {isEditMode ? "Edit Template" : "Create Email Template"}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Create a reusable email template
                </p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={createTemplateMutation.isPending}
              data-testid="button-save-template"
            >
              {createTemplateMutation.isPending
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                  ? "Update Template"
                  : "Save Template"}
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-6 p-6 h-full overflow-auto">
            {/* Left: Builder */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Template Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Welcome Email"
                      data-testid="input-template-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Welcome to {{business_name}}"
                      data-testid="input-subject"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div ref={emailBodyRef}>
                    <ButtonRichTextEditor
                      value={templateBody}
                      onChange={setTemplateBody}
                      placeholder="Hi {{first_name}},

Thank you for reaching out! I'm excited to learn more about your special day..."
                      minHeight="200px"
                      data-testid="input-email-body"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click a variable below to insert it into your message.
                  </p>

                  {/* Variable chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVariable(v.key)}
                        className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>

                  {/* Add Button chip */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setButtonText("");
                        setButtonDestination("CALENDAR");
                        setButtonCustomUrl("");
                        setShowButtonDialog(true);
                      }}
                      className="px-3 py-1.5 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1.5 font-medium"
                      data-testid="button-add-link"
                    >
                      <Link2 className="w-3 h-3" />
                      Add a Button
                    </button>
                  </div>

                  {/* Header/Signature toggles */}
                  <div className="flex items-center gap-6 pt-3 border-t">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={includeHeader}
                        onCheckedChange={(checked) =>
                          setIncludeHeader(!!checked)
                        }
                        data-testid="checkbox-include-header"
                      />
                      <span className="text-sm text-muted-foreground">
                        Include Header
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={includeSignature}
                        onCheckedChange={(checked) =>
                          setIncludeSignature(!!checked)
                        }
                        data-testid="checkbox-include-signature"
                      />
                      <span className="text-sm text-muted-foreground">
                        Include Signature
                      </span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Preview placeholder */}
            <div className="lg:sticky lg:top-6 lg:h-fit">
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 rounded-lg p-6 min-h-[300px]">
                    {templateBody ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {templateBody}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center">
                        Start typing to see a preview
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Add Button Dialog */}
        <Dialog open={showButtonDialog} onOpenChange={setShowButtonDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-purple-500" />
                Add Button
              </DialogTitle>
              <DialogDescription>
                Add a clickable button to your email
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
                <Select
                  value={buttonDestination}
                  onValueChange={setButtonDestination}
                >
                  <SelectTrigger
                    className="mt-1"
                    data-testid="select-button-destination"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUTTON_DESTINATIONS.map((dest) => (
                      <SelectItem key={dest.key} value={dest.key}>
                        {dest.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {
                    BUTTON_DESTINATIONS.find((d) => d.key === buttonDestination)
                      ?.description
                  }
                </p>
              </div>

              {buttonDestination === "CUSTOM" && (
                <div>
                  <Label htmlFor="buttonUrl">Custom URL</Label>
                  <Input
                    id="buttonUrl"
                    value={buttonCustomUrl}
                    onChange={(e) => setButtonCustomUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1"
                    data-testid="input-button-url"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowButtonDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={insertButton}
                  disabled={
                    !buttonText.trim() ||
                    (buttonDestination === "CUSTOM" && !buttonCustomUrl.trim())
                  }
                  data-testid="button-insert-button"
                >
                  Insert Button
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div>
      <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">Templates</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Create and manage email and SMS templates for automation
            </p>
          </div>

          <Button
            onClick={() => setShowBuilder(true)}
            data-testid="button-create-template"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Template
          </Button>
        </div>
      </header>

      <div className="p-3 sm:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="hidden md:grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Email Templates
              </CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold"
                data-testid="count-email-templates"
              >
                {emailTemplates.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for automation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                SMS Templates
              </CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold"
                data-testid="count-sms-templates"
              >
                {smsTemplates.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for automation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Email Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Email Templates ({emailTemplates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : emailTemplates.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No email templates created yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {emailTemplates.map((template: Template) => (
                  <Card
                    key={template.id}
                    className="border border-border/50 hover:border-border transition-colors"
                    data-testid={`email-template-${template.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-base truncate">
                              {template.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.subject}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(template)}
                              data-testid={`button-edit-${template.id}`}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(template.id)}
                              disabled={deleteTemplateMutation.isPending}
                              data-testid={`button-delete-${template.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Mail className="w-3 h-3 mr-1" />
                          Created{" "}
                          {new Date(template.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
