import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  LayoutDashboard,
  Users,
  FolderOpen,
  Calendar,
  Zap,
  BarChart3,
  DollarSign,
  Settings,
  LogOut,
  Layers,
  Inbox as InboxIcon,
  GraduationCap,
  Images,
  TrendingUp,
  CreditCard,
  FileText as ActivityIcon,
  Headphones,
  ChevronDown,
  Mail,
  Megaphone,
  FileText,
  Palette,
  ClipboardList,
  Code,
  Star,
  Send,
  Briefcase,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { setOpenMobile, isMobile, state } = useSidebar();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "Client Delivery": false,
    "Marketing": false,
    "Business Tools": false,
  });
  // Track which sections were open before sidebar collapsed
  const previousOpenSections = useRef<Record<string, boolean>>({});
  const wasExpanded = useRef(true);

  // Handle sidebar collapse/expand - close submenus when collapsed, restore when expanded
  useEffect(() => {
    const isExpanded = state === "expanded";

    if (!isExpanded && wasExpanded.current) {
      // Sidebar is collapsing - save current state and close all
      previousOpenSections.current = { ...openSections };
      setOpenSections({
        "Client Delivery": false,
        "Marketing": false,
        "Business Tools": false,
      });
    } else if (isExpanded && !wasExpanded.current) {
      // Sidebar is expanding - restore previous state after text has faded in
      setTimeout(() => {
        setOpenSections(previousOpenSections.current);
      }, 400);
    }

    wasExpanded.current = isExpanded;
  }, [state]);

  // Fetch unread inbox count
  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ['/api/inbox/unread-count'],
    enabled: user?.role === 'PHOTOGRAPHER',
    refetchInterval: 30000
  });

  const unreadCount = unreadData?.unreadCount || 0;

  // Admin navigation for /admin/* routes
  const adminNavigation = [
    { name: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Photographers", href: "/admin/photographers", icon: Users },
    { name: "Analytics", href: "/admin/analytics", icon: TrendingUp },
    { name: "Billing", href: "/admin/billing", icon: CreditCard },
    { name: "Activity", href: "/admin/activity", icon: ActivityIcon },
    { name: "Support", href: "/admin/support", icon: Headphones }
  ];

  // Core workspace items
  const coreNavigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderOpen },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "SMS Inbox", href: "/inbox", icon: InboxIcon, badge: unreadCount },
    { name: "Scheduling", href: "/scheduling", icon: Calendar },
  ];

  // Grouped navigation with icons for parent sections
  const groupedNavigation = [
    {
      name: "Client Delivery",
      icon: Send,
      items: [
        { name: "Smart Files", href: "/smart-files" },
        { name: "Galleries", href: "/galleries" },
        { name: "Packages", href: "/packages" },
        { name: "Add-ons", href: "/add-ons" },
      ],
    },
    {
      name: "Marketing",
      icon: Megaphone,
      items: [
        { name: "Automations", href: "/automations" },
        { name: "Drip Campaigns", href: "/drip-campaigns" },
        { name: "Templates", href: "/templates" },
        { name: "Email Branding", href: "/email-branding" },
        { name: "Lead Forms", href: "/lead-forms" },
        { name: "Embed Widgets", href: "/embed-widgets" },
        { name: "Testimonials", href: "/testimonials" },
      ],
    },
    {
      name: "Business Tools",
      icon: Briefcase,
      items: [
        { name: "Reports", href: "/reports" },
        { name: "Earnings", href: "/earnings" },
        { name: "Tutorials", href: "/tutorials" },
        { name: "Settings", href: "/settings" },
      ],
    },
  ];

  // Auto-close mobile sidebar when navigating
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location, isMobile, setOpenMobile]);

  // Determine which navigation to show
  const isAdminRoute = location.startsWith('/admin');
  const isAdmin = user?.role === 'ADMIN';
  const showAdminNav = isAdmin && isAdminRoute && !user?.isImpersonating;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Check if a route is active (including sub-routes)
  const isActiveRoute = (href: string) => {
    if (href === '/') return location === '/';
    return location === href || location.startsWith(href + '/');
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const isCurrentlyOpen = prev[section];
      // Close all sections, then open the clicked one (if it was closed)
      const allClosed = Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>);
      return { ...allClosed, [section]: !isCurrentlyOpen };
    });
  };

  // Mobile grid items - flatten grouped navigation for mobile
  const mobileItems = showAdminNav
    ? adminNavigation
    : [...coreNavigation, ...groupedNavigation.flatMap(group =>
        group.items.map(item => ({ ...item, icon: group.icon }))
      )];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:gap-0">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <Camera className="w-5 h-5 text-[#1a1a1a]" />
          </div>
          <span className="font-semibold text-white text-sm whitespace-nowrap overflow-hidden transition-all duration-200 delay-[250ms] group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:delay-0">
            The Photo CRM
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="dark-scrollbar">
        {isMobile ? (
          // Mobile Grid Layout
          <div className="p-4 overflow-y-auto">
            <div className="grid grid-cols-4 gap-3">
              {mobileItems.map((item) => {
                const isActive = isActiveRoute(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div
                      className={cn(
                        "relative aspect-square rounded-xl flex flex-col items-center justify-center p-3 transition-all duration-200",
                        isActive
                          ? "bg-white/20 shadow-lg scale-105"
                          : "bg-white/10 hover:bg-white/15 hover:scale-105"
                      )}
                    >
                      <div className="relative">
                        <Icon className="w-7 h-7 text-white mb-1.5" />
                        {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                          <div
                            className="absolute -top-2 -right-2 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-green-500 text-white"
                            data-testid="inbox-unread-badge"
                          >
                            {item.badge}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-white text-center leading-tight">
                        {item.name}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          // Desktop Layout with Text Labels
          <div className="flex-1 overflow-y-auto dark-scrollbar px-2 py-2">
            {/* Core Navigation */}
            <SidebarGroup className="p-0">
              <SidebarMenu>
                {(showAdminNav ? adminNavigation : coreNavigation).map((item) => {
                  const isActive = isActiveRoute(item.href);
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.name}
                        className={cn(
                          "w-full justify-start gap-3 px-3 py-2.5 rounded-lg transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                          isActive
                            ? "bg-white/10 text-white"
                            : "text-white/70 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Link
                          href={item.href}
                          data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <div className="relative">
                            <Icon className="w-5 h-5" />
                            {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                              <span
                                className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                                data-testid="inbox-unread-badge"
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">
                            {item.name}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

                {/* Group icons for collapsed state - in same menu for consistent styling */}
                {!showAdminNav && groupedNavigation.map((group) => {
                  const GroupIcon = group.icon;
                  const isGroupActive = group.items.some(item => isActiveRoute(item.href));

                  return (
                    <SidebarMenuItem key={`collapsed-${group.name}`} className="hidden group-data-[collapsible=icon]:block">
                      <SidebarMenuButton
                        asChild
                        isActive={isGroupActive}
                        tooltip={group.name}
                        className={cn(
                          "w-full justify-center px-0 py-2.5 rounded-lg transition-colors",
                          isGroupActive
                            ? "bg-white/10 text-white"
                            : "text-white/70 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Link href={group.items[0].href}>
                          <div className="relative">
                            <GroupIcon className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">
                            {group.name}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>

            {/* Grouped Navigation - Expanded state dropdowns */}
            {!showAdminNav && groupedNavigation.map((group) => {
              const GroupIcon = group.icon;

              return (
                <SidebarGroup
                  key={group.name}
                  className="group-data-[collapsible=icon]:hidden p-0"
                >
                  <Collapsible
                    open={openSections[group.name]}
                    onOpenChange={() => toggleSection(group.name)}
                  >
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <button
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                              "text-white/70 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <div className="relative">
                              <GroupIcon className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium whitespace-nowrap transition-opacity duration-100 delay-[250ms] group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:delay-0">
                              {group.name}
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 ml-auto transition-transform duration-200",
                                openSections[group.name] ? "rotate-180" : ""
                              )}
                            />
                          </button>
                        </CollapsibleTrigger>
                      </SidebarMenuItem>
                    </SidebarMenu>
                    <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:opacity-0 data-[state=closed]:h-0 data-[state=open]:animate-expand">
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {group.items.map((item) => {
                            const isActive = isActiveRoute(item.href);

                            return (
                              <SidebarMenuItem key={item.name}>
                                <Link
                                  href={item.href}
                                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                                  className={cn(
                                    "block w-full py-2 rounded-lg transition-colors",
                                    "ml-[32px]",
                                    isActive
                                      ? "bg-white/10 text-white"
                                      : "text-white/70 hover:bg-white/5 hover:text-white"
                                  )}
                                >
                                  <span className="text-sm font-medium pl-3">
                                    {item.name}
                                  </span>
                                </Link>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarGroup>
              );
            })}
          </div>
        )}
      </SidebarContent>

      <SidebarFooter>
        {!isMobile && (
          <div className="px-2 py-3 border-t border-white/10">
            {/* User Info */}
            <div className="flex items-center gap-3 px-3 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-medium text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                <p className="text-xs text-white/50">{user?.role}</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              data-testid="button-logout"
              className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Logout</span>
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
