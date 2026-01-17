// Project Detail Page - Redesign Preview
// This is a static prototype page to preview the new design
// URL: /project-preview

import { useState } from "react";
import {
  Calendar,
  Paperclip,
  MessageSquare,
  Link as LinkIcon,
  Send,
  FileText,
  Archive,
  ChevronDown,
  Eye,
  MoreVertical,
  Heart,
  Users,
  Settings,
  Copy,
  ExternalLink,
  ArrowLeft,
  Camera,
  LayoutDashboard,
  FolderOpen,
  Inbox,
  Layers,
  Images,
  Package,
  ShoppingBag,
  Target,
  Zap,
  Sparkles,
  Star,
  Code,
  BarChart3,
  DollarSign,
  GraduationCap,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Tag,
  StickyNote,
  Image,
  Trash2,
  Edit3,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Receipt,
  TrendingUp,
  Upload,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Extended mock data
const mockProject = {
  title: "Sarah & Michael",
  projectType: "Wedding",
  eventDate: "Sat, Jun 14, 2026",
  eventDateCountdown: 149,
  participantCount: 2,
  venue: "The Grand Estate, Napa Valley",
  stage: "Proposal Sent",
  leadSource: "Instagram",
  totalValue: 8500,
  amountCollected: 2500,
  amountOutstanding: 6000,
};

const mockContacts = [
  { id: "1", name: "Sarah Johnson", email: "sarah@email.com", phone: "(555) 123-4567", role: "Primary", initials: "SJ" },
  { id: "2", name: "Michael Chen", email: "michael@email.com", phone: "(555) 987-6543", role: "Partner", initials: "MC" },
];

const mockFiles = [
  { id: "1", title: "Wedding Photography Proposal", status: "VIEWED", sentDate: "Sent Jan 10, 2026", value: 8500 },
  { id: "2", title: "Engagement Session Contract", status: "SIGNED", sentDate: "Sent Jan 8, 2026", value: 500 },
  { id: "3", title: "Wedding Day Timeline", status: "DRAFT", sentDate: null, value: 0 },
];

const mockActivity = [
  { id: "1", type: "EMAIL_SENT", title: "Proposal sent", description: "Wedding Photography Proposal was sent to Sarah Johnson", time: "2 hours ago", icon: Mail },
  { id: "2", type: "SMART_FILE_VIEWED", title: "Proposal viewed", description: "Sarah Johnson viewed the proposal", time: "1 hour ago", icon: Eye },
  { id: "3", type: "EMAIL_RECEIVED", title: "Email received", description: "Re: Wedding Photography Proposal", time: "45 min ago", icon: Mail },
  { id: "4", type: "SMS_SENT", title: "SMS sent", description: "Reminder about proposal expiration", time: "30 min ago", icon: MessageSquare },
];

const mockPayments = [
  { id: "1", type: "Deposit", amount: 2500, status: "PAID", date: "Jan 12, 2026", method: "Credit Card" },
  { id: "2", type: "Balance", amount: 3000, status: "PENDING", date: "May 14, 2026", method: "Due" },
  { id: "3", type: "Final Payment", amount: 3000, status: "PENDING", date: "Jun 21, 2026", method: "Due" },
];

const mockNotes = [
  { id: "1", content: "Bride prefers candid shots over posed photos. Mentioned wanting golden hour portraits.", date: "Jan 15, 2026" },
  { id: "2", content: "Groom's family flying in from overseas - confirm family portrait timing.", date: "Jan 10, 2026" },
];

const mockTags = [
  { id: "1", name: "VIP", color: "bg-purple-500" },
  { id: "2", name: "Summer 2026", color: "bg-blue-500" },
  { id: "3", name: "Referral", color: "bg-green-500" },
];

const tabs = ["Activity", "Files", "Tasks", "Financials", "Notes", "Gallery", "Details"];

const stages = ["New Inquiry", "Consultation", "Proposal Sent", "Booked", "Completed"];

// Sidebar navigation
const coreNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderOpen, active: true },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "SMS Inbox", href: "/inbox", icon: Inbox, badge: 3 },
  { name: "Scheduling", href: "/scheduling", icon: Calendar },
];

const groupedNavigation = [
  { id: "delivery", name: "Client Delivery", icon: Send, items: [{ href: "/smart-files" }] },
  { id: "marketing", name: "Marketing", icon: Target, items: [{ href: "/automations" }] },
  { id: "business", name: "Business Tools", icon: BarChart3, items: [{ href: "/reports" }] },
];

export default function ProjectDetailPreview() {
  const [activeTab, setActiveTab] = useState("Activity");
  const [includePortalLinks, setIncludePortalLinks] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState(mockProject.stage);

  // Calculate payment progress
  const paymentProgress = Math.round((mockProject.amountCollected / mockProject.totalValue) * 100);

  const renderTabContent = () => {
    switch (activeTab) {
      case "Activity":
        return (
          <div className="space-y-4">
            {/* Email Composer Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">You</AvatarFallback>
                </Avatar>
                <input
                  type="text"
                  placeholder="Write a message to Sarah & Michael..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="space-y-3">
              {mockActivity.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        activity.type.includes("RECEIVED") ? "bg-green-100" : "bg-gray-100"
                      )}>
                        <Icon className={cn(
                          "w-5 h-5",
                          activity.type.includes("RECEIVED") ? "text-green-600" : "text-gray-500"
                        )} />
                      </div>
                      {index < mockActivity.length - 1 && (
                        <div className="w-px h-full bg-gray-200 my-2" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 mb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{activity.title}</h4>
                          <p className="text-sm text-gray-500 mt-0.5">{activity.description}</p>
                        </div>
                        <span className="text-xs text-gray-400">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "Files":
        return (
          <div className="space-y-3">
            {mockFiles.map((file) => (
              <div
                key={file.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-200 rounded-xl px-4 sm:px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-all gap-3 sm:gap-0"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-11 h-11 rounded-lg flex items-center justify-center",
                    file.status === "DRAFT" ? "bg-gray-100" : "bg-orange-50"
                  )}>
                    <FileText className={cn(
                      "w-5 h-5",
                      file.status === "DRAFT" ? "text-gray-400" : "text-orange-500"
                    )} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{file.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide",
                        file.status === "SIGNED" ? "bg-green-100 text-green-700" :
                        file.status === "VIEWED" ? "bg-blue-100 text-blue-700" :
                        file.status === "DRAFT" ? "bg-gray-100 text-gray-500" :
                        "bg-orange-100 text-orange-700"
                      )}>
                        {file.status}
                      </span>
                      {file.sentDate && <span className="text-xs text-gray-400">{file.sentDate}</span>}
                      {file.value > 0 && <span className="text-xs font-medium text-gray-600">${file.value.toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {file.status === "DRAFT" ? (
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                      <Send className="w-4 h-4 mr-1.5" />
                      Send
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1.5" />
                      View
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="w-8 h-8">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Add File Button */}
            <button className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Attach Smart File</span>
            </button>
          </div>
        );

      case "Financials":
        return (
          <div className="space-y-6">
            {/* Financial Summary Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Payment Overview</h3>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full border-4 border-orange-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-orange-500">{paymentProgress}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">${mockProject.totalValue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Value</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">${mockProject.amountCollected.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Collected</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-500">${mockProject.amountOutstanding.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Outstanding</p>
                </div>
              </div>
            </div>

            {/* Payment Schedule */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Payment Schedule</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {mockPayments.map((payment) => (
                  <div key={payment.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        payment.status === "PAID" ? "bg-green-100" : "bg-gray-100"
                      )}>
                        {payment.status === "PAID" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{payment.type}</p>
                        <p className="text-sm text-gray-500">{payment.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${payment.amount.toLocaleString()}</p>
                      <p className={cn(
                        "text-xs",
                        payment.status === "PAID" ? "text-green-600" : "text-gray-400"
                      )}>
                        {payment.status === "PAID" ? payment.method : "Pending"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "Notes":
        return (
          <div className="space-y-4">
            {/* Add Note */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <textarea
                placeholder="Add a note about this project..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                rows={3}
              />
              <div className="flex justify-end mt-3">
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Note
                </Button>
              </div>
            </div>

            {/* Notes List */}
            {mockNotes.map((note) => (
              <div key={note.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <p className="text-gray-700 leading-relaxed">{note.content}</p>
                  <Button variant="ghost" size="icon" className="w-8 h-8 -mt-1 -mr-1">
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-3">{note.date}</p>
              </div>
            ))}
          </div>
        );

      case "Gallery":
        return (
          <div className="space-y-6">
            {/* Native Gallery */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Images className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Wedding Gallery</h3>
                    <p className="text-sm text-gray-500">0 photos uploaded</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                  Not Ready
                </span>
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-3">Drag and drop photos or click to upload</p>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photos
                </Button>
              </div>
            </div>

            {/* External Gallery */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4">External Gallery Link</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste gallery URL (Pic-Time, Pixieset, etc.)"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <Button variant="outline">
                  <Link2 className="w-4 h-4 mr-2" />
                  Link
                </Button>
              </div>
            </div>
          </div>
        );

      case "Details":
        return (
          <div className="space-y-6">
            {/* Event Details */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Event Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Date</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={mockProject.eventDate}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      readOnly
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Venue</label>
                  <input
                    type="text"
                    value={mockProject.venue}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Participants</h3>
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add
                </Button>
              </div>
              <div className="space-y-3">
                {mockContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-orange-100 text-orange-600 text-sm font-medium">
                          {contact.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">{contact.name}</p>
                        <p className="text-sm text-gray-500">{contact.email}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                      {contact.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "Tasks":
        return (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Tasks Coming Soon</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Track your to-dos and project milestones. This feature is currently in development.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Icons Only, Dark Charcoal */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-50 h-screen w-16 bg-[#1a1a1a] flex flex-col transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-center py-4">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <Camera className="w-6 h-6 text-[#1a1a1a]" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <div className="space-y-2">
            {coreNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  title={item.name}
                  className={cn(
                    "relative flex items-center justify-center w-12 h-12 rounded-xl transition-colors mx-auto",
                    item.active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </a>
              );
            })}
          </div>

          <div className="h-px bg-white/10 my-4 mx-2" />

          <div className="space-y-2">
            {groupedNavigation.map((group) => {
              const GroupIcon = group.icon;
              return (
                <a
                  key={group.id}
                  href={group.items[0].href}
                  title={group.name}
                  className="flex items-center justify-center w-12 h-12 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition-colors mx-auto"
                >
                  <GroupIcon className="w-5 h-5" />
                </a>
              );
            })}
          </div>
        </nav>

        <div className="py-4 px-2 space-y-2">
          <a href="/settings" title="Settings" className="flex items-center justify-center w-12 h-12 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition-colors mx-auto">
            <Settings className="w-5 h-5" />
          </a>
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">J</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Hero Section */}
        <div
          className="relative h-44 sm:h-52 md:h-60 bg-cover bg-center flex-shrink-0"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&h=400&fit=crop')",
            backgroundColor: "#374151"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/20" />

          {/* Back Button */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <button className="lg:hidden p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-colors" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-700" />
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">Projects</span>
            </button>
          </div>

          {/* Days Until Event Badge */}
          <div className="absolute top-4 right-4 z-20">
            <div className="px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg">
              <p className="text-xs text-gray-500">Days until event</p>
              <p className="text-xl font-bold text-gray-900">{mockProject.eventDateCountdown}</p>
            </div>
          </div>

          {/* Title Section */}
          <div className="absolute inset-x-0 bottom-0 z-10 px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-white tracking-tight drop-shadow-lg" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {mockProject.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-3">
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-orange-400 fill-orange-400" />
                <span className="text-sm font-medium text-white">{mockProject.projectType}</span>
              </div>
              <span className="text-white/50">•</span>
              <span className="text-sm text-white/80">{mockProject.eventDate}</span>
              <span className="text-white/50">•</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-white/60" />
                <span className="text-sm text-white/80">{mockProject.venue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-3 text-sm font-medium relative transition-colors whitespace-nowrap",
                  activeTab === tab ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-orange-500" />}
              </button>
            ))}
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <Button variant="outline" size="sm"><Calendar className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Schedule</span></Button>
              <Button variant="outline" size="sm"><Paperclip className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Attach</span></Button>
              <Button variant="outline" size="sm"><MessageSquare className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Message</span></Button>
              <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white"><FileText className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Create File</span></Button>
            </div>
            <Button variant="ghost" size="sm" className="text-gray-500"><Archive className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {renderTabContent()}
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0">
            <div className="p-4 sm:p-5 space-y-6">
              {/* Stage Selector */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stage</label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  {stages.map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-green-600">${mockProject.amountCollected.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Collected</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-orange-500">${mockProject.amountOutstanding.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Outstanding</p>
                </div>
              </div>

              {/* Primary Contact */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Primary Contact</label>
                <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-orange-100 text-orange-600 font-medium">SJ</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">Sarah Johnson</p>
                      <p className="text-sm text-gray-500 truncate">sarah@email.com</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1"><Mail className="w-4 h-4 mr-1.5" />Email</Button>
                    <Button variant="outline" size="sm" className="flex-1"><Phone className="w-4 h-4 mr-1.5" />Call</Button>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tags</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {mockTags.map((tag) => (
                    <span key={tag.id} className={cn("px-2.5 py-1 text-xs font-medium text-white rounded-full", tag.color)}>
                      {tag.name}
                    </span>
                  ))}
                  <button className="px-2.5 py-1 text-xs font-medium text-gray-400 border border-dashed border-gray-300 rounded-full hover:border-gray-400 hover:text-gray-500 transition-colors">
                    + Add
                  </button>
                </div>
              </div>

              {/* Client Portal */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Client Portal</label>
                <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-gray-500 truncate">sarah-michael.tpcportal.co</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7"><Copy className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7"><ExternalLink className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Include in emails</span>
                    <Switch checked={includePortalLinks} onCheckedChange={setIncludePortalLinks} className="data-[state=checked]:bg-orange-500" />
                  </div>
                </div>
              </div>

              {/* Lead Source */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lead Source</label>
                <p className="mt-1 text-sm text-gray-900">{mockProject.leadSource}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
