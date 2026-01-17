import { useState, useEffect } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, CreditCard, Check, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";

interface PaymentFormProps {
  token: string;
  paymentType: 'DEPOSIT' | 'FULL' | 'BALANCE' | 'INSTALLMENT';
  baseAmount: number;
  status: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  existingClientSecret?: string;
}

interface SavedPaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  type: string;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  isDefault: boolean;
  nickname: string | null;
}

function StripePaymentForm({ token, paymentType, baseAmount, tipCents, onSuccess, onError, saveCardEnabled, onSaveCardChange, enableAutopay, onEnableAutopayChange }: PaymentFormProps & { tipCents: number; saveCardEnabled: boolean; onSaveCardChange: (enabled: boolean) => void; enableAutopay: boolean; onEnableAutopayChange: (enabled: boolean) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const totalAmount = baseAmount + tipCents;

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/smart-file/${token}/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || "Payment failed");
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment
        await apiRequest(
          'POST',
          `/api/public/smart-files/${token}/confirm-payment`,
          {
            paymentIntentId: paymentIntent.id,
            paymentType,
            tipCents,
          }
        );

        // If user wants to save card for future payments, create a SetupIntent and save the payment method
        if (saveCardEnabled && paymentIntent.payment_method) {
          try {
            // Create SetupIntent to save the card
            const setupResponse = await apiRequest(
              'POST',
              `/api/public/smart-files/${token}/create-setup-intent`,
              {}
            );
            const setupData = await setupResponse.json();

            if (setupData.clientSecret) {
              // Confirm the SetupIntent with the same payment method
              const { error: setupError, setupIntent } = await stripe.confirmCardSetup(
                setupData.clientSecret,
                {
                  payment_method: paymentIntent.payment_method as string
                }
              );

              if (!setupError && setupIntent?.status === 'succeeded') {
                // Save the payment method to our database
                await apiRequest(
                  'POST',
                  `/api/public/smart-files/${token}/save-payment-method`,
                  {
                    setupIntentId: setupIntent.id,
                    setAsDefault: true,
                    enableAutopay: enableAutopay
                  }
                );
              }
            }
          } catch (saveError) {
            console.error("Failed to save card:", saveError);
            // Don't fail the payment if card save fails
          }
        }

        onSuccess();
      }
    } catch (err) {
      console.error("Payment error:", err);
      onError("Payment failed");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Stripe Payment Element - min-height ensures visibility on mobile */}
      <div className="space-y-4 min-h-[200px]" style={{ minHeight: '200px' }}>
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Save Card Options */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-start space-x-3">
          <Checkbox 
            id="save-card" 
            checked={saveCardEnabled}
            onCheckedChange={(checked) => onSaveCardChange(checked as boolean)}
            data-testid="checkbox-save-card"
          />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="save-card" className="text-sm font-medium cursor-pointer">
              Save card for future payments
            </Label>
            <p className="text-xs text-muted-foreground">
              Securely save your card to pay faster next time
            </p>
          </div>
        </div>

        {saveCardEnabled && (
          <div className="flex items-start space-x-3 ml-6 p-3 bg-muted/50 rounded-lg">
            <Checkbox 
              id="enable-autopay" 
              checked={enableAutopay}
              onCheckedChange={(checked) => onEnableAutopayChange(checked as boolean)}
              data-testid="checkbox-enable-autopay"
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="enable-autopay" className="text-sm font-medium cursor-pointer">
                Enable autopay
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically charge this card when payments are due
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SSL Security Badge */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t">
        <Shield className="w-4 h-4" />
        <span>We use the same SSL encryption technology that banks use to protect your sensitive data.</span>
      </div>

      {/* Footer with Pay Button */}
      <div className="flex items-center justify-between gap-3 pt-4">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span>Secured by <span className="font-semibold">Stripe</span></span>
        </div>
        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 h-11 px-8"
          disabled={!stripe || isProcessing}
          data-testid="button-submit-payment"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${formatPrice(totalAmount)}`
          )}
        </Button>
      </div>
    </form>
  );
}

// Component to display saved payment methods
function SavedPaymentMethodsList({ 
  token, 
  savedMethods, 
  selectedMethodId, 
  onSelectMethod,
  onDeleteMethod,
  isDeleting
}: { 
  token: string; 
  savedMethods: SavedPaymentMethod[];
  selectedMethodId: string | null;
  onSelectMethod: (methodId: string | null) => void;
  onDeleteMethod: (methodId: string) => void;
  isDeleting: boolean;
}) {
  const getCardIcon = (brand: string | null) => {
    return <CreditCard className="w-5 h-5" />;
  };

  if (savedMethods.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Your saved cards</div>
      <div className="space-y-2">
        {savedMethods.map((method) => (
          <div 
            key={method.id}
            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedMethodId === method.stripePaymentMethodId 
                ? 'border-primary bg-primary/5' 
                : 'hover:bg-muted/50'
            }`}
            onClick={() => onSelectMethod(
              selectedMethodId === method.stripePaymentMethodId ? null : method.stripePaymentMethodId
            )}
            data-testid={`saved-card-${method.id}`}
          >
            <div className="flex items-center gap-3">
              {getCardIcon(method.cardBrand)}
              <div>
                <div className="font-medium text-sm flex items-center gap-2">
                  {method.cardBrand ? method.cardBrand.charAt(0).toUpperCase() + method.cardBrand.slice(1) : 'Card'} •••• {method.cardLast4}
                  {method.isDefault && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Default</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Expires {method.cardExpMonth}/{method.cardExpYear}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedMethodId === method.stripePaymentMethodId && (
                <Check className="w-4 h-4 text-primary" />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMethod(method.id);
                }}
                disabled={isDeleting}
                data-testid={`delete-card-${method.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      <Button
        variant="outline"
        className="w-full"
        onClick={() => onSelectMethod(null)}
        data-testid="button-use-new-card"
      >
        <CreditCard className="w-4 h-4 mr-2" />
        Use a new card
      </Button>
    </div>
  );
}

export function EmbeddedPaymentForm(props: PaymentFormProps & { publishableKey: string }) {
  const [selectedTip, setSelectedTip] = useState<number | 'custom' | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [saveCardEnabled, setSaveCardEnabled] = useState(false);
  const [enableAutopay, setEnableAutopay] = useState(false);
  const [selectedSavedMethodId, setSelectedSavedMethodId] = useState<string | null>(null);
  const [isPayingWithSaved, setIsPayingWithSaved] = useState(false);
  
  // Static Stripe promise - no stripeAccount needed for destination charges
  const stripePromise = loadStripe(props.publishableKey);

  const tipPercentages = [10, 15, 20];

  const calculateTipAmount = () => {
    if (selectedTip === 'custom') {
      const customAmount = parseFloat(customTip) || 0;
      return Math.round(customAmount * 100);
    } else if (typeof selectedTip === 'number') {
      return Math.round((props.baseAmount * selectedTip) / 100);
    }
    return 0;
  };

  const tipCents = calculateTipAmount();

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Only create payment intent when status is ACCEPTED or DEPOSIT_PAID
  const canCreatePayment = ['ACCEPTED', 'DEPOSIT_PAID'].includes(props.status);

  // Clear any cached payment intent on mount to ensure fresh PI with automatic_payment_methods
  useEffect(() => {
    queryClient.removeQueries({ 
      queryKey: ['/api/public/smart-files', props.token, 'payment-intent'],
      exact: false 
    });
  }, [props.token]);

  // Fetch saved payment methods
  const { data: savedMethodsData, isLoading: isLoadingSavedMethods } = useQuery({
    queryKey: ['/api/public/smart-files', props.token, 'saved-payment-methods'],
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/public/smart-files/${props.token}/saved-payment-methods`
      );
      return response.json();
    },
    enabled: canCreatePayment,
  });

  // Delete payment method mutation
  const deleteMethodMutation = useMutation({
    mutationFn: async (methodId: string) => {
      await apiRequest(
        'DELETE',
        `/api/public/smart-files/${props.token}/payment-methods/${methodId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/public/smart-files', props.token, 'saved-payment-methods'] });
    }
  });

  // Fetch payment intent when tip or status changes
  // IMPORTANT: staleTime: 0 ensures we always create a fresh payment intent
  // This is critical because Stripe Payment Element requires intents created with automatic_payment_methods
  // If existingClientSecret is provided, skip the query
  const { data: paymentIntentData, isLoading, isFetching, error, dataUpdatedAt } = useQuery({
    queryKey: ['/api/public/smart-files', props.token, 'payment-intent', props.status, props.paymentType, props.baseAmount, tipCents],
    queryFn: async () => {
      console.log('🔄 Fetching fresh payment intent...');
      const response = await apiRequest(
        'POST',
        `/api/public/smart-files/${props.token}/create-payment-intent`,
        { paymentType: props.paymentType, tipCents, amountCents: props.baseAmount }
      );
      const data = await response.json();
      console.log('✅ Got payment intent, clientSecret starts with:', data.clientSecret?.substring(0, 30));
      return data;
    },
    enabled: canCreatePayment && !selectedSavedMethodId && !props.existingClientSecret,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
    gcTime: 0,
  });
  
  // Use existing client secret if provided, otherwise use fetched data
  const effectiveClientSecret = props.existingClientSecret || paymentIntentData?.clientSecret;
  
  // Determine if we have fresh data (fetched in this session or provided externally)
  const hasFreshData = (effectiveClientSecret && (props.existingClientSecret || (dataUpdatedAt > 0 && !isFetching)));

  const savedMethods = savedMethodsData?.paymentMethods || [];

  // Initialize enableAutopay from server response
  useEffect(() => {
    if (savedMethodsData?.autopayEnabled !== undefined) {
      setEnableAutopay(savedMethodsData.autopayEnabled);
    }
  }, [savedMethodsData?.autopayEnabled]);

  // Handle payment with saved card
  const handlePayWithSavedCard = async () => {
    if (!selectedSavedMethodId) return;
    
    setIsPayingWithSaved(true);
    try {
      // Create payment intent with the saved payment method
      const response = await apiRequest(
        'POST',
        `/api/public/smart-files/${props.token}/create-payment-intent`,
        { 
          paymentType: props.paymentType, 
          tipCents, 
          amountCents: props.baseAmount,
          paymentMethodId: selectedSavedMethodId
        }
      );
      const data = await response.json();

      if (data.clientSecret) {
        // Load Stripe (no stripeAccount needed for destination charges)
        const stripe = await loadStripe(props.publishableKey);
        if (!stripe) throw new Error("Stripe not loaded");

        const { error, paymentIntent } = await stripe.confirmCardPayment(
          data.clientSecret,
          { payment_method: selectedSavedMethodId }
        );

        if (error) {
          props.onError(error.message || "Payment failed");
        } else if (paymentIntent?.status === 'succeeded') {
          await apiRequest(
            'POST',
            `/api/public/smart-files/${props.token}/confirm-payment`,
            {
              paymentIntentId: paymentIntent.id,
              paymentType: props.paymentType,
              tipCents,
            }
          );

          // Toggle autopay if user has selected the option
          try {
            await apiRequest(
              'POST',
              `/api/public/smart-files/${props.token}/toggle-autopay`,
              {
                enabled: enableAutopay,
                paymentMethodId: selectedSavedMethodId
              }
            );
          } catch (autopayError) {
            console.error("Failed to set autopay:", autopayError);
            // Don't fail the payment if autopay toggle fails
          }

          props.onSuccess();
        }
      }
    } catch (err) {
      console.error("Payment with saved card error:", err);
      props.onError("Payment failed");
    } finally {
      setIsPayingWithSaved(false);
    }
  };

  // Show loading state while waiting for status to be accepted or while creating payment intent
  // Skip loading check if existingClientSecret is provided
  if (!canCreatePayment || (isLoading && !selectedSavedMethodId && !props.existingClientSecret) || isLoadingSavedMethods) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {!canCreatePayment ? "Finalizing your proposal..." : "Preparing payment..."}
          </p>
        </div>
      </div>
    );
  }

  if (error && !selectedSavedMethodId) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-400">
            {(error as any)?.message || "Failed to initialize payment. Please try again."}
          </p>
        </div>
      </div>
    );
  }

  const options: StripeElementsOptions = effectiveClientSecret ? {
    clientSecret: effectiveClientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#0570de',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
      rules: {
        '.Input': {
          padding: '12px',
          fontSize: '16px', // Prevents iOS zoom on focus
        },
        '.Tab': {
          padding: '12px 16px',
        },
      },
    },
  } : undefined as any;

  return (
    <div className="space-y-6">
      {/* Amount Due - Large Display */}
      <div className="text-center">
        <div className="text-sm text-muted-foreground mb-1">Amount due</div>
        <div className="text-4xl font-bold" data-testid="text-amount-due">
          {formatPrice(props.baseAmount + tipCents)}
        </div>
      </div>

      {/* Tip Section */}
      <div className="space-y-3">
        <div className="text-sm font-medium">Would you like to leave a tip?</div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            type="button"
            variant={selectedTip === null ? "default" : "outline"} 
            size="sm" 
            className="flex-1 min-w-[70px]"
            onClick={() => {
              setSelectedTip(null);
              setCustomTip("");
            }}
            data-testid="button-no-tip"
          >
            No thanks
          </Button>
          {tipPercentages.map((percentage) => {
            const tipAmount = Math.round((props.baseAmount * percentage) / 100);
            return (
              <Button
                key={percentage}
                type="button"
                variant={selectedTip === percentage ? "default" : "outline"}
                size="sm"
                className="flex-1 min-w-[70px]"
                onClick={() => {
                  setSelectedTip(percentage);
                  setCustomTip("");
                }}
                data-testid={`button-tip-${percentage}`}
              >
                <div className="text-center w-full">
                  <div className="font-semibold">{percentage}%</div>
                  <div className="text-xs text-muted-foreground">{formatPrice(tipAmount)}</div>
                </div>
              </Button>
            );
          })}
          <Button
            type="button"
            variant={selectedTip === 'custom' ? "default" : "outline"}
            size="sm"
            className="flex-1 min-w-[70px]"
            onClick={() => setSelectedTip('custom')}
            data-testid="button-tip-custom"
          >
            Custom
          </Button>
        </div>
        {selectedTip === 'custom' && (
          <Input
            type="number"
            placeholder="Enter custom tip amount"
            value={customTip}
            onChange={(e) => setCustomTip(e.target.value)}
            min="0"
            step="0.01"
            className="mt-2"
            data-testid="input-custom-tip"
          />
        )}
      </div>

      {/* Saved Payment Methods */}
      {savedMethods.length > 0 && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Payment method</span>
            </div>
          </div>

          <SavedPaymentMethodsList
            token={props.token}
            savedMethods={savedMethods}
            selectedMethodId={selectedSavedMethodId}
            onSelectMethod={setSelectedSavedMethodId}
            onDeleteMethod={(id) => deleteMethodMutation.mutate(id)}
            isDeleting={deleteMethodMutation.isPending}
          />

          {selectedSavedMethodId && (
            <>
              {/* Autopay toggle for saved cards */}
              <div className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                <Checkbox 
                  id="enable-autopay-saved" 
                  checked={enableAutopay}
                  onCheckedChange={(checked) => setEnableAutopay(checked as boolean)}
                  data-testid="checkbox-enable-autopay-saved"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="enable-autopay-saved" className="text-sm font-medium cursor-pointer">
                    Enable autopay for future payments
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically charge this card when payments are due
                  </p>
                </div>
              </div>

              <Button
                className="w-full h-12"
                onClick={handlePayWithSavedCard}
                disabled={isPayingWithSaved}
                data-testid="button-pay-with-saved"
              >
                {isPayingWithSaved ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ${formatPrice(props.baseAmount + tipCents)}`
                )}
              </Button>
            </>
          )}
        </>
      )}

      {/* Divider before new card form */}
      {!selectedSavedMethodId && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {savedMethods.length > 0 ? 'Or enter card details' : 'Enter card details'}
              </span>
            </div>
          </div>

          {/* Payment Form - only render with fresh data to avoid using cached payment intents */}
          {(isLoading && !props.existingClientSecret) || isFetching || !hasFreshData || !stripePromise ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" data-testid="loader-payment" />
            </div>
          ) : (
            <Elements stripe={stripePromise} options={options} key={effectiveClientSecret}>
              <StripePaymentForm 
                {...props} 
                tipCents={tipCents}
                saveCardEnabled={saveCardEnabled}
                onSaveCardChange={setSaveCardEnabled}
                enableAutopay={enableAutopay}
                onEnableAutopayChange={setEnableAutopay}
              />
            </Elements>
          )}
        </>
      )}
    </div>
  );
}
