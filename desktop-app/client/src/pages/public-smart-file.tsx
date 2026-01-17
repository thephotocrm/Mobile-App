import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import DOMPurify from "dompurify";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Camera,
  FileText,
  DollarSign,
  CheckCircle,
  Loader2,
  Plus,
  Minus,
  CreditCard,
  Package as PackageIcon,
  FileSignature,
  Calendar,
  Check,
  Clock,
  Lock,
  Building2,
  ArrowLeft,
  Printer,
  Mail,
  ChevronRight,
  Eye
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { EmbeddedPaymentForm } from "@/components/embedded-payment-form";
import { PaymentHistory } from "@/components/payment-history";
import { PaymentPlanCard } from "@/components/payment-plan-card";
import { SignaturePad, SignaturePadHandle } from "@/components/signature-pad";
import { ContractRenderer } from "@/components/contract-renderer";
import { parseContractVariables } from "@shared/contractVariables";
import { SchedulingCalendar } from "@/components/scheduling-calendar";
import { generateClientChoiceSchedule, getAllowedInstallmentCounts, PaymentInstallment } from "@shared/paymentScheduleUtils";
import { calculateInvoiceTotals, formatCentsAsDollars } from "@shared/invoiceCalculations";

type ImageContent = {
  url: string;
  borderRadius?: 'straight' | 'rounded';
  size?: 'small' | 'medium' | 'large';
};

interface SmartFilePage {
  id: string;
  pageType: "TEXT" | "PACKAGE" | "ADDON" | "CONTRACT" | "PAYMENT" | "INVOICE" | "PAY" | "FORM" | "SCHEDULING";
  pageOrder: number;
  displayTitle: string;
  content: any;
}

interface SmartFileData {
  projectSmartFile: {
    id: string;
    status: string;
    token: string;
    depositPercent?: number;
    selectedPackages?: any;
    selectedAddOns?: any;
    clientSignatureUrl?: string;
    photographerSignatureUrl?: string;
    clientSignedAt?: string;
    photographerSignedAt?: string;
    amountPaidCents?: number;
    balanceDueCents?: number;
    tipCents?: number;
    paidAt?: string;
    paymentSchedule?: any;
    paymentScheduleConfig?: any;
    contractTermsAccepted?: boolean;
    // Expiration fields
    expiresAt?: string;
    expirationMode?: string;
  };
  smartFile: {
    id: string;
    name: string;
    description?: string;
    defaultDepositPercent?: number;
    allowFullPayment?: boolean;
    pages: SmartFilePage[];
  };
  project: {
    id: string;
    title: string;
    projectType: string;
    eventDate?: string;
  };
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  photographer: {
    id: string;
    businessName: string;
    email?: string;
    phone?: string;
    businessAddress?: string;
  };
}

interface SelectedPackage {
  pageId: string;
  packageId: string;
  name: string;
  priceCents: number;
}

// Expired proposal response structure
interface ExpiredSmartFileData {
  expired: true;
  expiresAt: string;
  expirationMode?: string;
  photographerContact: {
    businessName: string;
    email?: string;
    phone?: string;
  };
}

interface SelectedAddOn {
  pageId: string;
  addOnId: string;
  name: string;
  priceCents: number;
  quantity: number;
}

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

// PAY page payment form component (must be inside Elements provider)
interface PaymentResult {
  transactionId: string;
  paymentMethod: { brand: string; last4: string } | null;
  amountPaid: number;
  balanceDue: number;
}

interface PayPageFormProps {
  amountCents: number;
  tipCents: number;
  token: string;
  paymentType: 'DEPOSIT' | 'BALANCE';
  onSuccess: (result: PaymentResult) => void;
  onError: (message: string) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
  autopayEnabled: boolean;
}

function PayPageForm({
  amountCents,
  tipCents,
  token,
  paymentType,
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
  autopayEnabled
}: PayPageFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Validate tip amount is non-negative
    if (tipCents < 0) {
      onError('Invalid tip amount');
      return;
    }

    setIsProcessing(true);
    onError(''); // Clear any previous errors

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required'
      });

      if (error) {
        onError(error.message || 'Payment failed');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        const confirmResponse = await fetch(`/api/public/smart-files/${token}/confirm-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            paymentType,
            tipCents
          })
        });

        if (!confirmResponse.ok) {
          throw new Error('Failed to confirm payment');
        }

        const result = await confirmResponse.json();

        // Enable autopay if selected
        if (autopayEnabled) {
          await fetch(`/api/public/smart-files/${token}/toggle-autopay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: true })
          });
        }

        onSuccess({
          transactionId: result.transactionId,
          paymentMethod: result.paymentMethod,
          amountPaid: result.amountPaid,
          balanceDue: result.balanceDue
        });
      }
    } catch (err: any) {
      onError(err.message || 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs'
        }}
      />
      <Button
        type="submit"
        className="w-full h-12 text-base font-semibold"
        disabled={!stripe || !elements || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay ${formatCentsAsDollars(amountCents + tipCents)}`
        )}
      </Button>
    </form>
  );
}

export default function PublicSmartFile() {
  const [, params] = useRoute("/smart-file/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Detect preview mode from query parameter
  const isPreviewMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('preview') === 'true';
  }, []);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedPackages, setSelectedPackages] = useState<Map<string, SelectedPackage>>(new Map());
  const [selectedAddOns, setSelectedAddOns] = useState<Map<string, SelectedAddOn>>(new Map());
  const [selectionsRehydrated, setSelectionsRehydrated] = useState(false);
  const [showClientSignaturePad, setShowClientSignaturePad] = useState(false);
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<'DEPOSIT' | 'FULL' | null>(null);
  const [selectedInstallments, setSelectedInstallments] = useState<number | null>(null);
  const [formAnswers, setFormAnswers] = useState<Map<string, any>>(new Map());
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<{ date: Date; time: string } | null>(null);
  const [selectionsNeedResigning, setSelectionsNeedResigning] = useState(false);
  const [installmentPaymentData, setInstallmentPaymentData] = useState<{
    installment: PaymentInstallment;
    clientSecret: string;
  } | null>(null);
  const hasAutoAcceptedRef = useRef(false);
  const contractRendererRef = useRef<HTMLDivElement>(null);
  const signaturePadRef = useRef<SignaturePadHandle>(null);

  // PAY page state
  const [selectedTip, setSelectedTip] = useState<number | 'custom' | null>(null);
  const [customTipAmount, setCustomTipAmount] = useState<string>('');
  const [payPageAutopayEnabled, setPayPageAutopayEnabled] = useState(false);
  const [payPageClientSecret, setPayPageClientSecret] = useState<string | null>(null);
  const [payPageIsProcessing, setPayPageIsProcessing] = useState(false);
  const [payPageError, setPayPageError] = useState<string | null>(null);
  const [payPageSuccess, setPayPageSuccess] = useState(false);
  const [payPageResult, setPayPageResult] = useState<PaymentResult | null>(null);
  const [payPageIsInitializing, setPayPageIsInitializing] = useState(false);
  const [payPageNeedsAcceptance, setPayPageNeedsAcceptance] = useState(false);
  const [pendingClientSignature, setPendingClientSignature] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [expiredData, setExpiredData] = useState<ExpiredSmartFileData | null>(null);

  // Track if we've initiated payment fetch for current PAY page session
  const paymentFetchInitiatedRef = useRef(false);

  // Reset payment fetch ref on component mount to handle returning via email link
  useEffect(() => {
    paymentFetchInitiatedRef.current = false;
  }, []);

  const { data, isLoading, error, refetch } = useQuery<SmartFileData>({
    queryKey: [`/api/public/smart-files/${params?.token}`],
    enabled: !!params?.token,
    // Override global cache settings for payment-critical data
    staleTime: 30000, // 30 seconds - ensure fresh data on return visits
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    queryFn: async () => {
      const response = await fetch(`/api/public/smart-files/${params?.token}`, {
        credentials: "include",
      });

      // Handle 410 Gone (expired) specially
      if (response.status === 410) {
        const expiredResponse = await response.json();
        setExpiredData(expiredResponse);
        throw new Error('EXPIRED');
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }

      return response.json();
    },
  });

  // Rehydrate selections from database when data loads
  useEffect(() => {
    if (!data || selectionsRehydrated) return;
    
    // Rehydrate selections from database if already accepted
    if (data.projectSmartFile.selectedPackages) {
      const pkgs = Array.isArray(data.projectSmartFile.selectedPackages) 
        ? data.projectSmartFile.selectedPackages 
        : JSON.parse(data.projectSmartFile.selectedPackages || '[]');
      
      // Populate packages Map
      const packagesMap = new Map<string, SelectedPackage>();
      pkgs.forEach((pkg: SelectedPackage) => {
        const key = `${pkg.pageId}-${pkg.packageId}`;
        packagesMap.set(key, pkg);
      });
      setSelectedPackages(packagesMap);
    }

    if (data.projectSmartFile.selectedAddOns) {
      const addOns = Array.isArray(data.projectSmartFile.selectedAddOns)
        ? data.projectSmartFile.selectedAddOns
        : JSON.parse(data.projectSmartFile.selectedAddOns || '[]');
      
      const addOnsMap = new Map<string, SelectedAddOn>();
      addOns.forEach((addOn: SelectedAddOn) => {
        const key = `${addOn.pageId}-${addOn.addOnId}`;
        addOnsMap.set(key, addOn);
      });
      setSelectedAddOns(addOnsMap);
    }

    // Rehydrate payment schedule selection if CLIENT_CHOICE mode was used
    // Require BOTH a valid saved schedule AND a valid selectedInstallments count
    const savedSchedule = data.projectSmartFile.paymentSchedule;
    const rawConfig = data.projectSmartFile.paymentScheduleConfig;
    
    // Parse config if it's stored as a string
    let savedConfig: any = null;
    if (rawConfig) {
      if (typeof rawConfig === 'string') {
        try {
          savedConfig = JSON.parse(rawConfig);
        } catch (e) {
          console.error('Failed to parse paymentScheduleConfig:', e);
        }
      } else {
        savedConfig = rawConfig;
      }
    }
    
    // Defensive checks: schedule must be a non-empty array with valid installments
    const hasValidSchedule = savedSchedule && 
        Array.isArray(savedSchedule) && 
        savedSchedule.length > 0 &&
        savedSchedule.every((inst: any) => 
          inst && typeof inst.amountCents === 'number' && inst.dueDate
        );
    
    // selectedInstallments must be a valid number >= 1
    const hasValidInstallmentCount = savedConfig?.selectedInstallments && 
        typeof savedConfig.selectedInstallments === 'number' &&
        savedConfig.selectedInstallments >= 1;
    
    // Only restore if both are valid and consistent
    if (hasValidSchedule && hasValidInstallmentCount &&
        savedSchedule.length === savedConfig.selectedInstallments) {
      setSelectedInstallments(savedConfig.selectedInstallments);
    }

    // Rehydrate contract terms acceptance if already saved
    if (data.projectSmartFile.contractTermsAccepted) {
      setAcceptedTerms(true);
    }

    setSelectionsRehydrated(true);
  }, [data, selectionsRehydrated]);

  // Sync payment schedule selection from server data when it changes
  // This runs separately from the initial rehydration to handle refetches
  useEffect(() => {
    if (!data || !selectionsRehydrated) return;
    
    const savedSchedule = data.projectSmartFile.paymentSchedule;
    const rawConfig = data.projectSmartFile.paymentScheduleConfig;
    
    // Parse config if it's stored as a string
    let savedConfig: any = null;
    if (rawConfig) {
      if (typeof rawConfig === 'string') {
        try {
          savedConfig = JSON.parse(rawConfig);
        } catch (e) {
          console.error('Failed to parse paymentScheduleConfig:', e);
        }
      } else {
        savedConfig = rawConfig;
      }
    }
    
    // If server has a valid saved schedule and selectedInstallments, sync local state
    const hasValidSchedule = savedSchedule && 
        Array.isArray(savedSchedule) && 
        savedSchedule.length > 0;
    
    const hasValidInstallmentCount = savedConfig?.selectedInstallments && 
        typeof savedConfig.selectedInstallments === 'number' &&
        savedConfig.selectedInstallments >= 1;
    
    // Sync if the server has a valid schedule that matches the config
    if (hasValidSchedule && hasValidInstallmentCount && 
        savedSchedule.length === savedConfig.selectedInstallments) {
      // Only update if different from current state to avoid infinite loops
      if (selectedInstallments !== savedConfig.selectedInstallments) {
        setSelectedInstallments(savedConfig.selectedInstallments);
      }
    }
  }, [data?.projectSmartFile?.paymentSchedule, data?.projectSmartFile?.paymentScheduleConfig, selectionsRehydrated]);

  // Reset payment option if schedule is invalid for CLIENT_CHOICE mode
  // This moves the validation out of render to avoid React state-during-render warnings
  useEffect(() => {
    if (!selectedPaymentOption || !selectedInstallments || selectedInstallments <= 1) return;

    const savedSchedule = data?.projectSmartFile?.paymentSchedule as PaymentInstallment[] | undefined;
    const hasValidSavedSchedule = savedSchedule &&
      Array.isArray(savedSchedule) &&
      savedSchedule.length === selectedInstallments &&
      typeof savedSchedule[0]?.amountCents === 'number';

    if (!hasValidSavedSchedule) {
      setSelectedPaymentOption(null);
      toast({
        title: "Payment schedule not ready",
        description: "Please select your payment plan again.",
        variant: "destructive"
      });
    }
  }, [selectedPaymentOption, selectedInstallments, data?.projectSmartFile?.paymentSchedule, toast]);

  // Fetch fresh package data to show latest name, description, and images
  const { data: freshPackages } = useQuery<any[]>({
    queryKey: [`/api/public/smart-files/${params?.token}/packages`],
    enabled: !!params?.token && !!data,
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Refetch when component mounts
  });

  // Fetch fresh add-on data to show latest name, description, and images
  const { data: freshAddOns } = useQuery<any[]>({
    queryKey: [`/api/public/smart-files/${params?.token}/add-ons`],
    enabled: !!params?.token && !!data,
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Refetch when component mounts
  });

  // Check if this Smart File already has a booking
  const { data: existingBookingData, isLoading: isLoadingBooking } = useQuery<{ booking: any; photographer: any } | null>({
    queryKey: [`/api/public/smart-files/${params?.token}/booking`],
    enabled: !!params?.token && !!data,
  });

  // Clamp currentPageIndex when pages change
  useEffect(() => {
    if (data && freshPackages && freshAddOns) {
      const mergedPages = getMergedPages();
      const sortedPages = [...mergedPages].sort((a, b) => a.pageOrder - b.pageOrder);
      if (sortedPages.length > 0 && currentPageIndex >= sortedPages.length) {
        setCurrentPageIndex(sortedPages.length - 1);
      }
    }
  }, [data, freshPackages, freshAddOns, currentPageIndex]);

  // Scroll to top when page index changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPageIndex]);

  // Log page navigation for debugging
  useEffect(() => {
    if (data && freshPackages && freshAddOns) {
      const mergedPages = getMergedPages();
      const sortedPages = [...mergedPages].sort((a, b) => a.pageOrder - b.pageOrder);
      const currentPage = sortedPages[currentPageIndex];
      console.log('📄 [PAGE NAVIGATION] Page changed to index:', currentPageIndex, 'pageType:', currentPage?.pageType);
      console.log('📄 [PAGE NAVIGATION] Total pages:', sortedPages.length, 'Page types:', sortedPages.map(p => p.pageType));
    }
  }, [currentPageIndex, data, freshPackages, freshAddOns]);

  // Clear payPageNeedsAcceptance when smart file is accepted
  useEffect(() => {
    if (data?.projectSmartFile.status === 'ACCEPTED' && payPageNeedsAcceptance) {
      console.log('💰 [PAYMENT INTENT] Smart file is now ACCEPTED - clearing payPageNeedsAcceptance flag');
      setPayPageNeedsAcceptance(false);
    }
  }, [data?.projectSmartFile.status, payPageNeedsAcceptance]);

  // Reset payment fetch ref when leaving PAY page
  useEffect(() => {
    if (!data || !freshPackages || !freshAddOns) return;

    const mergedPages = getMergedPages();
    const sortedPages = [...mergedPages].sort((a, b) => a.pageOrder - b.pageOrder);
    const currentPage = sortedPages[currentPageIndex];

    if (currentPage?.pageType !== 'PAY') {
      // Not on PAY page - reset for next time
      if (paymentFetchInitiatedRef.current) {
        console.log('💰 [PAYMENT INTENT] Left PAY page - resetting fetch flag');
        paymentFetchInitiatedRef.current = false;
      }
    }
  }, [currentPageIndex, data, freshPackages, freshAddOns]);

  // Helper function to merge fresh package and add-on data with page snapshots
  const getMergedPages = () => {
    if (!data || !freshPackages || !freshAddOns) return data?.smartFile.pages || [];
    
    return data.smartFile.pages.map(page => {
      // Handle PACKAGE pages
      if (page.pageType === 'PACKAGE') {
        // Check if we have snapshot packages or just packageIds
        if (page.content.packages) {
          // Merge fresh package data with snapshot packages
          const mergedPackages = page.content.packages.map((snapshotPkg: any) => {
            const freshPkg = freshPackages.find(fp => fp.id === snapshotPkg.id);
            
            if (!freshPkg) return snapshotPkg; // Package might have been deleted
            
            // Use fresh data for name, description, and image, but keep snapshot price
            return {
              ...snapshotPkg,
              name: freshPkg.name,
              description: freshPkg.description,
              imageUrl: freshPkg.imageUrl
            };
          });

          return {
            ...page,
            content: {
              ...page.content,
              packages: mergedPackages
            }
          };
        } else if (page.content.packageIds) {
          // Convert packageIds to full package objects from fresh data
          const packages = page.content.packageIds
            .map((id: string) => freshPackages.find((pkg: any) => pkg.id === id))
            .filter(Boolean) // Remove any undefined values if package was deleted
            .map((pkg: any) => ({
              id: pkg.id,
              name: pkg.name,
              description: pkg.description,
              imageUrl: pkg.imageUrl,
              priceCents: pkg.basePriceCents,
              features: [] // No features in base package data
            }));

          return {
            ...page,
            content: {
              ...page.content,
              packages
            }
          };
        }
      }

      // Handle ADDON pages - convert addOnIds to full add-on objects
      if (page.pageType === 'ADDON' && page.content.addOnIds) {
        const addOns = page.content.addOnIds
          .map((id: string) => freshAddOns.find((addon: any) => addon.id === id))
          .filter(Boolean); // Remove any undefined values if add-on was deleted

        return {
          ...page,
          content: {
            ...page.content,
            addOns
          }
        };
      }

      return page;
    });
  };

  const paymentPage = data?.smartFile.pages?.find((p: SmartFilePage) => p.pageType === 'PAYMENT');

  const acceptMutation = useMutation({
    mutationFn: async (acceptanceData: any) => {
      // Accept the Smart File - this saves selections but doesn't create checkout
      await apiRequest("PATCH", `/api/public/smart-files/${params?.token}/accept`, acceptanceData);
      return { accepted: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/smart-files/${params?.token}`] });

      // Clear payment error states to allow payment intent retry
      setPayPageError(null);
      setPayPageNeedsAcceptance(false);
      paymentFetchInitiatedRef.current = false;  // Reset ref to allow retry

      console.log('✅ [ACCEPT MUTATION] Success - cleared payment errors and reset fetch guard');

      // Only show toast if not auto-accepting (ref was set)
      if (!hasAutoAcceptedRef.current) {
        toast({
          title: "Proposal Accepted",
          description: "Your selections have been saved. Choose a payment option below.",
        });
      }
    },
    onError: (error: any) => {
      // Reset ref on error so user can manually retry
      hasAutoAcceptedRef.current = false;
      toast({
        title: "Error",
        description: error.message || "Failed to accept Smart File. Please try again.",
        variant: "destructive"
      });
    }
  });

  const resetSelectionsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/public/smart-files/${params?.token}/reset-selections`, {});
      return { reset: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/smart-files/${params?.token}`] });
      setSelectionsNeedResigning(true);
      toast({
        title: "Selections Reset",
        description: "You can now edit your selections. Please re-sign the contract when done.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset selections. Please try again.",
        variant: "destructive"
      });
    }
  });

  const saveSignatureMutation = useMutation({
    mutationFn: async (signatureData: { clientSignatureUrl: string; contractTermsAccepted: boolean }) => {
      // Capture the contract HTML at signature time for legal record
      const contractHtml = contractRendererRef.current?.innerHTML || '';

      await apiRequest("PATCH", `/api/public/smart-files/${params?.token}/sign`, {
        ...signatureData,
        contractHtml
      });
      return { signed: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/smart-files/${params?.token}`] });
      setShowClientSignaturePad(false);
      toast({
        title: "Signature Saved",
        description: "Your signature has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save signature. Please try again.",
        variant: "destructive"
      });
    }
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (paymentType: 'DEPOSIT' | 'FULL' | 'BALANCE') => {
      const response = await apiRequest("POST", `/api/public/smart-files/${params?.token}/create-checkout`, {
        paymentType
      });
      return response;
    },
    onSuccess: (response: any) => {
      if (response.checkoutUrl) {
        toast({
          title: "Redirecting to checkout",
          description: "Please complete your payment...",
        });
        window.location.href = response.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation to save the selected payment schedule for CLIENT_CHOICE mode
  const savePaymentScheduleMutation = useMutation({
    mutationFn: async (scheduleData: { paymentSchedule: PaymentInstallment[], selectedInstallments: number }) => {
      const response = await apiRequest("PATCH", `/api/public/smart-files/${params?.token}/payment-schedule`, scheduleData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/smart-files/${params?.token}`] });
    },
    onError: (error: any) => {
      console.error("Failed to save payment schedule:", error);
      toast({
        title: "Error",
        description: "Failed to save payment plan. Please try again.",
        variant: "destructive"
      });
    }
  });

  const submitFormMutation = useMutation({
    mutationFn: async (formData: { answers: Record<string, any> }) => {
      await apiRequest("PATCH", `/api/public/smart-files/${params?.token}/form-answers`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/smart-files/${params?.token}`] });
      toast({
        title: "Form Submitted",
        description: "Your responses have been saved successfully.",
      });
      // Move to next page after successful submission
      const mergedPages = getMergedPages();
      const sortedPages = [...mergedPages].sort((a, b) => a.pageOrder - b.pageOrder);
      if (currentPageIndex < sortedPages.length - 1) {
        setCurrentPageIndex(currentPageIndex + 1);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit form. Please try again.",
        variant: "destructive"
      });
    }
  });

  const bookingMutation = useMutation({
    mutationFn: async (bookingData: { date: Date; time: string; durationMinutes: number }) => {
      // Prevent booking if one already exists
      if (existingBookingData?.booking) {
        throw new Error("An appointment has already been booked for this Smart File");
      }
      
      const response = await apiRequest("POST", `/api/public/smart-files/${params?.token}/booking`, {
        date: bookingData.date.toISOString(),
        time: bookingData.time,
        durationMinutes: bookingData.durationMinutes
      });
      return response;
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/smart-files/${params?.token}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/public/smart-files/${params?.token}/booking`] });
      setBookingSuccess(true);
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Auto-accept proposal when on payment page if signed but not yet accepted
  useEffect(() => {
    // Skip auto-accept in preview mode - photographers should not trigger acceptance
    if (isPreviewMode) {
      console.log('✅ [AUTO-ACCEPT] Skipping in preview mode');
      return;
    }
    if (!data || hasAutoAcceptedRef.current || acceptMutation.isPending) return;

    const mergedPages = getMergedPages();
    const sortedPages = [...mergedPages].sort((a, b) => a.pageOrder - b.pageOrder);
    const currentPage = sortedPages[currentPageIndex];

    // Check if on payment page
    if (currentPage?.pageType !== 'PAY') return;

    console.log('✅ [AUTO-ACCEPT] On PAY page - checking if auto-accept should trigger');

    const isAccepted = ['ACCEPTED', 'DEPOSIT_PAID', 'PAID'].includes(data.projectSmartFile.status);
    const contractPage = sortedPages.find(p => p.pageType === 'CONTRACT');
    const requiresClientSignature = contractPage && contractPage.content.requireClientSignature !== false;
    const clientHasSigned = !!data.projectSmartFile.clientSignatureUrl;
    const canPay = !requiresClientSignature || clientHasSigned;

    console.log('✅ [AUTO-ACCEPT] Status check - isAccepted:', isAccepted, 'canPay:', canPay, 'requiresClientSignature:', requiresClientSignature, 'clientHasSigned:', clientHasSigned);

    // Check if packages are required (only if Smart File has PACKAGE pages)
    const hasPackagePages = sortedPages.some(p => p.pageType === 'PACKAGE');
    const hasRequiredSelections = !hasPackagePages || selectedPackages.size > 0;

    // Determine if this Smart File type requires acceptance
    // Invoice-only files (no contract, no packages) don't need acceptance - they can pay directly
    const hasContractPage = !!contractPage;
    const requiresAcceptance = hasContractPage || hasPackagePages;

    console.log('✅ [AUTO-ACCEPT] Selection check - hasPackagePages:', hasPackagePages, 'hasRequiredSelections:', hasRequiredSelections, 'requiresAcceptance:', requiresAcceptance);

    // Auto-accept if: requires acceptance, not accepted, can pay (signed if needed), and has required selections
    if (requiresAcceptance && !isAccepted && canPay && hasRequiredSelections) {
      console.log('✅ [AUTO-ACCEPT] 🎉 Triggering auto-accept!');
      hasAutoAcceptedRef.current = true;
      handleAccept();
    } else {
      console.log('✅ [AUTO-ACCEPT] ❌ Not triggering - conditions not met');
    }
  }, [data, currentPageIndex, selectedPackages, acceptMutation.isPending, isPreviewMode]);

  const { subtotal, depositAmount, total, depositPercent } = useMemo(() => {
    console.log('🔢 [TOTAL CALC] Starting total calculation');
    console.log('🔢 [TOTAL CALC] Data available:', !!data, 'freshPackages:', !!freshPackages, 'freshAddOns:', !!freshAddOns);
    let subtotalCents = 0;

    // Check if we have package/addon selections
    const hasPackageSelections = selectedPackages.size > 0 || selectedAddOns.size > 0;
    console.log('🔢 [TOTAL CALC] hasPackageSelections:', hasPackageSelections, 'selectedPackages:', selectedPackages.size, 'selectedAddOns:', selectedAddOns.size);

    if (hasPackageSelections) {
      // Proposal mode - sum packages and addons
      selectedPackages.forEach((pkg) => {
        subtotalCents += pkg.priceCents;
      });
      selectedAddOns.forEach((addOn) => {
        subtotalCents += addOn.priceCents * addOn.quantity;
      });
      console.log('🔢 [TOTAL CALC] Proposal mode - total from packages/addons:', subtotalCents);
    } else {
      // Invoice-only mode - calculate from invoice page line items using merged pages
      const mergedPages = getMergedPages();
      console.log('🔢 [TOTAL CALC] Invoice-only mode - mergedPages count:', mergedPages.length);
      const invoicePage = mergedPages.find((p: any) => p.pageType === 'INVOICE');
      console.log('🔢 [TOTAL CALC] Invoice page found:', !!invoicePage);
      if (invoicePage) {
        console.log('🔢 [TOTAL CALC] Invoice line items:', invoicePage.content?.lineItems?.length || 0);
        console.log('🔢 [TOTAL CALC] Invoice content:', invoicePage.content);
      }
      if (invoicePage?.content?.lineItems?.length > 0) {
        const invoiceTotals = calculateInvoiceTotals(
          invoicePage.content.lineItems,
          invoicePage.content.taxPercent || 0,
          invoicePage.content.discountAmount || 0,
          invoicePage.content.discountType || 'PERCENT'
        );
        subtotalCents = invoiceTotals.total;
        console.log('🔢 [TOTAL CALC] Calculated total from invoice:', subtotalCents);
      } else {
        console.log('🔢 [TOTAL CALC] ⚠️ No invoice page or line items found - total will be 0');
      }
    }

    // Get deposit percentage from the INVOICE or PAYMENT page content (where photographer sets it)
    // Fall back to template default, then to 50% as last resort
    const allMergedPages = getMergedPages();
    const invoicePageForDeposit = allMergedPages.find((p: any) => p.pageType === 'INVOICE');
    const paymentPageForDeposit = allMergedPages.find((p: any) => p.pageType === 'PAY' || p.pageType === 'PAYMENT');
    const depositPct = invoicePageForDeposit?.content?.depositPercent
      ?? paymentPageForDeposit?.content?.depositPercent
      ?? data?.smartFile.defaultDepositPercent
      ?? data?.projectSmartFile.depositPercent
      ?? 50;
    const depositCents = Math.round(subtotalCents * (depositPct / 100));

    console.log('🔢 [TOTAL CALC] ✅ Final total:', subtotalCents, 'depositPercent:', depositPct);

    return {
      subtotal: subtotalCents,
      depositAmount: depositCents,
      total: subtotalCents,
      depositPercent: depositPct
    };
  }, [selectedPackages, selectedAddOns, data, freshPackages, freshAddOns]);

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };

  const handlePackageSelect = (page: SmartFilePage, pkg: any) => {
    const key = `${page.id}-${pkg.id}`;
    const newPackages = new Map(selectedPackages);
    
    if (newPackages.has(key)) {
      // Deselect if already selected
      newPackages.delete(key);
    } else {
      // Select the package
      newPackages.set(key, {
        pageId: page.id,
        packageId: pkg.id,
        name: pkg.name,
        priceCents: pkg.priceCents
      });
    }
    
    setSelectedPackages(newPackages);
  };

  const handleAddOnToggle = (page: SmartFilePage, addOn: any, checked: boolean) => {
    const key = `${page.id}-${addOn.id}`;
    const newAddOns = new Map(selectedAddOns);
    
    if (checked) {
      newAddOns.set(key, {
        pageId: page.id,
        addOnId: addOn.id,
        name: addOn.name,
        priceCents: addOn.priceCents,
        quantity: 1
      });
    } else {
      newAddOns.delete(key);
    }
    
    setSelectedAddOns(newAddOns);
  };

  const handleAddOnQuantityChange = (page: SmartFilePage, addOn: any, delta: number) => {
    const key = `${page.id}-${addOn.id}`;
    const newAddOns = new Map(selectedAddOns);
    const current = newAddOns.get(key);
    
    if (current) {
      const newQuantity = Math.max(1, Math.min(10, current.quantity + delta));
      newAddOns.set(key, { ...current, quantity: newQuantity });
      setSelectedAddOns(newAddOns);
    }
  };

  const handleFormFieldChange = (blockId: string, value: any) => {
    const newAnswers = new Map(formAnswers);
    newAnswers.set(blockId, value);
    setFormAnswers(newAnswers);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields before submitting
    const requiredFields: { id: string; label: string; fieldType: string }[] = [];
    currentPage.content?.sections?.forEach((section: any) => {
      section.blocks?.forEach((block: any) => {
        if (block.type === 'FORM_FIELD' && block.content?.required) {
          requiredFields.push({
            id: block.id,
            label: block.content.label || 'Untitled field',
            fieldType: block.content.fieldType
          });
        }
      });
    });

    for (const field of requiredFields) {
      const value = formAnswers.get(field.id);
      const isEmpty = !value ||
        (typeof value === 'string' && !value.trim()) ||
        (Array.isArray(value) && value.length === 0);

      if (isEmpty) {
        toast({
          title: "Required Field Missing",
          description: `Please fill in "${field.label}" before submitting.`,
          variant: "destructive"
        });
        return;
      }
    }

    // Convert Map to plain object for API
    const answersObject: Record<string, any> = {};
    formAnswers.forEach((value, key) => {
      answersObject[key] = value;
    });

    submitFormMutation.mutate({ answers: answersObject });
  };

  const handleAccept = () => {
    // Prevent duplicate submissions if already accepted
    if (isAccepted) {
      toast({
        title: "Already Accepted",
        description: "This Smart File has already been accepted.",
        variant: "default"
      });
      return;
    }

    // Only require package selection if Smart File contains PACKAGE pages
    const mergedPages = getMergedPages();
    const hasPackagePages = mergedPages.some(page => page.pageType === 'PACKAGE');
    
    if (hasPackagePages && selectedPackages.size === 0) {
      toast({
        title: "Package Required",
        description: "Please select at least one package before proceeding.",
        variant: "destructive"
      });
      return;
    }

    const selectedPackagesArray = Array.from(selectedPackages.values());
    const selectedAddOnsArray = Array.from(selectedAddOns.values());

    acceptMutation.mutate({
      selectedPackages: selectedPackagesArray,
      selectedAddOns: selectedAddOnsArray,
      subtotalCents: subtotal,
      totalCents: total,
      depositCents: depositAmount
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="loading-state">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Smart File...</p>
        </div>
      </div>
    );
  }

  // Show expired page if proposal has expired
  if (expiredData) {
    const expirationDate = new Date(expiredData.expiresAt);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="expired-state">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">This Proposal Has Expired</h2>
            <p className="text-muted-foreground mb-6">
              This proposal was valid until {expirationDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}.
            </p>

            <Separator className="my-6" />

            <p className="text-sm text-muted-foreground mb-4">
              Contact {expiredData.photographerContact.businessName} to request a new proposal.
            </p>

            <div className="space-y-2 text-sm">
              {expiredData.photographerContact.email && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <a
                    href={`mailto:${expiredData.photographerContact.email}`}
                    className="text-primary hover:underline"
                  >
                    {expiredData.photographerContact.email}
                  </a>
                </div>
              )}
              {expiredData.photographerContact.phone && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <a
                    href={`tel:${expiredData.photographerContact.phone}`}
                    className="text-primary hover:underline"
                  >
                    {expiredData.photographerContact.phone}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="error-state">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Smart File Not Found</h2>
            <p className="text-muted-foreground">
              This Smart File could not be found or may have expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mergedPages = getMergedPages();
  const sortedPages = [...mergedPages].sort((a, b) => a.pageOrder - b.pageOrder);
  const isAccepted = ['ACCEPTED', 'DEPOSIT_PAID', 'PAID'].includes(data.projectSmartFile.status);

  // Check for contract page and signature requirements
  const contractPage = sortedPages.find(p => p.pageType === 'CONTRACT');
  const hasContractPage = !!contractPage;
  const requiresClientSignature = hasContractPage && contractPage.content.requireClientSignature !== false;
  const clientHasSigned = !!data.projectSmartFile.clientSignatureUrl;
  const paymentPageIndex = sortedPages.findIndex(p => p.pageType === 'PAYMENT');
  
  // Client must sign contract before accessing payment
  const canAccessPayment = !requiresClientSignature || clientHasSigned;
  
  // Lock selections after accepting (when selections are saved to DB) to preserve contract integrity
  // This allows: select packages → sign contract → accept (saves selections) → pay
  const selectionsLocked = isAccepted;

  // Get current page for single-page view
  const currentPage = sortedPages[currentPageIndex];
  const pageIndex = currentPageIndex;

  return (
    <div className="min-h-screen bg-background">
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2 px-4 font-medium shadow-md">
          <Eye className="w-4 h-4 inline mr-2" />
          Preview Mode - Actions are disabled. This is how clients will see your Smart File.
        </div>
      )}

      {/* Expiration Banner - Show when proposal has expiration date and is not yet accepted */}
      {data.projectSmartFile.expiresAt && !isAccepted && (() => {
        const expiresAt = new Date(data.projectSmartFile.expiresAt);
        const now = new Date();
        const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        const isUrgent = daysRemaining <= 3;

        // Build message based on expiration mode
        let modeMessage = '';
        switch (data.projectSmartFile.expirationMode) {
          case 'UNLESS_PAYMENT':
            modeMessage = ' unless payment is made';
            break;
          case 'UNLESS_BOOKING':
            modeMessage = ' unless you schedule your session';
            break;
          case 'UNLESS_SIGNED':
            modeMessage = ' unless you accept and sign';
            break;
          default:
            modeMessage = '';
        }

        return (
          <div className={cn(
            "py-2 px-4 text-center text-sm font-medium",
            isUrgent
              ? "bg-red-500 text-white"
              : "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border-b border-amber-200 dark:border-amber-800"
          )}>
            <Clock className="w-4 h-4 inline mr-2" />
            {daysRemaining <= 0
              ? `This proposal expires today${modeMessage}`
              : daysRemaining === 1
                ? `This proposal expires tomorrow${modeMessage}`
                : `This proposal expires on ${expiresAt.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}${modeMessage} (${daysRemaining} days remaining)`
            }
          </div>
        );
      })()}

      {/* Header */}
      <header className={cn(
        "bg-card border-b border-border sticky z-10 shadow-sm",
        isPreviewMode ? "top-10" : "top-0"
      )} style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Camera className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold" data-testid="text-photographer-name">
                  {data.photographer.businessName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {data.project.projectType} Proposal - {data.project.title}
                </p>
              </div>
            </div>
            {sortedPages.length > 0 && (
              <div className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {pageIndex + 1}/{sortedPages.length}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section - Outside padded container for full width */}
      {sortedPages.length > 0 && currentPage.pageType === "TEXT" && currentPage.content.hero?.backgroundImage && (
        <div 
          className="relative w-full h-[400px] flex items-center justify-center bg-cover bg-center overflow-hidden"
          style={{ backgroundImage: `url(${currentPage.content.hero.backgroundImage})` }}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 text-center text-white px-6 max-w-3xl">
            {currentPage.content.hero.title && (
              <h1 className="text-5xl font-bold mb-4">{currentPage.content.hero.title}</h1>
            )}
            {currentPage.content.hero.description && (
              <p className="text-xl">{currentPage.content.hero.description}</p>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Re-signing Required Banner - Show when contract requires signature but client hasn't signed yet */}
          {requiresClientSignature && !clientHasSigned && data.projectSmartFile.selectedPackages && (
            <div className="mb-6">
              <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500 rounded-lg p-4" data-testid="banner-resigning-required">
                <div className="flex items-start gap-3">
                  <FileSignature className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100">Contract Signature Required</h3>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                      {selectionsNeedResigning 
                        ? "Your selections have been updated. Please review the contract and sign it again before proceeding with payment."
                        : "Please review and sign the contract to proceed with payment."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div>
            {sortedPages.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No pages available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div key={currentPage.id} data-testid={`page-${currentPage.pageType.toLowerCase()}-${pageIndex}`} className="relative">
                {/* TEXT Page */}
                {currentPage.pageType === "TEXT" && (
                  <>
                    
                    {/* Content - no Card wrapper if there's a hero */}
                    {currentPage.content.hero?.backgroundImage ? (
                      <div className="space-y-6">
                        {currentPage.content.sections && currentPage.content.sections.length > 0 ? (
                        // Sections-based rendering
                        currentPage.content.sections.map((section: any, secIdx: number) => (
                          <div key={secIdx}>
                            {section.columns === 1 ? (
                              <div className="space-y-4">
                                {section.blocks.map((block: any, blockIdx: number) => (
                                  <div key={blockIdx}>
                                    {block.type === 'HEADING' && block.content && (
                                      <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                    )}
                                    {block.type === 'TEXT' && block.content && (
                                      <div className="text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }} />
                                    )}
                                    {block.type === 'SPACER' && (
                                      <div className="py-6" />
                                    )}
                                    {block.type === 'IMAGE' && block.content && (() => {
                                      const imageData: ImageContent = typeof block.content === 'string' 
                                        ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                        : block.content;
                                      const isRounded = imageData.borderRadius === 'rounded';
                                      const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                        : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                        : 'h-[150px] w-[150px]';
                                      
                                      if (isRounded) {
                                        return (
                                          <div className={cn("rounded-full overflow-hidden border border-border mx-auto", sizeClass)}>
                                            <img 
                                              src={imageData.url} 
                                              alt="" 
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        );
                                      }
                                      
                                      const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                        : imageData.size === 'large' ? 'max-h-[300px]' 
                                        : 'max-h-[150px]';
                                      return (
                                        <div className="-mx-4 sm:-mx-6">
                                          <img 
                                            src={imageData.url} 
                                            alt="" 
                                            className={cn("w-full rounded-none object-cover", maxHeightClass)} 
                                          />
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4">
                                  {section.blocks.filter((b: any) => b.column === 0).map((block: any, blockIdx: number) => (
                                    <div key={blockIdx}>
                                      {block.type === 'HEADING' && block.content && (
                                        <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                      )}
                                      {block.type === 'TEXT' && block.content && (
                                        <div className="text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }} />
                                      )}
                                      {block.type === 'SPACER' && (
                                        <div className="py-6" />
                                      )}
                                      {block.type === 'IMAGE' && block.content && (() => {
                                        const imageData: ImageContent = typeof block.content === 'string' 
                                          ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                          : block.content;
                                        const isRounded = imageData.borderRadius === 'rounded';
                                        const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                          : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                          : 'h-[150px] w-[150px]';
                                        
                                        if (isRounded) {
                                          return (
                                            <div className={cn("rounded-full overflow-hidden border-4 border-border shadow-lg mx-auto", sizeClass)}>
                                              <img 
                                                src={imageData.url} 
                                                alt="" 
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                          );
                                        }
                                        
                                        const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                          : imageData.size === 'large' ? 'max-h-[300px]' 
                                          : 'max-h-[150px]';
                                        return (
                                          <div className="-mx-4 sm:-mx-6">
                                            <img 
                                              src={imageData.url} 
                                              alt="" 
                                              className={cn("w-full rounded-none object-cover", maxHeightClass)} 
                                            />
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  ))}
                                </div>
                                <div className="space-y-4">
                                  {section.blocks.filter((b: any) => b.column === 1).map((block: any, blockIdx: number) => (
                                    <div key={blockIdx}>
                                      {block.type === 'HEADING' && block.content && (
                                        <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                      )}
                                      {block.type === 'TEXT' && block.content && (
                                        <div className="text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }} />
                                      )}
                                      {block.type === 'SPACER' && (
                                        <div className="py-6" />
                                      )}
                                      {block.type === 'IMAGE' && block.content && (() => {
                                        const imageData: ImageContent = typeof block.content === 'string' 
                                          ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                          : block.content;
                                        const isRounded = imageData.borderRadius === 'rounded';
                                        const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                          : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                          : 'h-[150px] w-[150px]';
                                        
                                        if (isRounded) {
                                          return (
                                            <div className={cn("rounded-full overflow-hidden border-4 border-border shadow-lg mx-auto", sizeClass)}>
                                              <img 
                                                src={imageData.url} 
                                                alt="" 
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                          );
                                        }
                                        
                                        const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                          : imageData.size === 'large' ? 'max-h-[300px]' 
                                          : 'max-h-[150px]';
                                        return (
                                          <div className="-mx-4 sm:-mx-6">
                                            <img 
                                              src={imageData.url} 
                                              alt="" 
                                              className={cn("w-full rounded-none object-cover", maxHeightClass)} 
                                            />
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : currentPage.content.blocks && currentPage.content.blocks.length > 0 ? (
                        // Legacy blocks format
                        <div className="space-y-4">
                          {currentPage.content.blocks.map((block: any, blockIdx: number) => (
                            <div key={blockIdx}>
                              {block.type === 'HEADING' && block.content && (
                                <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                              )}
                              {block.type === 'TEXT' && block.content && (
                                <div className="text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }} />
                              )}
                              {block.type === 'SPACER' && (
                                <div className="py-6" />
                              )}
                              {block.type === 'IMAGE' && block.content && (
                                <img src={block.content} alt="" className="w-full max-h-[150px] object-contain rounded-lg" />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Legacy heading/content format
                        <p className="whitespace-pre-wrap text-muted-foreground" data-testid={`text-page-content-${pageIndex}`}>
                          {currentPage.content.content || currentPage.content.text}
                        </p>
                      )}
                      </div>
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle data-testid={`text-page-title-${pageIndex}`}>{currentPage.displayTitle}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {currentPage.content.sections && currentPage.content.sections.length > 0 ? (
                            // Sections-based rendering
                            currentPage.content.sections.map((section: any, secIdx: number) => (
                              <div key={secIdx}>
                                {section.columns === 1 ? (
                                  <div className="space-y-4">
                                    {section.blocks.map((block: any, blockIdx: number) => (
                                      <div key={blockIdx}>
                                        {block.type === 'HEADING' && block.content && (
                                          <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                        )}
                                        {block.type === 'TEXT' && block.content && (
                                          <div className="text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }} />
                                        )}
                                        {block.type === 'SPACER' && (
                                          <div className="py-6" />
                                        )}
                                        {block.type === 'IMAGE' && block.content && (() => {
                                          const imageData: ImageContent = typeof block.content === 'string' 
                                            ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                            : block.content;
                                          const isRounded = imageData.borderRadius === 'rounded';
                                          const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                            : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                            : 'h-[150px] w-[150px]';
                                          
                                          if (isRounded) {
                                            return (
                                              <div className={cn("rounded-full overflow-hidden border border-border mx-auto", sizeClass)}>
                                                <img 
                                                  src={imageData.url} 
                                                  alt="" 
                                                  className="w-full h-full object-cover"
                                                />
                                              </div>
                                            );
                                          }
                                          
                                          const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                            : imageData.size === 'large' ? 'max-h-[300px]' 
                                            : 'max-h-[150px]';
                                          return (
                                            <div className="-mx-4 sm:-mx-6">
                                              <img 
                                                src={imageData.url} 
                                                alt="" 
                                                className={cn("w-full rounded-none object-cover", maxHeightClass)} 
                                              />
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                      {section.blocks.filter((b: any) => b.column === 0).map((block: any, blockIdx: number) => (
                                        <div key={blockIdx}>
                                          {block.type === 'HEADING' && block.content && (
                                            <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                          )}
                                          {block.type === 'TEXT' && block.content && (
                                            <div className="text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }} />
                                          )}
                                          {block.type === 'SPACER' && (
                                            <div className="py-6" />
                                          )}
                                          {block.type === 'IMAGE' && block.content && (() => {
                                            const imageData: ImageContent = typeof block.content === 'string' 
                                              ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                              : block.content;
                                            const isRounded = imageData.borderRadius === 'rounded';
                                            const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                              : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                              : 'h-[150px] w-[150px]';
                                            
                                            if (isRounded) {
                                              return (
                                                <div className={cn("rounded-full overflow-hidden border-4 border-border shadow-lg mx-auto", sizeClass)}>
                                                  <img 
                                                    src={imageData.url} 
                                                    alt="" 
                                                    className="w-full h-full object-cover"
                                                  />
                                                </div>
                                              );
                                            }
                                            
                                            const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                              : imageData.size === 'large' ? 'max-h-[300px]' 
                                              : 'max-h-[150px]';
                                            return (
                                              <div className="-mx-4 sm:-mx-6">
                                                <img 
                                                  src={imageData.url} 
                                                  alt="" 
                                                  className={cn("w-full rounded-none object-cover", maxHeightClass)} 
                                                />
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="space-y-4">
                                      {section.blocks.filter((b: any) => b.column === 1).map((block: any, blockIdx: number) => (
                                        <div key={blockIdx}>
                                          {block.type === 'HEADING' && block.content && (
                                            <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                          )}
                                          {block.type === 'TEXT' && block.content && (
                                            <div className="text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }} />
                                          )}
                                          {block.type === 'SPACER' && (
                                            <div className="py-6" />
                                          )}
                                          {block.type === 'IMAGE' && block.content && (() => {
                                            const imageData: ImageContent = typeof block.content === 'string' 
                                              ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                              : block.content;
                                            const isRounded = imageData.borderRadius === 'rounded';
                                            const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                              : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                              : 'h-[150px] w-[150px]';
                                            
                                            if (isRounded) {
                                              return (
                                                <div className={cn("rounded-full overflow-hidden border-4 border-border shadow-lg mx-auto", sizeClass)}>
                                                  <img 
                                                    src={imageData.url} 
                                                    alt="" 
                                                    className="w-full h-full object-cover"
                                                  />
                                                </div>
                                              );
                                            }
                                            
                                            const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                              : imageData.size === 'large' ? 'max-h-[300px]' 
                                              : 'max-h-[150px]';
                                            return (
                                              <div className="-mx-4 sm:-mx-6">
                                                <img 
                                                  src={imageData.url} 
                                                  alt="" 
                                                  className={cn("w-full rounded-none object-cover", maxHeightClass)} 
                                                />
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : currentPage.content.blocks && currentPage.content.blocks.length > 0 ? (
                            // Legacy blocks format
                            <div className="space-y-4">
                              {currentPage.content.blocks.map((block: any, blockIdx: number) => (
                                <div key={blockIdx}>
                                  {block.type === 'HEADING' && block.content && (
                                    <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                  )}
                                  {block.type === 'TEXT' && block.content && (
                                    <div className="text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }} />
                                  )}
                                  {block.type === 'SPACER' && (
                                    <div className="py-6" />
                                  )}
                                  {block.type === 'IMAGE' && block.content && (
                                    <img src={block.content} alt="" className="w-full max-h-[150px] object-contain rounded-lg" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            // Legacy heading/content format
                            <p className="whitespace-pre-wrap text-muted-foreground" data-testid={`text-page-content-${pageIndex}`}>
                              {currentPage.content.content || currentPage.content.text}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {/* PACKAGE Page */}
                {currentPage.pageType === "PACKAGE" && (
                  <div className="space-y-6 px-4 md:px-0">
                    {currentPage.content.heading && (
                      <h3 className="text-4xl font-bold mb-4 text-center">{currentPage.content.heading}</h3>
                    )}
                    {currentPage.content.description && (
                      <p className="text-xl text-muted-foreground mb-6 leading-relaxed text-center">{currentPage.content.description}</p>
                    )}
                    {selectionsLocked && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                          <CheckCircle className="w-5 h-5" />
                          <p className="font-medium">Selections Locked - Contract Signed</p>
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                          Package selections are locked after signing the contract to preserve contract integrity.
                        </p>
                      </div>
                    )}
                    <div className="space-y-4">
                        {currentPage.content.packages?.map((pkg: any) => {
                          const key = `${currentPage.id}-${pkg.id}`;
                          const isSelected = selectedPackages.has(key);
                          
                          return (
                          <Card 
                            key={pkg.id} 
                            className={`overflow-hidden border-2 transition-all duration-300 max-w-[800px] mx-auto ${
                              isSelected
                                ? 'border-primary shadow-lg'
                                : 'hover:border-primary/40 hover:shadow-lg'
                            } ${selectionsLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                            data-testid={`card-package-${pkg.id}`}
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
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}
                                
                                {/* Content - Right Side */}
                                <div className="flex-1 flex flex-col min-w-0">
                                  {/* Package Title */}
                                  <h4 className="text-xl font-bold mb-4 break-words" data-testid={`text-package-name-${pkg.id}`}>
                                    {pkg.name}
                                  </h4>
                                  
                                  {/* Package Description */}
                                  {pkg.description && (
                                    <div className="mb-4">
                                      <p className="font-semibold text-sm mb-2">Includes:</p>
                                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                                        {pkg.description}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Package Features */}
                                  {pkg.features && pkg.features.length > 0 && (
                                    <ul className="space-y-2 mb-4">
                                      {pkg.features.map((feature: string, idx: number) => (
                                        <li key={idx} className="text-sm flex items-start gap-2">
                                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                          <span className="flex-1">{feature}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  
                                  {/* Price and Select Button */}
                                  <div className="mt-auto pt-4 border-t flex items-center justify-between gap-4">
                                    <div className="text-2xl font-bold text-primary" data-testid={`text-package-price-${pkg.id}`}>
                                      {formatPrice(pkg.priceCents)}
                                    </div>
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        !selectionsLocked && handlePackageSelect(currentPage, pkg);
                                      }}
                                      disabled={selectionsLocked}
                                      variant={isSelected ? "default" : "outline"}
                                      className={isSelected ? "bg-primary text-primary-foreground" : ""}
                                      data-testid={`button-select-package-${pkg.id}`}
                                    >
                                      {isSelected ? (
                                        <>
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Selected
                                        </>
                                      ) : (
                                        "Select"
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                        })}
                    </div>
                  </div>
                )}

                {/* ADDON Page */}
                {currentPage.pageType === "ADDON" && (
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b">
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Plus className="w-5 h-5 text-primary" />
                        </div>
                        {currentPage.displayTitle}
                      </CardTitle>
                      {currentPage.content.description && (
                        <CardDescription className="mt-2">{currentPage.content.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {selectionsLocked && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                            <CheckCircle className="w-5 h-5" />
                            <p className="font-medium">Selections Locked - Contract Signed</p>
                          </div>
                          <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                            Add-on selections are locked after signing the contract to preserve contract integrity.
                          </p>
                        </div>
                      )}
                      {currentPage.content.addOns?.map((addOn: any, addonIdx: number) => {
                        const key = `${currentPage.id}-${addOn.id}`;
                        const isSelected = selectedAddOns.has(key);
                        const quantity = selectedAddOns.get(key)?.quantity || 1;

                        return (
                          <div 
                            key={addOn.id} 
                            className={`
                              group relative p-5 rounded-xl border-2 cursor-pointer
                              transition-all duration-300 ease-out
                              ${isSelected 
                                ? 'border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg shadow-primary/10' 
                                : 'border-border bg-card hover:border-primary/30 hover:shadow-md'
                              } 
                              ${selectionsLocked ? 'opacity-60 cursor-not-allowed' : ''}
                            `}
                            data-testid={`card-addon-${addOn.id}`}
                            style={{
                              animationDelay: `${addonIdx * 80}ms`
                            }}
                            onClick={() => !selectionsLocked && !isSelected && handleAddOnToggle(currentPage, addOn, true)}
                          >
                            <div className="flex items-start gap-4">
                              <Checkbox
                                id={addOn.id}
                                checked={isSelected}
                                onCheckedChange={(checked) => 
                                  !selectionsLocked && handleAddOnToggle(currentPage, addOn, checked as boolean)
                                }
                                disabled={selectionsLocked}
                                className="mt-1.5 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                                data-testid={`checkbox-addon-${addOn.id}`}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                  <div className="flex-1">
                                    <Label 
                                      htmlFor={addOn.id} 
                                      className="font-bold text-base cursor-pointer group-hover:text-primary transition-colors"
                                    >
                                      {addOn.name}
                                    </Label>
                                    {addOn.description && (
                                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                                        {addOn.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className={`
                                      px-3 py-1.5 rounded-lg font-semibold text-sm
                                      ${isSelected 
                                        ? 'bg-primary/20 text-primary' 
                                        : 'bg-muted text-foreground'
                                      }
                                      transition-all duration-300
                                    `}>
                                      <span data-testid={`text-addon-price-${addOn.id}`}>
                                        {formatPrice(addOn.priceCents)}
                                      </span>
                                    </div>
                                    {!isSelected && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        per item
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {isSelected && (
                                  <div 
                                    className="flex items-center gap-3 mt-4 p-3 bg-gradient-to-br from-primary/5 to-background/50 rounded-lg border border-primary/30 shadow-sm animate-in slide-in-from-top-2 duration-300" 
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddOnQuantityChange(currentPage, addOn, -1)}
                                        disabled={selectionsLocked || quantity <= 1}
                                        data-testid={`button-decrease-quantity-${addOn.id}`}
                                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:border-primary hover:scale-110 active:scale-95 transition-all duration-200"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </Button>
                                      <div className="w-14 text-center">
                                        <Input
                                          type="number"
                                          value={quantity}
                                          readOnly
                                          className="h-8 text-center font-bold border-primary/40 bg-white dark:bg-background text-primary transition-all duration-200"
                                          data-testid={`input-quantity-${addOn.id}`}
                                          key={quantity}
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddOnQuantityChange(currentPage, addOn, 1)}
                                        disabled={selectionsLocked || quantity >= 10}
                                        data-testid={`button-increase-quantity-${addOn.id}`}
                                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:border-primary hover:scale-110 active:scale-95 transition-all duration-200"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                    <div className="flex-1" />
                                    <div className="text-right">
                                      <p className="text-xs text-muted-foreground mb-0.5 font-medium">Total</p>
                                      <p className="font-bold text-lg text-primary transition-all duration-300" key={`total-${quantity}`}>
                                        {formatPrice(addOn.priceCents * quantity)}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* CONTRACT Page */}
                {currentPage.pageType === "CONTRACT" && (
                  <div className="max-w-4xl mx-auto px-4 md:px-8">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <FileSignature className="w-6 h-6 text-primary" />
                          <div>
                            <CardTitle>{currentPage.content.heading || "Service Agreement"}</CardTitle>
                            {currentPage.content.description && (
                              <CardDescription>{currentPage.content.description}</CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Parsed Contract with Rich Package/Addon Cards */}
                        <div ref={contractRendererRef} className="prose prose-sm max-w-none bg-muted/30 p-6 rounded-lg border">
                          <ContractRenderer
                            template={currentPage.content.contractTemplate || ''}
                            variables={{
                              // Client contact info
                              client_name: `${data?.contact.firstName} ${data?.contact.lastName}`,
                              client_email: data?.contact.email || '',
                              client_phone: data?.contact.phone || '',
                              client_address: data?.contact.address || '',
                              
                              // Photographer info
                              photographer_name: data?.photographer.businessName || '',
                              photographer_email: data?.photographer.email || '',
                              photographer_phone: data?.photographer.phone || '',
                              photographer_address: data?.photographer.businessAddress || '',
                              
                              // Project details
                              project_date: data?.project.eventDate ? new Date(data.project.eventDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD',
                              project_type: data?.project.projectType || '',
                              project_venue: data?.project.venue || '',
                              
                              // Payment info
                              total_amount: formatPrice(total),
                              deposit_amount: formatPrice(depositAmount),
                              deposit_percent: String(data?.smartFile.defaultDepositPercent ?? data?.projectSmartFile.depositPercent ?? 50) + '%',
                              balance_amount: formatPrice(total - depositAmount),
                              
                              // Meta
                              contract_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                            }}
                            selectedPackages={(() => {
                              // Enrich selected packages with full data from merged pages and freshPackages
                              const enrichedPackages = new Map();
                              selectedPackages.forEach((pkg, key) => {
                                // Get fresh global data (description, imageUrl)
                                const freshPkg = freshPackages?.find(fp => fp.id === pkg.packageId);
                                
                                // Get page snapshot data (features) from merged pages
                                const packagePage = sortedPages.find(p => 
                                  p.pageType === 'PACKAGE' && p.id === pkg.pageId
                                );
                                const snapshotPkg = packagePage?.content?.packages?.find((p: any) => p.id === pkg.packageId);
                                
                                enrichedPackages.set(key, {
                                  ...pkg,
                                  description: freshPkg?.description || snapshotPkg?.description || pkg.description,
                                  features: snapshotPkg?.features || pkg.features || [],
                                  imageUrl: freshPkg?.imageUrl || snapshotPkg?.imageUrl || pkg.imageUrl,
                                });
                              });
                              return enrichedPackages;
                            })()}
                            selectedAddOns={(() => {
                              // Enrich selected add-ons with full data from merged pages and freshAddOns
                              const enrichedAddOns = new Map();
                              selectedAddOns.forEach((addon, key) => {
                                // Get fresh global data (description, imageUrl)
                                const freshAddon = freshAddOns?.find(fa => fa.id === addon.addOnId);
                                
                                // Get page snapshot data from merged pages
                                const addonPage = sortedPages.find(p => 
                                  p.pageType === 'ADDON' && p.id === addon.pageId
                                );
                                const snapshotAddon = addonPage?.content?.addOns?.find((a: any) => a.id === addon.addOnId);
                                
                                enrichedAddOns.set(key, {
                                  ...addon,
                                  description: freshAddon?.description || snapshotAddon?.description || addon.description,
                                  imageUrl: freshAddon?.imageUrl || snapshotAddon?.imageUrl || addon.imageUrl,
                                });
                              });
                              return enrichedAddOns;
                            })()}
                          />
                        </div>

                        <Separator />

                        {/* Signatures Section - Hidden in preview mode */}
                        {isPreviewMode ? (
                          <div className="text-center p-6 bg-muted rounded-lg">
                            <Eye className="w-8 h-8 mx-auto mb-3 text-amber-500" />
                            <h3 className="text-lg font-semibold mb-2">Preview Mode</h3>
                            <p className="text-muted-foreground mb-4">
                              Contract signing is disabled in preview mode.
                              Clients will sign here before proceeding.
                            </p>
                            <Button
                              onClick={() => setCurrentPageIndex(prev => prev + 1)}
                              variant="outline"
                            >
                              Skip to Next Page
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <h3 className="text-lg font-semibold">Signatures</h3>

                            {/* Photographer Signature */}
                            {currentPage.content.requirePhotographerSignature !== false && (
                              <div className="space-y-3">
                                <Label>Photographer Signature</Label>
                                {data?.projectSmartFile.photographerSignatureUrl ? (
                                  <div className="border rounded-lg p-4 bg-muted/20">
                                    <img
                                      src={data.projectSmartFile.photographerSignatureUrl}
                                      alt="Photographer signature"
                                      className="h-20 mx-auto"
                                      data-testid="img-photographer-signature"
                                    />
                                    <p className="text-xs text-muted-foreground text-center mt-2">
                                      Signed by {data.photographer.businessName}
                                      {data.projectSmartFile.photographerSignedAt &&
                                        ` on ${new Date(data.projectSmartFile.photographerSignedAt).toLocaleDateString()}`
                                      }
                                    </p>
                                  </div>
                                ) : (
                                  <div className="border rounded-lg p-4 bg-muted/20 text-center text-sm text-muted-foreground">
                                    Awaiting photographer signature
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Client Signature */}
                            {currentPage.content.requireClientSignature !== false && (
                              <div className="space-y-3">
                                <Label>Your Signature</Label>
                                {data?.projectSmartFile.clientSignatureUrl ? (
                                  <div className="border rounded-lg p-4 bg-muted/20">
                                    <img
                                      src={data.projectSmartFile.clientSignatureUrl}
                                      alt="Client signature"
                                      className="h-20 mx-auto"
                                      data-testid="img-client-signature"
                                    />
                                    <p className="text-xs text-muted-foreground text-center mt-2">
                                      Signed on {new Date(data.projectSmartFile.clientSignedAt!).toLocaleDateString()}
                                    </p>
                                  </div>
                                ) : (
                                  /* Inline signature pad - always visible until signed */
                                  <SignaturePad
                                    ref={signaturePadRef}
                                    label="Draw your signature below"
                                    hideButtons={true}
                                    disableAutoSave={true}
                                  />
                                )}
                              </div>
                            )}

                            {/* Agreement Checkbox */}
                            <div className="flex items-start space-x-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                              <Checkbox
                                id="agree-terms"
                                checked={acceptedTerms}
                                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                                data-testid="checkbox-agree-terms"
                              />
                              <Label htmlFor="agree-terms" className="text-sm leading-relaxed cursor-pointer">
                                I have read and agree to the terms outlined in this service agreement.
                                My signature above confirms my acceptance of all terms and conditions.
                              </Label>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* PAYMENT Page */}
                {currentPage.pageType === "PAYMENT" && (
                  <div className="max-w-lg mx-auto px-4 md:px-0">
                    {!canAccessPayment ? (
                      <Card className="border-2 border-amber-500/50">
                        <CardContent className="p-8 text-center space-y-4">
                          <FileSignature className="w-12 h-12 mx-auto text-amber-500" />
                          <h3 className="text-xl font-semibold">Contract Signature Required</h3>
                          <p className="text-muted-foreground">
                            You must sign the contract before you can proceed with payment.
                          </p>
                          <Button
                            onClick={() => {
                              const contractIndex = sortedPages.findIndex(p => p.pageType === 'CONTRACT');
                              if (contractIndex >= 0) {
                                setCurrentPageIndex(contractIndex);
                              }
                            }}
                            data-testid="button-go-to-contract"
                          >
                            Go to Contract
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                    <Card className="border-2">
                      <CardContent className="p-8 space-y-6">
                        {/* Amount Due Section */}
                        <div className="text-center space-y-2 pb-6 border-b">
                          <p className="text-sm text-muted-foreground">Amount due</p>
                          <h2 className="text-5xl font-bold" data-testid="text-total">
                            {formatPrice(total)}
                          </h2>
                          {depositAmount > 0 && depositAmount < total && (
                            <p className="text-sm text-muted-foreground">
                              Deposit: {formatPrice(depositAmount)} ({data.smartFile.defaultDepositPercent ?? data.projectSmartFile.depositPercent ?? 50}%)
                            </p>
                          )}
                        </div>

                        {/* Order Summary (Collapsible) */}
                        {(selectedPackages.size > 0 || selectedAddOns.size > 0) && (
                          <div className="space-y-3 pb-6 border-b">
                            <details className="group">
                              <summary className="flex items-center justify-between cursor-pointer text-sm font-medium">
                                <span>View Order Details</span>
                                <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </summary>
                              <div className="mt-4 space-y-3 text-sm">
                                {Array.from(selectedPackages.values()).map((pkg) => (
                                  <div key={`${pkg.pageId}-${pkg.packageId}`} className="flex justify-between">
                                    <span className="text-muted-foreground" data-testid="text-selected-package">{pkg.name}</span>
                                    <span className="font-medium" data-testid="text-selected-package-price">{formatPrice(pkg.priceCents)}</span>
                                  </div>
                                ))}
                                {Array.from(selectedAddOns.values()).map((addOn) => (
                                  <div key={`${addOn.pageId}-${addOn.addOnId}`} className="flex justify-between">
                                    <span className="text-muted-foreground">{addOn.name} × {addOn.quantity}</span>
                                    <span className="font-medium">{formatPrice(addOn.priceCents * addOn.quantity)}</span>
                                  </div>
                                ))}
                                <div className="pt-2 border-t flex justify-between font-medium">
                                  <span>Subtotal</span>
                                  <span data-testid="text-subtotal">{formatPrice(subtotal)}</span>
                                </div>
                              </div>
                            </details>
                          </div>
                        )}

                        {/* Payment Terms */}
                        {currentPage.content.terms && (
                          <div className="space-y-2 pb-6 border-b">
                            <h4 className="text-sm font-medium">Payment Terms</h4>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {currentPage.content.terms}
                            </p>
                          </div>
                        )}

                        {/* Payment Section */}
                        {data.projectSmartFile.status === 'PAID' ? (
                          <div className="space-y-6">
                            {/* Payment Complete Message */}
                            <div className="p-6 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-semibold text-green-800 dark:text-green-400">
                                    {data.projectSmartFile.depositCents && data.projectSmartFile.depositCents > 0 
                                      ? 'Full Balance Paid!' 
                                      : 'Payment Complete!'}
                                  </h3>
                                  <p className="text-sm text-green-700 dark:text-green-500 mt-1">Thank you for your payment</p>
                                </div>
                              </div>
                            </div>

                            {/* Payment Details */}
                            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Amount Paid</span>
                                <span className="font-medium">{formatPrice(data.projectSmartFile.amountPaidCents || 0)}</span>
                              </div>
                              {data.projectSmartFile.tipCents && data.projectSmartFile.tipCents > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Tip</span>
                                  <span className="font-medium">{formatPrice(data.projectSmartFile.tipCents)}</span>
                                </div>
                              )}
                              {data.projectSmartFile.paidAt && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Paid On</span>
                                  <span className="font-medium">
                                    {new Date(data.projectSmartFile.paidAt).toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric' 
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>

                            <p className="text-sm text-center text-muted-foreground">
                              You will receive a confirmation email shortly. If you have any questions, please contact {data.photographer.businessName}.
                            </p>

                            {/* Payment History */}
                            <PaymentHistory token={params?.token || ''} />
                          </div>
                        ) : data.projectSmartFile.status === 'DEPOSIT_PAID' ? (
                          <div className="space-y-4">
                            {/* Payment Plan Card with Installment Tracking */}
                            {currentPage.content.acceptOnlinePayments ? (
                              <PaymentPlanCard
                                token={params?.token || ''}
                                onPaymentClick={(installment, clientSecret) => {
                                  setInstallmentPaymentData({
                                    installment,
                                    clientSecret
                                  });
                                }}
                              />
                            ) : (
                              <>
                                {/* Deposit Paid - Show Balance Due (no online payments) */}
                                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-400">
                                    <CheckCircle className="w-5 h-5" />
                                    <p className="font-medium">Deposit Paid - Balance Due: {formatPrice(data.projectSmartFile.balanceDueCents || 0)}</p>
                                  </div>
                                </div>
                                <PaymentHistory token={params?.token || ''} />
                              </>
                            )}

                            {/* Installment Payment Dialog */}
                            {installmentPaymentData && (
                              <Dialog open={!!installmentPaymentData} onOpenChange={() => setInstallmentPaymentData(null)}>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Pay {installmentPaymentData.installment.description}</DialogTitle>
                                    <DialogDescription>
                                      Complete your payment of {formatPrice(installmentPaymentData.installment.amountCents - (installmentPaymentData.installment.amountPaidCents || 0))}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <EmbeddedPaymentForm
                                    token={params?.token || ''}
                                    status={data.projectSmartFile.status}
                                    paymentType="INSTALLMENT"
                                    baseAmount={installmentPaymentData.installment.amountCents - (installmentPaymentData.installment.amountPaidCents || 0)}
                                    publishableKey={import.meta.env.VITE_STRIPE_PUBLIC_KEY || ''}
                                    existingClientSecret={installmentPaymentData.clientSecret}
                                    onSuccess={() => {
                                      setInstallmentPaymentData(null);
                                      queryClient.invalidateQueries({ queryKey: ['/api/public/smart-files', params?.token, 'payment-schedule'] });
                                      queryClient.invalidateQueries({ queryKey: ['/api/public/smart-files', params?.token] });
                                      toast({
                                        title: "Payment successful",
                                        description: "Your payment has been processed.",
                                      });
                                    }}
                                    onError={(error) => {
                                      toast({
                                        title: "Payment failed",
                                        description: error,
                                        variant: "destructive"
                                      });
                                    }}
                                  />
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Success Message */}
                            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                              <div className="flex items-center gap-2 text-green-800 dark:text-green-400">
                                <CheckCircle className="w-5 h-5" />
                                <p className="font-medium">Proposal Accepted</p>
                              </div>
                            </div>

                            {/* Client Choice Payment Plan Selector */}
                            {currentPage.content.acceptOnlinePayments && 
                             currentPage.content.paymentScheduleMode === 'CLIENT_CHOICE' && 
                             !selectedInstallments && !selectedPaymentOption && (
                              <div className="space-y-4">
                                {(() => {
                                  // Calculate allowed installments based on event date
                                  const eventDate = data.project.eventDate 
                                    ? new Date(data.project.eventDate) 
                                    : null;
                                  const maxConfigured = currentPage.content.paymentScheduleConfig?.maxInstallments || 6;
                                  const allowPayInFull = currentPage.content.paymentScheduleConfig?.allowPayInFull !== false;
                                  const { allowedCounts, daysUntilFinal } = getAllowedInstallmentCounts(
                                    eventDate, 
                                    new Date(), 
                                    30, // finalPaymentBuffer
                                    7,  // minGapDays
                                    maxConfigured
                                  );
                                  
                                  // Filter installment options (exclude 1 since that's handled separately by Pay in Full)
                                  const multiPaymentOptions = allowedCounts.filter(n => n >= 2);
                                  
                                  // For generating schedule previews
                                  const previewEventDate = eventDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
                                  
                                  // Determine if event is very close (only full payment available)
                                  const onlyFullPaymentAvailable = multiPaymentOptions.length === 0;
                                  const eventIsSoon = eventDate && daysUntilFinal <= 30;
                                  
                                  return (
                                    <>
                                      <div>
                                        <h3 className="text-sm font-medium mb-1">Choose your payment plan</h3>
                                        <p className="text-xs text-muted-foreground">
                                          Select how you'd like to split your payments
                                          {!eventDate && " (dates shown are estimates)"}
                                        </p>
                                        {eventIsSoon && !onlyFullPaymentAvailable && (
                                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            Your event is coming up soon, so some payment options are limited.
                                          </p>
                                        )}
                                        {onlyFullPaymentAvailable && eventDate && (
                                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            Your event is very close, so only full payment is available.
                                          </p>
                                        )}
                                      </div>
                                      <div className="grid gap-3">
                                        {/* Pay in Full Option */}
                                        {allowPayInFull && (
                                          <Button
                                            variant="outline"
                                            className="h-auto p-4 justify-between hover:bg-accent hover:border-primary"
                                            onClick={() => {
                                              setSelectedInstallments(1);
                                              setSelectedPaymentOption('FULL');
                                            }}
                                            data-testid="button-pay-in-full"
                                          >
                                            <div className="text-left">
                                              <div className="font-semibold">Pay in Full</div>
                                              <div className="text-xs text-muted-foreground">
                                                Complete payment today
                                                {(currentPage.content.paymentScheduleConfig?.payInFullDiscountPercent || 0) > 0 && (
                                                  <span className="ml-1 text-green-600 dark:text-green-400 font-medium">
                                                    (Save {currentPage.content.paymentScheduleConfig.payInFullDiscountPercent}%)
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="text-lg font-bold">
                                              {formatPrice(
                                                (currentPage.content.paymentScheduleConfig?.payInFullDiscountPercent || 0) > 0
                                                  ? Math.round(total * (1 - (currentPage.content.paymentScheduleConfig.payInFullDiscountPercent / 100)))
                                                  : total
                                              )}
                                            </div>
                                          </Button>
                                        )}
                                        
                                        {/* Installment Options (2 to maxInstallments) - only show allowed counts */}
                                        {multiPaymentOptions.map((numPayments) => {
                                          // Generate preview schedule for this option (with deposit first if configured)
                                          const previewSchedule = generateClientChoiceSchedule(total, numPayments, previewEventDate, depositPercent);
                                          const firstPayment = previewSchedule[0]?.amountCents || Math.round(total / numPayments);
                                          
                                          // Validate the generated schedule has proper spacing
                                          // Skip this option if dates are too close together
                                          const hasValidSpacing = previewSchedule.length <= 1 || 
                                            previewSchedule.every((inst, idx) => {
                                              if (idx === 0) return true;
                                              const prevDate = new Date(previewSchedule[idx - 1].dueDate);
                                              const thisDate = new Date(inst.dueDate);
                                              const daysBetween = Math.floor((thisDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
                                              return daysBetween >= 3; // Minimum 3 days between payments for display
                                            });
                                          
                                          if (!hasValidSpacing) return null;
                                          
                                          return (
                                            <Button
                                              key={numPayments}
                                              variant="outline"
                                              className="h-auto p-4 flex-col items-stretch hover:bg-accent hover:border-primary"
                                              onClick={() => setSelectedInstallments(numPayments)}
                                              data-testid={`button-${numPayments}-payments`}
                                            >
                                              <div className="flex justify-between items-center mb-2">
                                                <div className="text-left">
                                                  <div className="font-semibold">{numPayments} Payments</div>
                                                  <div className="text-xs text-muted-foreground">
                                                    ~{formatPrice(firstPayment)}/payment
                                                  </div>
                                                </div>
                                                <div className="text-lg font-bold text-muted-foreground">
                                                  {formatPrice(total)}
                                                </div>
                                              </div>
                                              {/* Show schedule dates preview */}
                                              <div className="text-left border-t pt-2 mt-1 space-y-1">
                                                {previewSchedule.map((inst, idx) => (
                                                  <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                                                    <span>
                                                      {idx === 0 ? 'Today' : new Date(inst.dueDate).toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric'
                                                      })}
                                                    </span>
                                                    <span>{formatPrice(inst.amountCents)}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </Button>
                                          );
                                        })}
                                        
                                        {/* Show message if some options are unavailable */}
                                        {multiPaymentOptions.length < (maxConfigured - 1) && eventDate && multiPaymentOptions.length > 0 && (
                                          <p className="text-xs text-muted-foreground text-center italic">
                                            Some payment plans aren't available because your event is coming up soon.
                                          </p>
                                        )}
                                        
                                        {/* Handle edge case: no options available and allowPayInFull is false */}
                                        {!allowPayInFull && multiPaymentOptions.length === 0 && (
                                          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                            <p className="text-sm text-amber-800 dark:text-amber-400">
                                              Unfortunately, payment plans aren't available for this event date. 
                                              Please contact the photographer for payment options.
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            )}

                            {/* Payment Schedule Preview (after client selects installments) */}
                            {currentPage.content.acceptOnlinePayments && 
                             currentPage.content.paymentScheduleMode === 'CLIENT_CHOICE' && 
                             selectedInstallments && selectedInstallments > 1 && !selectedPaymentOption && (
                              <div className="space-y-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedInstallments(null)}
                                  className="text-xs"
                                  data-testid="button-change-plan"
                                >
                                  ← Change payment plan
                                </Button>
                                
                                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                  <h4 className="text-sm font-medium">Your Payment Schedule</h4>
                                  <div className="space-y-2">
                                    {(() => {
                                      // Always generate fresh schedule for preview (before save)
                                      // After save, the mutation invalidates the query and this component
                                      // will get the saved schedule from the server
                                      const savedSchedule = data.projectSmartFile.paymentSchedule as PaymentInstallment[] | undefined;
                                      const hasValidSavedSchedule = savedSchedule && 
                                          Array.isArray(savedSchedule) && 
                                          savedSchedule.length > 0 &&
                                          savedSchedule.length === selectedInstallments;
                                      
                                      let schedule: PaymentInstallment[];
                                      if (hasValidSavedSchedule) {
                                        schedule = savedSchedule;
                                      } else {
                                        const eventDate = data.project.eventDate 
                                          ? new Date(data.project.eventDate) 
                                          : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
                                        schedule = generateClientChoiceSchedule(total, selectedInstallments, eventDate, depositPercent);
                                      }
                                      return schedule.map((installment, idx) => (
                                        <div key={installment.id} className="flex justify-between items-center text-sm py-2 border-b last:border-0">
                                          <div>
                                            <span className="font-medium">{installment.description}</span>
                                            <span className="text-muted-foreground ml-2">
                                              {new Date(installment.dueDate).toLocaleDateString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric',
                                                year: 'numeric'
                                              })}
                                            </span>
                                          </div>
                                          <span className="font-semibold">{formatPrice(installment.amountCents)}</span>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                  <p className="text-xs text-muted-foreground italic">
                                    This schedule is flexible - you can pay any amount at any time.
                                  </p>
                                </div>

                                <div className="pt-2">
                                  <Button
                                    className="w-full"
                                    onClick={async () => {
                                      // Validate selectedInstallments before proceeding
                                      if (!selectedInstallments || typeof selectedInstallments !== 'number' || selectedInstallments < 1) {
                                        toast({
                                          title: "Please Select a Payment Plan",
                                          description: "Choose how many payments you'd like to split your total into.",
                                          variant: "destructive"
                                        });
                                        return;
                                      }
                                      
                                      // Capture the selected installments before async operations
                                      // This prevents issues with state changing during the async flow
                                      const installmentCount = selectedInstallments;
                                      
                                      // Generate and save the schedule when continuing to payment
                                      // Pass depositPercent so first payment is the deposit, remaining is split across other installments
                                      const eventDate = data.project.eventDate 
                                        ? new Date(data.project.eventDate) 
                                        : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
                                      const schedule = generateClientChoiceSchedule(total, installmentCount, eventDate, depositPercent);
                                      
                                      try {
                                        // Save schedule to database and wait for success
                                        await savePaymentScheduleMutation.mutateAsync({
                                          paymentSchedule: schedule,
                                          selectedInstallments: installmentCount
                                        });
                                        
                                        // Refetch to get the confirmed server data
                                        const refetchResult = await refetch();
                                        const freshData = refetchResult.data;
                                        
                                        // Verify using the server's saved config, not local state
                                        const savedSchedule = freshData?.projectSmartFile?.paymentSchedule;
                                        const rawConfig = freshData?.projectSmartFile?.paymentScheduleConfig;
                                        
                                        // Parse config if it's stored as a string
                                        let savedConfig: any = null;
                                        if (rawConfig) {
                                          if (typeof rawConfig === 'string') {
                                            try {
                                              savedConfig = JSON.parse(rawConfig);
                                            } catch (e) {
                                              console.error('Failed to parse paymentScheduleConfig:', e);
                                            }
                                          } else {
                                            savedConfig = rawConfig;
                                          }
                                        }
                                        
                                        // Verify the schedule was saved correctly by checking:
                                        // 1. Schedule array exists and has entries
                                        // 2. The config has the selectedInstallments we just saved
                                        // 3. The schedule length matches what we saved
                                        const hasValidSchedule = savedSchedule && 
                                            Array.isArray(savedSchedule) && 
                                            savedSchedule.length === installmentCount &&
                                            savedConfig?.selectedInstallments === installmentCount &&
                                            typeof (savedSchedule as PaymentInstallment[])[0]?.amountCents === 'number';
                                        
                                        if (!hasValidSchedule) {
                                          console.error('Schedule validation failed:', {
                                            savedScheduleLength: savedSchedule?.length,
                                            expectedInstallments: installmentCount,
                                            savedConfigInstallments: savedConfig?.selectedInstallments,
                                            hasAmountCents: typeof savedSchedule?.[0]?.amountCents
                                          });
                                          throw new Error('Schedule not found in server response after save');
                                        }
                                        
                                        // Restore the local state to match what was saved
                                        setSelectedInstallments(installmentCount);
                                        
                                        // Only proceed to payment after confirming save with fresh data
                                        // The payment form will now see the fresh data via the query cache
                                        setSelectedPaymentOption('DEPOSIT');
                                      } catch (error: any) {
                                        console.error("Failed to save payment schedule:", error);
                                        toast({
                                          title: "Error Saving Payment Plan",
                                          description: error?.message || "Failed to save payment plan. Please try again.",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                    disabled={savePaymentScheduleMutation.isPending}
                                    data-testid="button-continue-to-payment"
                                  >
                                    {savePaymentScheduleMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <CreditCard className="w-4 h-4 mr-2" />
                                    )}
                                    {savePaymentScheduleMutation.isPending ? 'Saving plan...' : 'Continue to First Payment'}
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Standard Payment Option Selector (for SIMPLE, MONTHLY, BIWEEKLY modes, or when no mode is set) */}
                            {currentPage.content.acceptOnlinePayments && 
                             (!currentPage.content.paymentScheduleMode || currentPage.content.paymentScheduleMode !== 'CLIENT_CHOICE') &&
                             !selectedPaymentOption && depositAmount > 0 && depositAmount < total && (
                              <div className="space-y-3">
                                <h3 className="text-sm font-medium">Choose your payment option:</h3>
                                <div className="grid gap-3">
                                  <Button
                                    variant="outline"
                                    className="h-auto p-4 justify-between hover:bg-accent"
                                    onClick={() => setSelectedPaymentOption('DEPOSIT')}
                                    data-testid="button-pay-deposit"
                                  >
                                    <div className="text-left">
                                      <div className="font-semibold">Pay Deposit</div>
                                      <div className="text-xs text-muted-foreground">
                                        Pay {depositAmount > 0 ? Math.round((depositAmount / total) * 100) : 0}% now, rest later
                                      </div>
                                    </div>
                                    <div className="text-lg font-bold">{formatPrice(depositAmount)}</div>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="h-auto p-4 justify-between hover:bg-accent"
                                    onClick={() => setSelectedPaymentOption('FULL')}
                                    data-testid="button-pay-full"
                                  >
                                    <div className="text-left">
                                      <div className="font-semibold">Pay in Full</div>
                                      <div className="text-xs text-muted-foreground">Complete payment today</div>
                                    </div>
                                    <div className="text-lg font-bold">{formatPrice(total)}</div>
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Payment Form - Shows after option selected or if no deposit configured */}
                            {currentPage.content.acceptOnlinePayments && (
                              <>
                                {/* If deposit not configured or invalid, and not CLIENT_CHOICE, show payment form directly */}
                                {(!currentPage.content.paymentScheduleMode || currentPage.content.paymentScheduleMode !== 'CLIENT_CHOICE') &&
                                 (depositAmount === 0 || depositAmount >= total) && !selectedPaymentOption && (
                                  <EmbeddedPaymentForm
                                    token={params?.token || ''}
                                    status={data.projectSmartFile.status}
                                    paymentType="FULL"
                                    baseAmount={total}
                                    publishableKey={import.meta.env.VITE_STRIPE_PUBLIC_KEY || ''}
                                    onSuccess={() => {
                                      setLocation(`/smart-file/${params?.token}/success`);
                                    }}
                                    onError={(error) => {
                                      toast({
                                        title: "Payment failed",
                                        description: error,
                                        variant: "destructive"
                                      });
                                    }}
                                  />
                                )}

                                {/* If option selected, show payment form with change option button */}
                                {selectedPaymentOption && (() => {
                                  // For CLIENT_CHOICE mode, verify server has saved schedule before showing payment form
                                  // The useEffect handles resetting invalid state; here we just show loading until it's valid
                                  if (currentPage.content.paymentScheduleMode === 'CLIENT_CHOICE' && selectedInstallments && selectedInstallments > 1) {
                                    const savedSchedule = data.projectSmartFile.paymentSchedule as PaymentInstallment[] | undefined;
                                    const hasValidSavedSchedule = savedSchedule &&
                                        Array.isArray(savedSchedule) &&
                                        savedSchedule.length === selectedInstallments &&
                                        typeof savedSchedule[0]?.amountCents === 'number';

                                    if (!hasValidSavedSchedule) {
                                      // Schedule not confirmed - useEffect will reset state
                                      return (
                                        <div className="text-center py-8 space-y-4">
                                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                          <p className="text-muted-foreground">Verifying payment schedule...</p>
                                        </div>
                                      );
                                    }
                                  }

                                  return (
                                    <div className="space-y-4">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedPaymentOption(null);
                                          if (currentPage.content.paymentScheduleMode === 'CLIENT_CHOICE') {
                                            setSelectedInstallments(null);
                                          }
                                        }}
                                        className="text-xs"
                                        data-testid="button-change-payment-option"
                                      >
                                        ← Change payment option
                                      </Button>
                                      <EmbeddedPaymentForm
                                        token={params?.token || ''}
                                        status={data.projectSmartFile.status}
                                        paymentType={selectedPaymentOption}
                                        baseAmount={(() => {
                                          if (selectedPaymentOption === 'FULL') {
                                            const discount = currentPage.content.paymentScheduleConfig?.payInFullDiscountPercent || 0;
                                            return discount > 0 ? Math.round(total * (1 - discount / 100)) : total;
                                          }
                                          if (currentPage.content.paymentScheduleMode === 'CLIENT_CHOICE' && selectedInstallments && selectedInstallments > 1) {
                                            // Use saved schedule from server (already validated above)
                                            const savedSchedule = data.projectSmartFile.paymentSchedule as PaymentInstallment[];
                                            return savedSchedule[0].amountCents;
                                          }
                                          return depositAmount;
                                        })()}
                                        publishableKey={import.meta.env.VITE_STRIPE_PUBLIC_KEY || ''}
                                        onSuccess={() => {
                                          setLocation(`/smart-file/${params?.token}/success`);
                                        }}
                                        onError={(error) => {
                                          toast({
                                            title: "Payment failed",
                                            description: error,
                                            variant: "destructive"
                                          });
                                        }}
                                      />
                                    </div>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    )}
                  </div>
                )}

                {/* INVOICE Page */}
                {currentPage.pageType === "INVOICE" && (
                  <div className="max-w-4xl mx-auto px-4 md:px-8">
                    {/* Modern Invoice Card */}
                    <div className="bg-white rounded-lg shadow-sm border p-8 mb-4">
                      {/* Invoice Header */}
                      <div className="flex justify-between items-start mb-8">
                        {/* Left: Business Info */}
                        <div>
                          <h1 className="text-3xl font-bold mb-2">
                            {currentPage.content.heading || data.photographer.businessName || "Invoice"}
                          </h1>
                          {currentPage.content.description && (
                            <p className="text-sm text-muted-foreground max-w-md">
                              {currentPage.content.description}
                            </p>
                          )}
                        </div>

                        {/* Right: Invoice Details */}
                        <div className="text-right">
                          <div className="text-4xl font-bold text-primary mb-2">INVOICE</div>
                          <div className="space-y-1 text-sm">
                            {currentPage.content.invoiceNumber && (
                              <div>
                                <span className="text-muted-foreground">Invoice #: </span>
                                <span className="font-medium">{currentPage.content.invoiceNumber}</span>
                              </div>
                            )}
                            {currentPage.content.dateIssued && (
                              <div>
                                <span className="text-muted-foreground">Date: </span>
                                <span className="font-medium">
                                  {new Date(currentPage.content.dateIssued).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                            )}
                            {currentPage.content.purchaseOrderNumber && (
                              <div>
                                <span className="text-muted-foreground">PO #: </span>
                                <span className="font-medium">{currentPage.content.purchaseOrderNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bill To Section */}
                      <div className="bg-muted/30 p-4 rounded-md mb-8">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Bill To</div>
                        <div className="font-semibold">
                          {currentPage.content.billTo || `${data.contact.firstName} ${data.contact.lastName}`}
                        </div>
                        {data.contact.address && (
                          <div className="text-sm text-muted-foreground mt-1">{data.contact.address}</div>
                        )}
                      </div>

                      {/* Line Items Table - Enhanced */}
                      {(selectedPackages.size > 0 || selectedAddOns.size > 0) ? (
                        // Proposal mode - show selected packages and add-ons
                        <table className="w-full mb-8">
                          <thead>
                            <tr className="border-b-2 border-gray-200">
                              <th className="text-left py-3 text-sm font-semibold uppercase tracking-wide">Description</th>
                              <th className="text-center py-3 text-sm font-semibold uppercase tracking-wide w-20">Qty</th>
                              <th className="text-right py-3 text-sm font-semibold uppercase tracking-wide w-32">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from(selectedPackages.values()).map((pkg, index) => (
                              <tr key={`${pkg.pageId}-${pkg.packageId}`} className={index % 2 === 0 ? 'bg-gray-50/50' : ''}>
                                <td className="py-4">
                                  <div className="font-medium">{pkg.name}</div>
                                  <div className="text-xs text-muted-foreground">Package</div>
                                </td>
                                <td className="py-4 text-center">1</td>
                                <td className="py-4 text-right font-semibold">
                                  ${(pkg.priceCents / 100).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                            {Array.from(selectedAddOns.values()).map((addOn, index) => {
                              const pkgCount = selectedPackages.size;
                              return (
                                <tr
                                  key={`${addOn.pageId}-${addOn.addOnId}`}
                                  className={(pkgCount + index) % 2 === 0 ? 'bg-gray-50/50' : ''}
                                >
                                  <td className="py-4">
                                    <div className="font-medium">{addOn.name}</div>
                                    <div className="text-xs text-muted-foreground">Add-on</div>
                                  </td>
                                  <td className="py-4 text-center">{addOn.quantity}</td>
                                  <td className="py-4 text-right font-semibold">
                                    ${((addOn.priceCents * addOn.quantity) / 100).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        // Standard invoice mode - show line items
                        currentPage.content.lineItems && currentPage.content.lineItems.length > 0 && (
                          <table className="w-full mb-8">
                            <thead>
                              <tr className="border-b-2 border-gray-200">
                                <th className="text-left py-3 text-sm font-semibold uppercase tracking-wide">Description</th>
                                <th className="text-center py-3 text-sm font-semibold uppercase tracking-wide w-20">Qty</th>
                                <th className="text-right py-3 text-sm font-semibold uppercase tracking-wide w-32">Rate</th>
                                <th className="text-right py-3 text-sm font-semibold uppercase tracking-wide w-32">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentPage.content.lineItems.map((item: any, index: number) => (
                                <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50/50' : ''}>
                                  <td className="py-4">
                                    <div className="font-medium">{item.service}</div>
                                    {item.taxable && (
                                      <div className="text-xs text-muted-foreground">Taxable</div>
                                    )}
                                  </td>
                                  <td className="py-4 text-center">{item.quantity}</td>
                                  <td className="py-4 text-right">${(item.unitPrice / 100).toFixed(2)}</td>
                                  <td className="py-4 text-right font-semibold">
                                    ${((item.quantity * item.unitPrice) / 100).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )
                      )}

                      {/* Totals Section - Enhanced */}
                      <div className="flex justify-end">
                        <div className="w-80 space-y-2">
                          <div className="flex justify-between py-2 text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium">${(subtotal / 100).toFixed(2)}</span>
                          </div>

                          {currentPage.content.taxPercent > 0 && (
                            <div className="flex justify-between py-2 text-sm">
                              <span className="text-muted-foreground">
                                Tax ({currentPage.content.taxPercent}%)
                              </span>
                              <span className="font-medium">
                                ${(Math.round(subtotal * (currentPage.content.taxPercent / 100)) / 100).toFixed(2)}
                              </span>
                            </div>
                          )}

                          {currentPage.content.discountAmount > 0 && (
                            <div className="flex justify-between py-2 text-sm text-green-600">
                              <span>
                                Discount {currentPage.content.discountType === 'PERCENT'
                                  ? `(${currentPage.content.discountAmount}%)`
                                  : ''
                                }
                              </span>
                              <span className="font-medium">
                                -${((
                                  currentPage.content.discountType === 'PERCENT'
                                    ? Math.round(subtotal * (currentPage.content.discountAmount / 100))
                                    : currentPage.content.discountAmount
                                ) / 100).toFixed(2)}
                              </span>
                            </div>
                          )}

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
                    <div className="bg-white rounded-lg shadow-sm border p-6 mt-4">
                      <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">Payment Terms</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          {currentPage.content.paymentScheduleMode === 'CLIENT_CHOICE' ? (
                            <div className="space-y-2">
                              <p className="font-medium text-foreground">Choose Your Payment Plan</p>
                              <p>Select up to {currentPage.content.paymentScheduleConfig?.maxInstallments || 6} installments to spread out your payments.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-4">
                                <div className="flex-1 p-3 bg-muted/50 rounded-lg">
                                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Deposit Due</div>
                                  <div className="font-semibold text-foreground">{currentPage.content.depositPercent || 50}% upon booking</div>
                                </div>
                                <div className="flex-1 p-3 bg-muted/50 rounded-lg">
                                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Balance Due</div>
                                  <div className="font-semibold text-foreground">Before event date</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        {currentPage.content.acceptOnlinePayments && (
                          <div className="flex items-center gap-2 text-sm text-green-600 pt-2">
                            <Check className="w-4 h-4" />
                            <span>Secure online payments accepted</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* PAY Page - HoneyBook Style Payment UI */}
                {currentPage.pageType === "PAY" && (() => {
                  // Determine mode: proposal (packages/addons) vs invoice-only
                  const hasProposalPages = sortedPages.some(p =>
                    p.pageType === 'PACKAGE' || p.pageType === 'ADDON');
                  const hasPackageSelections = selectedPackages.size > 0 || selectedAddOns.size > 0;
                  const invoicePage = sortedPages.find(p => p.pageType === 'INVOICE');
                  const invoiceContent = invoicePage?.content;

                  // If proposal mode but no packages selected yet, show message
                  if (hasProposalPages && !hasPackageSelections) {
                    return (
                      <div className="max-w-lg mx-auto px-4 md:px-0">
                        <Card className="overflow-hidden">
                          <CardContent className="p-8 text-center">
                            <PackageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Select a Package First</h3>
                            <p className="text-muted-foreground mb-4">
                              Please go back and select a package before proceeding to payment.
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const pkgPageIndex = sortedPages.findIndex(p => p.pageType === 'PACKAGE');
                                if (pkgPageIndex >= 0) setCurrentPageIndex(pkgPageIndex);
                              }}
                            >
                              <ArrowLeft className="w-4 h-4 mr-2" />
                              Go to Packages
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  }

                  console.log('💳 [PAY PAGE] Rendering PAY page');
                  console.log('💳 [PAY PAGE] hasProposalPages:', hasProposalPages, 'hasPackageSelections:', hasPackageSelections);
                  console.log('💳 [PAY PAGE] invoicePage found:', !!invoicePage, 'invoiceContent:', invoiceContent);

                  // Use global total which already handles both proposal and invoice-only modes
                  const effectiveTotal = total;
                  console.log('💳 [PAY PAGE] effectiveTotal (from global total):', effectiveTotal);

                  const depositPct = invoiceContent?.depositPercent || 50;
                  const paymentScheduleMode = invoiceContent?.paymentScheduleMode || 'SIMPLE';
                  console.log('💳 [PAY PAGE] depositPercent:', depositPct, 'paymentScheduleMode:', paymentScheduleMode);

                  // Check payment state
                  const amountPaid = data.projectSmartFile.amountPaidCents || 0;
                  const savedSchedule = data.projectSmartFile.paymentSchedule as PaymentInstallment[] | undefined;
                  console.log('💳 [PAY PAGE] amountPaid:', amountPaid, 'savedSchedule:', savedSchedule);

                  // Determine current payment info
                  let paymentNumber = 1;
                  let totalPayments = paymentScheduleMode === 'SIMPLE' ? 2 :
                    (invoiceContent?.paymentScheduleConfig?.maxInstallments || 2);
                  let amountDue = Math.round(effectiveTotal * (depositPct / 100));
                  let dueDate = new Date();
                  let paymentType: 'DEPOSIT' | 'BALANCE' = 'DEPOSIT';
                  console.log('💳 [PAY PAGE] Initial amountDue calculated:', amountDue, '(from effectiveTotal:', effectiveTotal, '* depositPct:', depositPct, '/ 100)');

                  if (savedSchedule && Array.isArray(savedSchedule) && savedSchedule.length > 0) {
                    // Use saved schedule for CLIENT_CHOICE mode
                    totalPayments = savedSchedule.length;
                    const nextUnpaid = savedSchedule.find(i => i.status === 'PENDING' || i.status === 'PARTIAL');
                    if (nextUnpaid) {
                      paymentNumber = savedSchedule.indexOf(nextUnpaid) + 1;
                      amountDue = nextUnpaid.amountCents - (nextUnpaid.amountPaidCents || 0);
                      dueDate = new Date(nextUnpaid.dueDate);
                      paymentType = paymentNumber === 1 ? 'DEPOSIT' : 'BALANCE';
                    } else {
                      // All paid
                      paymentNumber = totalPayments;
                      amountDue = 0;
                    }
                  } else if (amountPaid > 0 && amountPaid >= Math.round(effectiveTotal * (depositPct / 100))) {
                    // Deposit paid, showing balance
                    paymentNumber = 2;
                    amountDue = effectiveTotal - amountPaid;
                    paymentType = 'BALANCE';
                  } else if (amountPaid >= effectiveTotal && effectiveTotal > 0) {
                    // Fully paid
                    amountDue = 0;
                  }

                  // Calculate tip in cents
                  const tipCents = selectedTip === 'custom'
                    ? Math.round(parseFloat(customTipAmount || '0') * 100)
                    : selectedTip
                      ? Math.round(amountDue * (selectedTip / 100))
                      : 0;
                  const totalWithTip = amountDue + tipCents;
                  console.log('💳 [PAY PAGE] tipCents:', tipCents, 'totalWithTip:', totalWithTip);

                  // Fetch PaymentIntent when needed - guarded by ref to prevent infinite loop
                  // Skip in preview mode - we'll show a mock form instead
                  if (
                    !isPreviewMode &&
                    amountDue > 0 &&
                    !payPageClientSecret &&
                    !payPageIsProcessing &&
                    !payPageSuccess &&
                    !payPageNeedsAcceptance &&
                    !payPageIsInitializing &&
                    !acceptMutation.isPending &&  // Wait for accept mutation to complete
                    !paymentFetchInitiatedRef.current // Only fetch once per PAY page session
                  ) {
                    console.log('💰 [PAYMENT INTENT] ✅ Starting fetch - setting ref guard');
                    paymentFetchInitiatedRef.current = true; // Mark as initiated BEFORE async call

                    // Immediately invoke async function (IIFE pattern)
                    (async () => {
                      setPayPageIsInitializing(true);
                      console.log('💰 [PAYMENT INTENT] Fetching payment intent with:', {
                        paymentType,
                        tipCents,
                        amountCents: totalWithTip
                      });

                      try {
                        const response = await fetch(`/api/public/smart-files/${params?.token}/create-payment-intent`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            paymentType,
                            tipCents,
                            amountCents: totalWithTip
                          })
                        });

                        console.log('💰 [PAYMENT INTENT] Response status:', response.status, response.ok);

                        if (!response.ok) {
                          const errorData = await response.json().catch(() => ({}));
                          console.log('💰 [PAYMENT INTENT] ❌ Error response:', errorData);

                          const errorMessage = errorData.message || errorData.error || 'Failed to create payment intent';
                          if (errorMessage.toLowerCase().includes('must be accepted')) {
                            console.log('💰 [PAYMENT INTENT] ⚠️ Smart file needs acceptance - will not retry');
                            setPayPageNeedsAcceptance(true);
                          }

                          throw new Error(errorMessage);
                        }

                        const result = await response.json();
                        console.log('💰 [PAYMENT INTENT] ✅ Payment intent created successfully:', result);
                        setPayPageError(null);
                        setPayPageClientSecret(result.clientSecret);
                      } catch (err: any) {
                        console.error('💰 [PAYMENT INTENT] ❌ Exception:', err);
                        setPayPageError(err.message || 'Failed to initialize payment');
                      } finally {
                        setPayPageIsInitializing(false);
                      }
                    })();
                  } else {
                    console.log('💰 [PAYMENT INTENT] ❌ Conditions not met - skipping fetch', {
                      amountDue: amountDue > 0,
                      noClientSecret: !payPageClientSecret,
                      notProcessing: !payPageIsProcessing,
                      notSuccess: !payPageSuccess,
                      notNeedingAcceptance: !payPageNeedsAcceptance,
                      notInitializing: !payPageIsInitializing,
                      notAccepting: !acceptMutation.isPending,
                      refNotSet: !paymentFetchInitiatedRef.current
                    });
                  }

                  // Handle payment success
                  const handlePaymentSuccess = (result: PaymentResult) => {
                    setPayPageSuccess(true);
                    setPayPageResult(result);
                    setPayPageIsProcessing(false);
                    toast({
                      title: "Payment successful!",
                      description: "Thank you for your payment."
                    });
                    // Refresh data to show updated status
                    refetch();
                  };

                  // If already fully paid, show success state
                  if (amountDue <= 0 && effectiveTotal > 0) {
                    return (
                      <div className="max-w-lg mx-auto px-4 md:px-0">
                        <Card className="overflow-hidden">
                          <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                              <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Payment Complete</h3>
                            <p className="text-muted-foreground">
                              Thank you! Your payment of {formatCentsAsDollars(effectiveTotal)} has been received.
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  }

                  // Show success after payment
                  if (payPageSuccess) {
                    const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
                    const balanceRemaining = payPageResult?.balanceDue || 0;

                    return (
                      <div className="max-w-lg mx-auto px-4 md:px-0">
                        <Card className="overflow-hidden">
                          {/* Header with photographer branding */}
                          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center text-white">
                            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                              <CheckCircle className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold mb-1">Payment Successful!</h2>
                            <p className="text-white/90 text-sm">
                              Thank you for your {paymentType === 'DEPOSIT' ? 'deposit' : 'payment'}
                            </p>
                          </div>

                          <CardContent className="p-6 space-y-6">
                            {/* Payment Summary */}
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Amount Paid</span>
                                <span className="text-xl font-bold text-green-600">{formatCentsAsDollars(totalWithTip)}</span>
                              </div>
                              {tipCents > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">Includes tip</span>
                                  <span className="text-muted-foreground">{formatCentsAsDollars(tipCents)}</span>
                                </div>
                              )}
                              {balanceRemaining > 0 && (
                                <div className="flex justify-between items-center pt-2 border-t">
                                  <span className="text-sm text-muted-foreground">Balance Remaining</span>
                                  <span className="font-semibold text-amber-600">{formatCentsAsDollars(balanceRemaining)}</span>
                                </div>
                              )}
                            </div>

                            {/* Transaction Details */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Transaction Details</h4>
                              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Transaction ID</span>
                                  <span className="font-mono text-xs bg-gray-200 px-2 py-0.5 rounded">
                                    {payPageResult?.transactionId?.slice(0, 12) || 'Processing...'}
                                  </span>
                                </div>
                                {payPageResult?.paymentMethod && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Payment Method</span>
                                    <span className="flex items-center gap-1">
                                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                                      {capitalizeFirst(payPageResult.paymentMethod.brand)} ****{payPageResult.paymentMethod.last4}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Date</span>
                                  <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Project</span>
                                  <span className="font-medium truncate max-w-[180px]">{data.project.title}</span>
                                </div>
                              </div>
                            </div>

                            {/* Next Steps */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">What's Next</h4>
                              <div className="space-y-2">
                                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                                  <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-sm font-medium text-blue-900">Receipt sent to your email</p>
                                    <p className="text-xs text-blue-700">Check your inbox for the payment confirmation</p>
                                  </div>
                                </div>
                                {balanceRemaining > 0 ? (
                                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                                    <Calendar className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium text-amber-900">Next payment due</p>
                                      <p className="text-xs text-amber-700">{formatCentsAsDollars(balanceRemaining)} remaining - you'll be notified before the due date</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium text-green-900">You're all set!</p>
                                      <p className="text-xs text-green-700">Your booking is fully paid. {data.photographer.businessName} will be in touch with next steps.</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => window.print()}
                              >
                                <Printer className="w-4 h-4 mr-2" />
                                Print Receipt
                              </Button>
                              {balanceRemaining > 0 && (
                                <Button
                                  className="flex-1"
                                  onClick={() => {
                                    setPayPageSuccess(false);
                                    setPayPageResult(null);
                                    setPayPageClientSecret(null);
                                    paymentFetchInitiatedRef.current = false;
                                  }}
                                >
                                  Make Next Payment
                                  <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  }

                  return (
                  <div className="max-w-lg mx-auto px-4 md:px-0">
                    <Card className="overflow-hidden">
                      {/* Header with branding */}
                      <div className="flex items-center justify-between p-4 border-b">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {data.photographer.businessName?.split(' ').map(w => w[0]).join('').slice(0, 2) || 'BZ'}
                          </div>
                          <div>
                            <div className="font-medium text-sm">Payment {paymentNumber} of {totalPayments}</div>
                            <div className="text-xs text-muted-foreground">Due: {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          </div>
                        </div>
                        <button className="text-sm text-primary hover:underline">View Invoice</button>
                      </div>

                      <CardContent className="p-6 space-y-6">
                        {/* Amount Due - Dynamic */}
                        <div className="text-center pb-4 border-b">
                          <div className="text-sm font-medium text-primary mb-1">Amount due</div>
                          <div className="text-4xl font-bold">{formatCentsAsDollars(amountDue)}</div>
                          {tipCents > 0 && (
                            <div className="text-sm text-muted-foreground mt-1">
                              + {formatCentsAsDollars(tipCents)} tip = <span className="font-semibold">{formatCentsAsDollars(totalWithTip)}</span>
                            </div>
                          )}
                          {effectiveTotal > 0 && amountDue !== effectiveTotal && !tipCents && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Total: {formatCentsAsDollars(effectiveTotal)}
                            </div>
                          )}
                        </div>

                        {/* Tip Section */}
                        <div className="space-y-3">
                          <div className="text-sm font-medium">Add a tip</div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant={selectedTip === null ? "default" : "outline"}
                              size="sm"
                              className="flex-1 min-w-[70px]"
                              disabled={isPreviewMode}
                              onClick={() => {
                                setSelectedTip(null);
                                setPayPageClientSecret(null); // Reset to refetch with new amount
                                paymentFetchInitiatedRef.current = false; // Allow new fetch with updated tip
                              }}
                            >
                              No thanks
                            </Button>
                            <Button
                              variant={selectedTip === 18 ? "default" : "outline"}
                              size="sm"
                              className="flex-1 min-w-[50px]"
                              disabled={isPreviewMode}
                              onClick={() => {
                                setSelectedTip(18);
                                setPayPageClientSecret(null);
                                paymentFetchInitiatedRef.current = false; // Allow new fetch with updated tip
                              }}
                            >
                              18%
                            </Button>
                            <Button
                              variant={selectedTip === 20 ? "default" : "outline"}
                              size="sm"
                              className="flex-1 min-w-[50px]"
                              disabled={isPreviewMode}
                              onClick={() => {
                                setSelectedTip(20);
                                setPayPageClientSecret(null);
                                paymentFetchInitiatedRef.current = false; // Allow new fetch with updated tip
                              }}
                            >
                              20%
                            </Button>
                            <Button
                              variant={selectedTip === 25 ? "default" : "outline"}
                              size="sm"
                              className="flex-1 min-w-[50px]"
                              disabled={isPreviewMode}
                              onClick={() => {
                                setSelectedTip(25);
                                setPayPageClientSecret(null);
                                paymentFetchInitiatedRef.current = false; // Allow new fetch with updated tip
                              }}
                            >
                              25%
                            </Button>
                            <Button
                              variant={selectedTip === 'custom' ? "default" : "outline"}
                              size="sm"
                              className="flex-1 min-w-[60px]"
                              disabled={isPreviewMode}
                              onClick={() => setSelectedTip('custom')}
                            >
                              Custom
                            </Button>
                          </div>
                          {selectedTip === 'custom' && !isPreviewMode && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={customTipAmount}
                                onChange={(e) => {
                                  setCustomTipAmount(e.target.value);
                                }}
                                onBlur={() => {
                                  // Reset clientSecret when user finishes typing (not on every keystroke)
                                  if (customTipAmount && parseFloat(customTipAmount) > 0) {
                                    setPayPageClientSecret(null);
                                    paymentFetchInitiatedRef.current = false; // Allow new fetch with updated tip
                                  }
                                }}
                                className="w-24"
                              />
                            </div>
                          )}
                        </div>

                        {/* Autopay Section */}
                        <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                          <Checkbox
                            id="pay-autopay"
                            className="mt-0.5"
                            checked={payPageAutopayEnabled}
                            disabled={isPreviewMode}
                            onCheckedChange={(checked) => setPayPageAutopayEnabled(!!checked)}
                          />
                          <div className="flex-1">
                            <label htmlFor="pay-autopay" className={cn("text-sm font-medium", isPreviewMode ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>Set up Autopay</label>
                            <p className="text-xs text-muted-foreground mt-1">Automatically pay future installments with this payment method</p>
                          </div>
                        </div>

                        {/* Error Display */}
                        {payPageError && !payPageIsInitializing && !acceptMutation.isPending && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {payPageError}
                          </div>
                        )}

                        {/* Stripe Payment Form */}
                        {isPreviewMode ? (
                          /* Mock Payment Form for Preview Mode */
                          <div className="space-y-4">
                            {/* Mock Card Number */}
                            <div className="border rounded-md p-3 bg-white">
                              <div className="text-xs text-gray-500 mb-1">Card number</div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">1234 1234 1234 1234</span>
                                <CreditCard className="w-6 h-4 text-gray-400" />
                              </div>
                            </div>

                            {/* Mock Expiry and CVC row */}
                            <div className="flex gap-3">
                              <div className="flex-1 border rounded-md p-3 bg-white">
                                <div className="text-xs text-gray-500 mb-1">Expiration</div>
                                <span className="text-gray-400">MM / YY</span>
                              </div>
                              <div className="flex-1 border rounded-md p-3 bg-white">
                                <div className="text-xs text-gray-500 mb-1">CVC</div>
                                <span className="text-gray-400">CVC</span>
                              </div>
                            </div>

                            {/* Mock Country */}
                            <div className="border rounded-md p-3 bg-white">
                              <div className="text-xs text-gray-500 mb-1">Country</div>
                              <span className="text-gray-400">United States</span>
                            </div>

                            {/* Disabled Pay Button */}
                            <Button
                              className="w-full h-12 text-base font-semibold"
                              disabled
                            >
                              Pay {formatCentsAsDollars(amountDue + tipCents)}
                            </Button>

                            {/* Preview Mode Indicator */}
                            <div className="text-center text-xs text-amber-600 bg-amber-50 rounded p-2">
                              <Eye className="w-3 h-3 inline mr-1" />
                              Preview Mode - Payment form is for display only
                            </div>
                          </div>
                        ) : payPageClientSecret ? (
                          <Elements
                            stripe={stripePromise}
                            options={{
                              clientSecret: payPageClientSecret,
                              appearance: {
                                theme: 'stripe',
                                variables: {
                                  colorPrimary: '#0066cc',
                                }
                              }
                            }}
                          >
                            <PayPageForm
                              amountCents={amountDue}
                              tipCents={tipCents}
                              token={params?.token || ''}
                              paymentType={paymentType}
                              onSuccess={handlePaymentSuccess}
                              onError={(msg) => setPayPageError(msg)}
                              isProcessing={payPageIsProcessing}
                              setIsProcessing={setPayPageIsProcessing}
                              autopayEnabled={payPageAutopayEnabled}
                            />
                          </Elements>
                        ) : (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">Loading payment form...</span>
                          </div>
                        )}

                        {/* SSL Footer */}
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                          <Lock className="w-3 h-3" />
                          <span>256-bit SSL encrypted payment</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  );
                })()}

                {/* FORM Page */}
                {currentPage.pageType === "FORM" && (
                  <Card>
                    <CardHeader>
                      <CardTitle data-testid={`form-page-title-${pageIndex}`}>{currentPage.displayTitle}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleFormSubmit} className="space-y-6">
                      {/* Hero Section if present */}
                      {currentPage.content.hero?.backgroundImage && (
                        <div 
                          className="relative w-full h-[200px] flex items-center justify-center bg-cover bg-center overflow-hidden rounded-lg -mx-6 -mt-6 mb-6"
                          style={{ backgroundImage: `url(${currentPage.content.hero.backgroundImage})` }}
                        >
                          <div className="absolute inset-0 bg-black/30" />
                          <div className="relative z-10 text-center text-white px-6">
                            {currentPage.content.hero.title && (
                              <h2 className="text-3xl font-bold mb-2">{currentPage.content.hero.title}</h2>
                            )}
                            {currentPage.content.hero.description && (
                              <p className="text-lg">{currentPage.content.hero.description}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sections-based rendering */}
                      {currentPage.content.sections && currentPage.content.sections.length > 0 ? (
                        currentPage.content.sections.map((section: any, secIdx: number) => (
                          <div key={secIdx}>
                            {section.columns === 1 ? (
                              <div className="space-y-4">
                                {section.blocks.map((block: any, blockIdx: number) => (
                                  <div key={blockIdx}>
                                    {block.type === 'HEADING' && block.content && (
                                      <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                    )}
                                    {block.type === 'TEXT' && block.content && (
                                      <div className="text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }} />
                                    )}
                                    {block.type === 'SPACER' && (
                                      <div className="py-6" />
                                    )}
                                    {block.type === 'IMAGE' && block.content && (() => {
                                      const imageData: ImageContent = typeof block.content === 'string' 
                                        ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                        : block.content;
                                      const isRounded = imageData.borderRadius === 'rounded';
                                      const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                        : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                        : 'h-[150px] w-[150px]';
                                      
                                      if (isRounded) {
                                        return (
                                          <div className={cn("rounded-full overflow-hidden border border-border mx-auto", sizeClass)}>
                                            <img 
                                              src={imageData.url} 
                                              alt="" 
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        );
                                      }
                                      
                                      const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                        : imageData.size === 'large' ? 'max-h-[300px]' 
                                        : 'max-h-[150px]';
                                      return (
                                        <div className="-mx-4 sm:-mx-6">
                                          <img 
                                            src={imageData.url} 
                                            alt="" 
                                            className={cn("w-full rounded-none object-cover", maxHeightClass)} 
                                          />
                                        </div>
                                      );
                                    })()}
                                    {block.type === 'FORM_FIELD' && block.content && (() => {
                                      const field = block.content;
                                      return (
                                        <div className="space-y-2">
                                          <Label htmlFor={`field-${block.id}`} className="text-sm font-medium">
                                            {field.label}
                                            {field.required && <span className="text-destructive ml-1">*</span>}
                                          </Label>
                                          {field.fieldType === 'TEXT_INPUT' && (
                                            <Input
                                              id={`field-${block.id}`}
                                              placeholder={field.placeholder}
                                              required={field.required}
                                              value={formAnswers.get(block.id) || ''}
                                              onChange={(e) => handleFormFieldChange(block.id, e.target.value)}
                                              data-testid={`input-form-field-${blockIdx}`}
                                            />
                                          )}
                                          {field.fieldType === 'TEXTAREA' && (
                                            <Textarea
                                              id={`field-${block.id}`}
                                              placeholder={field.placeholder}
                                              required={field.required}
                                              rows={4}
                                              value={formAnswers.get(block.id) || ''}
                                              onChange={(e) => handleFormFieldChange(block.id, e.target.value)}
                                              data-testid={`textarea-form-field-${blockIdx}`}
                                            />
                                          )}
                                          {field.fieldType === 'NUMBER' && (
                                            <Input
                                              id={`field-${block.id}`}
                                              type="number"
                                              placeholder={field.placeholder}
                                              required={field.required}
                                              value={formAnswers.get(block.id) || ''}
                                              onChange={(e) => handleFormFieldChange(block.id, e.target.value)}
                                              data-testid={`input-number-field-${blockIdx}`}
                                            />
                                          )}
                                          {field.fieldType === 'EMAIL' && (
                                            <Input
                                              id={`field-${block.id}`}
                                              type="email"
                                              placeholder={field.placeholder}
                                              required={field.required}
                                              value={formAnswers.get(block.id) || ''}
                                              onChange={(e) => handleFormFieldChange(block.id, e.target.value)}
                                              data-testid={`input-email-field-${blockIdx}`}
                                            />
                                          )}
                                          {field.fieldType === 'DATE' && (
                                            <Input
                                              id={`field-${block.id}`}
                                              type="date"
                                              required={field.required}
                                              value={formAnswers.get(block.id) || ''}
                                              onChange={(e) => handleFormFieldChange(block.id, e.target.value)}
                                              data-testid={`input-date-field-${blockIdx}`}
                                            />
                                          )}
                                          {field.fieldType === 'MULTIPLE_CHOICE' && field.options && (
                                            <RadioGroup 
                                              value={formAnswers.get(block.id) || ''}
                                              onValueChange={(value) => handleFormFieldChange(block.id, value)}
                                              data-testid={`radio-group-field-${blockIdx}`}
                                            >
                                              {field.options.map((option: string, optIdx: number) => (
                                                <div key={optIdx} className="flex items-center space-x-2">
                                                  <RadioGroupItem
                                                    id={`field-${block.id}-${optIdx}`}
                                                    value={option}
                                                    data-testid={`radio-option-${blockIdx}-${optIdx}`}
                                                  />
                                                  <Label htmlFor={`field-${block.id}-${optIdx}`} className="text-sm">
                                                    {option}
                                                  </Label>
                                                </div>
                                              ))}
                                            </RadioGroup>
                                          )}
                                          {field.fieldType === 'CHECKBOX' && field.options && (
                                            <div className="space-y-2" data-testid={`checkbox-group-field-${blockIdx}`}>
                                              {field.options.map((option: string, optIdx: number) => {
                                                const selectedValues = formAnswers.get(block.id) || [];
                                                const isChecked = Array.isArray(selectedValues) && selectedValues.includes(option);
                                                return (
                                                  <div key={optIdx} className="flex items-center space-x-2">
                                                    <Checkbox
                                                      id={`field-${block.id}-${optIdx}`}
                                                      checked={isChecked}
                                                      onCheckedChange={(checked) => {
                                                        const currentValues = formAnswers.get(block.id) || [];
                                                        const values = Array.isArray(currentValues) ? currentValues : [];
                                                        if (checked) {
                                                          handleFormFieldChange(block.id, [...values, option]);
                                                        } else {
                                                          handleFormFieldChange(block.id, values.filter((v: string) => v !== option));
                                                        }
                                                      }}
                                                      data-testid={`checkbox-option-${blockIdx}-${optIdx}`}
                                                    />
                                                    <Label htmlFor={`field-${block.id}-${optIdx}`} className="text-sm">
                                                      {option}
                                                    </Label>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4">
                                  {section.blocks.filter((b: any) => b.column === 0).map((block: any, blockIdx: number) => (
                                    <div key={blockIdx}>
                                      {block.type === 'HEADING' && block.content && (
                                        <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                      )}
                                      {block.type === 'TEXT' && block.content && (
                                        <div className="text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }} />
                                      )}
                                      {block.type === 'SPACER' && (
                                        <div className="py-6" />
                                      )}
                                      {block.type === 'IMAGE' && block.content && (() => {
                                        const imageData: ImageContent = typeof block.content === 'string' 
                                          ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                          : block.content;
                                        const isRounded = imageData.borderRadius === 'rounded';
                                        const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                          : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                          : 'h-[150px] w-[150px]';
                                        
                                        if (isRounded) {
                                          return (
                                            <div className={cn("rounded-full overflow-hidden border-4 border-border shadow-lg mx-auto", sizeClass)}>
                                              <img 
                                                src={imageData.url} 
                                                alt="" 
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                          );
                                        }
                                        
                                        const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                          : imageData.size === 'large' ? 'max-h-[300px]' 
                                          : 'max-h-[150px]';
                                        return (
                                          <div className="-mx-4 sm:-mx-6">
                                            <img 
                                              src={imageData.url} 
                                              alt="" 
                                              className={cn("w-full rounded-none object-cover", maxHeightClass)} 
                                            />
                                          </div>
                                        );
                                      })()}
                                      {block.type === 'FORM_FIELD' && block.content && (() => {
                                        const field = block.content;
                                        return (
                                          <div className="space-y-2">
                                            <Label htmlFor={`field-${block.id}`} className="text-sm font-medium">
                                              {field.label}
                                              {field.required && <span className="text-destructive ml-1">*</span>}
                                            </Label>
                                            {field.fieldType === 'TEXT_INPUT' && (
                                              <Input
                                                id={`field-${block.id}`}
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                data-testid={`input-form-field-${blockIdx}`}
                                              />
                                            )}
                                            {field.fieldType === 'TEXTAREA' && (
                                              <Textarea
                                                id={`field-${block.id}`}
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                rows={4}
                                                data-testid={`textarea-form-field-${blockIdx}`}
                                              />
                                            )}
                                            {field.fieldType === 'NUMBER' && (
                                              <Input
                                                id={`field-${block.id}`}
                                                type="number"
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                data-testid={`input-number-field-${blockIdx}`}
                                              />
                                            )}
                                            {field.fieldType === 'EMAIL' && (
                                              <Input
                                                id={`field-${block.id}`}
                                                type="email"
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                data-testid={`input-email-field-${blockIdx}`}
                                              />
                                            )}
                                            {field.fieldType === 'DATE' && (
                                              <Input
                                                id={`field-${block.id}`}
                                                type="date"
                                                required={field.required}
                                                data-testid={`input-date-field-${blockIdx}`}
                                              />
                                            )}
                                            {field.fieldType === 'MULTIPLE_CHOICE' && field.options && (
                                              <RadioGroup data-testid={`radio-group-field-${blockIdx}`}>
                                                {field.options.map((option: string, optIdx: number) => (
                                                  <div key={optIdx} className="flex items-center space-x-2">
                                                    <input
                                                      type="radio"
                                                      id={`field-${block.id}-${optIdx}`}
                                                      name={`field-${block.id}`}
                                                      value={option}
                                                      required={field.required}
                                                      className="w-4 h-4"
                                                      data-testid={`radio-option-${blockIdx}-${optIdx}`}
                                                    />
                                                    <Label htmlFor={`field-${block.id}-${optIdx}`} className="text-sm">
                                                      {option}
                                                    </Label>
                                                  </div>
                                                ))}
                                              </RadioGroup>
                                            )}
                                            {field.fieldType === 'CHECKBOX' && field.options && (
                                              <div className="space-y-2" data-testid={`checkbox-group-field-${blockIdx}`}>
                                                {field.options.map((option: string, optIdx: number) => (
                                                  <div key={optIdx} className="flex items-center space-x-2">
                                                    <Checkbox
                                                      id={`field-${block.id}-${optIdx}`}
                                                      data-testid={`checkbox-option-${blockIdx}-${optIdx}`}
                                                    />
                                                    <Label htmlFor={`field-${block.id}-${optIdx}`} className="text-sm">
                                                      {option}
                                                    </Label>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  ))}
                                </div>
                                <div className="space-y-4">
                                  {section.blocks.filter((b: any) => b.column === 1).map((block: any, blockIdx: number) => (
                                    <div key={blockIdx}>
                                      {block.type === 'HEADING' && block.content && (
                                        <h3 className="text-2xl font-bold mb-2">{block.content}</h3>
                                      )}
                                      {block.type === 'TEXT' && block.content && (
                                        <div className="text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }} />
                                      )}
                                      {block.type === 'SPACER' && (
                                        <div className="py-6" />
                                      )}
                                      {block.type === 'IMAGE' && block.content && (() => {
                                        const imageData: ImageContent = typeof block.content === 'string' 
                                          ? { url: block.content, borderRadius: 'straight', size: 'medium' }
                                          : block.content;
                                        const isRounded = imageData.borderRadius === 'rounded';
                                        const sizeClass = imageData.size === 'small' ? 'h-[100px] w-[100px]' 
                                          : imageData.size === 'large' ? 'h-[300px] w-[300px]' 
                                          : 'h-[150px] w-[150px]';
                                        
                                        if (isRounded) {
                                          return (
                                            <div className={cn("rounded-full overflow-hidden border-4 border-border shadow-lg mx-auto", sizeClass)}>
                                              <img 
                                                src={imageData.url} 
                                                alt="" 
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                          );
                                        }
                                        
                                        const maxHeightClass = imageData.size === 'small' ? 'max-h-[100px]' 
                                          : imageData.size === 'large' ? 'max-h-[300px]' 
                                          : 'max-h-[150px]';
                                        return (
                                          <div className="-mx-4 sm:-mx-6">
                                            <img 
                                              src={imageData.url} 
                                              alt="" 
                                              className={cn("w-full rounded-none object-cover", maxHeightClass)} 
                                            />
                                          </div>
                                        );
                                      })()}
                                      {block.type === 'FORM_FIELD' && block.content && (() => {
                                        const field = block.content;
                                        return (
                                          <div className="space-y-2">
                                            <Label htmlFor={`field-${block.id}`} className="text-sm font-medium">
                                              {field.label}
                                              {field.required && <span className="text-destructive ml-1">*</span>}
                                            </Label>
                                            {field.fieldType === 'TEXT_INPUT' && (
                                              <Input
                                                id={`field-${block.id}`}
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                data-testid={`input-form-field-${blockIdx}`}
                                              />
                                            )}
                                            {field.fieldType === 'TEXTAREA' && (
                                              <Textarea
                                                id={`field-${block.id}`}
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                rows={4}
                                                data-testid={`textarea-form-field-${blockIdx}`}
                                              />
                                            )}
                                            {field.fieldType === 'NUMBER' && (
                                              <Input
                                                id={`field-${block.id}`}
                                                type="number"
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                data-testid={`input-number-field-${blockIdx}`}
                                              />
                                            )}
                                            {field.fieldType === 'EMAIL' && (
                                              <Input
                                                id={`field-${block.id}`}
                                                type="email"
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                data-testid={`input-email-field-${blockIdx}`}
                                              />
                                            )}
                                            {field.fieldType === 'DATE' && (
                                              <Input
                                                id={`field-${block.id}`}
                                                type="date"
                                                required={field.required}
                                                data-testid={`input-date-field-${blockIdx}`}
                                              />
                                            )}
                                            {field.fieldType === 'MULTIPLE_CHOICE' && field.options && (
                                              <RadioGroup data-testid={`radio-group-field-${blockIdx}`}>
                                                {field.options.map((option: string, optIdx: number) => (
                                                  <div key={optIdx} className="flex items-center space-x-2">
                                                    <input
                                                      type="radio"
                                                      id={`field-${block.id}-${optIdx}`}
                                                      name={`field-${block.id}`}
                                                      value={option}
                                                      required={field.required}
                                                      className="w-4 h-4"
                                                      data-testid={`radio-option-${blockIdx}-${optIdx}`}
                                                    />
                                                    <Label htmlFor={`field-${block.id}-${optIdx}`} className="text-sm">
                                                      {option}
                                                    </Label>
                                                  </div>
                                                ))}
                                              </RadioGroup>
                                            )}
                                            {field.fieldType === 'CHECKBOX' && field.options && (
                                              <div className="space-y-2" data-testid={`checkbox-group-field-${blockIdx}`}>
                                                {field.options.map((option: string, optIdx: number) => (
                                                  <div key={optIdx} className="flex items-center space-x-2">
                                                    <Checkbox
                                                      id={`field-${block.id}-${optIdx}`}
                                                      data-testid={`checkbox-option-${blockIdx}-${optIdx}`}
                                                    />
                                                    <Label htmlFor={`field-${block.id}-${optIdx}`} className="text-sm">
                                                      {option}
                                                    </Label>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No form fields available</p>
                        </div>
                      )}

                      {/* Submit Button */}
                      <div className="pt-4 border-t">
                        <Button 
                          type="submit" 
                          className="w-full" 
                          size="lg"
                          data-testid="button-submit-form"
                        >
                          Submit Form
                        </Button>
                      </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {/* SCHEDULING Page */}
                {currentPage.pageType === "SCHEDULING" && (
                  <>
                    {isLoadingBooking ? (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="animate-pulse">
                              <div className="h-8 bg-muted rounded w-3/4 mx-auto mb-4"></div>
                              <div className="h-4 bg-muted rounded w-1/2 mx-auto mb-6"></div>
                              <div className="h-64 bg-muted rounded"></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (bookingSuccess && bookingDetails) || existingBookingData?.booking ? (
                      <Card data-testid="card-booking-success">
                        <CardContent className="pt-6">
                          <div className="text-center space-y-4">
                            {/* Show photographer photo if available */}
                            {existingBookingData?.photographer?.headshotUrl && (
                              <div className="mx-auto w-24 h-24 rounded-full overflow-hidden border-4 border-border">
                                <img 
                                  src={existingBookingData.photographer.headshotUrl} 
                                  alt={existingBookingData.photographer.businessName || existingBookingData.photographer.photographerName}
                                  className="w-full h-full object-cover"
                                  data-testid="img-photographer-headshot"
                                />
                              </div>
                            )}
                            
                            <div className={cn(
                              "mx-auto w-16 h-16 rounded-full flex items-center justify-center",
                              existingBookingData?.booking?.status === 'CANCELLED' 
                                ? "bg-red-100 dark:bg-red-900" 
                                : "bg-green-100 dark:bg-green-900"
                            )}>
                              <Check className={cn(
                                "w-8 h-8",
                                existingBookingData?.booking?.status === 'CANCELLED'
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-green-600 dark:text-green-400"
                              )} />
                            </div>
                            <div>
                              <h3 className="text-2xl font-semibold mb-2" data-testid="text-booking-confirmed">
                                {existingBookingData?.booking?.status === 'CANCELLED' 
                                  ? 'Appointment Cancelled' 
                                  : 'Appointment Confirmed!'}
                              </h3>
                              <p className="text-muted-foreground">
                                {existingBookingData?.booking?.status === 'CANCELLED'
                                  ? 'This appointment has been cancelled'
                                  : (bookingSuccess 
                                    ? 'Your appointment has been successfully scheduled'
                                    : 'Your appointment details')}
                              </p>
                            </div>
                            <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-4 space-y-2">
                              <div className="flex items-center justify-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span data-testid="text-booking-date">
                                  {existingBookingData?.booking 
                                    ? new Date(existingBookingData.booking.startAt).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })
                                    : bookingDetails?.date.toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                </span>
                              </div>
                              <div className="flex items-center justify-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span data-testid="text-booking-time">
                                  {existingBookingData?.booking
                                    ? new Date(existingBookingData.booking.startAt).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      })
                                    : bookingDetails && new Date(`2000-01-01T${bookingDetails.time}`).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                </span>
                              </div>
                              {existingBookingData?.booking?.status && (
                                <div className="pt-2">
                                  <Badge 
                                    variant={existingBookingData.booking.status === 'CANCELLED' ? 'destructive' : 'default'}
                                    data-testid={`badge-status-${existingBookingData.booking.status.toLowerCase()}`}
                                  >
                                    {existingBookingData.booking.status}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            {bookingSuccess && (
                              <p className="text-sm text-muted-foreground">
                                A confirmation email has been sent to you with all the details.
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <SchedulingCalendar
                        heading={currentPage.content.heading}
                        description={currentPage.content.description}
                        durationMinutes={currentPage.content.durationMinutes}
                        bookingType={currentPage.content.bookingType}
                        bufferBefore={currentPage.content.bufferBefore}
                        bufferAfter={currentPage.content.bufferAfter}
                        allowRescheduling={currentPage.content.allowRescheduling}
                        isPreview={false}
                        isLoading={bookingMutation.isPending}
                        photographerName={data.photographer.businessName}
                        photographerPhoto={null}
                        photographerId={data.photographer.id}
                        showPhotographerProfile={currentPage.content.showPhotographerProfile ?? true}
                        onBookingConfirm={(date, time) => {
                          setBookingDetails({ date, time });
                          bookingMutation.mutate({
                            date,
                            time,
                            durationMinutes: currentPage.content.durationMinutes || 60
                          });
                        }}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Edit Selections Button - Shows when accepted but not fully paid, and Smart File has packages/add-ons */}
              {['ACCEPTED', 'DEPOSIT_PAID'].includes(data.projectSmartFile.status) && 
               sortedPages.some(p => p.pageType === 'PACKAGE' || p.pageType === 'ADDON') && (
                <div className="mt-6">
                  <Button
                    onClick={() => resetSelectionsMutation.mutate()}
                    variant="outline"
                    className="w-full"
                    disabled={resetSelectionsMutation.isPending}
                    data-testid="button-edit-selections"
                  >
                    {resetSelectionsMutation.isPending ? "Resetting..." : "Edit Selections"}
                  </Button>
                </div>
              )}

              {/* Pay Balance Button - Shows on all pages when deposit is paid and balance is due */}
              {data.projectSmartFile.status === 'DEPOSIT_PAID' && currentPage.pageType !== 'PAYMENT' && paymentPageIndex !== -1 && (
                <div className="mt-6">
                  <Button
                    onClick={() => setCurrentPageIndex(paymentPageIndex)}
                    className="w-full"
                    size="lg"
                    data-testid="button-pay-balance"
                  >
                    Pay Remaining Balance ({formatPrice(data.projectSmartFile.balanceDueCents || 0)})
                  </Button>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                  disabled={currentPageIndex === 0}
                  data-testid="button-previous-page"
                >
                  Previous
                </Button>
                <div className="flex flex-col items-end gap-1">
                  {!canAccessPayment && currentPageIndex + 1 === paymentPageIndex && (
                    <p className="text-xs text-muted-foreground" data-testid="text-signature-required">
                      Please sign the contract to proceed
                    </p>
                  )}
                  <Button
                    onClick={async () => {
                      const nextIndex = currentPageIndex + 1;
                      const currentPage = sortedPages[currentPageIndex];

                      // In preview mode, skip all contract validation - just navigate
                      if (isPreviewMode) {
                        setCurrentPageIndex(Math.min(sortedPages.length - 1, nextIndex));
                        return;
                      }

                      // If on CONTRACT page and not yet signed, validate and save signature
                      if (currentPage?.pageType === 'CONTRACT' && !data.projectSmartFile.clientSignatureUrl) {
                        // Read signature from canvas ref
                        const signatureData = signaturePadRef.current?.getCanvasData();

                        // Check if signature was drawn
                        if (!signatureData) {
                          toast({
                            title: "Signature Required",
                            description: "Please sign the contract before continuing.",
                            variant: "destructive"
                          });
                          return;
                        }

                        // Check if terms accepted
                        if (!acceptedTerms) {
                          toast({
                            title: "Terms Required",
                            description: "Please accept the terms to continue.",
                            variant: "destructive"
                          });
                          return;
                        }

                        // Save signature before navigating
                        try {
                          await saveSignatureMutation.mutateAsync({
                            clientSignatureUrl: signatureData,
                            contractTermsAccepted: acceptedTerms
                          });
                          // CRITICAL: Wait for query to refetch so data.clientSignatureUrl is populated
                          // This ensures auto-accept logic on PAY page sees the updated signature
                          await queryClient.refetchQueries({ queryKey: [`/api/public/smart-files/${params?.token}`] });
                        } catch (err) {
                          // Error toast already shown by mutation
                          return;
                        }
                      }

                      // Block navigation to payment page if signature is required but not provided
                      if (nextIndex === paymentPageIndex && !canAccessPayment) {
                        toast({
                          title: "Signature Required",
                          description: "Please sign the contract before proceeding to payment.",
                          variant: "destructive"
                        });
                        return;
                      }
                      setCurrentPageIndex(Math.min(sortedPages.length - 1, nextIndex));
                    }}
                    disabled={currentPageIndex === sortedPages.length - 1}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
