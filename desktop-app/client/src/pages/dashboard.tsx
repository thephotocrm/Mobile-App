import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Users,
  DollarSign,
  TrendingUp,
  Mail,
  Plus,
  UserPlus,
  FileText,
  Zap,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Helper to get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for OAuth callback status in URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleConnected = params.get("google_connected");
    const googleError = params.get("google_error");

    if (googleConnected === "true") {
      toast({
        title: "Google Calendar Connected!",
        description: "Your calendar integration is now active.",
      });
      // Remove query params from URL
      window.history.replaceState({}, "", "/dashboard");
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photographers/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photographer"] });
    } else if (googleError) {
      toast({
        title: "Connection Failed",
        description: `Failed to connect Google Calendar: ${decodeURIComponent(googleError)}`,
        variant: "destructive",
      });
      // Remove query params from URL
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [toast, queryClient]);

  // Redirect admins to admin dashboard
  useEffect(() => {
    if (user && user.role === "ADMIN" && !user.photographerId) {
      setLocation("/admin/dashboard");
    }
  }, [user, setLocation]);

  // Helper to check if user is a pure admin (not impersonating)
  const isPureAdmin = user?.role === "ADMIN" && !user?.photographerId;

  // Fetch summary stats (skip for pure admins - they get redirected)
  const { data: stats } = useQuery({
    queryKey: ["/api/reports/summary"],
    queryFn: () => fetch("/api/reports/summary").then((res) => res.json()),
    enabled: !!user && !isPureAdmin,
  });

  // Fetch photographer data for greeting
  const { data: photographer } = useQuery<{ photographerName?: string }>({
    queryKey: ["/api/photographers/me"],
    enabled: !!user && !isPureAdmin,
  });

  // Fetch recent projects (limit 5) (skip for pure admins - they get redirected)
  const { data: recentProjects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => fetch("/api/projects").then((res) => res.json()),
    select: (data: any[]) => data.filter((p: any) => !p.isArchived).slice(0, 5),
    enabled: !!user && !isPureAdmin,
  });

  // Fetch upcoming bookings (skip for pure admins - they get redirected)
  const { data: allBookings = [] } = useQuery({
    queryKey: ["/api/bookings"],
    queryFn: () => fetch("/api/bookings").then((res) => res.json()),
    enabled: !!user && !isPureAdmin,
  });

  // Filter for upcoming bookings (next 3)
  const upcomingBookings = Array.isArray(allBookings)
    ? allBookings
        .filter((booking: any) => new Date(booking.startTime) > new Date())
        .sort(
          (a: any, b: any) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        )
        .slice(0, 3)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Projects",
      value: stats?.totalProjects || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      borderColor: "border-t-blue-500",
    },
    {
      title: "New Leads",
      value: stats?.newLeads || 0,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
      borderColor: "border-t-emerald-500",
    },
    {
      title: "Unread Messages",
      value: stats?.unreadMessages || 0,
      icon: Mail,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
      borderColor: "border-t-amber-500",
    },
  ];

  const quickActions = [
    {
      label: "New Project",
      icon: Plus,
      path: "/projects?create=true",
      description: "Start a new project",
      gradient: "from-blue-500 to-blue-600",
      hoverGradient: "hover:from-blue-600 hover:to-blue-700",
    },
    {
      label: "New Contact",
      icon: UserPlus,
      path: "/contacts?create=true",
      description: "Add a contact",
      gradient: "from-purple-500 to-purple-600",
      hoverGradient: "hover:from-purple-600 hover:to-purple-700",
    },
    {
      label: "New Smart File",
      icon: FileText,
      path: "/smart-files",
      description: "Create proposal or invoice",
      gradient: "from-emerald-500 to-emerald-600",
      hoverGradient: "hover:from-emerald-600 hover:to-emerald-700",
    },
    {
      label: "New Automation",
      icon: Zap,
      path: "/automations",
      description: "Set up automation",
      gradient: "from-amber-500 to-orange-500",
      hoverGradient: "hover:from-amber-600 hover:to-orange-600",
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1140px] mx-auto w-full p-4 md:p-6 space-y-6">
          {/* Header with Personalized Greeting */}
          <div className="flex items-center gap-3">
            <SidebarTrigger
              data-testid="button-menu-toggle"
              className="md:hidden shrink-0"
            />
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-blue-800 dark:from-white dark:via-purple-300 dark:to-blue-300 bg-clip-text text-transparent">
                {getGreeting()}, there {photographer?.photographerName || ""}
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                {stats?.newLeads
                  ? `${stats.newLeads} new leads`
                  : "No new leads"}{" "}
                &bull;{" "}
                {upcomingBookings.length
                  ? `${upcomingBookings.length} upcoming ${upcomingBookings.length === 1 ? "appointment" : "appointments"}`
                  : "No upcoming appointments"}
              </p>
            </div>
          </div>
          {/* Top Stats Cards with Hero Revenue */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Hero Revenue Card */}
            <Card
              className="lg:col-span-1 bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 text-white border-0 shadow-lg card-hover-lift overflow-hidden relative"
              data-testid="stat-card-total-revenue"
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMCAwdi02aC02djZoNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-100">
                      Total Revenue
                    </p>
                    <h3 className="text-3xl font-bold mt-2">
                      ${stats?.totalRevenue?.toLocaleString() || 0}
                    </h3>
                    <p className="text-xs text-purple-200 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      This year
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <DollarSign className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Other Stat Cards with Colored Top Borders */}
            {statCards.map((stat, index) => (
              <Card
                key={index}
                className={cn("border-t-4 card-hover-lift", stat.borderColor)}
                data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <h3 className="text-2xl font-bold mt-2">{stat.value}</h3>
                    </div>
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        stat.bgColor,
                      )}
                    >
                      <stat.icon className={cn("w-6 h-6", stat.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Quick Actions with Gradient Buttons */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-white transition-all duration-200",
                      "bg-gradient-to-r shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                      action.gradient,
                      action.hoverGradient,
                    )}
                    onClick={() => setLocation(action.path)}
                    data-testid={`button-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold">{action.label}</div>
                      <div className="text-xs text-white/80">
                        {action.description}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/70" />
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Upcoming Appointments with Calendar-Style Dates */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-500" />
                  Upcoming Appointments
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/scheduling")}
                  data-testid="link-view-calendar"
                  className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/20"
                >
                  View Calendar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-8 relative overflow-hidden rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20">
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-4 left-8 w-16 h-16 rounded-full bg-cyan-400 blur-2xl" />
                      <div className="absolute bottom-4 right-8 w-20 h-20 rounded-full bg-blue-400 blur-2xl" />
                    </div>
                    <div className="relative">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                        <Calendar className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        No upcoming appointments
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your schedule is clear
                      </p>
                      <Button
                        size="sm"
                        className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-md"
                        onClick={() => setLocation("/scheduling")}
                      >
                        View Calendar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingBookings.slice(0, 3).map((booking: any) => (
                      <div
                        key={booking.id}
                        className="flex items-center gap-4 p-3 rounded-lg border hover:border-cyan-200 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 transition-all duration-200 card-hover-lift"
                        data-testid={`booking-${booking.id}`}
                      >
                        {/* Calendar-Style Date Block */}
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex flex-col items-center justify-center text-white shadow-md shrink-0">
                          <span className="text-lg font-bold leading-none">
                            {format(new Date(booking.startTime), "d")}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider opacity-90">
                            {format(new Date(booking.startTime), "MMM")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {booking.project?.title || "Appointment"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {booking.clientName}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 text-sm font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(booking.startTime), "h:mm a")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Projects with Enhanced Hover Effects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-500" />
                Recent Projects
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/projects")}
                data-testid="link-view-all-projects"
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/20"
              >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentProjects.length === 0 ? (
                <div className="text-center py-8 relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 left-8 w-16 h-16 rounded-full bg-purple-400 blur-2xl" />
                    <div className="absolute bottom-4 right-8 w-20 h-20 rounded-full bg-pink-400 blur-2xl" />
                  </div>
                  <div className="relative">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      No projects yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Start by creating your first project
                    </p>
                    <Button
                      size="sm"
                      className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md"
                      onClick={() => setLocation("/projects?create=true")}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create Project
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map((project: any) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:border-purple-200 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all duration-200 cursor-pointer card-hover-lift group"
                      onClick={() => setLocation(`/projects/${project.id}`)}
                      data-testid={`project-${project.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {project.title}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {project.client?.firstName}{" "}
                            {project.client?.lastName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {project.stage && (
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: project.stage.color,
                              color: project.stage.color,
                              backgroundColor: `${project.stage.color}15`,
                            }}
                          >
                            {project.stage.name}
                          </Badge>
                        )}
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity & Payments Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Activity with Vibrant Empty State */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 relative overflow-hidden rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 left-8 w-16 h-16 rounded-full bg-indigo-400 blur-2xl" />
                    <div className="absolute bottom-4 right-8 w-20 h-20 rounded-full bg-violet-400 blur-2xl" />
                  </div>
                  <div className="relative">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg">
                      <Clock className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Activity tracking coming soon
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      View your projects for current status
                    </p>
                    <Button
                      size="sm"
                      className="mt-4 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-md"
                      onClick={() => setLocation("/projects")}
                    >
                      Go to Projects
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payments Overview with Urgency Indicators */}
            <Card className="border-t-4 border-t-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  Payments
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/earnings")}
                  data-testid="link-view-payments"
                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                >
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Monthly Revenue - Hero Style */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                    <p className="text-sm text-emerald-100">
                      This month's revenue
                    </p>
                    <p className="text-3xl font-bold mt-1">
                      ${stats?.monthlyRevenue?.toLocaleString() || 0}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Pending - Amber Warning */}
                    <div
                      className={cn(
                        "p-3 rounded-lg",
                        (stats?.pendingPayments || 0) > 0
                          ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                          : "bg-muted/50",
                      )}
                    >
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p
                        className={cn(
                          "text-lg font-semibold",
                          (stats?.pendingPayments || 0) > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "",
                        )}
                      >
                        ${stats?.pendingPayments?.toLocaleString() || 0}
                      </p>
                    </div>

                    {/* Overdue - Red Alert with Pulse */}
                    <div
                      className={cn(
                        "p-3 rounded-lg relative overflow-hidden",
                        (stats?.overduePayments || 0) > 0
                          ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
                          : "bg-muted/50",
                      )}
                    >
                      {(stats?.overduePayments || 0) > 0 && (
                        <div className="absolute inset-0 animate-pulse bg-red-500/5" />
                      )}
                      <p className="text-xs text-muted-foreground relative">
                        Overdue
                      </p>
                      <p
                        className={cn(
                          "text-lg font-semibold relative",
                          (stats?.overduePayments || 0) > 0
                            ? "text-red-600 dark:text-red-400"
                            : "",
                        )}
                      >
                        ${stats?.overduePayments?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
