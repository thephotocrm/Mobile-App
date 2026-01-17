import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ButtonRichTextEditor } from "@/components/ButtonRichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Zap, 
  Users, 
  Clock, 
  Mail, 
  MessageSquare, 
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Sparkles,
  Target,
  Send,
  Calendar,
  Play,
  Rocket,
  ChevronRight,
  Eye,
  AlertTriangle,
  Smartphone,
  Link2,
  Wand2,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Confetti from 'react-confetti';

// Available template variables for personalization (these map to backend variables)
const TEMPLATE_VARIABLES = [
  { key: 'first_name', label: 'Client First Name', example: 'Sarah' },
  { key: 'last_name', label: 'Client Last Name', example: 'Johnson' },
  { key: 'email', label: 'Client Email', example: 'sarah@email.com' },
  { key: 'phone', label: 'Client Phone', example: '(555) 123-4567' },
  { key: 'photographer_name', label: 'Your Name', example: 'Your Studio' },
  { key: 'event_date', label: 'Event Date', example: 'June 15, 2026' },
];

// Button destination options for the Add Button modal
const BUTTON_DESTINATIONS = [
  { key: 'CALENDAR', label: 'Booking Calendar', description: 'Your booking/scheduling page' },
  { key: 'SMART_FILE', label: 'View Proposal', description: 'Client\'s proposal or invoice' },
  { key: 'GALLERY', label: 'View Gallery', description: 'Client\'s photo gallery' },
  { key: 'TESTIMONIALS', label: 'Leave Review', description: 'Review/testimonial submission page' },
  { key: 'CUSTOM', label: 'Custom URL', description: 'Enter your own link' },
];

// Regex to parse button markers: [[BUTTON:LINKTYPE:ButtonText]] or [[BUTTON:CUSTOM:ButtonText:url]]
const BUTTON_MARKER_REGEX = /\[\[BUTTON:([A-Z_]+):([^\]]+?)(?::([^\]]+))?\]\]/g;

type WizardStep = 'welcome' | 'trigger' | 'action' | 'configure' | 'review';

type TriggerMode = 'STAGE' | 'BUSINESS' | 'TIME';
type Channel = 'EMAIL' | 'SMS';

interface Stage {
  id: string;
  name: string;
}

interface WizardFormData {
  name: string;
  triggerMode: TriggerMode;
  triggerStageId: string | null;
  triggerEvent: string | null;
  stageCondition: string | null; // For business triggers: which stage to limit the trigger to
  channel: Channel;
  enableCommunication: boolean;
  enablePipeline: boolean;
  moveToStageId: string | null;
  templateSubject: string;
  templateBody: string;
  delayDays: number;
  delayHours: number;
  delayMinutes: number;
  timingMode: 'immediate' | 'delayed' | null;
  daysBefore: number;
  triggerTiming: 'BEFORE' | 'AFTER';
  includeHeader: boolean;
  includeFooter: boolean;
}

// Helper to parse button markers from text content
const parseButtonMarkers = (text: string): Array<{
  fullMatch: string;
  linkType: string;
  buttonText: string;
  customUrl?: string;
  startIndex: number;
  endIndex: number;
}> => {
  const buttons: Array<{
    fullMatch: string;
    linkType: string;
    buttonText: string;
    customUrl?: string;
    startIndex: number;
    endIndex: number;
  }> = [];
  let match;
  const regex = new RegExp(BUTTON_MARKER_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    buttons.push({
      fullMatch: match[0],
      linkType: match[1],
      buttonText: match[2],
      customUrl: match[3],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  return buttons;
};

interface AutomationWizardProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WizardFormData) => void;
  isPending: boolean;
  stages: Stage[];
  projectTypeName: string;
  automationCount?: number; // For first-automation confirmation checkbox (undefined = loading)
  isAutomationCountLoading?: boolean; // True while automation count is loading
  onOpenAiBuilder?: () => void; // Opens AI automation builder
}

const TRIGGER_OPTIONS = [
  { 
    id: 'STAGE', 
    label: 'Stage Entry', 
    description: 'When a client enters a pipeline stage',
    example: 'e.g., Client fills out inquiry form and becomes a new lead',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  { 
    id: 'BUSINESS', 
    label: 'Business Event', 
    description: 'When a specific action happens',
    example: 'e.g., Client makes a payment or signs a contract',
    icon: Zap,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30'
  },
  { 
    id: 'TIME', 
    label: 'Date-Based', 
    description: 'Before or after an event date',
    example: 'e.g., 3 days before their wedding day',
    icon: Calendar,
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30'
  },
];

const ACTION_OPTIONS = [
  { 
    id: 'EMAIL', 
    label: 'Send Email', 
    description: 'Automatically send an email to your client',
    icon: Mail,
    color: 'from-blue-500 to-cyan-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  { 
    id: 'SMS', 
    label: 'Send SMS', 
    description: 'Send a text message to their phone',
    icon: MessageSquare,
    color: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  { 
    id: 'PIPELINE', 
    label: 'Move in Pipeline', 
    description: 'Automatically move to another stage',
    icon: ArrowRight,
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30'
  },
];

const BUSINESS_EVENTS = [
  { value: 'ANY_PAYMENT_MADE', label: 'Any Payment Made', emoji: '💰' },
  { value: 'DEPOSIT_PAID', label: 'Deposit Payment Received', emoji: '💳' },
  { value: 'FULL_PAYMENT_MADE', label: 'Full Payment Completed', emoji: '✅' },
  { value: 'PROJECT_BOOKED', label: 'Project Booked/Contract Signed', emoji: '📋' },
  { value: 'SMART_FILE_ACCEPTED', label: 'Smart File Accepted', emoji: '📄' },
  { value: 'SMART_FILE_SENT', label: 'Smart File Sent', emoji: '📤' },
  { value: 'EVENT_DATE_REACHED', label: 'Event Date Reached', emoji: '📅' },
  { value: 'PROJECT_DELIVERED', label: 'Project Delivered', emoji: '📦' },
  { value: 'CLIENT_ONBOARDED', label: 'Client Onboarded', emoji: '🎯' },
  { value: 'APPOINTMENT_BOOKED', label: 'Appointment Booked', emoji: '📅' },
  { value: 'GALLERY_SHARED', label: 'Gallery Shared', emoji: '🖼️' },
];

export default function AutomationWizard({
  open,
  onClose,
  onSubmit,
  isPending,
  stages,
  projectTypeName,
  automationCount,
  isAutomationCountLoading = true, // Default to true (loading) so confirmation checkbox never appears if not explicitly passed
  onOpenAiBuilder
}: AutomationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [cachedAutoName, setCachedAutoName] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmAutoSend, setConfirmAutoSend] = useState(false);
  
  // AI Help Me Write state
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  
  // Fetch photographer data for branded preview
  const { data: photographer } = useQuery<{
    businessName?: string;
    photographerName?: string;
    logoUrl?: string;
    brandPrimary?: string;
    brandSecondary?: string;
    phone?: string;
    email?: string;
    website?: string;
    businessAddress?: string;
  }>({
    queryKey: ['/api/photographers/me'],
  });
  
  // Refs for inserting variables at cursor position
  const emailBodyRef = useRef<HTMLDivElement>(null);
  const smsBodyRef = useRef<HTMLTextAreaElement>(null);
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  
  // Helper function to insert variable at cursor position
  const insertVariable = (variableKey: string, field: 'subject' | 'body') => {
    const variable = `{{${variableKey}}}`;
    
    if (formData.channel === 'EMAIL' && field === 'subject') {
      const input = emailSubjectRef.current;
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const newValue = formData.templateSubject.substring(0, start) + variable + formData.templateSubject.substring(end);
        setFormData({ ...formData, templateSubject: newValue });
        // Restore cursor position after state update
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      }
    } else if (formData.channel === 'EMAIL' && field === 'body') {
      // For email body with rich editor, use the insertText method exposed by ButtonRichTextEditor
      const editorContainer = emailBodyRef.current;
      if (editorContainer) {
        // The actual editor is the first child with contenteditable
        const editor = editorContainer.querySelector('[contenteditable="true"]') as HTMLDivElement & { insertText?: (text: string) => void };
        if (editor?.insertText) {
          editor.insertText(variable);
        } else {
          // Fallback: focus and use execCommand
          editor?.focus();
          document.execCommand('insertText', false, variable);
        }
      } else {
        // Fallback: append to end
        setFormData({ ...formData, templateBody: formData.templateBody + variable });
      }
    } else if (formData.channel === 'SMS') {
      const textarea = smsBodyRef.current;
      if (textarea) {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const newValue = formData.templateBody.substring(0, start) + variable + formData.templateBody.substring(end);
        setFormData({ ...formData, templateBody: newValue });
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      }
    }
  };
  
  // Helper to replace variables with example values for preview (used for subject line and SMS)
  const getPreviewContent = (content: string) => {
    let preview = content;
    TEMPLATE_VARIABLES.forEach(v => {
      preview = preview.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), v.example);
    });
    // For text preview, strip button markers and just show button text in brackets
    preview = preview.replace(/\[\[BUTTON:[A-Z_]+:([^\]]+?)(?::[^\]]+)?\]\]/g, '[$1]');
    return preview;
  };
  
  // Helper to render email preview with variable replacements AND button rendering
  const renderEmailBodyPreview = (content: string) => {
    // Replace text variables with example values
    let processedContent = content;
    TEMPLATE_VARIABLES.forEach(v => {
      processedContent = processedContent.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), v.example);
    });
    
    // Parse button markers and split content into segments
    const buttons = parseButtonMarkers(processedContent);
    
    if (buttons.length === 0) {
      return <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{processedContent || '(No message body)'}</p>;
    }
    
    // Build segments: text and buttons interleaved
    const segments: Array<{ type: 'text' | 'button'; content: string; linkType?: string }> = [];
    let lastIndex = 0;
    
    buttons.forEach((btn) => {
      // Add text before this button
      if (btn.startIndex > lastIndex) {
        segments.push({
          type: 'text',
          content: processedContent.substring(lastIndex, btn.startIndex),
        });
      }
      // Add the button
      segments.push({
        type: 'button',
        content: btn.buttonText,
        linkType: btn.linkType,
      });
      lastIndex = btn.endIndex;
    });
    
    // Add remaining text after last button
    if (lastIndex < processedContent.length) {
      segments.push({
        type: 'text',
        content: processedContent.substring(lastIndex),
      });
    }
    
    return (
      <div className="text-gray-800 dark:text-gray-200">
        {segments.map((seg, idx) => {
          if (seg.type === 'text') {
            return <span key={idx} className="whitespace-pre-wrap">{seg.content}</span>;
          }
          // Render button inline
          return (
            <span
              key={idx}
              className="inline-block mx-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-lg"
            >
              {seg.content}
            </span>
          );
        })}
        {!processedContent && '(No message body)'}
      </div>
    );
  };
  
  // Check if this is user's first automation (only true when loaded and count is 0)
  // Don't show confirmation checkbox while loading to avoid flash
  const isFirstAutomation = !isAutomationCountLoading && automationCount === 0;
  
  // Reset confirmAutoSend when automationCount transitions to > 0
  useEffect(() => {
    if (automationCount !== undefined && automationCount > 0) {
      setConfirmAutoSend(false);
    }
  }, [automationCount]);

  // Skip welcome screen for users with existing automations
  useEffect(() => {
    if (!isAutomationCountLoading && automationCount !== undefined && automationCount > 0 && currentStep === 'welcome') {
      setCurrentStep('trigger');
    }
  }, [automationCount, isAutomationCountLoading, currentStep]);

  // Form state
  const [formData, setFormData] = useState<WizardFormData>({
    name: '',
    triggerMode: 'STAGE',
    triggerStageId: null,
    triggerEvent: null,
    stageCondition: null,
    channel: 'EMAIL',
    enableCommunication: true,
    enablePipeline: false,
    moveToStageId: null,
    templateSubject: '',
    templateBody: '',
    delayDays: 0,
    delayHours: 0,
    delayMinutes: 0,
    timingMode: null,
    daysBefore: 7,
    triggerTiming: 'BEFORE',
    includeHeader: false,
    includeFooter: true,
  });
  
  // State for button popover
  const [showButtonPopover, setShowButtonPopover] = useState(false);
  const [buttonText, setButtonText] = useState('');
  const [buttonDestination, setButtonDestination] = useState('CALENDAR');
  const [buttonCustomUrl, setButtonCustomUrl] = useState('');
  const [buttonUrlError, setButtonUrlError] = useState('');

  // URL validation helper - validates format and restricts to http/https
  const validateButtonUrl = (url: string): string => {
    if (!url.trim()) return '';
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return 'URL must use http or https protocol';
      }
      return '';
    } catch {
      return 'Please enter a valid URL (e.g., https://example.com)';
    }
  };

  // Window size for confetti
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onClose]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep('welcome');
      setFormData({
        name: '',
        triggerMode: 'STAGE',
        triggerStageId: null,
        triggerEvent: null,
        stageCondition: null,
        channel: 'EMAIL',
        enableCommunication: true,
        enablePipeline: false,
        moveToStageId: null,
        templateSubject: '',
        templateBody: '',
        delayDays: 0,
        delayHours: 0,
        delayMinutes: 0,
        timingMode: null,
        daysBefore: 7,
        triggerTiming: 'BEFORE',
        includeHeader: false,
        includeFooter: true,
      });
      setCachedAutoName(null);
      setConfirmAutoSend(false);
      setShowPreview(false);
      setShowButtonPopover(false);
      setButtonText('');
      setButtonDestination('CALENDAR');
      setButtonCustomUrl('');
    }
  }, [open]);

  // Auto-generate name based on selections
  const autoGeneratedName = useMemo(() => {
    const parts: string[] = [];
    
    // Trigger part
    if (formData.triggerMode === 'STAGE' && formData.triggerStageId) {
      const stage = stages.find(s => s.id === formData.triggerStageId);
      parts.push(stage?.name || 'Stage Entry');
    } else if (formData.triggerMode === 'BUSINESS' && formData.triggerEvent) {
      const event = BUSINESS_EVENTS.find(e => e.value === formData.triggerEvent);
      parts.push(event?.label || 'Business Event');
    } else if (formData.triggerMode === 'TIME') {
      parts.push(`${formData.daysBefore} Days ${formData.triggerTiming === 'BEFORE' ? 'Before' : 'After'} Event`);
    }
    
    // Action part
    if (formData.enableCommunication) {
      parts.push(`Send ${formData.channel}`);
    }
    if (formData.enablePipeline && formData.moveToStageId) {
      const stage = stages.find(s => s.id === formData.moveToStageId);
      parts.push(`Move to ${stage?.name || 'Stage'}`);
    }
    
    // Timing part
    if (formData.enableCommunication && formData.timingMode) {
      if (formData.timingMode === 'immediate') {
        parts.push('(Immediate)');
      } else if (formData.timingMode === 'delayed') {
        const timing: string[] = [];
        if (formData.delayDays > 0) timing.push(`${formData.delayDays}d`);
        if (formData.delayHours > 0) timing.push(`${formData.delayHours}h`);
        if (timing.length > 0) {
          parts.push(`(After ${timing.join(' ')})`);
        }
      }
    }
    
    return parts.join(' → ') || 'New Automation';
  }, [formData, stages]);

  // Cache the auto-name when entering review step if not already cached
  useEffect(() => {
    if (currentStep === 'review' && !cachedAutoName && !formData.name) {
      setCachedAutoName(autoGeneratedName);
    }
  }, [currentStep, cachedAutoName, formData.name, autoGeneratedName]);

  const displayName = formData.name || cachedAutoName || autoGeneratedName;

  // Get trigger description for breadcrumb
  const triggerBreadcrumb = useMemo(() => {
    if (formData.triggerMode === 'STAGE' && formData.triggerStageId) {
      const stage = stages.find(s => s.id === formData.triggerStageId);
      return `Stage Entry → ${stage?.name || 'Selected Stage'}`;
    }
    if (formData.triggerMode === 'BUSINESS' && formData.triggerEvent) {
      const event = BUSINESS_EVENTS.find(e => e.value === formData.triggerEvent);
      return `Business Event → ${event?.label || 'Selected Event'}`;
    }
    if (formData.triggerMode === 'TIME') {
      return `Date-Based → ${formData.daysBefore} days ${formData.triggerTiming.toLowerCase()} event`;
    }
    return null;
  }, [formData.triggerMode, formData.triggerStageId, formData.triggerEvent, formData.daysBefore, formData.triggerTiming, stages]);

  const steps: WizardStep[] = ['welcome', 'trigger', 'action', 'configure', 'review'];
  const stepIndex = steps.indexOf(currentStep);
  const progress = ((stepIndex) / (steps.length - 1)) * 100;

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'welcome':
        return true;
      case 'trigger':
        if (formData.triggerMode === 'STAGE') return !!formData.triggerStageId;
        if (formData.triggerMode === 'BUSINESS') return !!formData.triggerEvent;
        if (formData.triggerMode === 'TIME') return formData.daysBefore > 0;
        return false;
      case 'action':
        return formData.enableCommunication || formData.enablePipeline;
      case 'configure':
        // For STAGE/BUSINESS triggers with communication, require timing mode selection
        // TIME triggers don't need timing mode (timing is already defined by daysBefore)
        if (formData.enableCommunication && formData.triggerMode !== 'TIME' && !formData.timingMode) return false;
        if (formData.enablePipeline && !formData.moveToStageId) return false;
        // Require content for communication automations
        if (formData.enableCommunication) {
          if (formData.channel === 'SMS' && !formData.templateBody.trim()) return false;
          if (formData.channel === 'EMAIL' && (!formData.templateSubject.trim() || !formData.templateBody.trim())) return false;
        }
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const stepOrder: WizardStep[] = ['welcome', 'trigger', 'action', 'configure', 'review'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: WizardStep[] = ['welcome', 'trigger', 'action', 'configure', 'review'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleSubmit = () => {
    const finalData = {
      ...formData,
      name: displayName
    };
    onSubmit(finalData);
  };

  if (!open) return null;

  return (
    <>
      {showConfetti && windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
        />
      )}
      
      {/* Dark backdrop overlay */}
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-slate-950 dark:via-gray-900 dark:to-purple-950 overflow-hidden" data-testid="automation-wizard">
        {/* Close button */}
        <Button
          variant="ghost"
          size="lg"
          className="absolute top-4 right-4 z-10 hover:bg-white/80 dark:hover:bg-gray-800/80 w-14 h-14 rounded-full"
          onClick={onClose}
          data-testid="button-close-wizard"
        >
          <X className="h-10 w-10" />
        </Button>
        
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-100/40 to-pink-100/40 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-100/40 to-cyan-100/40 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-50/30 to-blue-50/30 dark:from-purple-900/10 dark:to-blue-900/10 rounded-full blur-3xl" />
        </div>

        {/* Progress bar */}
        {currentStep !== 'welcome' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800">
            <motion.div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        )}

        {/* Main content */}
        <div className="relative h-full flex items-center justify-center p-4 md:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Welcome Step */}
            {currentStep === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="text-center max-w-2xl mx-auto"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="mb-8"
                >
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/25">
                    <Zap className="w-12 h-12 text-white" />
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
                  data-testid="text-wizard-title"
                >
                  Let's Create an Automation
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="text-xl text-gray-600 dark:text-gray-300 mb-4 leading-relaxed"
                >
                  We'll guide you through setting up an automated workflow<br />
                  for your {projectTypeName.toLowerCase()} projects in just a few steps.
                </motion.p>
                
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.4 }}
                  className="text-sm text-gray-500 dark:text-gray-400 mb-8"
                >
                  Automations send messages and move clients automatically.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="flex flex-col items-center gap-4"
                >
                  <Button
                    size="lg"
                    onClick={handleNext}
                    className="px-8 py-6 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
                    data-testid="button-wizard-get-started"
                  >
                    Get Started
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="mt-12 flex justify-center gap-8 text-sm text-gray-500 dark:text-gray-400"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                      <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span>Trigger</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">
                      <Send className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                    </div>
                    <span>Action</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                      <Rocket className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span>Launch</span>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Trigger Step */}
            {currentStep === 'trigger' && (
              <motion.div
                key="trigger"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-3xl mx-auto"
              >
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 p-6 md:p-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                      <Target className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-trigger-title">When should this trigger?</h2>
                      <p className="text-gray-500 dark:text-gray-400">Choose what event will start this automation</p>
                    </div>
                  </div>

                  <div className="grid gap-4 mb-6">
                    {TRIGGER_OPTIONS.map((option) => (
                      <motion.button
                        key={option.id}
                        onClick={() => setFormData({ ...formData, triggerMode: option.id as TriggerMode })}
                        className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${
                          formData.triggerMode === option.id
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                        }`}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        data-testid={`button-trigger-${option.id.toLowerCase()}`}
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center shadow-md`}>
                          <option.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{option.label}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{option.description}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">{option.example}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          formData.triggerMode === option.id
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {formData.triggerMode === option.id && (
                            <div className="w-2.5 h-2.5 rounded-full bg-white" />
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {/* Stage selector */}
                  {formData.triggerMode === 'STAGE' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                    >
                      <Label className="text-sm font-medium">Which stage triggers this?</Label>
                      <Select 
                        value={formData.triggerStageId || ""} 
                        onValueChange={(value) => setFormData({ ...formData, triggerStageId: value })}
                      >
                        <SelectTrigger className="h-12" data-testid="select-wizard-trigger-stage">
                          <SelectValue placeholder="Select a stage..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">All Stages (Global trigger)</SelectItem>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}

                  {/* Business event selector */}
                  {formData.triggerMode === 'BUSINESS' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                    >
                      <Label className="text-sm font-medium">Which business event?</Label>
                      <Select 
                        value={formData.triggerEvent || ""} 
                        onValueChange={(value) => setFormData({ ...formData, triggerEvent: value })}
                      >
                        <SelectTrigger className="h-12" data-testid="select-wizard-trigger-event">
                          <SelectValue placeholder="Select an event..." />
                        </SelectTrigger>
                        <SelectContent>
                          {BUSINESS_EVENTS.map((event) => (
                            <SelectItem key={event.value} value={event.value}>
                              {event.emoji} {event.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}

                  {/* Stage condition for business triggers */}
                  {formData.triggerMode === 'BUSINESS' && formData.triggerEvent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800"
                    >
                      <Label className="text-sm font-medium">Only when in stage (optional)</Label>
                      <Select
                        value={formData.stageCondition || "all"}
                        onValueChange={(value) => setFormData({ ...formData, stageCondition: value === "all" ? null : value })}
                      >
                        <SelectTrigger className="h-12" data-testid="select-wizard-stage-condition">
                          <SelectValue placeholder="All Stages" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stages</SelectItem>
                          {stages?.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Optionally limit this automation to only fire when the client is in a specific stage
                      </p>
                    </motion.div>
                  )}

                  {/* Time-based selector */}
                  {formData.triggerMode === 'TIME' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label className="text-sm font-medium">Days</Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.daysBefore}
                            onChange={(e) => setFormData({ ...formData, daysBefore: parseInt(e.target.value) || 7 })}
                            className="h-12 mt-1"
                            data-testid="input-wizard-days"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-sm font-medium">Timing</Label>
                          <Select 
                            value={formData.triggerTiming} 
                            onValueChange={(value: 'BEFORE' | 'AFTER') => setFormData({ ...formData, triggerTiming: value })}
                          >
                            <SelectTrigger className="h-12 mt-1" data-testid="select-wizard-trigger-timing">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BEFORE">Before event</SelectItem>
                              <SelectItem value="AFTER">After event</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between mt-8 pt-6 border-t dark:border-gray-700">
                    <Button variant="outline" onClick={handleBack} data-testid="button-wizard-back">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      data-testid="button-wizard-next"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  {/* AI Helper prompt */}
                  {onOpenAiBuilder && (
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
                      Not sure where to start? Let our{' '}
                      <button
                        onClick={() => {
                          onClose();
                          onOpenAiBuilder();
                        }}
                        className="text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 underline underline-offset-2"
                      >
                        AI assistant
                      </button>
                      {' '}build it for you.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Action Step */}
            {currentStep === 'action' && (
              <motion.div
                key="action"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-3xl mx-auto"
              >
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 p-6 md:p-10">
                  {/* Persistent trigger breadcrumb */}
                  {triggerBreadcrumb && (
                    <div className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                      <Target className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">Trigger:</span>
                      <span>{triggerBreadcrumb}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
                      <Send className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-action-title">What should happen?</h2>
                      <p className="text-gray-500 dark:text-gray-400">Choose what action to take when triggered</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    {/* Email option */}
                    <motion.button
                      onClick={() => setFormData({ 
                        ...formData, 
                        enableCommunication: true,
                        enablePipeline: false,
                        channel: 'EMAIL'
                      })}
                      className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${
                        formData.enableCommunication && formData.channel === 'EMAIL' && !formData.enablePipeline
                          ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-700'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      data-testid="button-action-email"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
                        <Mail className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Send Email</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Automatically send an email to your client</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        formData.enableCommunication && formData.channel === 'EMAIL' && !formData.enablePipeline
                          ? 'border-pink-500 bg-pink-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {formData.enableCommunication && formData.channel === 'EMAIL' && !formData.enablePipeline && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        )}
                      </div>
                    </motion.button>

                    {/* SMS option */}
                    <motion.button
                      onClick={() => setFormData({ 
                        ...formData, 
                        enableCommunication: true,
                        enablePipeline: false,
                        channel: 'SMS'
                      })}
                      className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${
                        formData.enableCommunication && formData.channel === 'SMS' && !formData.enablePipeline
                          ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-700'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      data-testid="button-action-sms"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Send SMS</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Send a text message to their phone</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        formData.enableCommunication && formData.channel === 'SMS' && !formData.enablePipeline
                          ? 'border-pink-500 bg-pink-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {formData.enableCommunication && formData.channel === 'SMS' && !formData.enablePipeline && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        )}
                      </div>
                    </motion.button>

                    {/* Pipeline option */}
                    <motion.button
                      onClick={() => setFormData({ 
                        ...formData, 
                        enableCommunication: false,
                        enablePipeline: true
                      })}
                      className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${
                        formData.enablePipeline && !formData.enableCommunication
                          ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-700'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      data-testid="button-action-pipeline"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                        <ArrowRight className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Move in Pipeline</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Automatically move client to another stage</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        formData.enablePipeline && !formData.enableCommunication
                          ? 'border-pink-500 bg-pink-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {formData.enablePipeline && !formData.enableCommunication && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        )}
                      </div>
                    </motion.button>
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between mt-8 pt-6 border-t dark:border-gray-700">
                    <Button variant="outline" onClick={handleBack} data-testid="button-wizard-back">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      onClick={handleNext} 
                      disabled={!canProceed()}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      data-testid="button-wizard-next"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Configure Step */}
            {currentStep === 'configure' && (
              <motion.div
                key="configure"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-3xl mx-auto"
              >
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 p-6 md:p-10">
                  {/* Persistent trigger breadcrumb */}
                  {triggerBreadcrumb && (
                    <div className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                      <Target className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">Trigger:</span>
                      <span>{triggerBreadcrumb}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                      <Clock className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-configure-title">Configure the details</h2>
                      <p className="text-gray-500 dark:text-gray-400">Set up timing and content for your automation</p>
                    </div>
                  </div>

                  {/* Communication timing */}
                  {formData.enableCommunication && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Label className="text-base font-semibold">When should the message be sent?</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <motion.button
                            onClick={() => setFormData({ ...formData, timingMode: 'immediate', delayDays: 0, delayHours: 0, delayMinutes: 0 })}
                            className={`p-4 rounded-xl border-2 transition-all text-center ${
                              formData.timingMode === 'immediate'
                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            data-testid="button-timing-immediate"
                          >
                            <Zap className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Immediately</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Send right away</p>
                          </motion.button>
                          <motion.button
                            onClick={() => setFormData({ ...formData, timingMode: 'delayed' })}
                            className={`p-4 rounded-xl border-2 transition-all text-center ${
                              formData.timingMode === 'delayed'
                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            data-testid="button-timing-delayed"
                          >
                            <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">After Delay</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Wait before sending</p>
                          </motion.button>
                        </div>
                      </div>

                      {formData.timingMode === 'delayed' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                        >
                          <div>
                            <Label className="text-sm font-medium">Days</Label>
                            <Input
                              type="number"
                              min="0"
                              value={formData.delayDays}
                              onChange={(e) => setFormData({ ...formData, delayDays: parseInt(e.target.value) || 0 })}
                              className="h-12 mt-1"
                              data-testid="input-wizard-delay-days"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Hours</Label>
                            <Input
                              type="number"
                              min="0"
                              max="23"
                              value={formData.delayHours}
                              onChange={(e) => setFormData({ ...formData, delayHours: parseInt(e.target.value) || 0 })}
                              className="h-12 mt-1"
                              data-testid="input-wizard-delay-hours"
                            />
                          </div>
                        </motion.div>
                      )}

                      {/* Message content fields */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold flex items-center gap-2">
                            {formData.channel === 'EMAIL' ? <Mail className="w-5 h-5 text-blue-500" /> : <MessageSquare className="w-5 h-5 text-green-500" />}
                            {formData.channel === 'EMAIL' ? 'Email Content' : 'SMS Message'}
                          </Label>
                          <div className="flex items-center gap-2">
                            {formData.channel === 'EMAIL' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAiHelper(true)}
                                className="text-xs bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30"
                                data-testid="button-help-me-write"
                              >
                                <Wand2 className="w-3 h-3 mr-1" />
                                Help Me Write
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowPreview(true)}
                              className="text-xs"
                              data-testid="button-preview-message"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Preview
                            </Button>
                          </div>
                        </div>
                        
                        {formData.channel === 'EMAIL' && (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Subject Line</Label>
                              <Input
                                ref={emailSubjectRef}
                                value={formData.templateSubject}
                                onChange={(e) => setFormData({ ...formData, templateSubject: e.target.value })}
                                placeholder="e.g., Thanks for your inquiry!"
                                className="h-12 mt-1"
                                data-testid="input-wizard-email-subject"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Message Body</Label>
                              <div className="mt-1" ref={emailBodyRef}>
                                <ButtonRichTextEditor
                                  value={formData.templateBody}
                                  onChange={(value) => setFormData({ ...formData, templateBody: value })}
                                  placeholder="Hi {{first_name}},

Thank you for reaching out! I'm excited to learn more about your special day..."
                                  minHeight="120px"
                                  data-testid="input-wizard-email-body"
                                />
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                Click a variable below to insert it. If a value is missing, it will be left blank.
                              </p>
                              {/* Clickable variable chips for email body */}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {TEMPLATE_VARIABLES.map((v) => (
                                  <button
                                    key={v.key}
                                    type="button"
                                    onClick={() => insertVariable(v.key, 'body')}
                                    className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                    data-testid={`button-insert-var-${v.key}`}
                                  >
                                    {v.label}
                                  </button>
                                ))}
                              </div>
                              {/* Add a Button chip - opens modal to insert button at cursor */}
                              <div className="mt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setButtonText('');
                                    setButtonDestination('CALENDAR');
                                    setButtonCustomUrl('');
                                    setShowButtonPopover(true);
                                  }}
                                  className="px-3 py-1.5 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1.5 font-medium"
                                  data-testid="button-add-link"
                                >
                                  <Link2 className="w-3 h-3" />
                                  Add a Button
                                </button>
                              </div>
                              
                              {/* Header/Footer toggles */}
                              <div className="flex items-center gap-6 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={formData.includeHeader}
                                    onCheckedChange={(checked) => setFormData({ ...formData, includeHeader: !!checked })}
                                    data-testid="checkbox-include-header"
                                  />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">Include Header</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={formData.includeFooter}
                                    onCheckedChange={(checked) => setFormData({ ...formData, includeFooter: !!checked })}
                                    data-testid="checkbox-include-footer"
                                  />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">Include Footer</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {formData.channel === 'SMS' && (
                          <div>
                            {/* SMS Warning */}
                            <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-amber-700 dark:text-amber-300">
                                SMS messages are sent immediately and cannot be recalled.
                              </p>
                            </div>
                            <Textarea
                              ref={smsBodyRef}
                              value={formData.templateBody}
                              onChange={(e) => setFormData({ ...formData, templateBody: e.target.value })}
                              placeholder="Hi {{first_name}}, thank you for reaching out! I'll be in touch soon to discuss your special day. - Your Photographer"
                              className="min-h-[100px] resize-none"
                              maxLength={160}
                              data-testid="input-wizard-sms-body"
                            />
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-gray-400">
                                If a value is missing, it will be left blank.
                              </p>
                              <p className={`text-xs font-medium ${formData.templateBody.length > 140 ? 'text-amber-500' : 'text-gray-400'}`}>
                                {formData.templateBody.length}/160
                              </p>
                            </div>
                            {/* Clickable variable chips for SMS */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {TEMPLATE_VARIABLES.map((v) => (
                                <button
                                  key={v.key}
                                  type="button"
                                  onClick={() => insertVariable(v.key, 'body')}
                                  className="px-2 py-1 text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-md hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                                  data-testid={`button-insert-var-sms-${v.key}`}
                                >
                                  {v.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pipeline configuration */}
                  {formData.enablePipeline && (
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Move to which stage?</Label>
                      <Select 
                        value={formData.moveToStageId || ""} 
                        onValueChange={(value) => setFormData({ ...formData, moveToStageId: value })}
                      >
                        <SelectTrigger className="h-12" data-testid="select-wizard-move-stage">
                          <SelectValue placeholder="Select destination stage..." />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between mt-8 pt-6 border-t dark:border-gray-700">
                    <Button variant="outline" onClick={handleBack} data-testid="button-wizard-back">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      onClick={handleNext} 
                      disabled={!canProceed()}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      data-testid="button-wizard-next"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Review Step */}
            {currentStep === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-3xl mx-auto"
              >
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 p-6 md:p-10">
                  {/* Persistent trigger breadcrumb */}
                  {triggerBreadcrumb && (
                    <div className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                      <Target className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">Trigger:</span>
                      <span>{triggerBreadcrumb}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                      <Rocket className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-review-title">Ready to launch!</h2>
                      <p className="text-gray-500 dark:text-gray-400">Review your automation and give it a name</p>
                    </div>
                  </div>

                  {/* Editable name */}
                  <div className="space-y-3 mb-6">
                    <Label className="text-base font-semibold">Automation Name</Label>
                    <Input
                      value={formData.name || cachedAutoName || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={autoGeneratedName}
                      className="h-12 text-lg font-medium"
                      data-testid="input-wizard-name"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      We've suggested a name based on your choices, but feel free to change it
                    </p>
                  </div>

                  {/* Summary card */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 space-y-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      Automation Summary
                    </h3>
                    
                    <div className="space-y-3">
                      {/* Trigger */}
                      <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                          <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Trigger</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formData.triggerMode === 'STAGE' && (
                              <>When client enters: {stages.find(s => s.id === formData.triggerStageId)?.name || 'Any Stage'}</>
                            )}
                            {formData.triggerMode === 'BUSINESS' && (
                              <>{BUSINESS_EVENTS.find(e => e.value === formData.triggerEvent)?.emoji} {BUSINESS_EVENTS.find(e => e.value === formData.triggerEvent)?.label}</>
                            )}
                            {formData.triggerMode === 'TIME' && (
                              <>{formData.daysBefore} days {formData.triggerTiming.toLowerCase()} event</>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">
                          {formData.enableCommunication ? (
                            formData.channel === 'EMAIL' ? (
                              <Mail className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                            ) : (
                              <MessageSquare className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                            )
                          ) : (
                            <ArrowRight className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Action</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formData.enableCommunication && `Send ${formData.channel}`}
                            {formData.enablePipeline && `Move to: ${stages.find(s => s.id === formData.moveToStageId)?.name}`}
                          </p>
                        </div>
                      </div>

                      {/* Timing (for communication) */}
                      {formData.enableCommunication && (
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Timing</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formData.timingMode === 'immediate' ? 'Immediately' : 
                                `After ${formData.delayDays > 0 ? `${formData.delayDays} day${formData.delayDays > 1 ? 's' : ''}` : ''}${formData.delayDays > 0 && formData.delayHours > 0 ? ', ' : ''}${formData.delayHours > 0 ? `${formData.delayHours} hour${formData.delayHours > 1 ? 's' : ''}` : ''}`.trim() || 'Immediately'
                              }
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Repeat behavior clarification */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Play className="w-4 h-4 text-blue-500" />
                        {formData.triggerMode === 'STAGE' && (
                          <>Runs every time a client enters the <span className="font-medium">{stages.find(s => s.id === formData.triggerStageId)?.name || 'selected'}</span> stage</>
                        )}
                        {formData.triggerMode === 'BUSINESS' && (
                          <>Runs once each time this event occurs</>
                        )}
                        {formData.triggerMode === 'TIME' && (
                          <>Runs once per client, {formData.daysBefore} days {formData.triggerTiming.toLowerCase()} their event</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* First automation confirmation checkbox */}
                  {isFirstAutomation && formData.enableCommunication && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={confirmAutoSend}
                          onCheckedChange={(checked) => setConfirmAutoSend(checked === true)}
                          className="mt-0.5"
                          data-testid="checkbox-confirm-auto-send"
                        />
                        <div>
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            I understand this will send messages automatically
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            When triggered, this automation will send {formData.channel === 'EMAIL' ? 'emails' : 'text messages'} to your clients without further confirmation.
                          </p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between mt-8 pt-6 border-t dark:border-gray-700">
                    <Button variant="outline" onClick={handleBack} data-testid="button-wizard-back">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        onClick={handleSubmit}
                        disabled={isPending || (isFirstAutomation && !isAutomationCountLoading && formData.enableCommunication && !confirmAutoSend)}
                        className="px-8 py-6 text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25"
                        data-testid="button-wizard-launch"
                      >
                        {isPending ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Rocket className="w-5 h-5 mr-2" />
                            Launch Automation
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Preview Modal */}
      {/* Add Button Modal */}
      <Dialog open={showButtonPopover} onOpenChange={setShowButtonPopover}>
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
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="e.g., Book Your Call"
                className="mt-1"
                data-testid="input-button-text"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Link Destination</Label>
              <Select value={buttonDestination} onValueChange={setButtonDestination}>
                <SelectTrigger className="mt-1" data-testid="select-button-destination">
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {BUTTON_DESTINATIONS.find(d => d.key === buttonDestination)?.description}
              </p>
            </div>
            
            {buttonDestination === 'CUSTOM' && (
              <div>
                <Label className="text-sm font-medium">URL</Label>
                <Input
                  value={buttonCustomUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setButtonCustomUrl(url);
                    setButtonUrlError(validateButtonUrl(url));
                  }}
                  placeholder="https://example.com"
                  className={`mt-1 ${buttonUrlError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  data-testid="input-button-custom-url"
                />
                {buttonUrlError && (
                  <p className="text-xs text-red-500 mt-1">{buttonUrlError}</p>
                )}
              </div>
            )}
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowButtonPopover(false);
                  setButtonText('');
                  setButtonDestination('CALENDAR');
                  setButtonCustomUrl('');
                  setButtonUrlError('');
                }}
                data-testid="button-cancel-insert"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (buttonText.trim() && (buttonDestination !== 'CUSTOM' || (buttonCustomUrl.trim() && !buttonUrlError))) {
                    // Get the rich text editor and call its insertButton method
                    const editorContainer = emailBodyRef.current;
                    if (editorContainer) {
                      // Find the contentEditable div inside the container
                      const editor = editorContainer.querySelector('[contenteditable="true"]') as HTMLElement;
                      if (editor && (editor as any).insertButton) {
                        (editor as any).insertButton(
                          buttonDestination,
                          buttonText.trim(),
                          buttonDestination === 'CUSTOM' ? buttonCustomUrl.trim() : undefined
                        );
                      } else {
                        // Fallback: append marker to templateBody
                        const marker = buttonDestination === 'CUSTOM'
                          ? `[[BUTTON:CUSTOM:${buttonText.trim()}:${buttonCustomUrl.trim()}]]`
                          : `[[BUTTON:${buttonDestination}:${buttonText.trim()}]]`;
                        setFormData({ ...formData, templateBody: formData.templateBody + marker });
                      }
                    }

                    setShowButtonPopover(false);
                    setButtonText('');
                    setButtonDestination('CALENDAR');
                    setButtonCustomUrl('');
                    setButtonUrlError('');
                  }
                }}
                disabled={!buttonText.trim() || (buttonDestination === 'CUSTOM' && (!buttonCustomUrl.trim() || !!buttonUrlError))}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-confirm-insert"
              >
                Insert Button
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formData.channel === 'EMAIL' ? (
                <>
                  <Mail className="w-5 h-5 text-blue-500" />
                  Email Preview
                </>
              ) : (
                <>
                  <Smartphone className="w-5 h-5 text-green-500" />
                  SMS Preview
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {formData.channel === 'EMAIL' ? (
              <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                {/* Email branding header - uses photographer's actual branding */}
                {formData.includeHeader && (
                  <div 
                    className="p-4 text-center"
                    style={{ 
                      background: photographer?.brandPrimary 
                        ? `linear-gradient(135deg, ${photographer.brandPrimary} 0%, ${photographer.brandSecondary || photographer.brandPrimary} 100%)`
                        : 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)'
                    }}
                  >
                    {photographer?.logoUrl ? (
                      <img 
                        src={photographer.logoUrl} 
                        alt={photographer.businessName || 'Logo'} 
                        className="h-12 mx-auto mb-2 object-contain"
                      />
                    ) : (
                      <div className="w-12 h-12 mx-auto bg-white/20 rounded-lg flex items-center justify-center mb-2">
                        <span className="text-white text-xl font-bold">
                          {(photographer?.businessName || 'YS').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <p className="text-white text-sm font-medium">
                      {photographer?.businessName || 'Your Studio'}
                    </p>
                  </div>
                )}
                {/* Email subject line */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400 w-16">Subject:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getPreviewContent(formData.templateSubject) || '(No subject)'}
                    </span>
                  </div>
                </div>
                {/* Email body - buttons are now rendered inline */}
                <div className="p-4 bg-white dark:bg-gray-900 min-h-[200px]">
                  {renderEmailBodyPreview(formData.templateBody)}
                </div>
                {/* Email footer - uses photographer's actual info */}
                {formData.includeFooter && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {photographer?.businessName || 'Your Studio Photography'}<br />
                      {photographer?.businessAddress || '123 Main Street, City, State 12345'}<br />
                      {photographer?.website && (
                        <span style={{ color: photographer?.brandPrimary || '#9333ea' }}>
                          {photographer.website.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                      {!photographer?.website && (
                        <span className="text-purple-500">yourwebsite.com</span>
                      )}
                    </p>
                    {(photographer?.phone || photographer?.email) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {photographer?.phone && <span>{photographer.phone}</span>}
                        {photographer?.phone && photographer?.email && <span> • </span>}
                        {photographer?.email && <span>{photographer.email}</span>}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // iPhone-style SMS preview
              <div className="bg-gray-100 dark:bg-gray-800 rounded-[2rem] p-3 max-w-[280px] mx-auto">
                {/* Phone notch area */}
                <div className="h-6 bg-black rounded-t-[1.5rem] flex items-center justify-center mb-1">
                  <div className="w-16 h-4 bg-gray-800 rounded-full" />
                </div>
                {/* Message area */}
                <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-4 min-h-[200px]">
                  <div className="flex justify-end mb-2">
                    <div className="bg-green-500 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[90%]">
                      <p className="text-sm whitespace-pre-wrap">
                        {getPreviewContent(formData.templateBody) || '(No message)'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-center text-gray-400 mt-4">Delivered</p>
                </div>
                {/* Home indicator */}
                <div className="h-6 flex items-center justify-center">
                  <div className="w-24 h-1 bg-gray-400 dark:bg-gray-600 rounded-full" />
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Variables like {"{{first_name}}"} are shown with sample values. Actual values will be filled from client data.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Help Me Write Dialog */}
      <Dialog open={showAiHelper} onOpenChange={setShowAiHelper}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-500" />
              Help Me Write
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Describe what you want your email to say, and AI will write a professional email with personalization variables and buttons.
            </p>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">What should this email do?</Label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., Welcome new inquiry and encourage them to schedule a consultation call"
                className="min-h-[100px] resize-none"
                data-testid="input-ai-prompt"
              />
              <p className="text-xs text-gray-400">
                Examples: "Thank client for booking and share next steps", "Follow up after consultation", "Remind about upcoming event"
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <p className="text-xs text-purple-700 dark:text-purple-300">
                <Sparkles className="w-3 h-3 inline mr-1" />
                AI will use personalization like {"{{first_name}}"} and can include action buttons
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAiHelper(false);
                setAiPrompt('');
              }}
              disabled={isGenerating}
              data-testid="button-cancel-ai"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!aiPrompt.trim()) return;
                
                setIsGenerating(true);
                try {
                  // Build context from current form state
                  const context: Record<string, string> = {};
                  
                  if (formData.triggerMode === 'STAGE' && formData.triggerStageId) {
                    const selectedStage = stages?.find(s => s.id === formData.triggerStageId);
                    if (selectedStage) {
                      context.stageName = selectedStage.name;
                    }
                  }
                  
                  if (formData.triggerMode === 'BUSINESS' && formData.triggerEvent) {
                    context.triggerType = formData.triggerEvent;
                  }

                  if (projectTypeName) {
                    context.projectType = projectTypeName;
                  }

                  // Build timing description
                  if (formData.timingMode === 'immediate') {
                    context.timing = 'Immediately after trigger';
                  } else if (formData.delayDays > 0 || formData.delayHours > 0) {
                    const parts = [];
                    if (formData.delayDays > 0) parts.push(`${formData.delayDays} day(s)`);
                    if (formData.delayHours > 0) parts.push(`${formData.delayHours} hour(s)`);
                    context.timing = `${parts.join(' and ')} after trigger`;
                  }
                  
                  const response = await fetch('/api/automations/generate-email-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      prompt: aiPrompt,
                      context
                    })
                  });
                  
                  if (!response.ok) {
                    throw new Error('Failed to generate content');
                  }
                  
                  const result = await response.json();
                  
                  // Check if AI actually generated content
                  if (!result.subject && !result.body) {
                    throw new Error('AI did not generate any content');
                  }
                  
                  // Update form with generated content
                  setFormData({
                    ...formData,
                    templateSubject: result.subject || formData.templateSubject,
                    templateBody: result.body || formData.templateBody
                  });
                  
                  toast({
                    title: "Content generated!",
                    description: "Your email has been written. Feel free to edit it.",
                  });
                  
                  setShowAiHelper(false);
                  setAiPrompt('');
                } catch (error) {
                  console.error('AI generation error:', error);
                  toast({
                    title: "Generation failed",
                    description: "Could not generate email content. Please try again.",
                    variant: "destructive",
                  });
                } finally {
                  setIsGenerating(false);
                }
              }}
              disabled={!aiPrompt.trim() || isGenerating}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              data-testid="button-generate-ai"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Writing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Email
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
