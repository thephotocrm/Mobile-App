import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  FileText,
  Loader2,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { PaymentScheduleTimeline, type PaymentInstallment as TimelineInstallment } from "./payment-schedule-timeline";

interface PaymentInstallment {
  id: string;
  label: string;
  amountCents: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'PARTIAL';
  paidCents?: number;
}

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
  schedule: PaymentInstallment[];
  nextInstallment: PaymentInstallment | null;
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

interface ClientPortalPaymentsSectionProps {
  projectId: string;
  onNavigateToSmartFile: (token: string) => void;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

function getStatusBadge(status: string, dueDate?: string) {
  if (status === 'PAID') {
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" data-testid="badge-paid">Paid</Badge>;
  }
  if (status === 'PARTIAL') {
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" data-testid="badge-partial">Partial</Badge>;
  }
  
  if (dueDate) {
    const date = new Date(dueDate);
    const isOverdue = isPast(date) && !isToday(date);
    const isDueToday = isToday(date);
    const daysUntil = differenceInDays(date, new Date());
    
    if (isOverdue) {
      return <Badge variant="destructive" data-testid="badge-overdue">Overdue</Badge>;
    }
    if (isDueToday) {
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" data-testid="badge-due-today">Due Today</Badge>;
    }
    if (daysUntil <= 7 && daysUntil > 0) {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" data-testid="badge-due-soon">Due in {daysUntil}d</Badge>;
    }
  }
  
  return <Badge variant="outline" data-testid="badge-pending">Pending</Badge>;
}

function getSmartFileStatusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'PAID':
      return 'default';
    case 'ACCEPTED':
    case 'SIGNED':
      return 'secondary';
    case 'PENDING':
    case 'DRAFT':
      return 'outline';
    default:
      return 'outline';
  }
}

function SmartFilePaymentCard({
  smartFile,
  onViewClick,
  onPayInstallment
}: {
  smartFile: SmartFileSummary;
  onViewClick: () => void;
  onPayInstallment: (installment: PaymentInstallment) => void;
}) {
  // Convert local PaymentInstallment to timeline format
  const timelineSchedule: TimelineInstallment[] = smartFile.schedule.map(inst => ({
    id: inst.id,
    label: inst.label,
    amountCents: inst.amountCents,
    dueDate: inst.dueDate,
    status: inst.status,
    paidCents: inst.paidCents
  }));

  const timelineSummary = {
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
    label: smartFile.nextInstallment.label,
    amountCents: smartFile.nextInstallment.amountCents,
    dueDate: smartFile.nextInstallment.dueDate,
    status: smartFile.nextInstallment.status,
    paidCents: smartFile.nextInstallment.paidCents
  } : null;

  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700" data-testid={`smartfile-payment-card-${smartFile.smartFileId}`}>
      {/* Smart File Header */}
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <CardTitle className="text-base font-semibold tracking-wide">{smartFile.title}</CardTitle>
          <Badge variant={getSmartFileStatusColor(smartFile.status)} className="text-xs">
            {smartFile.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-4 pb-4">
        {smartFile.schedule.length > 0 ? (
          <PaymentScheduleTimeline
            schedule={timelineSchedule}
            nextInstallment={timelineNextInstallment}
            summary={timelineSummary}
            context="client-portal"
            onPayClick={(installment) => onPayInstallment(installment as unknown as PaymentInstallment)}
          />
        ) : (
          <div className="text-center py-6 text-gray-500">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No payment schedule configured</p>
            <Button
              variant="outline"
              onClick={onViewClick}
              className="mt-3"
            >
              View Details
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TransactionHistorySection({ smartFiles }: { smartFiles: SmartFileSummary[] }) {
  const allTransactions = smartFiles.flatMap(sf => 
    sf.transactions.map(t => ({
      ...t,
      smartFileTitle: sf.title
    }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  if (allTransactions.length === 0) {
    return null;
  }
  
  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700" data-testid="card-transaction-history">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-gray-500" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allTransactions.map((transaction) => (
            <div 
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
              data-testid={`transaction-row-${transaction.id}`}
            >
              <div className="flex items-center gap-3">
                {transaction.status === 'SUCCEEDED' || transaction.status === 'COMPLETED' ? (
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {transaction.paymentType === 'DEPOSIT' ? 'Deposit Payment' :
                     transaction.paymentType === 'FULL' ? 'Full Payment' :
                     transaction.paymentType === 'BALANCE' ? 'Balance Payment' :
                     transaction.paymentType === 'INSTALLMENT' ? 'Installment Payment' :
                     'Payment'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {transaction.smartFileTitle} • {format(new Date(transaction.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{formatPrice(transaction.amountCents)}</p>
                  {transaction.tipCents && transaction.tipCents > 0 && (
                    <p className="text-xs text-gray-500">+ {formatPrice(transaction.tipCents)} tip</p>
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
}

export function ClientPortalPaymentsSection({ projectId, onNavigateToSmartFile }: ClientPortalPaymentsSectionProps) {
  const { data, isLoading, error } = useQuery<PaymentSummaryResponse>({
    queryKey: ['/api/client-portal/projects', projectId, 'payment-summary'],
    enabled: !!projectId
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" data-testid="loader-payments" />
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-900 font-medium">Unable to load payment information</p>
            <p className="text-sm text-gray-500 mt-2">Please try refreshing the page.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (data.smartFiles.length === 0) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-900 font-medium">No invoices yet!</p>
            <p className="text-sm text-gray-500 mt-2">Your invoices and contracts will appear here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="client-portal-payments-section">
      <div className="space-y-3">
        <h3 className="text-base font-semibold tracking-wide text-gray-900 dark:text-gray-100">Invoices & Contracts</h3>
        {data.smartFiles.map((smartFile) => (
          <SmartFilePaymentCard
            key={smartFile.smartFileId}
            smartFile={smartFile}
            onViewClick={() => onNavigateToSmartFile(smartFile.token)}
            onPayInstallment={(installment) => {
              // Navigate to smart file with installment ID for payment
              onNavigateToSmartFile(`${smartFile.token}?payInstallment=${installment.id}`);
            }}
          />
        ))}
      </div>

      <TransactionHistorySection smartFiles={data.smartFiles} />
    </div>
  );
}
