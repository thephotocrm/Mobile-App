import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  User,
  Building2,
  Palette,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Upload,
  Globe,
  MapPin,
  Phone,
  Clock,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Confetti from "react-confetti";
import { getAccessibleTextColor } from "@shared/color-utils";

type OnboardingStep = "welcome" | "info" | "business" | "branding" | "complete";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

const SPECIALTIES = [
  { id: "weddings", label: "Weddings", emoji: "💒" },
  { id: "portraits", label: "Portraits", emoji: "👤" },
  { id: "events", label: "Events", emoji: "🎉" },
  { id: "commercial", label: "Commercial", emoji: "🏢" },
  { id: "newborn", label: "Newborn", emoji: "👶" },
  { id: "family", label: "Family", emoji: "👨‍👩‍👧‍👦" },
  { id: "boudoir", label: "Boudoir", emoji: "✨" },
  { id: "real-estate", label: "Real Estate", emoji: "🏠" },
  { id: "product", label: "Product", emoji: "📦" },
  { id: "fashion", label: "Fashion", emoji: "👗" },
];

type PhotographerData = {
  id: string;
  businessName: string;
  photographerName: string | null;
  phone: string | null;
  timezone: string;
  businessAddress: string | null;
  website: string | null;
  logoUrl: string | null;
  headshotUrl: string | null;
  brandPrimary: string | null;
  brandSecondary: string | null;
  onboardingCompletedAt: Date | null;
};

export default function OnboardingWizard({
  open,
  onComplete,
}: {
  open: boolean;
  onComplete: () => void;
}) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [showConfetti, setShowConfetti] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const { toast } = useToast();

  // Form state
  const [photographerName, setPhotographerName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [businessAddress, setBusinessAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [headshotFile, setHeadshotFile] = useState<File | null>(null);
  const [headshotPreview, setHeadshotPreview] = useState<string>("");
  const [brandPrimary, setBrandPrimary] = useState("#3b82f6");
  const [brandSecondary, setBrandSecondary] = useState("#8b5cf6");

  const { data: photographer } = useQuery<PhotographerData>({
    queryKey: ["/api/photographers/me"],
  });

  // Window size for confetti (SSR safe)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      const handleResize = () =>
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onComplete();
      }
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open, onComplete]);

  // Auto-populate form when photographer data loads
  useEffect(() => {
    if (photographer) {
      setPhotographerName(photographer.photographerName || "");
      setPhone(photographer.phone || "");
      setTimezone(photographer.timezone || "America/New_York");
      setBusinessAddress(photographer.businessAddress || "");
      setWebsite(photographer.website || "");
      setLogoPreview(photographer.logoUrl || "");
      setHeadshotPreview(photographer.headshotUrl || "");
      setBrandPrimary(photographer.brandPrimary || "#3b82f6");
      setBrandSecondary(photographer.brandSecondary || "#8b5cf6");
    }
  }, [photographer]);

  const updatePhotographerMutation = useMutation({
    mutationFn: async (data: Partial<PhotographerData>) => {
      return apiRequest("PATCH", "/api/photographers/me", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photographers/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photographer"] });
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/photographers/me/complete-onboarding");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photographers/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photographer"] });
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
        onComplete();
      }, 3000);
    },
  });

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSpecialty = (id: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleSaveInfo = async () => {
    await updatePhotographerMutation.mutateAsync({
      photographerName: photographerName || null,
      phone: phone || null,
      timezone,
    });
    setCurrentStep("business");
  };

  const handleSaveBusiness = async () => {
    await updatePhotographerMutation.mutateAsync({
      businessAddress: businessAddress || null,
      website: website || null,
    });
    setCurrentStep("branding");
  };

  const handleSaveBranding = async () => {
    setIsUploading(true);
    try {
      let finalLogoUrl = logoPreview;
      let finalHeadshotUrl = headshotPreview;

      // Upload logo if new file selected
      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        const response = await fetch("/api/upload/logo", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Logo upload failed");
        }
        const data = await response.json();
        finalLogoUrl = data.logoUrl;
      }

      // Upload headshot if new file selected
      if (headshotFile) {
        const formData = new FormData();
        formData.append("headshot", headshotFile);
        const response = await fetch("/api/upload/headshot", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Headshot upload failed");
        }
        const data = await response.json();
        finalHeadshotUrl = data.headshotUrl;
      }

      await updatePhotographerMutation.mutateAsync({
        logoUrl: finalLogoUrl || null,
        headshotUrl: finalHeadshotUrl || null,
        brandPrimary,
        brandSecondary,
      });

      toast({ title: "Branding saved!" });
      setCurrentStep("complete");
    } catch (error) {
      toast({
        title: "Upload Failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not save branding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleComplete = async () => {
    await completeOnboardingMutation.mutateAsync();
  };

  const steps: OnboardingStep[] = [
    "welcome",
    "info",
    "business",
    "branding",
    "complete",
  ];
  const stepIndex = steps.indexOf(currentStep);
  const progress = (stepIndex / (steps.length - 1)) * 100;

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

      <div
        className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden"
        data-testid="onboarding-wizard"
        role="dialog"
        aria-modal="true"
        aria-label="Setup wizard"
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 hover:bg-white/80"
          onClick={onComplete}
          aria-label="Close setup wizard"
          data-testid="close-wizard-button"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-100/40 to-purple-100/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-pink-100/40 to-orange-100/40 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-50/30 to-purple-50/30 rounded-full blur-3xl" />
        </div>

        {/* Progress bar */}
        {currentStep !== "welcome" && currentStep !== "complete" && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        )}

        {/* Main content */}
        <div className="relative h-full flex items-center justify-center p-8">
          <AnimatePresence mode="wait">
            {/* Welcome Step */}
            {currentStep === "welcome" && (
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
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/25">
                    <Camera className="w-12 h-12 text-white" />
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
                  data-testid="text-welcome-title"
                >
                  Welcome to ThePhotoCRM
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="text-xl text-gray-600 mb-8 leading-relaxed"
                >
                  Let's set up your studio in just a few minutes.
                  <br />
                  You'll be ready to book your next client in no time.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="flex flex-col items-center gap-4"
                >
                  <Button
                    size="lg"
                    onClick={() => setCurrentStep("info")}
                    className="px-8 py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
                    data-testid="button-get-started"
                  >
                    Get Started
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <button
                    onClick={onComplete}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    data-testid="button-skip-onboarding"
                  >
                    I'll set this up later
                  </button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="mt-12 flex justify-center gap-8 text-sm text-gray-500"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <span>Your Info</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-purple-600" />
                    </div>
                    <span>Business</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                      <Palette className="w-4 h-4 text-pink-600" />
                    </div>
                    <span>Branding</span>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Info Step */}
            {currentStep === "info" && (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-xl mx-auto"
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/50 p-8 md:p-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <User className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2
                        className="text-2xl font-bold text-gray-900"
                        data-testid="text-info-title"
                      >
                        Tell us about yourself
                      </h2>
                      <p className="text-gray-500">
                        This helps personalize your client experience
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-sm font-medium flex items-center gap-2"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        Your Name
                      </Label>
                      <Input
                        id="name"
                        placeholder="e.g., Sarah Johnson"
                        value={photographerName}
                        onChange={(e) => setPhotographerName(e.target.value)}
                        className="h-12 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                        data-testid="input-photographer-name"
                      />
                      <p className="text-xs text-gray-400">
                        Used in email signatures and automated messages
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="phone"
                        className="text-sm font-medium flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4 text-gray-400" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-12 text-base border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                        data-testid="input-phone"
                      />
                      <p className="text-xs text-gray-400">
                        For SMS notifications and client communication
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="timezone"
                        className="text-sm font-medium flex items-center gap-2"
                      >
                        <Clock className="w-4 h-4 text-gray-400" />
                        Timezone
                      </Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger
                          className="h-12 text-base border-gray-200"
                          data-testid="select-timezone"
                        >
                          <SelectValue placeholder="Select your timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-400">
                        Ensures accurate scheduling for you and clients
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep("welcome")}
                      className="h-12 px-6"
                      data-testid="button-back-info"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSaveInfo}
                      disabled={updatePhotographerMutation.isPending}
                      className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      data-testid="button-continue-info"
                    >
                      {updatePhotographerMutation.isPending
                        ? "Saving..."
                        : "Continue"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Business Step */}
            {currentStep === "business" && (
              <motion.div
                key="business"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-xl mx-auto"
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/50 p-8 md:p-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2
                        className="text-2xl font-bold text-gray-900"
                        data-testid="text-business-title"
                      >
                        Your Business
                      </h2>
                      <p className="text-gray-500">
                        Help clients find and connect with you
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="address"
                        className="text-sm font-medium flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4 text-gray-400" />
                        Business Address
                      </Label>
                      <Textarea
                        id="address"
                        placeholder="123 Main Street, City, State 12345"
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        className="min-h-[80px] text-base border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                        data-testid="input-business-address"
                      />
                      <p className="text-xs text-gray-400">
                        Appears on invoices and contracts
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="website"
                        className="text-sm font-medium flex items-center gap-2"
                      >
                        <Globe className="w-4 h-4 text-gray-400" />
                        Website
                      </Label>
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://yourwebsite.com"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="h-12 text-base border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                        data-testid="input-website"
                      />
                      <p className="text-xs text-gray-400">
                        Included in your email signature
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Camera className="w-4 h-4 text-gray-400" />
                        What do you photograph?
                      </Label>
                      <div
                        className="flex flex-wrap gap-2"
                        data-testid="specialty-options"
                      >
                        {SPECIALTIES.map((specialty) => (
                          <button
                            key={specialty.id}
                            onClick={() => toggleSpecialty(specialty.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              selectedSpecialties.includes(specialty.id)
                                ? "bg-purple-100 text-purple-700 ring-2 ring-purple-500 ring-offset-1"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                            data-testid={`specialty-${specialty.id}`}
                          >
                            {specialty.emoji} {specialty.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400">
                        Select all that apply
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep("info")}
                      className="h-12 px-6"
                      data-testid="button-back-business"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSaveBusiness}
                      disabled={updatePhotographerMutation.isPending}
                      className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      data-testid="button-continue-business"
                    >
                      {updatePhotographerMutation.isPending
                        ? "Saving..."
                        : "Continue"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Branding Step */}
            {currentStep === "branding" && (
              <motion.div
                key="branding"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-3xl mx-auto"
              >
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/50 p-8 md:p-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
                      <Palette className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2
                        className="text-2xl font-bold text-gray-900"
                        data-testid="text-branding-title"
                      >
                        Make it yours
                      </h2>
                      <p className="text-gray-500">
                        Customize how clients see your brand
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Left column - Uploads */}
                    <div className="space-y-6">
                      {/* Logo Upload */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          Business Logo
                        </Label>
                        <div
                          className="relative border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-pink-400 transition-colors cursor-pointer group"
                          onClick={() =>
                            document.getElementById("logo-upload")?.click()
                          }
                        >
                          {logoPreview ? (
                            <div className="flex flex-col items-center">
                              <img
                                src={logoPreview}
                                alt="Logo"
                                className="w-24 h-24 object-contain rounded-lg mb-2"
                              />
                              <p className="text-sm text-gray-500">
                                Click to change
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center py-4">
                              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-pink-50 transition-colors">
                                <Upload className="w-8 h-8 text-gray-400 group-hover:text-pink-500 transition-colors" />
                              </div>
                              <p className="text-sm font-medium text-gray-700">
                                Upload your logo
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                PNG, JPG or SVG
                              </p>
                            </div>
                          )}
                          <input
                            id="logo-upload"
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleFileChange(e, setLogoFile, setLogoPreview)
                            }
                            className="hidden"
                            data-testid="input-logo-upload"
                          />
                        </div>
                      </div>

                      {/* Headshot Upload */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          Your Headshot
                        </Label>
                        <div
                          className="relative border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-pink-400 transition-colors cursor-pointer group"
                          onClick={() =>
                            document.getElementById("headshot-upload")?.click()
                          }
                        >
                          {headshotPreview ? (
                            <div className="flex flex-col items-center">
                              <img
                                src={headshotPreview}
                                alt="Headshot"
                                className="w-24 h-24 object-cover rounded-full mb-2"
                              />
                              <p className="text-sm text-gray-500">
                                Click to change
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center py-4">
                              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-pink-50 transition-colors">
                                <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-pink-500 transition-colors" />
                              </div>
                              <p className="text-sm font-medium text-gray-700">
                                Upload your photo
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                For email signatures
                              </p>
                            </div>
                          )}
                          <input
                            id="headshot-upload"
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleFileChange(
                                e,
                                setHeadshotFile,
                                setHeadshotPreview,
                              )
                            }
                            className="hidden"
                            data-testid="input-headshot-upload"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right column - Colors & Preview */}
                    <div className="space-y-6">
                      {/* Color Pickers */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Primary Color
                          </Label>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-12 h-12 rounded-xl cursor-pointer shadow-sm border border-gray-200 overflow-hidden"
                              onClick={() =>
                                document
                                  .getElementById("primary-color")
                                  ?.click()
                              }
                            >
                              <input
                                id="primary-color"
                                type="color"
                                value={brandPrimary}
                                onChange={(e) =>
                                  setBrandPrimary(e.target.value)
                                }
                                className="w-16 h-16 -m-2 cursor-pointer"
                                data-testid="input-brand-primary"
                              />
                            </div>
                            <Input
                              value={brandPrimary}
                              onChange={(e) => setBrandPrimary(e.target.value)}
                              className="flex-1 h-10 text-sm font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Secondary Color
                          </Label>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-12 h-12 rounded-xl cursor-pointer shadow-sm border border-gray-200 overflow-hidden"
                              onClick={() =>
                                document
                                  .getElementById("secondary-color")
                                  ?.click()
                              }
                            >
                              <input
                                id="secondary-color"
                                type="color"
                                value={brandSecondary}
                                onChange={(e) =>
                                  setBrandSecondary(e.target.value)
                                }
                                className="w-16 h-16 -m-2 cursor-pointer"
                                data-testid="input-brand-secondary"
                              />
                            </div>
                            <Input
                              value={brandSecondary}
                              onChange={(e) =>
                                setBrandSecondary(e.target.value)
                              }
                              className="flex-1 h-10 text-sm font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Live Preview */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Preview</Label>
                        <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                          <div className="flex items-center gap-3">
                            {logoPreview ? (
                              <img
                                src={logoPreview}
                                alt="Logo"
                                className="w-10 h-10 object-contain"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-200" />
                            )}
                            <div>
                              <p className="font-semibold text-gray-900">
                                {photographer?.businessName || "Your Business"}
                              </p>
                              <p className="text-xs text-gray-500">
                                Photography Studio
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              style={{
                                backgroundColor: brandPrimary,
                                color: getAccessibleTextColor(brandPrimary),
                              }}
                            >
                              View Proposal
                            </button>
                            <button
                              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              style={{
                                backgroundColor: brandSecondary,
                                color: getAccessibleTextColor(brandSecondary),
                              }}
                            >
                              Book Session
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep("business")}
                      className="h-12 px-6"
                      data-testid="button-back-branding"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSaveBranding}
                      disabled={
                        updatePhotographerMutation.isPending || isUploading
                      }
                      className="flex-1 h-12 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
                      data-testid="button-continue-branding"
                    >
                      {isUploading || updatePhotographerMutation.isPending
                        ? "Saving..."
                        : "Finish Setup"}
                      <Sparkles className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Complete Step */}
            {currentStep === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center max-w-xl mx-auto"
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mb-8"
                >
                  <div className="w-28 h-28 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30">
                    <Check className="w-14 h-14 text-white" strokeWidth={3} />
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-4xl font-bold text-gray-900 mb-4"
                  data-testid="text-complete-title"
                >
                  You're all set! 🎉
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-xl text-gray-600 mb-8"
                >
                  Your studio is ready. Let's start booking clients!
                </motion.p>

                {/* Summary */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 text-left shadow-lg"
                >
                  <h3 className="font-semibold text-gray-900 mb-4">
                    What's set up:
                  </h3>
                  <div className="space-y-3">
                    {photographerName && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-gray-700">
                          Personal info saved
                        </span>
                      </div>
                    )}
                    {(businessAddress || website) && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-gray-700">
                          Business details added
                        </span>
                      </div>
                    )}
                    {(logoPreview || brandPrimary !== "#3b82f6") && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-gray-700">Brand customized</span>
                      </div>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button
                    size="lg"
                    onClick={handleComplete}
                    disabled={completeOnboardingMutation.isPending}
                    className="px-10 py-6 text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/25"
                    data-testid="button-complete-onboarding"
                  >
                    {completeOnboardingMutation.isPending
                      ? "Finishing..."
                      : "Go to Dashboard"}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="mt-6 text-sm text-gray-500"
                >
                  You can connect Google Calendar and Stripe later in Settings
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
