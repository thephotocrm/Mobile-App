// Automations Page - Kanban Board Redesign Preview
// This is a static prototype page to preview the new design
// URL: /automations-preview

import { useState } from "react";
import {
  Plus,
  MoreVertical,
  Zap,
  Mail,
  MessageSquare,
  Clock,
  Calendar,
  Check,
  Play,
  Pause,
  Settings,
  Target,
  Users,
  ArrowLeft,
  Filter,
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  Sparkles,
  Bell,
  FileText,
  Eye,
  Edit3,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

// Mock data for automations
const mockAutomations = {
  inactive: [
    {
      id: "1",
      name: "Welcome Email Sequence",
      description: "Send welcome email when new lead is created",
      triggerType: "stage",
      actionType: "email",
      stage: "New Inquiry",
      projectType: "Wedding",
      lastRun: null,
      runCount: 0,
      createdAt: "Jan 5, 2026",
    },
    {
      id: "2",
      name: "Follow-up Reminder",
      description: "Send follow-up 3 days after inquiry",
      triggerType: "time",
      actionType: "email",
      stage: "New Inquiry",
      projectType: "All",
      lastRun: null,
      runCount: 0,
      createdAt: "Jan 8, 2026",
    },
  ],
  active: [
    {
      id: "3",
      name: "Proposal Sent Notification",
      description: "Notify when proposal is viewed",
      triggerType: "event",
      actionType: "sms",
      stage: "Proposal Sent",
      projectType: "Wedding",
      lastRun: "2 hours ago",
      runCount: 47,
      createdAt: "Dec 15, 2025",
    },
    {
      id: "4",
      name: "Contract Signed Celebration",
      description: "Send thank you email after contract signing",
      triggerType: "event",
      actionType: "email",
      stage: "Booked",
      projectType: "All",
      lastRun: "1 day ago",
      runCount: 23,
      createdAt: "Nov 20, 2025",
    },
    {
      id: "5",
      name: "Payment Reminder",
      description: "Remind about upcoming payment due",
      triggerType: "time",
      actionType: "email",
      stage: "Booked",
      projectType: "Wedding",
      lastRun: "3 hours ago",
      runCount: 156,
      createdAt: "Oct 1, 2025",
    },
    {
      id: "6",
      name: "Pre-Session Checklist",
      description: "Send checklist 7 days before session",
      triggerType: "booking",
      actionType: "email",
      stage: "Booked",
      projectType: "Engagement",
      lastRun: "5 hours ago",
      runCount: 34,
      createdAt: "Sep 15, 2025",
    },
  ],
  scheduled: [
    {
      id: "7",
      name: "Day-Before Reminder",
      description: "Send reminder 1 day before event",
      triggerType: "booking",
      actionType: "sms",
      stage: "Booked",
      projectType: "All",
      nextRun: "Tomorrow, 9:00 AM",
      runCount: 89,
      createdAt: "Aug 10, 2025",
    },
    {
      id: "8",
      name: "Gallery Ready Notification",
      description: "Notify when gallery is published",
      triggerType: "event",
      actionType: "email",
      stage: "Completed",
      projectType: "Wedding",
      nextRun: "Jan 20, 2026",
      runCount: 12,
      createdAt: "Jul 5, 2025",
    },
  ],
  completed: [
    {
      id: "9",
      name: "Review Request",
      description: "Ask for review 2 weeks after delivery",
      triggerType: "time",
      actionType: "email",
      stage: "Completed",
      projectType: "Wedding",
      lastRun: "Yesterday",
      runCount: 234,
      successRate: 92,
      createdAt: "Jun 1, 2025",
    },
    {
      id: "10",
      name: "Anniversary Reminder",
      description: "Send anniversary message after 1 year",
      triggerType: "time",
      actionType: "email",
      stage: "Completed",
      projectType: "Wedding",
      lastRun: "3 days ago",
      runCount: 67,
      successRate: 88,
      createdAt: "May 15, 2025",
    },
  ],
};

// Tag colors based on trigger type - dark background
const triggerColors: Record<string, string> = {
  stage: "bg-gray-800 text-white",
  time: "bg-gray-800 text-white",
  event: "bg-gray-800 text-white",
  booking: "bg-gray-800 text-white",
};

// Tag colors based on action type - light background
const actionColors: Record<string, string> = {
  email: "bg-gray-100 text-gray-700",
  sms: "bg-gray-100 text-gray-700",
};

// Trigger type labels
const triggerLabels: Record<string, string> = {
  stage: "Stage Change",
  time: "Time Delay",
  event: "Event Trigger",
  booking: "Booking Relative",
};

// Action type labels
const actionLabels: Record<string, string> = {
  email: "Email",
  sms: "SMS",
};

// Trigger icons
const TriggerIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "stage":
      return <Target className="w-3 h-3" />;
    case "time":
      return <Clock className="w-3 h-3" />;
    case "event":
      return <Zap className="w-3 h-3" />;
    case "booking":
      return <Calendar className="w-3 h-3" />;
    default:
      return <Zap className="w-3 h-3" />;
  }
};

// Action icons
const ActionIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "email":
      return <Mail className="w-3 h-3" />;
    case "sms":
      return <MessageSquare className="w-3 h-3" />;
    default:
      return <Mail className="w-3 h-3" />;
  }
};

// Automation Card Component
interface AutomationCardProps {
  automation: {
    id: string;
    name: string;
    description: string;
    triggerType: string;
    actionType: string;
    stage: string;
    projectType: string;
    lastRun?: string | null;
    nextRun?: string;
    runCount: number;
    successRate?: number;
    createdAt: string;
  };
  showNextRun?: boolean;
}

function AutomationCard({
  automation,
  showNextRun = false,
}: AutomationCardProps) {
  return (
    <div
      className="
        bg-white
        rounded-xl
        shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)]
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.08)]
        hover:-translate-y-0.5
        transition-all duration-200
        p-4
        space-y-3
        cursor-pointer
        group
      "
    >
      {/* Header with title and menu */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
          {automation.name}
        </h4>
        <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-all p-1 -m-1">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
            triggerColors[automation.triggerType],
          )}
        >
          <TriggerIcon type={automation.triggerType} />
          {triggerLabels[automation.triggerType]}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
            actionColors[automation.actionType],
          )}
        >
          <ActionIcon type={automation.actionType} />
          {actionLabels[automation.actionType]}
        </span>
        {automation.projectType !== "All" && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
            {automation.projectType}
          </span>
        )}
      </div>

      {/* Metadata Row */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {automation.lastRun ? `Last run: ${automation.lastRun}` : "Never run"}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Play className="w-3 h-3" />
          {automation.runCount}
        </span>
      </div>
    </div>
  );
}

// Kanban Column Component
interface KanbanColumnProps {
  title: string;
  count: number;
  automations: AutomationCardProps["automation"][];
  accentColor: string;
  showAddButton?: boolean;
  showNextRun?: boolean;
  emptyMessage?: string;
}

function KanbanColumn({
  title,
  count,
  automations,
  accentColor,
  showAddButton = false,
  showNextRun = false,
  emptyMessage = "No automations",
}: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-[260px]">
      {/* Column Header */}
      <div className="flex items-center gap-2 px-1 pb-3">
        <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
        <button className="ml-auto text-gray-400 hover:text-gray-600 transition-colors p-1">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Cards Container - no flex-1, natural height */}
      <div className="space-y-3">
        {automations.length > 0 ? (
          automations.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              showNextRun={showNextRun}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            {emptyMessage}
          </div>
        )}

        {/* Add Button - inside cards container, right after last card */}
        {showAddButton && (
          <button className="w-full py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-transparent hover:bg-gray-100 rounded-lg border border-gray-300 hover:border-gray-400 transition-all">
            <Plus className="w-4 h-4 inline mr-1.5" />
            Add Automation
          </button>
        )}
      </div>
    </div>
  );
}

// Main Preview Page
export default function AutomationsPreview() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          {/* Top row with back button and actions */}
          <div className="flex items-center justify-between mb-4">
            <Link href="/automations">
              <Button variant="ghost" size="sm" className="gap-2 text-gray-600">
                <ArrowLeft className="w-4 h-4" />
                Back to Current Design
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                Preview Mode
              </span>
            </div>
          </div>

          {/* Title and description */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-6 h-6 text-indigo-500" />
                Automations
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Automate your workflow with triggers and actions
              </p>
            </div>

            {/* Primary action button */}
            <Button
              className="
                bg-indigo-500 hover:bg-indigo-600
                text-white
                shadow-[0_4px_12px_rgba(99,102,241,0.25)]
                hover:shadow-[0_6px_16px_rgba(99,102,241,0.3)]
                transition-all duration-200
              "
            >
              <Plus className="w-4 h-4 mr-2" />
              New Automation
            </Button>
          </div>

          {/* Filters and search row */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search automations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64 h-9 bg-gray-50 border-gray-200"
                />
              </div>

              {/* Filter buttons */}
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <Filter className="w-4 h-4" />
                Filter
                <ChevronDown className="w-3 h-3" />
              </Button>

              <Button variant="outline" size="sm" className="gap-2 h-9">
                <Target className="w-4 h-4" />
                Trigger Type
                <ChevronDown className="w-3 h-3" />
              </Button>

              <Button variant="outline" size="sm" className="gap-2 h-9">
                <Users className="w-4 h-4" />
                Project Type
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "kanban"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700",
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700",
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-5 min-w-max">
          <KanbanColumn
            title="Inactive"
            count={mockAutomations.inactive.length}
            automations={mockAutomations.inactive}
            accentColor="bg-gray-400"
            showAddButton
            emptyMessage="No inactive automations"
          />
          <KanbanColumn
            title="Active"
            count={mockAutomations.active.length}
            automations={mockAutomations.active}
            accentColor="bg-green-500"
            showAddButton
            emptyMessage="No active automations"
          />
          <KanbanColumn
            title="Scheduled"
            count={mockAutomations.scheduled.length}
            automations={mockAutomations.scheduled}
            accentColor="bg-amber-500"
            showNextRun
            emptyMessage="No scheduled runs"
          />
          <KanbanColumn
            title="Completed"
            count={mockAutomations.completed.length}
            automations={mockAutomations.completed}
            accentColor="bg-indigo-500"
            emptyMessage="No completed automations"
          />
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">4</span> Active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">2</span> Scheduled
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">2</span> Inactive
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Total runs this month:{" "}
              <span className="font-semibold text-gray-900">1,247</span>
            </div>
            <div className="text-sm text-gray-500">
              Success rate:{" "}
              <span className="font-semibold text-green-600">94.2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
