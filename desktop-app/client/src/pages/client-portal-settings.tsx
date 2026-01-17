import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Mail, Phone, Save, CreditCard, Trash2, Star, Shield, Plus } from "lucide-react";
import { ClientPortalLayout } from "@/components/layout/client-portal-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const settingsFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

interface ClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
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

interface PaymentMethodsData {
  paymentMethods: SavedPaymentMethod[];
  autopayEnabled: boolean;
  autopayPaymentMethodId: string | null;
}

export default function ClientPortalSettings() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null);

  // Fetch client contact information
  const { data: clientInfo, isLoading } = useQuery<ClientInfo>({
    queryKey: ["/api/client-portal/contact-info"],
    enabled: !!user
  });

  // Fetch saved payment methods
  const { data: paymentMethodsData, isLoading: isLoadingPaymentMethods } = useQuery<PaymentMethodsData>({
    queryKey: ["/api/client-portal/payment-methods"],
    enabled: !!user
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      firstName: clientInfo?.firstName || "",
      lastName: clientInfo?.lastName || "",
      email: clientInfo?.email || "",
      phone: clientInfo?.phone || "",
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (clientInfo) {
      form.reset({
        firstName: clientInfo.firstName,
        lastName: clientInfo.lastName,
        email: clientInfo.email,
        phone: clientInfo.phone || "",
      });
    }
  }, [clientInfo, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      return await apiRequest("PUT", "/api/client-portal/contact-info", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/contact-info"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Success",
        description: "Your contact information has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact information",
        variant: "destructive",
      });
    },
  });

  // Delete payment method mutation
  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (methodId: string) => {
      return await apiRequest("DELETE", `/api/client-portal/payment-methods/${methodId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/payment-methods"] });
      toast({
        title: "Success",
        description: "Payment method has been removed.",
      });
      setDeletingMethodId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove payment method",
        variant: "destructive",
      });
      setDeletingMethodId(null);
    },
  });

  // Set default payment method mutation
  const setDefaultPaymentMethodMutation = useMutation({
    mutationFn: async (methodId: string) => {
      return await apiRequest("POST", "/api/client-portal/set-default-payment-method", { paymentMethodId: methodId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/payment-methods"] });
      toast({
        title: "Success",
        description: "Default payment method updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update default payment method",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    updateMutation.mutate(data);
  };

  const handleDeletePaymentMethod = (methodId: string) => {
    setDeletingMethodId(methodId);
    deletePaymentMethodMutation.mutate(methodId);
  };

  const handleSetDefault = (methodId: string) => {
    setDefaultPaymentMethodMutation.mutate(methodId);
  };

  const getCardBrandIcon = (brand: string | null) => {
    return <CreditCard className="w-6 h-6 text-gray-600" />;
  };

  if (!authLoading && !user) {
    setLocation("/login");
    return null;
  }

  if (isLoading || authLoading) {
    return (
      <ClientPortalLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ClientPortalLayout>
    );
  }

  const savedMethods = paymentMethodsData?.paymentMethods || [];

  return (
    <ClientPortalLayout>
      <div className="p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your contact information and preferences.</p>
          </div>

          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Contact Information
              </CardTitle>
              <CardDescription>
                Update your personal details to stay connected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              data-testid="input-first-name"
                              placeholder="Enter your first name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              data-testid="input-last-name"
                              placeholder="Enter your last name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Email Field */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <Input 
                              {...field} 
                              type="email"
                              className="pl-10"
                              data-testid="input-email"
                              placeholder="your.email@example.com"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone Field */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <Input 
                              {...field} 
                              type="tel"
                              className="pl-10"
                              data-testid="input-phone"
                              placeholder="(555) 123-4567"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={updateMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Payment Methods Card */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Methods
              </CardTitle>
              <CardDescription>
                Manage your saved cards for faster checkout and autopay.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPaymentMethods ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : savedMethods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 mb-2">No saved payment methods</p>
                  <p className="text-sm text-gray-500">
                    Your cards will appear here after you make a payment with the "Save card" option selected.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedMethods.map((method) => (
                    <div 
                      key={method.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                      data-testid={`payment-method-${method.id}`}
                    >
                      <div className="flex items-center gap-4">
                        {getCardBrandIcon(method.cardBrand)}
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {method.cardBrand ? method.cardBrand.charAt(0).toUpperCase() + method.cardBrand.slice(1) : 'Card'} •••• {method.cardLast4}
                            {method.isDefault && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            Expires {method.cardExpMonth}/{method.cardExpYear}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(method.id)}
                            disabled={setDefaultPaymentMethodMutation.isPending}
                            data-testid={`set-default-${method.id}`}
                          >
                            {setDefaultPaymentMethodMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Set as default"
                            )}
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500 hover:text-red-600"
                              data-testid={`delete-method-${method.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove payment method?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the card ending in {method.cardLast4} from your account. 
                                You can always add it again later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePaymentMethod(method.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {deletingMethodId === method.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Removing...
                                  </>
                                ) : (
                                  "Remove"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}

                  {/* Security note */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 pt-4 border-t mt-4">
                    <Shield className="w-4 h-4" />
                    <span>Your card information is securely stored by Stripe. We never have access to your full card number.</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientPortalLayout>
  );
}
