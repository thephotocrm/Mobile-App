import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, DollarSign, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "ZELLE", label: "Zelle" },
  { value: "VENMO", label: "Venmo" },
  { value: "BANK_TRANSFER", label: "Bank Transfer (ACH/Wire)" },
  { value: "CARD_OFFLINE", label: "Card (offline)" },
  { value: "OTHER", label: "Other" },
] as const;

type PaymentMethod = typeof PAYMENT_METHODS[number]["value"];

const markPaidSchema = z.object({
  amountType: z.enum(["full", "partial"]),
  partialAmountDollars: z.string().optional(),
  paymentMethod: z.string().min(1, "Payment method is required"),
  note: z.string().optional(),
  paidAt: z.string().min(1, "Date is required"),
}).refine((data) => {
  if (data.amountType === "partial") {
    const amount = parseFloat(data.partialAmountDollars || "0");
    return amount > 0;
  }
  return true;
}, {
  message: "Partial amount must be greater than 0",
  path: ["partialAmountDollars"],
});

type MarkPaidFormData = z.infer<typeof markPaidSchema>;

interface MarkPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectSmartFileId: string;
  installment: {
    id: string;
    label: string;
    amountCents: number;
    paidCents?: number;
    dueDate: string;
  };
  onSuccess: () => void;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function MarkPaidDialog({
  open,
  onOpenChange,
  projectId,
  projectSmartFileId,
  installment,
  onSuccess,
}: MarkPaidDialogProps) {
  const { toast } = useToast();
  const remainingCents = installment.amountCents - (installment.paidCents || 0);

  const form = useForm<MarkPaidFormData>({
    resolver: zodResolver(markPaidSchema),
    defaultValues: {
      amountType: "full",
      partialAmountDollars: "",
      paymentMethod: "",
      note: "",
      paidAt: new Date().toISOString().split("T")[0],
    },
  });

  const amountType = form.watch("amountType");

  const markPaidMutation = useMutation({
    mutationFn: async (data: MarkPaidFormData) => {
      const amountCents = data.amountType === "full"
        ? remainingCents
        : Math.round(parseFloat(data.partialAmountDollars || "0") * 100);

      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/smart-files/${projectSmartFileId}/mark-paid`,
        {
          installmentId: installment.id,
          amountCents,
          paymentMethod: data.paymentMethod,
          note: data.note || undefined,
          paidAt: data.paidAt,
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: `${formatPrice(
          amountType === "full"
            ? remainingCents
            : Math.round(parseFloat(form.getValues("partialAmountDollars") || "0") * 100)
        )} marked as paid`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "payment-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to record payment",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    // Validate partial amount doesn't exceed remaining
    if (data.amountType === "partial") {
      const partialCents = Math.round(parseFloat(data.partialAmountDollars || "0") * 100);
      if (partialCents > remainingCents) {
        form.setError("partialAmountDollars", {
          message: `Amount cannot exceed ${formatPrice(remainingCents)}`,
        });
        return;
      }
    }
    markPaidMutation.mutate(data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Mark this payment as received
          </DialogDescription>
        </DialogHeader>

        {/* Payment Info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Payment</span>
            <span className="font-semibold">{installment.label}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount Due</span>
            <span className="font-semibold text-lg">{formatPrice(remainingCents)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Due Date</span>
            <span className="text-sm">{format(new Date(installment.dueDate), "MMM d, yyyy")}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Type */}
          <div className="space-y-2">
            <Label>Amount Paid</Label>
            <RadioGroup
              value={amountType}
              onValueChange={(value) => form.setValue("amountType", value as "full" | "partial")}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="font-normal cursor-pointer">
                  Full amount ({formatPrice(remainingCents)})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="font-normal cursor-pointer">
                  Partial amount
                </Label>
              </div>
            </RadioGroup>

            {amountType === "partial" && (
              <div className="pl-6 pt-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={(remainingCents / 100).toFixed(2)}
                    placeholder="0.00"
                    className="pl-7"
                    {...form.register("partialAmountDollars")}
                  />
                </div>
                {form.formState.errors.partialAmountDollars && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.partialAmountDollars.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              value={form.watch("paymentMethod")}
              onValueChange={(value) => form.setValue("paymentMethod", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.paymentMethod && (
              <p className="text-sm text-destructive">
                {form.formState.errors.paymentMethod.message}
              </p>
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Reference / Note (optional)</Label>
            <Textarea
              placeholder="e.g., Check #1234, Venmo @username"
              className="resize-none h-20"
              {...form.register("note")}
            />
          </div>

          {/* Date Paid */}
          <div className="space-y-2">
            <Label htmlFor="paidAt" className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Date Paid
            </Label>
            <Input
              type="date"
              {...form.register("paidAt")}
            />
            {form.formState.errors.paidAt && (
              <p className="text-sm text-destructive">
                {form.formState.errors.paidAt.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={markPaidMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={markPaidMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {markPaidMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                "Mark as Paid"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
