import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Send,
  Sparkles,
  Bot,
  User,
  Rocket,
  Mail,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type WizardPhase = "conversation" | "confirm" | "building" | "complete";

type AICampaignWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCampaignCreated: (campaignId: string) => void;
};

const BUILDING_STEPS = [
  { icon: Mail, text: "Crafting compelling subject lines..." },
  { icon: Sparkles, text: "Generating personalized email content..." },
  { icon: Clock, text: "Optimizing send timing..." },
  { icon: CheckCircle2, text: "Finalizing your campaign..." },
];

export function AICampaignWizard({
  open,
  onOpenChange,
  onCampaignCreated,
}: AICampaignWizardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [phase, setPhase] = useState<WizardPhase>("conversation");
  const [buildingStep, setBuildingStep] = useState(0);
  const [campaignSummary, setCampaignSummary] = useState<string>("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && messages.length === 0) {
      startConversation();
    }
  }, [open]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current && phase === "conversation") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, isLoading, phase]);

  // Animate through building steps
  useEffect(() => {
    if (phase === "building") {
      const interval = setInterval(() => {
        setBuildingStep((prev) => {
          if (prev < BUILDING_STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const startConversation = async () => {
    setIsLoading(true);
    setPhase("conversation");
    try {
      const res = await apiRequest("POST", "/api/ai-campaign-wizard/start");
      const data = await res.json();

      setConversationId(data.conversationId);
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: data.message,
        },
      ]);
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast({
        title: "Error",
        description: "Failed to start AI wizard. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !conversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await apiRequest("POST", "/api/ai-campaign-wizard/message", {
        conversationId,
        message: userMessage.content,
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || "Failed to get response");
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Check if AI is ready to generate the campaign
      if (data.readyToGenerate) {
        setCampaignSummary(data.message);
        setPhase("confirm");
      } else if (data.campaignCreated && data.campaignId) {
        // Direct creation (fallback)
        handleCampaignSuccess(data.campaignId);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startBuildingCampaign = async () => {
    setPhase("building");
    setBuildingStep(0);

    try {
      const res = await apiRequest("POST", "/api/ai-campaign-wizard/generate", {
        conversationId,
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || "Failed to generate campaign");
      }

      const data = await res.json();

      if (data.campaignCreated && data.campaignId) {
        setPhase("complete");
        setTimeout(() => {
          handleCampaignSuccess(data.campaignId);
        }, 1500);
      } else {
        throw new Error("Campaign generation failed");
      }
    } catch (error) {
      console.error("Failed to generate campaign:", error);
      toast({
        title: "Error",
        description: "Failed to generate campaign. Please try again.",
        variant: "destructive",
      });
      // Return to confirm phase so user can retry (not conversation)
      setBuildingStep(0);
      setPhase("confirm");
    }
  };

  const handleCampaignSuccess = (campaignId: string) => {
    toast({
      title: "Campaign Created!",
      description: "Your AI-generated campaign is ready to edit.",
    });
    onCampaignCreated(campaignId);
    handleClose();
  };

  const handleClose = () => {
    setMessages([]);
    setConversationId(null);
    setInput("");
    setPhase("conversation");
    setBuildingStep(0);
    setCampaignSummary("");
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const goBackToConversation = () => {
    setPhase("conversation");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Campaign Wizard
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Conversation Phase */}
          {phase === "conversation" && (
            <motion.div
              key="conversation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
                <div className="py-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                      {message.role === "user" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <User className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="px-6 py-4 border-t">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      conversationId
                        ? "Type your response..."
                        : "Starting conversation..."
                    }
                    disabled={isLoading || !conversationId}
                    data-testid="input-ai-wizard-message"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading || !conversationId}
                    data-testid="button-send-ai-message"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Confirmation Phase */}
          {phase === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center px-8 py-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6"
              >
                <Rocket className="w-10 h-10 text-primary" />
              </motion.div>

              <h3 className="text-xl font-semibold mb-2 text-center">
                Ready to Build Your Campaign!
              </h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                I've gathered all the details I need. Click below to generate
                your personalized email campaign.
              </p>

              <div className="bg-muted/50 rounded-lg p-4 mb-6 max-w-md w-full">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {campaignSummary}
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={goBackToConversation}>
                  Go Back
                </Button>
                <Button
                  onClick={startBuildingCampaign}
                  className="gap-2"
                  data-testid="button-start-building-campaign"
                >
                  <Sparkles className="w-4 h-4" />
                  Start Building Campaign
                </Button>
              </div>
            </motion.div>
          )}

          {/* Building Phase */}
          {phase === "building" && (
            <motion.div
              key="building"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-8 py-6"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary mb-8"
              />

              <h3 className="text-xl font-semibold mb-6 text-center">
                Building Your Campaign...
              </h3>

              <div className="space-y-3 w-full max-w-sm">
                {BUILDING_STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index === buildingStep;
                  const isComplete = index < buildingStep;

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: isActive || isComplete ? 1 : 0.4,
                        x: 0,
                      }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-primary/10"
                          : isComplete
                            ? "bg-green-500/10"
                            : "bg-muted/50"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : isActive ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                      ) : (
                        <StepIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span
                        className={`text-sm ${isActive ? "text-primary font-medium" : isComplete ? "text-green-600" : "text-muted-foreground"}`}
                      >
                        {step.text}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Complete Phase */}
          {phase === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-8 py-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </motion.div>

              <h3 className="text-xl font-semibold mb-2 text-center">
                Campaign Created!
              </h3>
              <p className="text-muted-foreground text-center">
                Taking you to the editor...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
