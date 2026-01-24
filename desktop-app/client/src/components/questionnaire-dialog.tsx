import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Question {
  id: string;
  type: string;
  label: string;
  options: string[] | null;
  orderIndex: number;
}

interface QuestionnaireData {
  id: string;
  templateId: string;
  template: {
    title: string;
    description?: string;
  };
  questions: Question[];
  answers: Record<string, any> | null;
  submittedAt: string | null;
}

interface QuestionnaireDialogProps {
  questionnaire: {
    id: string;
    templateId: string;
    template: {
      title: string;
      description?: string;
    };
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function QuestionnaireDialog({
  questionnaire,
  open,
  onOpenChange,
  onComplete,
}: QuestionnaireDialogProps) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  // Fetch questionnaire details with questions
  const { data: questionnaireData, isLoading } = useQuery<QuestionnaireData>({
    queryKey: [`/api/client-portal/questionnaires/${questionnaire?.id}`],
    enabled: open && !!questionnaire?.id,
  });

  // Reset state when dialog opens with new questionnaire
  useEffect(() => {
    if (open && questionnaireData) {
      setAnswers(questionnaireData.answers || {});
      setSubmitted(!!questionnaireData.submittedAt);
    }
  }, [open, questionnaireData]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (answers: Record<string, any>) => {
      return apiRequest(
        "PUT",
        `/api/client-portal/questionnaires/${questionnaire?.id}`,
        { answers },
      );
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal"] });
      onComplete();
    },
  });

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleCheckboxChange = (
    questionId: string,
    option: string,
    checked: boolean,
  ) => {
    setAnswers((prev) => {
      const currentValues = Array.isArray(prev[questionId])
        ? prev[questionId]
        : [];
      if (checked) {
        return { ...prev, [questionId]: [...currentValues, option] };
      } else {
        return {
          ...prev,
          [questionId]: currentValues.filter((v: string) => v !== option),
        };
      }
    });
  };

  const handleSubmit = () => {
    submitMutation.mutate(answers);
  };

  const renderQuestion = (question: Question) => {
    const value = answers[question.id];

    switch (question.type) {
      case "TEXT":
        return (
          <Input
            value={value || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Your answer..."
            disabled={submitted}
            className="mt-2"
          />
        );

      case "TEXTAREA":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Your answer..."
            rows={4}
            disabled={submitted}
            className="mt-2"
          />
        );

      case "MULTIPLE_CHOICE":
        return (
          <RadioGroup
            value={value || ""}
            onValueChange={(val) => handleAnswerChange(question.id, val)}
            disabled={submitted}
            className="mt-3 space-y-2"
          >
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${idx}`} />
                <Label
                  htmlFor={`${question.id}-${idx}`}
                  className="font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "CHECKBOX":
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="mt-3 space-y-2">
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${idx}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(question.id, option, !!checked)
                  }
                  disabled={submitted}
                />
                <Label
                  htmlFor={`${question.id}-${idx}`}
                  className="font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case "DATE":
        const dateValue = value ? new Date(value) : undefined;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={submitted}
                className={cn(
                  "w-full mt-2 justify-start text-left font-normal",
                  !dateValue && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) =>
                  handleAnswerChange(question.id, date?.toISOString())
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      default:
        return (
          <Input
            value={value || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Your answer..."
            disabled={submitted}
            className="mt-2"
          />
        );
    }
  };

  const sortedQuestions =
    questionnaireData?.questions?.sort((a, b) => a.orderIndex - b.orderIndex) ||
    [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl tracking-wide">
            {questionnaire?.template.title || "Questionnaire"}
          </DialogTitle>
          {questionnaire?.template.description && (
            <DialogDescription className="text-muted-foreground">
              {questionnaire.template.description}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : submitted ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-semibold tracking-wide mb-2">
              Thank You!
            </h3>
            <p className="text-muted-foreground">
              Your responses have been submitted successfully.
            </p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {sortedQuestions.map((question, index) => (
              <div key={question.id} className="space-y-1">
                <Label className="text-base font-medium">
                  {index + 1}. {question.label}
                </Label>
                {renderQuestion(question)}
              </div>
            ))}

            {sortedQuestions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No questions in this questionnaire.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {!submitted && sortedQuestions.length > 0 && (
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="w-full sm:w-auto"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Questionnaire"
              )}
            </Button>
          )}
          {submitted && (
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
