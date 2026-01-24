import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  CreditCard,
  Clock,
  TrendingUp,
  Zap,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  User,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function formatCurrency(cents: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(cents / 100);
}

function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getStatusBadge(status: string) {
  const variants: Record<string, { variant: any; icon: any; text: string }> = {
    pending: { variant: "secondary", icon: Clock, text: "Pending" },
    transferred: { variant: "default", icon: CheckCircle, text: "Transferred" },
    paid: { variant: "default", icon: CheckCircle, text: "Paid" },
    failed: { variant: "destructive", icon: XCircle, text: "Failed" },
    cancelled: { variant: "outline", icon: XCircle, text: "Cancelled" },
  };

  const config = variants[status] || variants.pending;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {config.text}
    </Badge>
  );
}

export default function Earnings() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("standard");

  // All hooks must be called before any conditional returns
  // Fetch balance data
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["/api/stripe-connect/balance"],
    enabled: !!user && !loading,
  });

  // Fetch earnings history
  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ["/api/stripe-connect/earnings"],
    enabled: !!user && !loading,
  });

  // Fetch payout history
  const { data: payouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ["/api/stripe-connect/payouts"],
    enabled: !!user && !loading,
  });

  // Fetch Stripe Connect status
  const { data: stripeStatus } = useQuery({
    queryKey: ["/api/stripe-connect/account-status"],
    enabled: !!user && !loading,
  });

  // Fetch outstanding invoices
  const { data: outstanding, isLoading: outstandingLoading } = useQuery({
    queryKey: ["/api/stripe-connect/outstanding"],
    enabled: !!user && !loading,
  });

  // Create payout mutation
  const createPayoutMutation = useMutation({
    mutationFn: async (data: { amountCents: number; method: string }) => {
      return await apiRequest(
        "POST",
        "/api/stripe-connect/create-payout",
        data,
      );
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/stripe-connect/balance"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/stripe-connect/payouts"],
      });
      setPayoutDialogOpen(false);
      setPayoutAmount("");
      toast({
        title: "Payout Created",
        description:
          data.message || "Your payout has been initiated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Payout Failed",
        description:
          error.message || "Failed to create payout. Please try again.",
        variant: "destructive",
      });
    },
  });

  // State for tracking Stripe dashboard loading
  const [isOpeningStripeDashboard, setIsOpeningStripeDashboard] =
    useState(false);

  // Open Stripe Express Dashboard - must open window synchronously to avoid popup blocker
  const openStripeDashboard = async () => {
    setIsOpeningStripeDashboard(true);

    // Open window immediately on click (synchronous) - this avoids popup blocker
    const newWindow = window.open("about:blank", "_blank");

    if (!newWindow) {
      setIsOpeningStripeDashboard(false);
      toast({
        title: "Popup Blocked",
        description:
          "Please allow popups for this site to open the Stripe Dashboard.",
        variant: "destructive",
      });
      return;
    }

    // Show loading message in the new window
    newWindow.document.write(`
      <html>
        <head><title>Loading Stripe Dashboard...</title></head>
        <body style="font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f9fafb;">
          <div style="text-align: center;">
            <div style="width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
            <p style="color: #6b7280;">Loading Stripe Dashboard...</p>
          </div>
          <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        </body>
      </html>
    `);

    try {
      const response = await apiRequest(
        "POST",
        "/api/stripe-connect/dashboard-link",
        {},
      );

      if (response.url) {
        // Redirect the already-open window to the Stripe dashboard
        newWindow.location.href = response.url;
      } else {
        newWindow.close();
        toast({
          title: "Unable to Open Dashboard",
          description: "No dashboard URL received. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      newWindow.close();
      toast({
        title: "Unable to Open Dashboard",
        description:
          error.message ||
          "Failed to generate dashboard link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsOpeningStripeDashboard(false);
    }
  };

  // Conditional returns after all hooks
  // Redirect to login if not authenticated
  if (!loading && !user) {
    setLocation("/login");
    return null;
  }

  // Prevent flash of protected content
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleCreatePayout = () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payout amount.",
        variant: "destructive",
      });
      return;
    }

    const amountCents = Math.round(amount * 100);
    const availableCents = balance?.availableCents || 0;

    if (amountCents > availableCents) {
      toast({
        title: "Insufficient Balance",
        description: `You can only request up to ${formatCurrency(availableCents)}.`,
        variant: "destructive",
      });
      return;
    }

    createPayoutMutation.mutate({
      amountCents,
      method: payoutMethod,
    });
  };

  const isStripeReady =
    stripeStatus?.onboardingCompleted && stripeStatus?.payoutEnabled;

  return (
    <div>
      {/* Header */}
      <header className="bg-card border-b border-border px-4 md:px-6 py-4 relative">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Earnings</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Track your payments and request payouts
          </p>
        </div>
      </header>

      <div className="p-3 sm:p-6 space-y-6">
        {/* Stripe Connection Status */}
        {!isStripeReady && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Stripe Connect Setup Required
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Complete your Stripe Connect setup to start receiving
                    payments.
                    <Button
                      variant="link"
                      className="p-0 h-auto text-yellow-700 dark:text-yellow-300 underline ml-1"
                      onClick={() => setLocation("/settings?tab=integrations")}
                    >
                      Set up now
                    </Button>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Available Balance
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold"
                data-testid="text-available-balance"
              >
                {balanceLoading
                  ? "..."
                  : formatCurrency(balance?.availableCents || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Ready for payout</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Earnings
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold"
                data-testid="text-pending-balance"
              >
                {balanceLoading
                  ? "..."
                  : formatCurrency(balance?.pendingCents || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Being processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Request Payout
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Dialog
                open={payoutDialogOpen}
                onOpenChange={setPayoutDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    className="w-full"
                    disabled={
                      !isStripeReady || (balance?.availableCents || 0) === 0
                    }
                    data-testid="button-request-payout"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Request Payout
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Payout</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        data-testid="input-payout-amount"
                      />
                      <p className="text-xs text-muted-foreground">
                        Available:{" "}
                        {formatCurrency(balance?.availableCents || 0)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Payout Method</Label>
                      <Select
                        value={payoutMethod}
                        onValueChange={setPayoutMethod}
                      >
                        <SelectTrigger data-testid="select-payout-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">
                            Standard (2-3 business days, no fee)
                          </SelectItem>
                          <SelectItem value="instant">
                            <div className="flex items-center">
                              <Zap className="w-4 h-4 mr-2" />
                              Instant (within minutes, 1% fee)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setPayoutDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreatePayout}
                        disabled={createPayoutMutation.isPending}
                        className="flex-1"
                        data-testid="button-confirm-payout"
                      >
                        {createPayoutMutation.isPending
                          ? "Creating..."
                          : "Create Payout"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Stripe Dashboard
              </CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                disabled={!isStripeReady || isOpeningStripeDashboard}
                onClick={openStripeDashboard}
                data-testid="button-open-stripe-dashboard"
              >
                {isOpeningStripeDashboard ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Stripe Dashboard
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                View full transaction history, manage payouts, and update bank
                details
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Tabs defaultValue="outstanding" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="outstanding"
              data-testid="tab-outstanding"
              className="relative"
            >
              Outstanding
              {outstanding?.summary?.hasOverdue && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="earnings" data-testid="tab-earnings">
              Earnings
            </TabsTrigger>
            <TabsTrigger value="payouts" data-testid="tab-payouts">
              Payouts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="outstanding" className="space-y-4">
            {/* Outstanding Summary Cards */}
            {outstanding?.summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Total Outstanding
                    </div>
                    <div
                      className="text-2xl font-bold text-orange-600"
                      data-testid="text-total-outstanding"
                    >
                      {formatCurrency(
                        outstanding.summary.totalOutstandingCents,
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {outstanding.summary.invoiceCount} invoice
                      {outstanding.summary.invoiceCount !== 1 ? "s" : ""}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Already Collected
                    </div>
                    <div
                      className="text-2xl font-bold text-green-600"
                      data-testid="text-total-collected"
                    >
                      {formatCurrency(outstanding.summary.totalPaidCents)}
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className={
                    outstanding.summary.hasOverdue
                      ? "border-red-200 bg-red-50 dark:bg-red-950/20"
                      : ""
                  }
                >
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">
                      Overdue Invoices
                    </div>
                    <div
                      className={`text-2xl font-bold ${outstanding.summary.hasOverdue ? "text-red-600" : "text-muted-foreground"}`}
                      data-testid="text-overdue-count"
                    >
                      {outstanding.summary.overdueCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {outstanding.summary.hasOverdue
                        ? "Requires attention"
                        : "All invoices on track"}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Outstanding Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {outstandingLoading ? (
                  <div className="text-center py-8">
                    Loading outstanding invoices...
                  </div>
                ) : !outstanding?.invoices ||
                  outstanding.invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                    <p className="font-medium">All caught up!</p>
                    <p className="text-sm">
                      No outstanding invoices at the moment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(outstanding.invoices as any[]).map((invoice: any) => {
                      const dueDate = invoice.nextInstallment?.dueDate
                        ? new Date(invoice.nextInstallment.dueDate)
                        : null;
                      const isOverdue =
                        dueDate && isPast(dueDate) && !isToday(dueDate);
                      const isDueToday = dueDate && isToday(dueDate);
                      const daysUntil = dueDate
                        ? differenceInDays(dueDate, new Date())
                        : null;

                      return (
                        <div
                          key={invoice.projectSmartFileId}
                          className={`p-4 rounded-lg border ${
                            invoice.hasOverdue
                              ? "border-red-200 bg-red-50 dark:bg-red-950/20"
                              : "border-gray-200 dark:border-gray-700"
                          }`}
                          data-testid={`outstanding-invoice-${invoice.projectSmartFileId}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">
                                  {invoice.title}
                                </h4>
                                {invoice.hasOverdue && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Overdue
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{invoice.projectTitle}</span>
                                {invoice.client && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {invoice.client.firstName}{" "}
                                      {invoice.client.lastName}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">
                                {formatCurrency(invoice.remainingCents)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                remaining
                              </div>
                            </div>
                          </div>

                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>
                                {formatCurrency(invoice.paidCents)} paid
                              </span>
                              <span>{invoice.percentComplete}% complete</span>
                            </div>
                            <Progress
                              value={invoice.percentComplete}
                              className="h-2"
                            />
                          </div>

                          {invoice.nextInstallment && (
                            <div className="flex items-center justify-between pt-2 border-t">
                              <div className="text-sm">
                                <span className="text-muted-foreground">
                                  Next:{" "}
                                </span>
                                <span className="font-medium">
                                  {invoice.nextInstallment.label}
                                </span>
                                <span className="text-muted-foreground">
                                  {" "}
                                  •{" "}
                                </span>
                                <span
                                  className={`${
                                    isOverdue
                                      ? "text-red-600 font-semibold"
                                      : isDueToday
                                        ? "text-orange-600 font-semibold"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  {dueDate
                                    ? format(dueDate, "MMM d, yyyy")
                                    : "No due date"}
                                  {isOverdue && " (Overdue)"}
                                  {isDueToday && " (Due Today)"}
                                  {daysUntil &&
                                    daysUntil > 0 &&
                                    daysUntil <= 7 &&
                                    ` (${daysUntil}d)`}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setLocation(`/smart-file/${invoice.token}`)
                                }
                                data-testid={`button-view-invoice-${invoice.projectSmartFileId}`}
                              >
                                View
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Earnings History</CardTitle>
              </CardHeader>
              <CardContent>
                {earningsLoading ? (
                  <div className="text-center py-8">Loading earnings...</div>
                ) : !earnings || earnings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No earnings yet. Your payment history will appear here.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Platform Fee</TableHead>
                        <TableHead>Your Earnings</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(earnings as any[]).map((earning: any) => (
                        <TableRow key={earning.id}>
                          <TableCell>{formatDate(earning.createdAt)}</TableCell>
                          <TableCell>
                            {formatCurrency(earning.totalAmountCents)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            -{formatCurrency(earning.platformFeeCents)}
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            {formatCurrency(earning.photographerEarningsCents)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(earning.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payout History</CardTitle>
              </CardHeader>
              <CardContent>
                {payoutsLoading ? (
                  <div className="text-center py-8">Loading payouts...</div>
                ) : !payouts || payouts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No payouts yet. Your payout history will appear here.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Arrival Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(payouts as any[]).map((payout: any) => (
                        <TableRow key={payout.id}>
                          <TableCell>{formatDate(payout.createdAt)}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(payout.amountCents)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {payout.isInstant && (
                                <Zap className="w-4 h-4 mr-1 text-yellow-500" />
                              )}
                              {payout.isInstant ? "Instant" : "Standard"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {payout.feeCents > 0
                              ? formatCurrency(payout.feeCents)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {payout.arrivalDate
                              ? formatDate(payout.arrivalDate)
                              : "—"}
                          </TableCell>
                          <TableCell>{getStatusBadge(payout.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
