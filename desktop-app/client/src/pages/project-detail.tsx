// EMAIL_RECEIVED activities now display with HoneyBook-style cards in CRM sidebar
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, User, Mail, Phone, FileText, DollarSign, Clock, Copy, Eye, MoreVertical, Trash, Send, MessageSquare, Plus, X, Heart, Briefcase, Camera, ChevronDown, Menu, Link as LinkIcon, ExternalLink, Lock, Settings, Tag, Sparkles, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Paperclip, Image as ImageIcon, Video, Smile, Code, Undo, Redo, Strikethrough, Subscript, Superscript, Palette, Type, Mic, ArrowLeft, Reply, CheckCircle2, Archive, ArchiveRestore, Loader2, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PhotographerSignatureDialog } from "@/components/photographer-signature-dialog";
import { PaymentScheduleTimeline, type PaymentInstallment as TimelineInstallment, type PaymentSummary } from "@/components/payment-schedule-timeline";
import { MarkPaidDialog } from "@/components/mark-paid-dialog";
import heroImage from "@assets/stock_images/vintage_camera_photo_e2b0b796.jpg";

interface Project {
  id: string;
  title: string;
  projectType: string;
  eventDate?: string;
  venue?: string;
  notes?: string;
  status: string;
  createdAt: string;
  leadSource?: string;
  referralName?: string;
  contactId?: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  stage?: {
    id: string;
    name: string;
  };
}

interface Participant {
  id: string;
  projectId: string;
  clientId: string;
  role?: string;
  addedAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ProjectSmartFile {
  id: string;
  projectId: string;
  smartFileId: string;
  smartFileName: string;
  token: string;
  status: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  paidAt?: string;
  createdAt: string;
  pagesSnapshot?: any[];
  formAnswers?: any;
  // Expiration fields
  expiresAt?: string;
  expirationDays?: number;
  expirationMode?: string;
}

interface SmartFile {
  id: string;
  name: string;
  description?: string;
  projectType?: string;
  status: string;
  pages?: any[];
}

type TimelineEvent = 
  | {
      type: 'activity';
      id: string;
      title: string;
      description?: string;
      activityType: string;
      metadata?: any;
      createdAt: string;
    }
  | {
      type: 'email';
      id: string;
      title: string;
      description: string;
      status: string;
      sentAt?: string;
      openedAt?: string;
      clickedAt?: string;
      createdAt: string;
    }
  | {
      type: 'sms';
      id: string;
      body: string;
      direction: string;
      createdAt: string;
    };

// Helper to safely get contact info from project
function getContactInfo(project: Project | undefined) {
  if (!project) return null;
  const contact = project.contact || project.client;
  return contact ? {
    id: contact.id || project.contactId || '',
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    email: contact.email || '',
    phone: contact.phone || ''
  } : null;
}

// Payment schedule interface for financials tab
interface PaymentTransaction {
  id: string;
  amountCents: number;
  tipCents?: number;
  status: string;
  paymentType: string;
  createdAt: string;
  stripePaymentIntentId?: string;
}

interface SmartFileSummary {
  smartFileId: string;
  projectSmartFileId: string;
  title: string;
  token: string;
  status: string;
  totalCents: number;
  totalPaidCents: number;
  totalRemainingCents: number;
  percentComplete: number;
  isFullyPaid: boolean;
  schedule: Array<{
    id: string;
    label?: string;
    description?: string;
    amountCents: number;
    dueDate: string;
    status: 'PENDING' | 'PAID' | 'PARTIAL';
    paidCents?: number;
  }>;
  nextInstallment: {
    id: string;
    label?: string;
    amountCents: number;
    dueDate: string;
    status: 'PENDING' | 'PAID' | 'PARTIAL';
  } | null;
  paidCount: number;
  totalCount: number;
  transactions: PaymentTransaction[];
}

interface PaymentSummaryResponse {
  projectId: string;
  projectTitle: string;
  summary: {
    totalCents: number;
    totalPaidCents: number;
    totalRemainingCents: number;
    percentComplete: number;
    isFullyPaid: boolean;
  };
  smartFiles: SmartFileSummary[];
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

// ProjectFinancials component
function ProjectFinancials({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Mark Paid dialog state
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<TimelineInstallment | null>(null);
  const [selectedSmartFileId, setSelectedSmartFileId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<PaymentSummaryResponse>({
    queryKey: ["/api/projects", projectId, "payment-summary"],
  });

  const handleMarkPaid = (installment: TimelineInstallment, projectSmartFileId: string) => {
    setSelectedInstallment(installment);
    setSelectedSmartFileId(projectSmartFileId);
    setMarkPaidDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Unable to load financial data</p>
            <p className="text-sm mt-2">Please try refreshing the page.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.smartFiles.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No invoices or contracts yet</p>
            <p className="text-sm mt-2">Attach a Smart File to this project to track payments.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Project Summary */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Project Financials
              </h3>
              <p className="text-2xl font-bold mt-1">
                {formatPrice(data.summary.totalCents)}
              </p>
              <p className="text-sm text-muted-foreground">
                Total contract value
              </p>
            </div>

            {data.summary.isFullyPaid ? (
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
            ) : (
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="5"
                    fill="transparent"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - data.summary.percentComplete / 100)}`}
                    className="text-green-500"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold">{data.summary.percentComplete}%</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-green-200 dark:border-green-800">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-lg font-bold">{formatPrice(data.summary.totalCents)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Collected</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatPrice(data.summary.totalPaidCents)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Outstanding</p>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {formatPrice(data.summary.totalRemainingCents)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Files with Payment Schedules */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-wide">Invoices & Contracts</h3>

        {data.smartFiles.map((smartFile) => {
          // Convert to timeline format
          const timelineSchedule: TimelineInstallment[] = smartFile.schedule.map(inst => ({
            id: inst.id,
            label: inst.label || inst.description || 'Payment',
            amountCents: inst.amountCents,
            dueDate: inst.dueDate,
            status: inst.status,
            paidCents: inst.paidCents
          }));

          const timelineSummary: PaymentSummary = {
            totalCents: smartFile.totalCents,
            totalPaidCents: smartFile.totalPaidCents,
            totalRemainingCents: smartFile.totalRemainingCents,
            paidCount: smartFile.paidCount,
            totalCount: smartFile.totalCount,
            percentComplete: smartFile.percentComplete,
            isFullyPaid: smartFile.isFullyPaid
          };

          const timelineNextInstallment = smartFile.nextInstallment ? {
            id: smartFile.nextInstallment.id,
            label: smartFile.nextInstallment.label || 'Payment',
            amountCents: smartFile.nextInstallment.amountCents,
            dueDate: smartFile.nextInstallment.dueDate,
            status: smartFile.nextInstallment.status
          } : null;

          return (
            <Card key={smartFile.smartFileId} className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-lg font-semibold tracking-wide">
                      {smartFile.title}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {smartFile.status}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation(`/smart-file/${smartFile.token}`)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {smartFile.schedule.length > 0 ? (
                  <PaymentScheduleTimeline
                    schedule={timelineSchedule}
                    nextInstallment={timelineNextInstallment}
                    summary={timelineSummary}
                    context="photographer-view"
                    onMarkPaid={(installment) => handleMarkPaid(installment, smartFile.projectSmartFileId)}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No payment schedule configured for this document.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Transaction History */}
      {(() => {
        const allTransactions = data.smartFiles.flatMap(sf =>
          sf.transactions.map(t => ({
            ...t,
            smartFileTitle: sf.title
          }))
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (allTransactions.length === 0) return null;

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-muted-foreground" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {transaction.status === 'SUCCEEDED' || transaction.status === 'COMPLETED' ? (
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {transaction.paymentType === 'DEPOSIT' ? 'Deposit Payment' :
                           transaction.paymentType === 'FULL' ? 'Full Payment' :
                           transaction.paymentType === 'BALANCE' ? 'Balance Payment' :
                           transaction.paymentType === 'INSTALLMENT' ? 'Installment Payment' :
                           transaction.paymentType === 'MANUAL' ? 'Manual Payment' :
                           'Payment'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.smartFileTitle} • {new Date(transaction.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(transaction.amountCents)}</p>
                        {transaction.tipCents && transaction.tipCents > 0 && (
                          <p className="text-xs text-muted-foreground">+ {formatPrice(transaction.tipCents)} tip</p>
                        )}
                      </div>
                      <Badge
                        variant={transaction.status === 'SUCCEEDED' || transaction.status === 'COMPLETED' ? 'default' : 'outline'}
                        className={transaction.status === 'SUCCEEDED' || transaction.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : ''}
                      >
                        {transaction.status === 'SUCCEEDED' || transaction.status === 'COMPLETED' ? 'Paid' : transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Mark Paid Dialog */}
      {selectedInstallment && selectedSmartFileId && (
        <MarkPaidDialog
          open={markPaidDialogOpen}
          onOpenChange={setMarkPaidDialogOpen}
          projectId={projectId}
          projectSmartFileId={selectedSmartFileId}
          installment={{
            id: selectedInstallment.id,
            label: selectedInstallment.label || 'Payment',
            amountCents: selectedInstallment.amountCents,
            paidCents: selectedInstallment.paidCents,
            dueDate: selectedInstallment.dueDate
          }}
          onSuccess={() => {
            setMarkPaidDialogOpen(false);
            setSelectedInstallment(null);
            setSelectedSmartFileId(null);
          }}
        />
      )}
    </div>
  );
}

// ProjectNotes component
function ProjectNotes({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [noteText, setNoteText] = useState("");

  const { data: notes, isLoading } = useQuery<Array<{
    id: string;
    noteText: string;
    createdAt: string;
  }>>({
    queryKey: ["/api/projects", projectId, "notes"],
  });

  const createNoteMutation = useMutation({
    mutationFn: async (text: string) => {
      return await apiRequest("POST", `/api/projects/${projectId}/notes`, { noteText: text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "notes"] });
      setNoteText("");
      toast({ title: "Note added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add note", variant: "destructive" });
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "notes"] });
      toast({ title: "Note deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete note", variant: "destructive" });
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Note</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Textarea
              placeholder="Type your note here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-new-note"
            />
            <Button
              onClick={() => {
                if (noteText.trim()) {
                  createNoteMutation.mutate(noteText);
                }
              }}
              disabled={!noteText.trim() || createNoteMutation.isPending}
              data-testid="button-add-note"
            >
              {createNoteMutation.isPending ? "Adding..." : "Add Note"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Loading notes...</p>
        </div>
      ) : notes && notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{note.noteText}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(note.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    disabled={deleteNoteMutation.isPending}
                    data-testid={`button-delete-note-${note.id}`}
                  >
                    <Trash className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No notes yet</p>
          <p className="text-sm mt-1">Add your first note above</p>
        </div>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("activity");
  
  // State for various dialogs
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [participantEmail, setParticipantEmail] = useState("");
  const [attachSmartFileOpen, setAttachSmartFileOpen] = useState(false);
  const [selectedSmartFileId, setSelectedSmartFileId] = useState("");
  const [smartFileToSend, setSmartFileToSend] = useState<ProjectSmartFile | null>(null);
  const [pendingSmartFileToSend, setPendingSmartFileToSend] = useState<ProjectSmartFile | null>(null);
  const [sendExpirationDays, setSendExpirationDays] = useState<string>("none"); // "none", "1", "3", "7", "14", "30", "60", "90"
  const [sendExpirationMode, setSendExpirationMode] = useState<string>("UNLESS_PAYMENT"); // "TIME_ONLY", "UNLESS_PAYMENT", "UNLESS_BOOKING", "UNLESS_SIGNED"
  const [smartFileToExtend, setSmartFileToExtend] = useState<ProjectSmartFile | null>(null);
  const [extendExpirationDays, setExtendExpirationDays] = useState<string>("14"); // Default to 14 days
  const [sendFileDialogOpen, setSendFileDialogOpen] = useState(false);
  const [sendFileTemplateId, setSendFileTemplateId] = useState("");
  const [templateExpirationDays, setTemplateExpirationDays] = useState<string>("none");
  const [templateExpirationMode, setTemplateExpirationMode] = useState<string>("UNLESS_PAYMENT");
  const [contractPageToSign, setContractPageToSign] = useState<any>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendToParticipants, setSendToParticipants] = useState(false);
  const [emailFontFamily, setEmailFontFamily] = useState("Default");
  const [emailFontSize, setEmailFontSize] = useState("16");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDuration, setMeetingDuration] = useState("60");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiModalType, setAiModalType] = useState<"email" | "sms">("email");
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [aiIsReady, setAiIsReady] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{ subject?: string; body: string } | null>(null);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsBody, setSmsBody] = useState("");
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [showSmartFields, setShowSmartFields] = useState(false);
  const [showTonePicker, setShowTonePicker] = useState(false);
  const [aiQuickActionLoading, setAiQuickActionLoading] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [manualGalleryUrl, setManualGalleryUrl] = useState("");
  const [isEditingGalleryUrl, setIsEditingGalleryUrl] = useState(false);
  const [includePortalLinks, setIncludePortalLinks] = useState(true);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string>("");
  const [showLinkExistingGallery, setShowLinkExistingGallery] = useState(false);

  // Editable project details state
  const [isEditingProjectNotes, setIsEditingProjectNotes] = useState(false);
  const [editProjectNotes, setEditProjectNotes] = useState("");
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editParticipantRole, setEditParticipantRole] = useState("");

  const { data: project, isLoading} = useQuery<Project>({
    queryKey: ["/api/projects", id],
    enabled: !!user && !!id
  });

  // Stages are unified per photographer (no project type filter)
  const { data: stages } = useQuery<any[]>({
    queryKey: ["/api/stages"],
    queryFn: async () => {
      const response = await fetch(`/api/stages`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch stages');
      return response.json();
    },
    enabled: !!user
  });

  const { data: participants } = useQuery<Participant[]>({
    queryKey: ["/api/projects", id, "participants"],
    enabled: !!user && !!id
  });

  const { data: history } = useQuery<TimelineEvent[]>({
    queryKey: ["/api/projects", id, "history"],
    enabled: !!user && !!id
  });

  const { data: smartFiles } = useQuery<ProjectSmartFile[]>({
    queryKey: ["/api/projects", id, "smart-files"],
    enabled: !!user && !!id
  });

  const { data: allSmartFiles } = useQuery<SmartFile[]>({
    queryKey: ["/api/smart-files"],
    enabled: !!user && (attachSmartFileOpen || sendFileDialogOpen)
  });

  // Query to fetch photographer's galleries
  const { data: galleries } = useQuery<Array<{ id: string; title: string; status: string; projectId: string | null }>>({
    queryKey: ["/api/galleries"],
    enabled: !!user && !!id
  });

  // Find gallery linked to this project
  const linkedGallery = galleries?.find(g => g.projectId === id);

  // Photographer tags query
  const { data: photographerTags } = useQuery<Array<{ id: string; name: string; color: string }>>({
    queryKey: ["/api/tags"],
    enabled: !!user
  });

  // Payment summary query for sidebar quick stats
  const { data: paymentSummaryData } = useQuery<PaymentSummaryResponse>({
    queryKey: ["/api/projects", id, "payment-summary"],
    enabled: !!user && !!id
  });

  // Calculate payment summary for quick stats (convert cents to dollars)
  const paymentSummary = paymentSummaryData?.summary ? {
    collected: paymentSummaryData.summary.totalPaidCents / 100,
    outstanding: paymentSummaryData.summary.totalRemainingCents / 100
  } : null;

  // Initialize includePortalLinks from project data
  useEffect(() => {
    if (project) {
      setIncludePortalLinks(project.includePortalLinks !== false); // Default to true if not set
    }
  }, [project]);

  const updateProjectMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      return await apiRequest("PUT", `/api/projects/${id}`, data);
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["/api/projects", id] });
      const previousProject = queryClient.getQueryData<Project>(["/api/projects", id]);
      queryClient.setQueryData(["/api/projects", id], (old: Project | undefined) => 
        old ? { ...old, ...newData } : old
      );
      return { previousProject };
    },
    onError: (err, newData, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(["/api/projects", id], context.previousProject);
      }
      toast({
        title: "Update failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    },
    onSuccess: () => {
      toast({
        title: "Project updated",
        description: "The project has been updated successfully."
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
    }
  });

  // Tag mutations
  const updateProjectTagsMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      return await apiRequest("PUT", `/api/projects/${id}/tags`, { tags });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
    }
  });

  const createTagMutation = useMutation({
    mutationFn: async (data: { name: string; color?: string }) => {
      const response = await apiRequest("POST", "/api/tags", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({ title: "Tag created", description: "Your new tag is ready to use." });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create tag",
        description: error.message || "Tag may already exist",
        variant: "destructive"
      });
    }
  });

  const updateStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      return await apiRequest("PUT", `/api/projects/${id}/stage`, { stageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      toast({
        title: "Stage updated",
        description: "Project stage has been updated."
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update stage. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateParticipantRoleMutation = useMutation({
    mutationFn: async ({ participantId, role }: { participantId: string; role: string | null }) => {
      return await apiRequest("PATCH", `/api/projects/${id}/participants/${participantId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "participants"] });
      toast({
        title: "Role updated",
        description: "Participant role has been updated."
      });
    }
  });

  const addParticipantMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", `/api/projects/${id}/participants`, { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "participants"] });
      setParticipantEmail("");
      setIsAddingParticipant(false);
      toast({
        title: "Participant added",
        description: "The participant has been added successfully."
      });
    }
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return await apiRequest("DELETE", `/api/projects/${id}/participants/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "participants"] });
      toast({
        title: "Participant removed",
        description: "The participant has been removed from this project."
      });
    }
  });

  const attachSmartFileMutation = useMutation({
    mutationFn: async (smartFileId: string) => {
      return await apiRequest("POST", `/api/projects/${id}/smart-files`, { smartFileId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "smart-files"] });
      setAttachSmartFileOpen(false);
      setSelectedSmartFileId("");
      toast({
        title: "Smart File attached",
        description: "The Smart File has been attached to this project."
      });
    }
  });

  const sendSmartFileMutation = useMutation({
    mutationFn: async ({ projectSmartFileId, expirationDays, expirationMode }: {
      projectSmartFileId: string;
      expirationDays?: number;
      expirationMode?: string;
    }) => {
      return await apiRequest("POST", `/api/projects/${id}/smart-files/${projectSmartFileId}/send`, {
        expirationDays,
        expirationMode
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "smart-files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      setSmartFileToSend(null);
      setPendingSmartFileToSend(null);
      setSendExpirationDays("none");
      setSendExpirationMode("UNLESS_PAYMENT");
      toast({
        title: "Smart File sent",
        description: "The Smart File has been sent to the client."
      });
    },
    onError: (error: any) => {
      if (error.code === "PHOTOGRAPHER_SIGNATURE_REQUIRED" && smartFileToSend) {
        const pagesSnapshot = smartFileToSend.pagesSnapshot || [];
        const contractPage = pagesSnapshot.find((page: any) => page.pageType === 'CONTRACT');
        
        if (contractPage) {
          setContractPageToSign(contractPage);
          setPendingSmartFileToSend(smartFileToSend);
          setSignatureDialogOpen(true);
          setSmartFileToSend(null);
          return;
        }
      }
      
      toast({
        title: "Failed to send Smart File",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const extendExpirationMutation = useMutation({
    mutationFn: async ({ projectSmartFileId, expirationDays }: {
      projectSmartFileId: string;
      expirationDays: number;
    }) => {
      return await apiRequest("PATCH", `/api/projects/${id}/smart-files/${projectSmartFileId}/extend`, {
        expirationDays
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "smart-files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      setSmartFileToExtend(null);
      setExtendExpirationDays("14");
      toast({
        title: "Expiration extended",
        description: "The proposal expiration has been extended."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to extend expiration",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const sendFileFromTemplateMutation = useMutation({
    mutationFn: async (data: { templateId: string; expirationDays?: number; expirationMode?: string }) => {
      return await apiRequest("POST", `/api/projects/${id}/send-smart-file`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "smart-files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      setSendFileDialogOpen(false);
      setSendFileTemplateId("");
      setTemplateExpirationDays("none");
      setTemplateExpirationMode("UNLESS_PAYMENT");
      toast({
        title: "Smart File sent",
        description: "The Smart File has been sent to the client."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send Smart File",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Create a new smart file and navigate to the editor with project context
  const createSmartFileMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/smart-files", {
        name: `Proposal for ${project?.title || 'Project'}`,
      });
      return response.json();
    },
    onSuccess: (newSmartFile) => {
      if (newSmartFile?.id) {
        // Navigate to the editor with projectId in the URL for auto-attachment
        navigate(`/smart-files/${newSmartFile.id}/edit?projectId=${id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create Smart File",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const archiveProjectMutation = useMutation({
    mutationFn: async ({ archive }: { archive: boolean }) => {
      await apiRequest("PATCH", `/api/projects/${id}/archive`, { archive });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: variables.archive ? "Project archived" : "Project restored",
        description: variables.archive
          ? "Project has been archived."
          : "Project has been restored.",
      });
      if (variables.archive) {
        navigate('/projects');
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project. Please try again.",
        variant: "destructive"
      });
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { subject: string; body: string; recipients: string[] }) => {
      return await apiRequest("POST", `/api/projects/${id}/send-email`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      setMessageSubject("");
      setMessageBody("");
      setMessageDialogOpen(false);
      setSelectedRecipients([]);
      toast({
        title: "Message sent",
        description: "Your email has been sent successfully."
      });
    }
  });

  const generateEmailMutation = useMutation({
    mutationFn: async (data: { prompt: string; existingEmailBody?: string }) => {
      return await apiRequest("POST", `/api/projects/${id}/generate-email`, data);
    },
    onSuccess: (data: { subject: string; body: string }) => {
      setMessageSubject(data.subject);
      setMessageBody(data.body);
      setShowAiModal(false);
      setAiPrompt("");
      toast({
        title: "Draft generated",
        description: "Your AI-generated email draft is ready to review."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate draft",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const generateSMSMutation = useMutation({
    mutationFn: async (data: { prompt: string; existingSMSBody?: string }) => {
      return await apiRequest("POST", `/api/projects/${id}/generate-sms`, data);
    },
    onSuccess: (data: { body: string }) => {
      setSmsBody(data.body);
      setShowAiModal(false);
      setAiPrompt("");
      toast({
        title: "Draft generated",
        description: "Your AI-generated SMS draft is ready to review."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate draft",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Quick AI action handler for inline email editing
  const handleAiQuickAction = async (action: 'shorter' | 'clarity' | 'tone', tone?: string) => {
    if (!messageBody.trim()) {
      toast({
        title: "No content to edit",
        description: "Write some content first, then use AI to improve it.",
        variant: "destructive"
      });
      return;
    }

    setAiQuickActionLoading(action);

    let prompt = '';
    switch (action) {
      case 'shorter':
        prompt = 'Make this email shorter and more concise while keeping the key points. Keep the same tone.';
        break;
      case 'clarity':
        prompt = 'Improve the clarity of this email. Make it easier to read and understand while keeping the same length and tone.';
        break;
      case 'tone':
        prompt = `Rewrite this email in a ${tone || 'professional'} tone. Keep the same content and length.`;
        break;
    }

    try {
      const response = await apiRequest("POST", `/api/projects/${id}/generate-email`, {
        prompt,
        existingEmailBody: messageBody
      });
      const data = await response.json() as { subject?: string; body: string };

      if (data.body) {
        setMessageBody(data.body);
      }
      if (data.subject && !messageSubject) {
        setMessageSubject(data.subject);
      }

      toast({
        title: action === 'shorter' ? "Made shorter" : action === 'clarity' ? "Clarity improved" : "Tone changed",
        description: "Your email has been updated."
      });
    } catch (error: any) {
      toast({
        title: "AI edit failed",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setAiQuickActionLoading(null);
      setShowTonePicker(false);
    }
  };

  const conversationalAIMutation = useMutation({
    mutationFn: async (data: {
      messageType: 'email' | 'sms';
      conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>;
      existingContent?: string;
    }) => {
      const response = await apiRequest("POST", `/api/projects/${id}/conversational-ai`, data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log("=== AI RESPONSE RECEIVED ===", data);
      
      if (!data || !data.type) {
        console.error("Invalid AI response format:", data);
        toast({
          title: "AI Error",
          description: "Received invalid response from AI. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      if (data.type === 'question' && data.message) {
        // AI is asking a clarifying question - reset ready state
        console.log("AI is asking a question:", data.message);
        setAiIsReady(false);
        setGeneratedContent(null);
        setConversationHistory(prev => [...prev, { role: 'assistant', content: data.message! }]);
        setAiPrompt("");
      } else if (data.type === 'ready' && data.content) {
        // AI has generated the content
        console.log("AI has generated content:", data.content);
        setConversationHistory(prev => [...prev, { role: 'assistant', content: data.message || 'Here\'s your draft!' }]);
        setGeneratedContent(data.content);
        setAiIsReady(true);
        setAiPrompt("");
      } else {
        console.error("Unhandled AI response type or missing data:", data);
        toast({
          title: "AI Error",
          description: "AI response was incomplete. Please try again.",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "AI Error",
        description: error.message || "Failed to process your request",
        variant: "destructive"
      });
    }
  });

  const handleSendAIMessage = () => {
    if (!aiPrompt.trim()) return;

    // Reset ready state when sending new message
    setAiIsReady(false);
    setGeneratedContent(null);

    // Add user message to conversation
    const newHistory = [...conversationHistory, { role: 'user' as const, content: aiPrompt }];
    setConversationHistory(newHistory);

    // Call AI
    conversationalAIMutation.mutate({
      messageType: aiModalType,
      conversationHistory: newHistory,
      existingContent: aiModalType === 'email' ? messageBody || undefined : smsBody || undefined
    });
  };

  const handleUseGeneratedContent = () => {
    if (!generatedContent) return;

    if (aiModalType === 'email') {
      if (generatedContent.subject) setMessageSubject(generatedContent.subject);
      setMessageBody(generatedContent.body);
    } else {
      setSmsBody(generatedContent.body);
    }

    // Reset AI modal
    setShowAiModal(false);
    setConversationHistory([]);
    setAiIsReady(false);
    setGeneratedContent(null);
    setAiPrompt("");

    toast({
      title: "Draft ready",
      description: `Your AI-generated ${aiModalType} draft has been added.`
    });
  };

  const sendSMSMutation = useMutation({
    mutationFn: async (data: { body: string; recipient: string }) => {
      return await apiRequest("POST", `/api/projects/${id}/send-sms`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      setSmsBody("");
      setSmsDialogOpen(false);
      toast({
        title: "Message sent",
        description: "Your SMS has been sent successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send SMS",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const sendLoginLinkMutation = useMutation({
    mutationFn: async () => {
      // Only use the primary client (project.client), not participants or other contacts
      const primaryClient = project?.client;
      
      if (!primaryClient || !primaryClient.id) {
        throw new Error("Project must have a primary client assigned");
      }
      if (!primaryClient.email) {
        throw new Error("Primary client email is required to send login link");
      }
      
      return await apiRequest("POST", `/api/contacts/${primaryClient.id}/send-login-link`, {
        projectId: id
      });
    },
    onSuccess: (data: any) => {
      let title = "Login link sent";
      let description = "Client will receive an email with direct access to this project.";
      
      // Handle development mode responses
      if (data?.loginUrl) {
        title = "Login link generated";
        description = data.message || "Project-specific login link created successfully.";
      }
      
      toast({
        title,
        description
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send login link",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: { 
      title: string;
      startAt: string;
      endAt: string;
      projectId: string;
      clientId: string;
    }) => {
      return await apiRequest("POST", `/api/bookings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setScheduleDialogOpen(false);
      setSelectedDate("");
      setSelectedTime("");
      setMeetingTitle("");
      setMeetingDuration("60");
      toast({
        title: "Meeting scheduled",
        description: "The meeting has been scheduled successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to schedule meeting",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const createGalleryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${id}/gallery/create`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({
        title: "Gallery created",
        description: "Gallery folder has been created successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create gallery",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const shareGalleryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${id}/gallery/share`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      toast({
        title: "Gallery shared",
        description: "Gallery link has been sent to client."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to share gallery",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const updateGalleryUrlMutation = useMutation({
    mutationFn: async (galleryUrl: string) => {
      return await apiRequest("PUT", `/api/projects/${id}/gallery`, { galleryUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      setIsEditingGalleryUrl(false);
      setManualGalleryUrl("");
      toast({
        title: "Gallery URL updated",
        description: "Gallery link has been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update gallery URL",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Link gallery to project mutation
  const linkGalleryMutation = useMutation({
    mutationFn: async (galleryId: string) => {
      return await apiRequest("PUT", `/api/galleries/${galleryId}`, { projectId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({
        title: "Gallery linked",
        description: "Gallery has been linked to this project."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to link gallery",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Unlink gallery from project mutation
  const unlinkGalleryMutation = useMutation({
    mutationFn: async (galleryId: string) => {
      return await apiRequest("PUT", `/api/galleries/${galleryId}`, { projectId: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({
        title: "Gallery unlinked",
        description: "Gallery has been unlinked from this project."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to unlink gallery",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Create a new native gallery linked to this project
  const createLinkedGalleryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/projects/${id}/native-gallery`);
      return response.json();
    },
    onSuccess: (data: { id: string; title: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({
        title: "Gallery created",
        description: "Redirecting to gallery upload page..."
      });
      // Navigate to the new gallery's upload page
      navigate(`/galleries/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create gallery",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Mark gallery as ready and move project to "Gallery Delivered" stage
  const markGalleryReadyMutation = useMutation({
    mutationFn: async (galleryId: string) => {
      // Use the dedicated endpoint that handles gallery status + stage change + automation trigger
      return await apiRequest("POST", `/api/projects/${id}/galleries/ready`, { galleryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/galleries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "history"] });
      toast({
        title: "Gallery ready",
        description: "Gallery has been marked as ready and project moved to Gallery Delivered."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to mark gallery as ready",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const formatDate = (dateString: string) => {
    // Parse date as local time to avoid timezone offset issues
    // "2024-06-15" should show as June 15, not June 14 in US timezones
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'WEDDING':
        return <Heart className="w-4 h-4 text-gray-900 fill-gray-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]" />;
      case 'PORTRAIT':
        return <User className="w-4 h-4" />;
      case 'COMMERCIAL':
        return <Briefcase className="w-4 h-4" />;
      default:
        return <Camera className="w-4 h-4" />;
    }
  };

  const getProjectTypeLabel = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  const getActivityIcon = (event: TimelineEvent) => {
    if (event.type === 'email') return <Mail className="w-5 h-5" />;
    if (event.type === 'sms') return <MessageSquare className="w-5 h-5" />;
    if (event.type === 'activity') {
      if (event.activityType === 'SMART_FILE_ATTACHED') return <FileText className="w-5 h-5" />;
      if (event.activityType === 'SMART_FILE_SENT') return <FileText className="w-5 h-5" />;
      if (event.activityType === 'SMART_FILE_VIEWED') return <Eye className="w-5 h-5" />;
      if (event.activityType === 'SMS_SENT' || event.activityType === 'SMS_RECEIVED') return <MessageSquare className="w-5 h-5" />;
      if (event.activityType === 'EMAIL_SENT' || event.activityType === 'EMAIL_RECEIVED') return <Mail className="w-5 h-5" />;
    }
    return <FileText className="w-5 h-5" />;
  };

  // Helper to determine if activity is "received" (should be green)
  const isReceivedActivity = (event: TimelineEvent) => {
    if (event.type === 'activity') {
      return event.activityType?.includes('RECEIVED') || event.activityType?.includes('VIEWED');
    }
    if (event.type === 'sms') {
      return event.direction === 'inbound';
    }
    return false;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  const totalParticipants = (participants?.length || 0) + 1; // +1 for main contact

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Cover Photo with Title Overlay */}
      {/* Height increased to accommodate transparent header overlay (h-14 = 56px) */}
      <div
        className="relative h-56 sm:h-64 md:h-72 bg-cover bg-center flex-shrink-0"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundColor: "#374151"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/20" />

        {/* Max-width container for overlay content */}
        <div className="absolute inset-0 max-w-[1500px] mx-auto">
          {/* Back Button - positioned below the transparent header */}
          <div className="absolute top-[4.5rem] sm:top-20 left-4 z-20">
          <Link href="/projects">
            <button
              className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-colors"
              data-testid="button-back-mobile"
            >
              <ArrowLeft className="w-4 h-4 text-gray-700" />
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">Projects</span>
            </button>
          </Link>
        </div>

        {/* Days Until Event Badge - positioned below the transparent header */}
        {project.eventDate && (
          <div className="absolute top-[4.5rem] sm:top-20 right-4 z-20">
            <div className="px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg">
              <p className="text-xs text-gray-500">Days until event</p>
              <p className="text-xl font-bold text-gray-900">
                {Math.max(0, Math.ceil((new Date(project.eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
              </p>
            </div>
          </div>
        )}

        {/* Title Section - Overlaid at Bottom */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-white tracking-tight drop-shadow-lg font-display"
                data-testid="text-project-title"
              >
                {project.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-3">
                <div className="flex items-center gap-1.5">
                  {getProjectTypeIcon(project.projectType)}
                  <span className="text-sm font-medium text-white capitalize">{getProjectTypeLabel(project.projectType)}</span>
                </div>
                {project.eventDate && (
                  <>
                    <span className="text-white/50">•</span>
                    <span className="text-sm text-white/80">{formatDate(project.eventDate)}</span>
                  </>
                )}
                {project.venue && (
                  <>
                    <span className="text-white/50">•</span>
                    <span className="text-sm text-white/80">{project.venue}</span>
                  </>
                )}
              </div>
            </div>

            {/* Participants - Over Cover Photo */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/15 backdrop-blur-md rounded-lg">
              <div className="flex items-center -space-x-2">
                {/* Main Contact Avatar */}
                <div
                  className="w-8 h-8 rounded-full bg-orange-400 text-white flex items-center justify-center text-xs font-medium border-2 border-white/30 shadow-sm"
                  title={`${getContactInfo(project)?.firstName || ''} ${getContactInfo(project)?.lastName || ''}`}
                >
                  {getInitials(getContactInfo(project)?.firstName || '', getContactInfo(project)?.lastName || '')}
                </div>

                {/* Participant Avatars */}
                {participants?.slice(0, 3).map((participant) => (
                  <div
                    key={participant.id}
                    className="w-8 h-8 rounded-full bg-purple-400 text-white flex items-center justify-center text-xs font-medium border-2 border-white/30 shadow-sm"
                    title={`${participant.client.firstName} ${participant.client.lastName}`}
                  >
                    {getInitials(participant.client.firstName, participant.client.lastName)}
                  </div>
                ))}

                {/* Add Button */}
                <button
                  onClick={() => setIsAddingParticipant(true)}
                  className="w-8 h-8 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center hover:border-white/60 hover:bg-white/10 transition-colors"
                  data-testid="button-add-participant"
                >
                  <Plus className="w-3.5 h-3.5 text-white/70" />
                </button>
              </div>
              <span className="text-xs text-white/80 font-medium">
                {totalParticipants}
              </span>
            </div>
          </div>
        </div>

          {/* Mobile Participants - Show below title on small screens */}
          <div className="sm:hidden absolute bottom-1 right-4 z-10">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-white/15 backdrop-blur-md rounded-full">
              <div className="flex items-center -space-x-1.5">
                <div
                  className="w-6 h-6 rounded-full bg-orange-400 text-white flex items-center justify-center text-[10px] font-medium border border-white/30"
                  title={`${getContactInfo(project)?.firstName || ''} ${getContactInfo(project)?.lastName || ''}`}
                >
                  {getInitials(getContactInfo(project)?.firstName || '', getContactInfo(project)?.lastName || '')}
                </div>
                {participants?.slice(0, 2).map((participant) => (
                  <div
                    key={participant.id}
                    className="w-6 h-6 rounded-full bg-purple-400 text-white flex items-center justify-center text-[10px] font-medium border border-white/30"
                  >
                    {getInitials(participant.client.firstName, participant.client.lastName)}
                  </div>
                ))}
                <button
                  onClick={() => setIsAddingParticipant(true)}
                  className="w-6 h-6 rounded-full border border-dashed border-white/40 flex items-center justify-center hover:bg-white/10"
                  data-testid="button-add-participant-mobile"
                >
                  <Plus className="w-3 h-3 text-white/70" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar - Cleaner Design */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScheduleDialogOpen(true)}
              data-testid="button-schedule"
            >
              <Calendar className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Schedule</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAttachSmartFileOpen(true)}
              data-testid="button-attach"
            >
              <LinkIcon className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Attach</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-send-message">
                  <MessageSquare className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Message</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setMessageDialogOpen(true)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSmsDialogOpen(true)}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send SMS
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />
            <Button
              size="sm"
              className="bg-gray-900 hover:bg-black text-white"
              onClick={() => createSmartFileMutation.mutate()}
              disabled={createSmartFileMutation.isPending}
              data-testid="button-create-file"
            >
              <FileText className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{createSmartFileMutation.isPending ? "Creating..." : "Create File"}</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500"
              onClick={() => archiveProjectMutation.mutate({ archive: project?.status !== 'ARCHIVED' })}
              disabled={archiveProjectMutation.isPending}
              data-testid="button-archive-project"
            >
              {project?.status === 'ARCHIVED' ? (
                <ArchiveRestore className="w-4 h-4" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
            </Button>
          </div>
          </div>
        </div>
      </div>

      {/* Tabs - Orange Accent */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white border-b border-gray-200">
        <div className="max-w-[1500px] mx-auto overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8">
          <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent inline-flex min-w-full border-0">
            <TabsTrigger
              value="activity"
              className="px-4 py-3 text-sm font-medium rounded-none border-b-[3px] border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 text-gray-500 hover:text-gray-700 whitespace-nowrap"
              data-testid="tab-activity"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="px-4 py-3 text-sm font-medium rounded-none border-b-[3px] border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 text-gray-500 hover:text-gray-700 whitespace-nowrap"
              data-testid="tab-files"
            >
              Files
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="px-4 py-3 text-sm font-medium rounded-none border-b-[3px] border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 text-gray-500 hover:text-gray-700 whitespace-nowrap"
              data-testid="tab-tasks"
            >
              Tasks
            </TabsTrigger>
            <TabsTrigger
              value="financials"
              className="px-4 py-3 text-sm font-medium rounded-none border-b-[3px] border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 text-gray-500 hover:text-gray-700 whitespace-nowrap"
              data-testid="tab-financials"
            >
              Financials
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="px-4 py-3 text-sm font-medium rounded-none border-b-[3px] border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 text-gray-500 hover:text-gray-700 whitespace-nowrap"
              data-testid="tab-notes"
            >
              Notes
            </TabsTrigger>
            <TabsTrigger
              value="gallery"
              className="px-4 py-3 text-sm font-medium rounded-none border-b-[3px] border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 text-gray-500 hover:text-gray-700 whitespace-nowrap"
              data-testid="tab-gallery"
            >
              Gallery
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="px-4 py-3 text-sm font-medium rounded-none border-b-[3px] border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 text-gray-500 hover:text-gray-700 whitespace-nowrap"
              data-testid="tab-details"
            >
              Details
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Content Area with Sidebar */}
        <div className="max-w-[1500px] mx-auto w-full flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <TabsContent value="activity" className="m-0">
              <div className="space-y-4">
                {/* Email Composer - Collapsed State */}
                {selectedRecipients.length === 0 && (
                  <Card 
                    className="border cursor-pointer hover:border-primary/50 transition-colors" 
                    onClick={() => {
                      const allRecipients = [];
                      const mainContact = getContactInfo(project);
                      if (mainContact?.email) allRecipients.push(mainContact.email);
                      participants?.forEach(p => {
                        if (p.client.email) allRecipients.push(p.client.email);
                      });
                      setSelectedRecipients(allRecipients);
                    }}
                    data-testid="compose-collapsed"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {user?.email?.substring(0, 2).toUpperCase() || "AP"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          Reply to: '{project?.title || 'Contract Agreement'}'
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Expanded Email Editor - Shows when recipients are selected */}
                {selectedRecipients.length > 0 && (
                  <Card className="border-2 border-primary/20">
                    <CardContent className="p-4 space-y-3">
                      {/* Recipient Header Row */}
                      <div className="flex items-center gap-2 pb-3 border-b">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-medium">
                            {user?.email?.substring(0, 2).toUpperCase() || "AP"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-600">Reply to:</span>
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                          {selectedRecipients.map((email) => {
                            // Find contact data for this email
                            const mainContact = getContactInfo(project);
                            const isMainContact = mainContact?.email === email;
                            const participant = participants?.find(p => p.client.email === email);
                            
                            const firstName = isMainContact ? mainContact?.firstName : participant?.client.firstName;
                            const lastName = isMainContact ? mainContact?.lastName : participant?.client.lastName;
                            
                            return (
                              <div 
                                key={email}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-sm"
                                data-testid={`badge-recipient-chip-${email}`}
                              >
                                <span>{firstName} {lastName}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 hover:bg-transparent"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRecipients(prev => prev.filter(e => e !== email));
                                  }}
                                >
                                  <X className="w-3 h-3 text-gray-500 hover:text-gray-700" />
                                </Button>
                              </div>
                            );
                          })}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-sm hover:bg-gray-100"
                              >
                                <Plus className="w-4 h-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {(() => {
                                const availableRecipients: { email: string; name: string }[] = [];
                                const mainContact = getContactInfo(project);
                                if (mainContact?.email && !selectedRecipients.includes(mainContact.email)) {
                                  availableRecipients.push({
                                    email: mainContact.email,
                                    name: `${mainContact.firstName || ''} ${mainContact.lastName || ''}`.trim() || 'Primary Contact'
                                  });
                                }
                                participants?.forEach(p => {
                                  if (p.client.email && !selectedRecipients.includes(p.client.email)) {
                                    availableRecipients.push({
                                      email: p.client.email,
                                      name: `${p.client.firstName || ''} ${p.client.lastName || ''}`.trim() || p.client.email
                                    });
                                  }
                                });

                                if (availableRecipients.length === 0) {
                                  return (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                      All contacts already added
                                    </div>
                                  );
                                }

                                return availableRecipients.map(recipient => (
                                  <DropdownMenuItem
                                    key={recipient.email}
                                    onClick={() => setSelectedRecipients(prev => [...prev, recipient.email])}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{recipient.name}</span>
                                      <span className="text-xs text-muted-foreground">{recipient.email}</span>
                                    </div>
                                  </DropdownMenuItem>
                                ));
                              })()}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMessageSubject("");
                            setMessageBody("");
                            setSelectedRecipients([]);
                            setAiPrompt("");
                          }}
                          className="shrink-0 text-sm font-medium"
                          data-testid="button-close-composer"
                        >
                          SEND NEW EMAIL
                          <X className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs font-semibold text-gray-700">SUBJECT</Label>
                          <Input
                            id="email-subject"
                            value={messageSubject}
                            onChange={(e) => setMessageSubject(e.target.value)}
                            placeholder="Re: Contract Agreement"
                            className="mt-1 border-0 border-b border-gray-200 rounded-none focus-visible:ring-0 focus-visible:border-primary px-3"
                            data-testid="input-email-subject"
                          />
                        </div>

                        <div>
                          <Textarea
                            value={messageBody}
                            onChange={(e) => setMessageBody(e.target.value)}
                            placeholder="Type | to add a smart field"
                            rows={6}
                            className="border-0 resize-none focus-visible:ring-0 px-3"
                            style={{
                              fontFamily: emailFontFamily === "Default" ? "inherit" : emailFontFamily,
                              fontSize: `${emailFontSize}px`
                            }}
                            data-testid="textarea-email-body"
                          />
                        </div>

                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAiModal(true)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            data-testid="button-edit-with-ai"
                          >
                            <Sparkles className="w-4 h-4 mr-1" />
                            Edit with AI
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground"
                                disabled={aiQuickActionLoading === 'tone' || !messageBody.trim()}
                              >
                                {aiQuickActionLoading === 'tone' ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : null}
                                Change tone
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleAiQuickAction('tone', 'professional')}>
                                Professional
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAiQuickAction('tone', 'friendly')}>
                                Friendly
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAiQuickAction('tone', 'casual')}>
                                Casual
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAiQuickAction('tone', 'warm and personable')}>
                                Warm
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAiQuickAction('tone', 'urgent and action-oriented')}>
                                Urgent
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => handleAiQuickAction('shorter')}
                            disabled={aiQuickActionLoading === 'shorter' || !messageBody.trim()}
                          >
                            {aiQuickActionLoading === 'shorter' ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : null}
                            Make it shorter
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => handleAiQuickAction('clarity')}
                            disabled={aiQuickActionLoading === 'clarity' || !messageBody.trim()}
                          >
                            {aiQuickActionLoading === 'clarity' ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : null}
                            Improve clarity
                          </Button>
                        </div>

                        {/* Formatting Toolbar */}
                        {showFormattingToolbar && (
                          <div className="flex items-center gap-1 py-2 border-b flex-wrap">
                            <Select value={emailFontFamily} onValueChange={setEmailFontFamily}>
                            <SelectTrigger className="w-[120px] h-8 text-xs border-0 focus:ring-0" data-testid="select-font-family">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Default">Default</SelectItem>
                              <SelectItem value="Arial">Arial</SelectItem>
                              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                              <SelectItem value="Courier New">Courier New</SelectItem>
                              <SelectItem value="Georgia">Georgia</SelectItem>
                              <SelectItem value="Verdana">Verdana</SelectItem>
                              <SelectItem value="Helvetica">Helvetica</SelectItem>
                              <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                              <SelectItem value="Impact">Impact</SelectItem>
                              <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                              <SelectItem value="Palatino">Palatino</SelectItem>
                              <SelectItem value="Garamond">Garamond</SelectItem>
                              <SelectItem value="Bookman">Bookman</SelectItem>
                              <SelectItem value="Tahoma">Tahoma</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select value={emailFontSize} onValueChange={setEmailFontSize}>
                            <SelectTrigger className="w-[70px] h-8 text-xs border-0 focus:ring-0" data-testid="select-font-size">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="12">12</SelectItem>
                              <SelectItem value="14">14</SelectItem>
                              <SelectItem value="16">16</SelectItem>
                              <SelectItem value="18">18</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="24">24</SelectItem>
                              <SelectItem value="32">32</SelectItem>
                            </SelectContent>
                          </Select>

                          <div className="w-px h-6 bg-gray-200 mx-1"></div>

                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-format-bold">
                            <Bold className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-format-italic">
                            <Italic className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-format-underline">
                            <Underline className="w-4 h-4" />
                          </Button>

                          <div className="w-px h-6 bg-gray-200 mx-1"></div>

                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-text-color">
                            <Type className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-bg-color">
                            <Palette className="w-4 h-4" />
                          </Button>

                          <div className="w-px h-6 bg-gray-200 mx-1"></div>

                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <AlignLeft className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <List className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ListOrdered className="w-4 h-4" />
                          </Button>

                          <div className="w-px h-6 bg-gray-200 mx-1"></div>

                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <LinkIcon className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Strikethrough className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Code className="w-4 h-4" />
                          </Button>

                          <div className="w-px h-6 bg-gray-200 mx-1"></div>

                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Undo className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Redo className="w-4 h-4" />
                          </Button>
                        </div>
                        )}

                        {/* Bottom Toolbar */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-8 text-xs">
                              Templates
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => setShowFormattingToolbar(!showFormattingToolbar)}
                              data-testid="button-toggle-formatting"
                              title="Toggle formatting toolbar"
                            >
                              <Type className="w-4 h-4" />
                            </Button>
                            <DropdownMenu open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  data-testid="button-emoji-picker"
                                  title="Insert emoji"
                                >
                                  <Smile className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-64 p-2">
                                <div className="grid grid-cols-8 gap-1">
                                  {["😊", "😂", "❤️", "👍", "🎉", "📸", "📅", "💍", "🌟", "✨", "🎊", "🎈", "🥂", "💐", "🌹", "💕"].map((emoji) => (
                                    <Button
                                      key={emoji}
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-accent"
                                      onClick={() => {
                                        setMessageBody(messageBody + emoji);
                                        setShowEmojiPicker(false);
                                      }}
                                    >
                                      {emoji}
                                    </Button>
                                  ))}
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => setShowLinkDialog(true)}
                              data-testid="button-insert-link"
                              title="Insert link"
                            >
                              <Paperclip className="w-4 h-4" />
                            </Button>
                            <DropdownMenu open={showSmartFields} onOpenChange={setShowSmartFields}>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  data-testid="button-smart-fields"
                                  title="Insert smart field"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => {
                                  setMessageBody(messageBody + "{{firstName}}");
                                  setShowSmartFields(false);
                                }}>
                                  First Name
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setMessageBody(messageBody + "{{lastName}}");
                                  setShowSmartFields(false);
                                }}>
                                  Last Name
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setMessageBody(messageBody + "{{email}}");
                                  setShowSmartFields(false);
                                }}>
                                  Email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setMessageBody(messageBody + "{{projectTitle}}");
                                  setShowSmartFields(false);
                                }}>
                                  Project Title
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setMessageBody(messageBody + "{{eventDate}}");
                                  setShowSmartFields(false);
                                }}>
                                  Event Date
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              disabled
                              title="Calendar availability (coming soon)"
                            >
                              <ImageIcon className="w-4 h-4 opacity-40" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                // Insert photographer's email signature
                                const signature = user?.photographer?.emailSignature || "\n\nBest regards,\n" + (user?.photographer?.businessName || user?.email || "");
                                setMessageBody(messageBody + signature);
                              }}
                              data-testid="button-insert-signature"
                              title="Insert email signature"
                            >
                              <Video className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setMessageBody(messageBody + "\n\n{{unsubscribeLink}}");
                              }}
                              data-testid="button-insert-unsubscribe"
                              title="Insert unsubscribe link"
                            >
                              <Code className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Mic className="w-4 h-4" />
                            </Button>
                            <Button 
                              onClick={() => sendEmailMutation.mutate({ 
                                subject: messageSubject, 
                                body: messageBody,
                                recipients: selectedRecipients 
                              })}
                              disabled={!messageSubject || !messageBody || selectedRecipients.length === 0 || sendEmailMutation.isPending}
                              className="h-8 bg-black text-white hover:bg-black/90"
                              data-testid="button-send-email"
                            >
                              {sendEmailMutation.isPending ? "SENDING..." : "SEND"}
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <span className="font-medium">RECENT ACTIVITY</span>
                </div>

                {history && history.length > 0 ? (
                  <div className="space-y-0">
                    {history.map((event, index) => {
                      const isReceived = isReceivedActivity(event);
                      return (
                      <div
                        key={event.id}
                        className="flex gap-4"
                        data-testid={`activity-${event.id}`}
                      >
                        {/* Timeline column with icon and line */}
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                            isReceived ? "bg-green-100" : "bg-gray-100"
                          )}>
                            <span className={isReceived ? "text-green-600" : "text-gray-500"}>
                              {getActivityIcon(event)}
                            </span>
                          </div>
                          {index < history.length - 1 && (
                            <div className="w-px h-full bg-gray-200 my-2 min-h-[20px]" />
                          )}
                        </div>
                        {/* Content card */}
                        <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl p-4 mb-3">
                          {event.type === 'activity' && (
                            <div>
                              {/* Hide title and description for EMAIL_SENT, EMAIL_RECEIVED, SMART_FILE_ATTACHED, and SMART_FILE_SENT since they have custom rendering */}
                              {event.activityType !== 'EMAIL_SENT' && event.activityType !== 'EMAIL_RECEIVED' && event.activityType !== 'SMART_FILE_ATTACHED' && event.activityType !== 'SMART_FILE_SENT' && (
                                <>
                                  <p className="font-medium text-sm">{event.title}</p>
                                  {event.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                  )}
                                </>
                              )}
                              
                              {/* Display full email in HoneyBook-style card for EMAIL_SENT activities */}
                              {event.activityType === 'EMAIL_SENT' && (() => {
                                try {
                                  const metadata = event.metadata ? (typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata) : null;
                                  if (metadata && ('body' in metadata || 'htmlBody' in metadata || 'subject' in metadata)) {
                                    // Determine sender name for avatar
                                    const senderName = metadata.fromName || metadata.from || 'You';
                                    const contactInfo = getContactInfo(project);
                                    const contactName = contactInfo ? `${contactInfo.firstName} ${contactInfo.lastName}`.trim() : '';
                                    const toName = metadata.toName || metadata.to || contactName || contactInfo?.email || 'Client';
                                    
                                    // Get initials from sender name
                                    const nameWords = senderName.split(' ');
                                    const initials = nameWords.length >= 2 
                                      ? `${nameWords[0][0]}${nameWords[nameWords.length - 1][0]}`.toUpperCase()
                                      : senderName.substring(0, 2).toUpperCase();
                                    
                                    // Render HoneyBook card with avatar circle and clean names
                                    return (
                                      <div className="mt-3 p-4 bg-white border rounded-lg relative">
                                        {/* Avatar and Header */}
                                        <div className="flex items-start gap-3 mb-3">
                                          {/* Avatar Circle */}
                                          <Avatar className="w-10 h-10 flex-shrink-0">
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                              {initials}
                                            </AvatarFallback>
                                          </Avatar>
                                          
                                          {/* From/To and Date */}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 text-sm">
                                                  <span className="font-semibold">From:</span>
                                                  <span className="truncate">{senderName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm mt-1">
                                                  <span className="font-semibold">To:</span>
                                                  <span className="truncate">{toName}</span>
                                                </div>
                                              </div>
                                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                                {new Date(event.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Subject Line */}
                                        {metadata.subject && (
                                          <>
                                            <h3 className="font-semibold text-base mb-2">
                                              {metadata.subject.trim() || 'No subject'}
                                            </h3>
                                            <div className="border-b border-gray-200 mb-3"></div>
                                          </>
                                        )}
                                        
                                        {/* Email Body */}
                                        {metadata.body && (
                                          <div className="text-sm whitespace-pre-wrap leading-relaxed break-words">
                                            {metadata.body}
                                          </div>
                                        )}
                                        
                                        {/* Attachments Section */}
                                        {metadata.attachments && metadata.attachments.length > 0 && (
                                          <div className="mt-6 pt-4 border-t">
                                            {metadata.attachments.map((attachment: any, idx: number) => (
                                              <div key={idx} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                                <FileText className="w-5 h-5 text-muted-foreground" />
                                                <span className="text-sm font-medium truncate">
                                                  {attachment.name || attachment.filename || 'Attachment'}
                                                </span>
                                                <MoreVertical className="w-4 h-4 ml-auto text-muted-foreground" />
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {/* Envelope Icon */}
                                        <div className="absolute bottom-4 right-4">
                                          <Mail className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    // No valid metadata - show simple timestamp
                                    return (
                                      <p className="text-xs text-muted-foreground mt-2">
                                        {formatDate(event.createdAt)}
                                      </p>
                                    );
                                  }
                                } catch (e) {
                                  // Parsing failed - show simple timestamp
                                  return (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {formatDate(event.createdAt)}
                                    </p>
                                  );
                                }
                              })()}
                              
                              {/* Display full email in HoneyBook-style card for EMAIL_RECEIVED activities */}
                              {event.activityType === 'EMAIL_RECEIVED' && (() => {
                                try {
                                  const metadata = event.metadata ? (typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata) : null;
                                  if (metadata && typeof metadata === 'object' && ('body' in metadata || 'htmlBody' in metadata || 'subject' in metadata)) {
                                    // Determine sender name for avatar (client is sender for received emails)
                                    const contactInfo = getContactInfo(project);
                                    const contactName = contactInfo ? `${contactInfo.firstName} ${contactInfo.lastName}`.trim() : '';
                                    const senderName = metadata.fromName || metadata.from || contactName || contactInfo?.email || 'Client';
                                    const toName = metadata.toName || metadata.to || 'You';
                                    
                                    // Get initials from sender name
                                    const nameWords = senderName.split(' ');
                                    const initials = nameWords.length >= 2 
                                      ? `${nameWords[0][0]}${nameWords[nameWords.length - 1][0]}`.toUpperCase()
                                      : senderName.substring(0, 2).toUpperCase();
                                    
                                    // Render HoneyBook card with avatar circle and clean names
                                    return (
                                      <div className="mt-3 p-4 bg-white border rounded-lg relative">
                                        {/* Avatar and Header */}
                                        <div className="flex items-start gap-3 mb-3">
                                          {/* Avatar Circle */}
                                          <Avatar className="w-10 h-10 flex-shrink-0">
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                              {initials}
                                            </AvatarFallback>
                                          </Avatar>
                                          
                                          {/* From/To and Date */}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 text-sm">
                                                  <span className="font-semibold">From:</span>
                                                  <span className="truncate">{senderName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm mt-1">
                                                  <span className="font-semibold">To:</span>
                                                  <span className="truncate">{toName}</span>
                                                </div>
                                              </div>
                                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                                {new Date(event.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Subject Line */}
                                        {metadata.subject && (
                                          <>
                                            <h3 className="font-semibold text-base mb-2">
                                              {metadata.subject.trim() || 'No subject'}
                                            </h3>
                                            <div className="border-b border-gray-200 mb-3"></div>
                                          </>
                                        )}
                                        
                                        {/* Email Body */}
                                        {(metadata.htmlBody || metadata.body) && (
                                          <div className="text-sm leading-relaxed">
                                            {metadata.htmlBody ? (
                                              <div className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: metadata.htmlBody }} />
                                            ) : (
                                              <div className="whitespace-pre-wrap break-words">{metadata.body}</div>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Attachments Section */}
                                        {metadata.attachments && metadata.attachments.length > 0 && (
                                          <div className="mt-6 pt-4 border-t">
                                            {metadata.attachments.map((attachment: any, idx: number) => (
                                              <div key={idx} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                                <FileText className="w-5 h-5 text-muted-foreground" />
                                                <span className="text-sm font-medium truncate">
                                                  {attachment.name || attachment.filename || 'Attachment'}
                                                </span>
                                                <MoreVertical className="w-4 h-4 ml-auto text-muted-foreground" />
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {/* Envelope Icon */}
                                        <div className="absolute bottom-4 right-4">
                                          <Mail className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    // No valid metadata - show simple timestamp
                                    return (
                                      <p className="text-xs text-muted-foreground mt-2">
                                        {formatDate(event.createdAt)}
                                      </p>
                                    );
                                  }
                                } catch (e) {
                                  // Parsing failed - show simple timestamp
                                  return (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {formatDate(event.createdAt)}
                                    </p>
                                  );
                                }
                              })()}

                              {/* Smart File Attached - Show Send button for DRAFT status files */}
                              {event.activityType === 'SMART_FILE_ATTACHED' && (() => {
                                // Get the projectSmartFileId from relatedId
                                const projectSmartFileId = event.relatedId;

                                // Find the matching smart file to check its status
                                const matchingSmartFile = smartFiles?.find(sf => sf.id === projectSmartFileId);
                                const isDraft = matchingSmartFile?.status === 'DRAFT';

                                return (
                                  <div>
                                    <p className="font-medium text-sm">{event.title}</p>
                                    {event.description && (
                                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                    )}

                                    {/* Show Send button for DRAFT smart files */}
                                    {isDraft && matchingSmartFile && (
                                      <div className="mt-3">
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={() => setSmartFileToSend(matchingSmartFile)}
                                          disabled={sendSmartFileMutation.isPending}
                                          data-testid={`send-smart-file-${projectSmartFileId}`}
                                        >
                                          <Send className="w-3 h-3 mr-2" />
                                          Send to Client
                                        </Button>
                                      </div>
                                    )}

                                    {/* Show status badge and View button for already sent files */}
                                    {matchingSmartFile && matchingSmartFile.status !== 'DRAFT' && (
                                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                                        <Badge variant="secondary" className="text-xs capitalize">
                                          {matchingSmartFile.status.toLowerCase().replace('_', ' ')}
                                        </Badge>
                                        {matchingSmartFile.sentAt && (
                                          <span className="text-xs text-muted-foreground">
                                            Sent {formatDate(matchingSmartFile.sentAt)}
                                          </span>
                                        )}
                                        {/* Expiration badge - only show for SENT/VIEWED status */}
                                        {matchingSmartFile.expiresAt && ['SENT', 'VIEWED'].includes(matchingSmartFile.status) && (() => {
                                          const expiresAt = new Date(matchingSmartFile.expiresAt);
                                          const now = new Date();
                                          const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                                          const isExpired = daysRemaining <= 0;
                                          const isUrgent = daysRemaining > 0 && daysRemaining <= 3;

                                          return (
                                            <Badge
                                              variant={isExpired ? "destructive" : isUrgent ? "secondary" : "outline"}
                                              className={cn(
                                                "text-xs",
                                                isExpired && "bg-red-500 text-white",
                                                isUrgent && !isExpired && "bg-amber-100 text-amber-800 border-amber-300"
                                              )}
                                            >
                                              <Clock className="w-3 h-3 mr-1" />
                                              {isExpired
                                                ? "Expired"
                                                : daysRemaining === 1
                                                  ? "1 day left"
                                                  : `${daysRemaining} days left`
                                              }
                                            </Badge>
                                          );
                                        })()}
                                        {matchingSmartFile.token && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                          >
                                            <a href={`/smart-file/${matchingSmartFile.token}`} target="_blank" rel="noopener noreferrer">
                                              <Eye className="w-3 h-3 mr-2" />
                                              View File
                                            </a>
                                          </Button>
                                        )}
                                        {/* Extend button for expiring/expired proposals */}
                                        {matchingSmartFile.expiresAt && ['SENT', 'VIEWED'].includes(matchingSmartFile.status) && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setSmartFileToExtend(matchingSmartFile)}
                                            className="text-xs"
                                          >
                                            <RefreshCw className="w-3 h-3 mr-1" />
                                            Extend
                                          </Button>
                                        )}
                                      </div>
                                    )}

                                    <p className="text-xs text-muted-foreground mt-2">
                                      {formatDate(event.createdAt)}
                                    </p>
                                  </div>
                                );
                              })()}

                              {/* Smart File Sent - Show status, expiration badge, and actions */}
                              {event.activityType === 'SMART_FILE_SENT' && (() => {
                                const projectSmartFileId = event.relatedId;
                                const matchingSmartFile = smartFiles?.find(sf => sf.id === projectSmartFileId);

                                return (
                                  <div>
                                    <p className="font-medium text-sm">{event.title}</p>
                                    {event.description && (
                                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                    )}

                                    {matchingSmartFile && (
                                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                                        <Badge variant="secondary" className="text-xs capitalize">
                                          {matchingSmartFile.status.toLowerCase().replace('_', ' ')}
                                        </Badge>
                                        {matchingSmartFile.sentAt && (
                                          <span className="text-xs text-muted-foreground">
                                            Sent {formatDate(matchingSmartFile.sentAt)}
                                          </span>
                                        )}
                                        {/* Expiration badge - only show for SENT/VIEWED status */}
                                        {matchingSmartFile.expiresAt && ['SENT', 'VIEWED'].includes(matchingSmartFile.status) && (() => {
                                          const expiresAt = new Date(matchingSmartFile.expiresAt);
                                          const now = new Date();
                                          const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                                          const isExpired = daysRemaining <= 0;
                                          const isUrgent = daysRemaining > 0 && daysRemaining <= 3;

                                          return (
                                            <Badge
                                              variant={isExpired ? "destructive" : isUrgent ? "secondary" : "outline"}
                                              className={cn(
                                                "text-xs",
                                                isExpired && "bg-red-500 text-white",
                                                isUrgent && !isExpired && "bg-amber-100 text-amber-800 border-amber-300"
                                              )}
                                            >
                                              <Clock className="w-3 h-3 mr-1" />
                                              {isExpired
                                                ? "Expired"
                                                : daysRemaining === 1
                                                  ? "1 day left"
                                                  : `${daysRemaining} days left`
                                              }
                                            </Badge>
                                          );
                                        })()}
                                        {matchingSmartFile.token && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                          >
                                            <a href={`/smart-file/${matchingSmartFile.token}`} target="_blank" rel="noopener noreferrer">
                                              <Eye className="w-3 h-3 mr-2" />
                                              View File
                                            </a>
                                          </Button>
                                        )}
                                        {/* Extend button for expiring/expired proposals */}
                                        {matchingSmartFile.expiresAt && ['SENT', 'VIEWED'].includes(matchingSmartFile.status) && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setSmartFileToExtend(matchingSmartFile)}
                                            className="text-xs"
                                          >
                                            <RefreshCw className="w-3 h-3 mr-1" />
                                            Extend
                                          </Button>
                                        )}
                                      </div>
                                    )}

                                    <p className="text-xs text-muted-foreground mt-2">
                                      {formatDate(event.createdAt)}
                                    </p>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          {event.type === 'email' && (() => {
                            let renderedCard = false;
                            try {
                              const metadata = event.metadata ? (typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata) : null;
                              if (metadata && ('body' in metadata || 'htmlBody' in metadata || 'subject' in metadata)) {
                                renderedCard = true;

                                // Determine sender name for avatar
                                const senderName = metadata.fromName || metadata.from || 'You';
                                const contactInfo = getContactInfo(project);
                                const contactName = contactInfo ? `${contactInfo.firstName} ${contactInfo.lastName}`.trim() : '';
                                const toName = metadata.toName || metadata.to || contactName || contactInfo?.email || 'Client';
                                
                                // Get initials from sender name
                                const nameWords = senderName.split(' ');
                                const initials = nameWords.length >= 2 
                                  ? `${nameWords[0][0]}${nameWords[nameWords.length - 1][0]}`.toUpperCase()
                                  : senderName.substring(0, 2).toUpperCase();
                                
                                return (
                                  <div>
                                    <div className="p-4 bg-white border rounded-lg relative">
                                      {/* Avatar and Header */}
                                      <div className="flex items-start gap-3 mb-3">
                                        {/* Avatar Circle */}
                                        <Avatar className="w-10 h-10 flex-shrink-0">
                                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                            {initials}
                                          </AvatarFallback>
                                        </Avatar>
                                        
                                        {/* From/To and Date */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 text-sm">
                                                <span className="font-semibold">From:</span>
                                                <span className="truncate">{senderName}</span>
                                              </div>
                                              <div className="flex items-center gap-2 text-sm mt-1">
                                                <span className="font-semibold">To:</span>
                                                <span className="truncate">{toName}</span>
                                              </div>
                                            </div>
                                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                              {event.sentAt ? new Date(event.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(event.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Subject Line */}
                                      {(metadata.subject || event.title) && (
                                        <>
                                          <h3 className="font-semibold text-base mb-2">
                                            {(metadata.subject?.trim() || event.title?.trim()) || 'No subject'}
                                          </h3>
                                          <div className="border-b border-gray-200 mb-3"></div>
                                        </>
                                      )}
                                      
                                      {/* Email Body */}
                                      {metadata.body && (
                                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                          {metadata.body}
                                        </div>
                                      )}
                                      
                                      {/* Attachments Section */}
                                      {metadata.attachments && metadata.attachments.length > 0 && (
                                        <div className="mt-6 pt-4 border-t">
                                          {metadata.attachments.map((attachment: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                              <FileText className="w-5 h-5 text-muted-foreground" />
                                              <span className="text-sm font-medium truncate">
                                                {attachment.name || attachment.filename || 'Attachment'}
                                              </span>
                                              <MoreVertical className="w-4 h-4 ml-auto text-muted-foreground" />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Status Badge */}
                                      {event.status && (
                                        <div className="mt-4">
                                          <Badge variant="secondary" className="text-xs">
                                            {event.status}
                                          </Badge>
                                        </div>
                                      )}
                                      
                                      {/* Envelope Icon */}
                                      <div className="absolute bottom-4 right-4">
                                        <Mail className="w-5 h-5 text-muted-foreground" />
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            } catch (e) {
                              // Parsing failed, show fallback
                            }
                            
                            // Fallback if card wasn't rendered
                            if (!renderedCard) {
                              return (
                                <div>
                                  <p className="font-medium text-sm">{event.title}</p>
                                  {event.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-2">
                                    {event.status && (
                                      <Badge variant="secondary" className="text-xs">
                                        {event.status}
                                      </Badge>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                      {event.sentAt ? formatDate(event.sentAt) : formatDate(event.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {event.type === 'sms' && (
                            <div>
                              <p className="text-sm">{event.body}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {event.direction === 'OUTBOUND' ? 'Sent' : 'Received'} • {formatDate(event.createdAt)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No activity yet</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="files" className="m-0">
              <div className="space-y-4">
                {smartFiles && smartFiles.length > 0 ? (
                  <div className="space-y-3">
                    {smartFiles.map((sf) => (
                      <div 
                        key={sf.id} 
                        className="p-4 border rounded-lg hover:shadow-sm transition-shadow"
                        data-testid={`smart-file-${sf.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="w-10 h-10 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{sf.smartFileName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {sf.status}
                                </Badge>
                                {sf.sentAt && (
                                  <span className="text-xs text-muted-foreground">
                                    Sent {formatDate(sf.sentAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {sf.status !== 'DRAFT' && sf.token && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={`/smart-file/${sf.token}?preview=true`} target="_blank" rel="noopener noreferrer">
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </a>
                              </Button>
                            )}
                            {sf.status === 'DRAFT' && (
                              <Button size="sm" onClick={() => setSmartFileToSend(sf)}>
                                <Send className="w-4 h-4 mr-1" />
                                Send
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {sf.status === 'DRAFT' && (
                                  <DropdownMenuItem onClick={() => setSmartFileToSend(sf)}>
                                  <Send className="w-4 h-4 mr-2" />
                                  Send to Client
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <a
                                  href={sf.token ? `/smart-file/${sf.token}?preview=true` : `/smart-files/${sf.smartFileId}?projectId=${project.id}&preview=true`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  data-testid={`preview-smart-file-${sf.smartFileId}`}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Preview
                                </a>
                              </DropdownMenuItem>
                              {sf.token && (
                                <DropdownMenuItem onClick={() => {
                                  const url = `${window.location.origin}/smart-file/${sf.token}`;
                                  navigator.clipboard.writeText(url);
                                  toast({ title: "Link copied to clipboard" });
                                }}>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy Client Link
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No files attached yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => setAttachSmartFileOpen(true)}
                    >
                      Attach Smart File
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="m-0">
              <div className="text-center py-12 text-muted-foreground">
                <p>Tasks feature coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="financials" className="m-0">
              <ProjectFinancials projectId={id!} />
            </TabsContent>

            <TabsContent value="notes" className="m-0">
              <ProjectNotes projectId={id!} />
            </TabsContent>

            <TabsContent value="gallery" className="m-0">
              <div className="space-y-4">
                {/* Native Gallery Linking Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Native Gallery</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {linkedGallery ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <Camera className="w-5 h-5 text-green-600 mt-0.5" />
                              <div>
                                <p className="font-medium text-green-800 dark:text-green-200">{linkedGallery.title}</p>
                                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                  Status: {linkedGallery.status}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unlinkGalleryMutation.mutate(linkedGallery.id)}
                              disabled={unlinkGalleryMutation.isPending}
                              data-testid="button-unlink-gallery"
                            >
                              {unlinkGalleryMutation.isPending ? "Unlinking..." : "Unlink"}
                            </Button>
                          </div>
                        </div>

                        {linkedGallery.status !== 'READY' && (
                          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div>
                              <p className="font-medium text-blue-800 dark:text-blue-200">Ready to deliver?</p>
                              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                Mark gallery as ready to move project to "Gallery Delivered" stage
                              </p>
                            </div>
                            <Button
                              onClick={() => markGalleryReadyMutation.mutate(linkedGallery.id)}
                              disabled={markGalleryReadyMutation.isPending}
                              data-testid="button-gallery-ready"
                            >
                              {markGalleryReadyMutation.isPending ? "Processing..." : "Gallery Ready"}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Primary action: Create Gallery */}
                        <div className="text-center py-6">
                          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mb-4">
                            <Camera className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2">No Gallery Yet</h3>
                          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                            Create a gallery to share photos with {project?.client?.firstName || 'your client'}
                          </p>
                          <Button
                            onClick={() => createLinkedGalleryMutation.mutate()}
                            disabled={createLinkedGalleryMutation.isPending}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            data-testid="button-create-gallery"
                          >
                            {createLinkedGalleryMutation.isPending ? (
                              <>
                                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Camera className="w-4 h-4 mr-2" />
                                Create Gallery
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Secondary option: Link existing gallery */}
                        <div className="border-t pt-4">
                          <button
                            onClick={() => setShowLinkExistingGallery(!showLinkExistingGallery)}
                            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                          >
                            <span>or link an existing gallery</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showLinkExistingGallery ? 'rotate-180' : ''}`} />
                          </button>

                          {showLinkExistingGallery && (
                            <div className="mt-4 flex gap-2">
                              <Select value={selectedGalleryId} onValueChange={setSelectedGalleryId}>
                                <SelectTrigger className="flex-1" data-testid="select-gallery">
                                  <SelectValue placeholder="Select a gallery..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {galleries?.filter(g => !g.projectId).map(gallery => (
                                    <SelectItem key={gallery.id} value={gallery.id}>
                                      {gallery.title} ({gallery.status})
                                    </SelectItem>
                                  ))}
                                  {galleries?.filter(g => !g.projectId).length === 0 && (
                                    <SelectItem value="none" disabled>No available galleries</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  if (selectedGalleryId) {
                                    linkGalleryMutation.mutate(selectedGalleryId);
                                    setSelectedGalleryId("");
                                    setShowLinkExistingGallery(false);
                                  }
                                }}
                                disabled={!selectedGalleryId || linkGalleryMutation.isPending}
                                data-testid="button-link-gallery"
                              >
                                {linkGalleryMutation.isPending ? "Linking..." : "Link"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* External Gallery Platform Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>External Gallery Platform</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(project as any)?.galleryUrl ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Camera className="w-5 h-5 text-green-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium text-green-800 dark:text-green-200">Gallery Created</p>
                              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                {(project as any).galleryReady 
                                  ? "Gallery has been shared with client" 
                                  : "Gallery folder is ready for photos"}
                              </p>
                              <div className="mt-3 flex items-center gap-2">
                                <Input 
                                  value={(project as any).galleryUrl} 
                                  readOnly 
                                  className="flex-1 text-sm"
                                  data-testid="input-gallery-url"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText((project as any).galleryUrl);
                                    toast({ title: "Gallery link copied!" });
                                  }}
                                  data-testid="button-copy-gallery-url"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open((project as any).galleryUrl, '_blank')}
                                  data-testid="button-open-gallery"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {!(project as any).galleryReady && (
                          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div>
                              <p className="font-medium text-blue-800 dark:text-blue-200">Ready to share?</p>
                              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                Mark gallery as ready to send the link to your client
                              </p>
                            </div>
                            <Button
                              onClick={() => shareGalleryMutation.mutate()}
                              disabled={shareGalleryMutation.isPending}
                              data-testid="button-share-gallery"
                            >
                              {shareGalleryMutation.isPending ? "Sharing..." : "Share Gallery"}
                            </Button>
                          </div>
                        )}

                        {(project as any).galleryReady && (
                          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>Shared {(project as any).gallerySharedAt ? formatDate((project as any).gallerySharedAt) : 'recently'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center py-8">
                          <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                          <h3 className="font-medium mb-2">No Gallery Created Yet</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Create a gallery folder or add a link manually
                          </p>
                          <div className="flex flex-col gap-3 max-w-md mx-auto">
                            <Button
                              onClick={() => createGalleryMutation.mutate()}
                              disabled={createGalleryMutation.isPending}
                              data-testid="button-create-gallery"
                              className="w-full"
                            >
                              {createGalleryMutation.isPending ? "Creating..." : "Auto-Create Gallery"}
                            </Button>
                            {!isEditingGalleryUrl ? (
                              <Button
                                variant="outline"
                                onClick={() => setIsEditingGalleryUrl(true)}
                                data-testid="button-add-manual-gallery"
                                className="w-full"
                              >
                                Add Gallery Link Manually
                              </Button>
                            ) : (
                              <div className="flex gap-2">
                                <Input
                                  placeholder="https://..."
                                  value={manualGalleryUrl}
                                  onChange={(e) => setManualGalleryUrl(e.target.value)}
                                  data-testid="input-manual-gallery-url"
                                />
                                <Button
                                  onClick={() => updateGalleryUrlMutation.mutate(manualGalleryUrl)}
                                  disabled={!manualGalleryUrl || updateGalleryUrlMutation.isPending}
                                  data-testid="button-save-manual-gallery"
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setIsEditingGalleryUrl(false);
                                    setManualGalleryUrl("");
                                  }}
                                  data-testid="button-cancel-manual-gallery"
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-start gap-2">
                            <LinkIcon className="w-4 h-4 text-blue-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-blue-800 dark:text-blue-200">Automatic gallery creation</p>
                              <p className="text-blue-700 dark:text-blue-300 mt-1">
                                Galleries are automatically created when clients pay their deposit. Configure your gallery platform in Settings → Integrations.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="details" className="m-0">
              <div className="space-y-4">
                {/* Project Details Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Event Date - Auto-save on change */}
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-muted-foreground">Event Date</Label>
                      <div
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted group"
                        data-testid="field-event-date"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <Input
                            type="date"
                            value={project?.eventDate?.split('T')[0] || ""}
                            onChange={async (e) => {
                              try {
                                await updateProjectMutation.mutateAsync({
                                  eventDate: e.target.value || null
                                });
                              } catch (error) {
                                console.error('Failed to update event date:', error);
                              }
                            }}
                            className="border-0 p-0 h-auto focus-visible:ring-0 bg-transparent cursor-pointer"
                            data-testid="input-event-date"
                          />
                        </div>
                        {updateProjectMutation.isPending && (
                          <span className="text-xs text-muted-foreground">Saving...</span>
                        )}
                      </div>
                    </div>

                    {/* Venue - Auto-save on blur */}
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-muted-foreground">Venue</Label>
                      <div
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted group"
                        data-testid="field-venue"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <Input
                            type="text"
                            defaultValue={project?.venue || ""}
                            placeholder="Enter venue name"
                            onBlur={async (e) => {
                              const newValue = e.target.value.trim();
                              if (newValue !== (project?.venue || "")) {
                                try {
                                  await updateProjectMutation.mutateAsync({
                                    venue: newValue || null
                                  });
                                } catch (error) {
                                  console.error('Failed to update venue:', error);
                                }
                              }
                            }}
                            className="border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                            data-testid="input-venue"
                          />
                        </div>
                        {updateProjectMutation.isPending && (
                          <span className="text-xs text-muted-foreground">Saving...</span>
                        )}
                      </div>
                    </div>

                    {/* Project Notes */}
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                      {isEditingProjectNotes ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editProjectNotes}
                            onChange={(e) => setEditProjectNotes(e.target.value)}
                            placeholder="Add notes about this project..."
                            rows={4}
                            className="resize-none"
                            data-testid="input-project-notes"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  await updateProjectMutation.mutateAsync({ notes: editProjectNotes || null });
                                  setIsEditingProjectNotes(false);
                                } catch (error) {
                                  console.error('Failed to update notes:', error);
                                }
                              }}
                              disabled={updateProjectMutation.isPending}
                              data-testid="button-save-project-notes"
                            >
                              {updateProjectMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsEditingProjectNotes(false);
                                setEditProjectNotes(project?.notes || "");
                              }}
                              disabled={updateProjectMutation.isPending}
                              data-testid="button-cancel-project-notes"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="p-2 rounded-md hover:bg-muted cursor-pointer group min-h-[60px]"
                          onClick={() => {
                            setEditProjectNotes(project?.notes || "");
                            setIsEditingProjectNotes(true);
                          }}
                          data-testid="field-project-notes"
                        >
                          <div className="flex items-start justify-between">
                            <p className="text-sm whitespace-pre-wrap">
                              {project?.notes || <span className="text-muted-foreground">No notes added</span>}
                            </p>
                            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 ml-2">Click to edit</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Primary Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium">
                        {getContactInfo(project)?.firstName} {getContactInfo(project)?.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Mail className="w-4 h-4" />
                        <span>{getContactInfo(project)?.email}</span>
                      </div>
                      {getContactInfo(project)?.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Phone className="w-4 h-4" />
                          <span>{getContactInfo(project)?.phone}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Project Participants Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Project Participants</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAddingParticipant(true)}
                      data-testid="button-add-participant-details"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {(!participants || participants.length === 0) ? (
                      <p className="text-sm text-muted-foreground">No additional participants</p>
                    ) : (
                      <div className="space-y-3">
                        {participants.map((participant) => (
                          <div 
                            key={participant.id} 
                            className="flex items-center justify-between p-3 border rounded-lg"
                            data-testid={`participant-row-${participant.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-medium">
                                {getInitials(participant.client.firstName, participant.client.lastName)}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {participant.client.firstName} {participant.client.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">{participant.client.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {editingParticipantId === participant.id ? (
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={editParticipantRole}
                                    onValueChange={setEditParticipantRole}
                                  >
                                    <SelectTrigger className="w-[140px]" data-testid={`select-role-${participant.id}`}>
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">No role</SelectItem>
                                      <SelectItem value="Bride">Bride</SelectItem>
                                      <SelectItem value="Groom">Groom</SelectItem>
                                      <SelectItem value="Partner">Partner</SelectItem>
                                      <SelectItem value="Wedding Planner">Wedding Planner</SelectItem>
                                      <SelectItem value="Parent">Parent</SelectItem>
                                      <SelectItem value="Best Man">Best Man</SelectItem>
                                      <SelectItem value="Maid of Honor">Maid of Honor</SelectItem>
                                      <SelectItem value="Coordinator">Coordinator</SelectItem>
                                      <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      updateParticipantRoleMutation.mutate({
                                        participantId: participant.id,
                                        role: editParticipantRole === "none" ? null : editParticipantRole
                                      });
                                      setEditingParticipantId(null);
                                    }}
                                    disabled={updateParticipantRoleMutation.isPending}
                                    data-testid={`button-save-role-${participant.id}`}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingParticipantId(null)}
                                    data-testid={`button-cancel-role-${participant.id}`}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <Badge 
                                    variant="secondary" 
                                    className="cursor-pointer hover:bg-secondary/80"
                                    onClick={() => {
                                      setEditingParticipantId(participant.id);
                                      setEditParticipantRole(participant.role || "none");
                                    }}
                                    data-testid={`badge-role-${participant.id}`}
                                  >
                                    {participant.role || "No role"}
                                  </Badge>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditingParticipantId(participant.id);
                                          setEditParticipantRole(participant.role || "none");
                                        }}
                                      >
                                        Edit Role
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => removeParticipantMutation.mutate(participant.clientId)}
                                      >
                                        Remove
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>

          {/* Right Sidebar - Redesigned */}
          <div className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0">
            <div className="p-4 sm:p-5 space-y-6">
              {/* Stage Selector */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stage</label>
                <Select
                  value={project.stage?.id || ''}
                  onValueChange={(value) => updateStageMutation.mutate(value)}
                >
                  <SelectTrigger
                    className="mt-2 w-full bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    data-testid="select-stage"
                  >
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages?.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-green-600">
                    ${(paymentSummary?.collected || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Collected</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-orange-500">
                    ${(paymentSummary?.outstanding || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Outstanding</p>
                </div>
              </div>

              {/* Primary Contact */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Primary Contact</label>
                <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-orange-100 text-orange-600 font-medium">
                        {getInitials(getContactInfo(project)?.firstName || '', getContactInfo(project)?.lastName || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {getContactInfo(project)?.firstName} {getContactInfo(project)?.lastName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{getContactInfo(project)?.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const email = getContactInfo(project)?.email;
                        if (email) window.location.href = `mailto:${email}`;
                      }}
                    >
                      <Mail className="w-4 h-4 mr-1.5" />Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const phone = getContactInfo(project)?.phone;
                        if (phone) window.location.href = `tel:${phone}`;
                      }}
                    >
                      <Phone className="w-4 h-4 mr-1.5" />Call
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tags</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(project?.tags || []).map((tagName: string) => {
                    const tagData = photographerTags?.find(t => t.name === tagName);
                    return (
                      <span
                        key={tagName}
                        className="px-2.5 py-1 text-xs font-medium text-white rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: tagData?.color || '#6366f1' }}
                        onClick={() => {
                          const newTags = (project?.tags || []).filter((t: string) => t !== tagName);
                          updateProjectTagsMutation.mutate(newTags);
                        }}
                      >
                        {tagName}
                      </span>
                    );
                  })}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="px-2.5 py-1 text-xs font-medium text-gray-400 border border-dashed border-gray-300 rounded-full hover:border-gray-400 hover:text-gray-500 transition-colors">
                        + Add
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {photographerTags?.filter(t => !(project?.tags || []).includes(t.name)).map(tag => (
                        <DropdownMenuItem
                          key={tag.id}
                          onClick={() => {
                            const newTags = [...(project?.tags || []), tag.name];
                            updateProjectTagsMutation.mutate(newTags);
                          }}
                        >
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </DropdownMenuItem>
                      ))}
                      {photographerTags?.filter(t => !(project?.tags || []).includes(t.name)).length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {photographerTags?.length === 0 ? "No tags yet" : "All tags applied"}
                        </div>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowCreateTag(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create new tag...
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Create new tag inline */}
                {showCreateTag && (
                  <div className="flex gap-2 mt-3">
                    <Input
                      placeholder="Tag name..."
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTagName.trim()) {
                          createTagMutation.mutate({ name: newTagName.trim() });
                          setNewTagName("");
                          setShowCreateTag(false);
                        }
                        if (e.key === 'Escape') {
                          setNewTagName("");
                          setShowCreateTag(false);
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="h-8 bg-orange-500 hover:bg-orange-600"
                      onClick={() => {
                        if (newTagName.trim()) {
                          createTagMutation.mutate({ name: newTagName.trim() });
                          setNewTagName("");
                          setShowCreateTag(false);
                        }
                      }}
                      disabled={!newTagName.trim() || createTagMutation.isPending}
                    >
                      {createTagMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => {
                        setNewTagName("");
                        setShowCreateTag(false);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Client Portal */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Client Portal</label>
                <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-gray-500 truncate" data-testid="text-portal-url">
                      {(user as any)?.portalSlug ? `${(user as any).portalSlug}.tpcportal.co` : 'Portal not set'}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7"
                        data-testid="button-copy-portal-link"
                        onClick={() => {
                          const portalUrl = (user as any)?.portalSlug
                            ? `https://${(user as any).portalSlug}.tpcportal.co`
                            : window.location.origin;
                          navigator.clipboard.writeText(portalUrl);
                          toast({ title: "Link copied to clipboard" });
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7"
                        data-testid="button-open-portal"
                        onClick={() => {
                          const portalUrl = (user as any)?.portalSlug
                            ? `https://${(user as any).portalSlug}.tpcportal.co`
                            : window.location.origin;
                          window.open(portalUrl, '_blank');
                        }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Include in emails</span>
                    <Switch
                      checked={includePortalLinks}
                      onCheckedChange={(checked) => {
                        setIncludePortalLinks(checked);
                        updateProjectMutation.mutate({ includePortalLinks: checked });
                      }}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Source */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lead Source</label>
                <Select
                  value={project.leadSource || ''}
                  onValueChange={(value) => updateProjectMutation.mutate({ leadSource: value })}
                >
                  <SelectTrigger
                    className="mt-2 w-full bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    data-testid="select-lead-source"
                  >
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                    <SelectItem value="Client Referral">Client Referral</SelectItem>
                    <SelectItem value="Vendor Referral">Vendor Referral</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>

                {project.leadSource === 'Client Referral' && (
                  <Input
                    placeholder="Who's your referral?"
                    value={project.referralName || ''}
                    onChange={(e) => updateProjectMutation.mutate({ referralName: e.target.value })}
                    className="mt-2"
                    data-testid="input-referral-name"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={isAddingParticipant} onOpenChange={setIsAddingParticipant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Participant</DialogTitle>
            <DialogDescription>
              Add a participant to this project. They will receive automated emails.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="participant-email">Email Address</Label>
              <Input
                id="participant-email"
                type="email"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                placeholder="participant@example.com"
                data-testid="input-participant-email"
              />
            </div>
            <Button 
              onClick={() => addParticipantMutation.mutate(participantEmail)}
              disabled={!participantEmail || addParticipantMutation.isPending}
              data-testid="button-add-participant-submit"
            >
              Add Participant
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={attachSmartFileOpen} onOpenChange={setAttachSmartFileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Smart File</DialogTitle>
            <DialogDescription>
              Select a Smart File to attach to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedSmartFileId} onValueChange={setSelectedSmartFileId}>
              <SelectTrigger data-testid="select-smart-file">
                <SelectValue placeholder="Select Smart File" />
              </SelectTrigger>
              <SelectContent>
                {allSmartFiles?.map((sf) => (
                  <SelectItem key={sf.id} value={sf.id}>
                    {sf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => attachSmartFileMutation.mutate(selectedSmartFileId)}
              disabled={!selectedSmartFileId || attachSmartFileMutation.isPending}
              data-testid="button-attach-submit"
            >
              Attach
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sendFileDialogOpen} onOpenChange={(open) => {
        setSendFileDialogOpen(open);
        if (!open) {
          setSendFileTemplateId("");
          setTemplateExpirationDays("none");
          setTemplateExpirationMode("UNLESS_PAYMENT");
        }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Send Smart File</DialogTitle>
            <DialogDescription>
              Choose a Smart File template to send to the client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Choose Smart File</Label>

            {/* Grid of smart file cards - 4 columns */}
            {allSmartFiles && allSmartFiles.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto">
                {allSmartFiles.map((sf) => (
                  <button
                    key={sf.id}
                    type="button"
                    onClick={() => setSendFileTemplateId(sf.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50",
                      sendFileTemplateId === sf.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-muted bg-card hover:bg-muted/50"
                    )}
                    data-testid={`smart-file-card-${sf.id}`}
                  >
                    <FileText className="w-8 h-8 mb-2 text-primary/70" />
                    <p className="font-medium text-sm truncate">{sf.name}</p>
                    {sf.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {sf.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No Smart Files yet</p>
                <p className="text-sm">Create a Smart File template first</p>
              </div>
            )}

            {/* Expiration Settings */}
            <div className="space-y-3 pt-2 border-t">
              <Label>Proposal Expiration</Label>
              <Select value={templateExpirationDays} onValueChange={setTemplateExpirationDays}>
                <SelectTrigger>
                  <SelectValue placeholder="Select expiration..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No expiration</SelectItem>
                  <SelectItem value="1">24 hours</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days (Recommended)</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set a deadline to encourage clients to respond promptly
              </p>
            </div>

            {/* Expiration Condition - only show if expiration is set */}
            {templateExpirationDays !== "none" && (
              <div className="space-y-3">
                <Label>Expiration Condition</Label>
                <Select value={templateExpirationMode} onValueChange={setTemplateExpirationMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNLESS_PAYMENT">Unless payment is made</SelectItem>
                    <SelectItem value="UNLESS_SIGNED">Unless contract is signed</SelectItem>
                    <SelectItem value="UNLESS_BOOKING">Unless session is booked</SelectItem>
                    <SelectItem value="TIME_ONLY">Time only (expires regardless)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {templateExpirationMode === "UNLESS_PAYMENT" && "Proposal won't expire once any payment is received"}
                  {templateExpirationMode === "UNLESS_SIGNED" && "Proposal won't expire once the client signs the contract"}
                  {templateExpirationMode === "UNLESS_BOOKING" && "Proposal won't expire once a session is scheduled"}
                  {templateExpirationMode === "TIME_ONLY" && "Proposal expires on the set date regardless of client actions"}
                </p>
              </div>
            )}

            <Button
              onClick={() => sendFileFromTemplateMutation.mutate({
                templateId: sendFileTemplateId,
                expirationDays: templateExpirationDays !== "none" ? parseInt(templateExpirationDays) : undefined,
                expirationMode: templateExpirationDays !== "none" ? templateExpirationMode : undefined
              })}
              disabled={!sendFileTemplateId || sendFileFromTemplateMutation.isPending}
              className="w-full"
              data-testid="button-send-file-submit"
            >
              {sendFileFromTemplateMutation.isPending ? "Sending..." : "Send File"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              Send an email to the project contact{participants && participants.length > 0 ? ' and participants' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="message-subject">Subject</Label>
              <Input
                id="message-subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Email subject"
                data-testid="input-message-subject"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="message-body">Message</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAiModalType("email");
                    setShowAiModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7"
                  data-testid="button-edit-email-with-ai"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Write with AI
                </Button>
              </div>
              <Textarea
                id="message-body"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Email body"
                rows={8}
                data-testid="textarea-message-body"
              />
            </div>
            {participants && participants.length > 0 && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="send-to-participants"
                  checked={sendToParticipants}
                  onCheckedChange={setSendToParticipants}
                />
                <Label htmlFor="send-to-participants">
                  Also send to participants
                </Label>
              </div>
            )}
            <Button 
              onClick={() => {
                const recipients: string[] = [];
                const mainContact = getContactInfo(project);
                if (mainContact?.email) recipients.push(mainContact.email);
                if (sendToParticipants && participants) {
                  participants.forEach(p => {
                    if (p.client.email && !recipients.includes(p.client.email)) {
                      recipients.push(p.client.email);
                    }
                  });
                }
                sendEmailMutation.mutate({ subject: messageSubject, body: messageBody, recipients });
              }}
              disabled={!messageSubject || !messageBody || sendEmailMutation.isPending}
              data-testid="button-send-email"
            >
              Send Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMS Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send SMS</DialogTitle>
            <DialogDescription>
              Send an SMS message to {project?.contact?.firstName || project?.client?.firstName} {project?.contact?.lastName || project?.client?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="sms-body">Message</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAiModalType("sms");
                    setShowAiModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7"
                  data-testid="button-edit-sms-with-ai"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Write with AI
                </Button>
              </div>
              <Textarea
                id="sms-body"
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                placeholder="Type your message here..."
                rows={6}
                maxLength={1000}
                data-testid="textarea-sms-body"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {smsBody.length}/1000 characters
              </div>
            </div>
            <Button 
              onClick={() => {
                const mainContact = getContactInfo(project);
                const recipient = mainContact?.phone || '';
                if (!recipient) {
                  toast({
                    title: "No phone number",
                    description: "The contact doesn't have a phone number.",
                    variant: "destructive"
                  });
                  return;
                }
                sendSMSMutation.mutate({ body: smsBody, recipient });
              }}
              disabled={!smsBody || sendSMSMutation.isPending}
              className="w-full"
              data-testid="button-send-sms"
            >
              {sendSMSMutation.isPending ? "Sending..." : "Send SMS"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Meeting Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule a Meeting</DialogTitle>
            <DialogDescription>
              Schedule a meeting with {project?.contact?.firstName || project?.client?.firstName} {project?.contact?.lastName || project?.client?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="meeting-title">Meeting Title</Label>
              <Input
                id="meeting-title"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g., Initial Consultation"
                data-testid="input-meeting-title"
              />
            </div>
            
            <div>
              <Label htmlFor="meeting-date">Date</Label>
              <Input
                id="meeting-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                data-testid="input-meeting-date"
              />
            </div>

            <div>
              <Label htmlFor="meeting-time">Time</Label>
              <Input
                id="meeting-time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                data-testid="input-meeting-time"
              />
            </div>

            <div>
              <Label htmlFor="meeting-duration">Duration (minutes)</Label>
              <Select value={meetingDuration} onValueChange={setMeetingDuration}>
                <SelectTrigger id="meeting-duration" data-testid="select-meeting-duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => {
                if (!project || !selectedDate || !selectedTime || !meetingTitle) return;
                
                const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
                const endDateTime = new Date(startDateTime.getTime() + parseInt(meetingDuration) * 60000);
                
                createBookingMutation.mutate({
                  title: meetingTitle,
                  startAt: startDateTime.toISOString(),
                  endAt: endDateTime.toISOString(),
                  projectId: project.id,
                  clientId: project.contact?.id || project.client?.id || project.contactId || ''
                });
              }}
              disabled={!meetingTitle || !selectedDate || !selectedTime || createBookingMutation.isPending}
              className="w-full"
              data-testid="button-schedule-submit"
            >
              {createBookingMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!smartFileToSend} onOpenChange={(open) => {
        if (!open) {
          setSmartFileToSend(null);
          setSendExpirationDays("none");
          setSendExpirationMode("UNLESS_PAYMENT");
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Smart File to Client</DialogTitle>
            <DialogDescription>
              This will send "{smartFileToSend?.smartFileName}" to the client via email. They will receive a link to view and interact with the Smart File.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Expiration Settings */}
            <div className="space-y-3">
              <Label>Proposal Expiration</Label>
              <Select value={sendExpirationDays} onValueChange={setSendExpirationDays}>
                <SelectTrigger>
                  <SelectValue placeholder="Select expiration..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No expiration</SelectItem>
                  <SelectItem value="1">24 hours</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days (Recommended)</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set a deadline to encourage clients to respond promptly
              </p>
            </div>

            {/* Expiration Condition - only show if expiration is set */}
            {sendExpirationDays !== "none" && (
              <div className="space-y-3">
                <Label>Expiration Condition</Label>
                <Select value={sendExpirationMode} onValueChange={setSendExpirationMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNLESS_PAYMENT">Unless payment is made</SelectItem>
                    <SelectItem value="UNLESS_SIGNED">Unless contract is signed</SelectItem>
                    <SelectItem value="UNLESS_BOOKING">Unless session is booked</SelectItem>
                    <SelectItem value="TIME_ONLY">Time only (expires regardless)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {sendExpirationMode === "UNLESS_PAYMENT" && "Proposal won't expire once any payment is received"}
                  {sendExpirationMode === "UNLESS_SIGNED" && "Proposal won't expire once the client signs the contract"}
                  {sendExpirationMode === "UNLESS_BOOKING" && "Proposal won't expire once a session is scheduled"}
                  {sendExpirationMode === "TIME_ONLY" && "Proposal expires on the set date regardless of client actions"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSmartFileToSend(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (smartFileToSend) {
                  sendSmartFileMutation.mutate({
                    projectSmartFileId: smartFileToSend.id,
                    expirationDays: sendExpirationDays !== "none" ? parseInt(sendExpirationDays) : undefined,
                    expirationMode: sendExpirationDays !== "none" ? sendExpirationMode : undefined
                  });
                }
              }}
              disabled={sendSmartFileMutation.isPending}
              data-testid="button-confirm-send"
            >
              {sendSmartFileMutation.isPending ? "Sending..." : "Send Proposal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Expiration Dialog */}
      <Dialog open={!!smartFileToExtend} onOpenChange={(open) => {
        if (!open) {
          setSmartFileToExtend(null);
          setExtendExpirationDays("14");
        }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Extend Expiration</DialogTitle>
            <DialogDescription>
              Extend the expiration for "{smartFileToExtend?.smartFileName}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {smartFileToExtend?.expiresAt && (
              <div className="text-sm text-muted-foreground">
                Currently expires: {new Date(smartFileToExtend.expiresAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            )}
            <div className="space-y-3">
              <Label>Extend by</Label>
              <Select value={extendExpirationDays} onValueChange={setExtendExpirationDays}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">24 hours</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                New expiration will be {extendExpirationDays} days from now
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSmartFileToExtend(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (smartFileToExtend) {
                  extendExpirationMutation.mutate({
                    projectSmartFileId: smartFileToExtend.id,
                    expirationDays: parseInt(extendExpirationDays)
                  });
                }
              }}
              disabled={extendExpirationMutation.isPending}
            >
              {extendExpirationMutation.isPending ? "Extending..." : "Extend Expiration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pendingSmartFileToSend && (
        <PhotographerSignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          projectId={project.id}
          projectSmartFileId={pendingSmartFileToSend.id}
          contractPage={contractPageToSign}
          projectData={{
            clientName: `${getContactInfo(project)?.firstName || ''} ${getContactInfo(project)?.lastName || ''}`,
            photographerName: user?.photographerName || '',
            projectTitle: project.title,
            projectType: project.projectType,
            eventDate: project.eventDate || null,
            selectedPackages: '',
            selectedAddOns: '',
            totalAmount: '',
            depositAmount: '',
            depositPercent: ''
          }}
          onSignatureComplete={() => {
            if (pendingSmartFileToSend) {
              sendSmartFileMutation.mutate({
                projectSmartFileId: pendingSmartFileToSend.id,
                expirationDays: sendExpirationDays !== "none" ? parseInt(sendExpirationDays) : undefined,
                expirationMode: sendExpirationDays !== "none" ? sendExpirationMode : undefined
              });
            }
            setSignatureDialogOpen(false);
            setContractPageToSign(null);
            setPendingSmartFileToSend(null);
          }}
        />
      )}

      {/* Link Insertion Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-insert-link">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>
              Add a hyperlink to your email message.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="link-text">Link Text</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Click here"
                data-testid="input-link-text"
              />
            </div>
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                data-testid="input-link-url"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowLinkDialog(false);
                setLinkText("");
                setLinkUrl("");
              }}
              data-testid="button-cancel-link"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (linkUrl && linkText) {
                  const linkMarkdown = `[${linkText}](${linkUrl})`;
                  setMessageBody(messageBody + linkMarkdown);
                  setShowLinkDialog(false);
                  setLinkText("");
                  setLinkUrl("");
                }
              }}
              disabled={!linkUrl || !linkText}
              className="bg-black text-white hover:bg-black/90"
              data-testid="button-insert-link-confirm"
            >
              Insert Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Conversational Assistant (Email & SMS) */}
      <Dialog 
        open={showAiModal} 
        onOpenChange={(open) => {
          setShowAiModal(open);
          if (!open) {
            // Reset on close
            setConversationHistory([]);
            setAiIsReady(false);
            setGeneratedContent(null);
            setAiPrompt("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px] h-[600px] flex flex-col" data-testid="dialog-ai-writer">
          <DialogHeader>
            <DialogTitle>AI Assistant - {aiModalType === 'email' ? 'Email' : 'SMS'} Draft</DialogTitle>
            <DialogDescription>
              Tell me what you want to say, and I'll ask questions if I need more details.
            </DialogDescription>
          </DialogHeader>

          {/* Portal Links Toggle - Only for emails */}
          {aiModalType === 'email' && (
            <div className="flex items-center justify-between px-1 py-2 bg-blue-50 rounded-md border border-blue-200">
              <div className="flex flex-col gap-1">
                <Label htmlFor="portal-links-toggle" className="text-sm font-medium">
                  Include portal links
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically add a magic link for clients to access their project
                </p>
              </div>
              <Switch
                id="portal-links-toggle"
                checked={includePortalLinks}
                onCheckedChange={(checked) => {
                  setIncludePortalLinks(checked);
                  updateProjectMutation.mutate({ includePortalLinks: checked });
                }}
                data-testid="switch-portal-links"
              />
            </div>
          )}
          
          {/* Chat conversation area */}
          <div className="flex-1 overflow-y-auto space-y-3 py-4 px-1">
            {conversationHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div className="space-y-2">
                  <Sparkles className="w-12 h-12 mx-auto text-blue-500" />
                  <p className="text-sm">Start a conversation with AI</p>
                  <p className="text-xs">Tell me what you want to communicate to your client</p>
                </div>
              </div>
            ) : (
              conversationHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-testid={`chat-message-${msg.role}-${idx}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            
            {/* Show generated content preview if ready */}
            {aiIsReady && generatedContent && (
              <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50" data-testid="generated-content-preview">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Draft Ready!</span>
                </div>
                {aiModalType === 'email' && generatedContent.subject && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-600">Subject:</span>
                    <p className="text-sm font-semibold">{generatedContent.subject}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs font-medium text-gray-600">Message:</span>
                  <p className="text-sm whitespace-pre-wrap">{generatedContent.body}</p>
                </div>
              </div>
            )}
            
            {conversationalAIMutation.isPending && (
              <div className="flex justify-start" data-testid="ai-typing-indicator">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendAIMessage();
                  }
                }}
                placeholder={
                  conversationHistory.length === 0
                    ? aiModalType === "email"
                      ? "E.g., Tell them their gallery is ready to view"
                      : "E.g., Confirm meeting tomorrow at 2pm"
                    : "Type your response..."
                }
                disabled={conversationalAIMutation.isPending || aiIsReady}
                className="flex-1"
                maxLength={500}
                data-testid="input-ai-chat"
              />
              <Button
                onClick={handleSendAIMessage}
                disabled={!aiPrompt.trim() || conversationalAIMutation.isPending || aiIsReady}
                className="bg-blue-600 text-white hover:bg-blue-700"
                data-testid="button-send-ai-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {aiPrompt.length}/500
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAiModal(false);
                    setConversationHistory([]);
                    setAiIsReady(false);
                    setGeneratedContent(null);
                    setAiPrompt("");
                  }}
                  data-testid="button-cancel-ai"
                >
                  Cancel
                </Button>
                {aiIsReady && (
                  <Button
                    onClick={handleUseGeneratedContent}
                    className="bg-green-600 text-white hover:bg-green-700"
                    data-testid="button-use-draft"
                  >
                    Use This Draft
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
