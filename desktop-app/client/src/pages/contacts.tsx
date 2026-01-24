import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Mail,
  Phone,
  Calendar,
  Trash2,
  Eye,
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  Users,
  X,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { type ContactWithProjects } from "@shared/schema";
import { getAvatarColor, getInitials } from "@/lib/avatar-utils";
import { cn } from "@/lib/utils";

// Safe date formatter that handles invalid dates
// Parses as local date (not UTC) to avoid timezone shift showing wrong day
function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "N/A";
  // Extract YYYY-MM-DD and parse as local date to avoid UTC timezone issues
  const dateStr = typeof date === "string" ? date : date.toISOString();
  const datePart = dateStr.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return "N/A";
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString();
}

interface ContactsListProps {
  clients: ContactWithProjects[];
  onDelete: (client: ContactWithProjects) => void;
  onArchive: (clientId: string) => void;
  setLocation: (path: string) => void;
  isArchived: boolean;
}

function ContactsList({
  clients,
  onDelete,
  onArchive,
  setLocation,
  isArchived,
}: ContactsListProps) {
  return (
    <div>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Latest Project</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client: ContactWithProjects) => (
              <TableRow
                key={client.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setLocation(`/contacts/${client.id}`)}
                data-testid={`client-row-${client.id}`}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0 ${getAvatarColor(client.id)}`}
                    >
                      {getInitials(client.firstName, client.lastName)}
                    </div>
                    <span
                      className="truncate max-w-[150px]"
                      title={`${client.firstName} ${client.lastName}`}
                    >
                      {client.firstName} {client.lastName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1.5">
                    {client.email && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 mr-2 text-blue-500 shrink-0" />
                        <span
                          className="truncate max-w-[180px]"
                          title={client.email}
                        >
                          {client.email}
                        </span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="w-4 h-4 mr-2 text-green-500 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {!client.email && !client.phone && (
                      <span className="text-sm text-muted-foreground">
                        No contact info
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                      (client.projects?.length || 0) > 0
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300",
                    )}
                  >
                    {client.projects?.length || 0}
                  </span>
                </TableCell>
                <TableCell>
                  {client.projects && client.projects.length > 0 ? (
                    <div className="space-y-1">
                      <div className="text-sm font-medium truncate max-w-[120px]">
                        {client.projects[0].projectType}
                      </div>
                      {client.projects[0].eventDate && (
                        <div className="text-xs text-muted-foreground flex items-center">
                          <Calendar className="w-3 h-3 mr-1 shrink-0" />
                          {formatDate(client.projects[0].eventDate)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(client.createdAt)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        data-testid={`button-contact-actions-${client.id}`}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setLocation(`/contacts/${client.id}`)}
                      >
                        <ChevronRight className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onArchive(client.id)}
                        data-testid={`button-archive-${client.id}`}
                      >
                        {isArchived ? (
                          <>
                            <ArchiveRestore className="w-4 h-4 mr-2" />
                            Restore Contact
                          </>
                        ) : (
                          <>
                            <Archive className="w-4 h-4 mr-2" />
                            Archive Contact
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(client)}
                        className="text-destructive"
                        data-testid={`button-delete-${client.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Contact
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {clients.map((client: ContactWithProjects) => {
          const clientName = `${client.firstName} ${client.lastName}`;

          return (
            <div
              key={client.id}
              className="border dark:border-border rounded-lg overflow-hidden cursor-pointer hover:shadow-md active:scale-[0.99] transition-all duration-200 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-900 dark:to-slate-800/50"
              onClick={() => setLocation(`/contacts/${client.id}`)}
              data-testid={`client-card-${client.id}`}
            >
              {/* Project count indicator bar */}
              <div
                className={cn(
                  "h-1 w-full",
                  (client.projects?.length || 0) > 0
                    ? "bg-green-500"
                    : "bg-gray-200 dark:bg-slate-700",
                )}
              />
              <div className="p-4 space-y-3">
                {/* Contact Header with Avatar */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0 ${getAvatarColor(client.id)}`}
                    >
                      {getInitials(client.firstName, client.lastName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base truncate">
                        {client.firstName} {client.lastName}
                      </h3>
                      {client.projects && client.projects.length > 0 && (
                        <div className="text-xs text-muted-foreground truncate">
                          Latest: {client.projects[0].projectType}
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex gap-1 shrink-0 ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10"
                          data-testid={`button-client-actions-${client.id}`}
                          aria-label={`More actions for ${clientName}`}
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setLocation(`/contacts/${client.id}`)}
                        >
                          <ChevronRight className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onArchive(client.id)}
                          data-testid={`button-archive-${client.id}`}
                        >
                          {isArchived ? (
                            <>
                              <ArchiveRestore className="w-4 h-4 mr-2" />
                              Restore Contact
                            </>
                          ) : (
                            <>
                              <Archive className="w-4 h-4 mr-2" />
                              Archive Contact
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(client)}
                          className="text-destructive"
                          data-testid={`button-delete-${client.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Contact
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5">
                  {client.email && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 mr-2 text-blue-500 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 mr-2 text-green-500 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>

                {/* Project Info with Visual Indicators */}
                <div className="flex justify-between items-center pt-2 border-t border-border/50">
                  <div className="flex items-center space-x-2">
                    <div
                      className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                        (client.projects?.length || 0) > 0
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300",
                      )}
                    >
                      {client.projects?.length || 0}{" "}
                      {(client.projects?.length || 0) === 1
                        ? "project"
                        : "projects"}
                    </div>
                    {client.projects &&
                      client.projects.length > 0 &&
                      client.projects[0].eventDate && (
                        <div className="text-xs text-muted-foreground flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(client.projects[0].eventDate)}
                        </div>
                      )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(client.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Contacts() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] =
    useState<ContactWithProjects | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Handle ?new=true query param to auto-open dialog
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("new") === "true") {
      setIsDialogOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // All hooks must be called before any early returns
  const {
    data: clients,
    isLoading,
    isError,
  } = useQuery<ContactWithProjects[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const response = await fetch("/api/contacts", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
    enabled: !loading && !!user,
    retry: 2,
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      emailOptIn: boolean;
      smsOptIn: boolean;
    }) => {
      await apiRequest("POST", "/api/contacts", clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Contact created",
        description: "New contact has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest("DELETE", `/api/contacts/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      toast({
        title: "Contact deleted",
        description:
          "Contact and all related data have been permanently deleted.",
      });
    },
    onError: (error: Error) => {
      // Check if this is the financial activity error
      if (error.message?.includes("Smart Files or payment history")) {
        toast({
          title: "Cannot Delete Contact",
          description:
            "This contact has Smart Files or payment history. For financial record-keeping, you cannot delete contacts with financial activity. Please archive this contact instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description:
            error.message || "Failed to delete contact. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const archiveClientMutation = useMutation({
    mutationFn: async ({
      clientId,
      archive,
    }: {
      clientId: string;
      archive: boolean;
    }) => {
      await apiRequest("PATCH", `/api/contacts/${clientId}/archive`, {
        archive,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: variables.archive ? "Contact archived" : "Contact restored",
        description: variables.archive
          ? "Contact has been moved to the archived list."
          : "Contact has been restored to the active list.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update contact status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setEmailOptIn(true);
    setSmsOptIn(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createClientMutation.mutate({
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      emailOptIn,
      smsOptIn,
    });
  };

  const handleDeleteClick = (client: ContactWithProjects) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (clientToDelete) {
      deleteClientMutation.mutate(clientToDelete.id);
    }
  };

  // Split clients into active and archived
  const activeClients =
    clients?.filter(
      (client: ContactWithProjects) =>
        client.status === "ACTIVE" || !client.status,
    ) || [];

  const archivedClients =
    clients?.filter(
      (client: ContactWithProjects) => client.status === "ARCHIVED",
    ) || [];

  // Apply search filter based on active tab
  const filteredClients = (
    activeTab === "active" ? activeClients : archivedClients
  ).filter(
    (client: ContactWithProjects) =>
      `${client.firstName} ${client.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div>
      <div className="max-w-[1140px] mx-auto w-full p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <SidebarTrigger
              data-testid="button-menu-toggle"
              className="md:hidden shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-3xl md:text-4xl font-semibold truncate">
                Contacts
              </h1>
            </div>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  data-testid="button-add-client"
                  className="w-full sm:w-auto"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                  <DialogDescription>
                    Create a new contact profile for your photography services.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      data-testid="input-phone"
                    />
                  </div>

                  {/* Communication Preferences */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">
                        Communication Preferences
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose how this contact will receive updates and
                        automated messages.
                      </p>
                    </div>

                    <div className="flex flex-row items-center justify-between p-4 border rounded-lg bg-card">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">
                          📧 Email communications
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Receive project updates and notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={emailOptIn}
                        onCheckedChange={setEmailOptIn}
                        data-testid="switch-email-opt-in"
                      />
                    </div>

                    <div className="flex flex-row items-center justify-between p-4 border rounded-lg bg-card">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">
                          📱 SMS notifications & automations
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Enable SMS updates and automated messages. Required
                          for SMS automation workflows.
                        </p>
                      </div>
                      <Switch
                        checked={smsOptIn}
                        onCheckedChange={setSmsOptIn}
                        data-testid="switch-sms-opt-in"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createClientMutation.isPending}
                      data-testid="button-create-client"
                    >
                      {createClientMutation.isPending
                        ? "Creating..."
                        : "Create Contact"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 space-y-2">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab} contacts...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9"
              data-testid="input-search-clients"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Result count */}
          <div className="text-sm text-muted-foreground">
            {filteredClients.length}{" "}
            {filteredClients.length === 1 ? "contact" : "contacts"}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        </div>

        {/* Clients Table with Tabs */}
        <Card>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "active" | "archived")}
          >
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Contacts</CardTitle>
                <TabsList>
                  <TabsTrigger value="active" data-testid="tab-active-contacts">
                    Active ({activeClients.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="archived"
                    data-testid="tab-archived-contacts"
                  >
                    Archived ({archivedClients.length})
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            <CardContent>
              <TabsContent value="active" className="mt-0">
                {isLoading ? (
                  <div className="space-y-4">
                    {/* Desktop skeleton */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Contact Info</TableHead>
                            <TableHead>Projects</TableHead>
                            <TableHead>Latest Project</TableHead>
                            <TableHead>Added</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Skeleton className="w-9 h-9 rounded-full" />
                                  <Skeleton className="h-4 w-28" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1.5">
                                  <Skeleton className="h-4 w-40" />
                                  <Skeleton className="h-4 w-28" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-8 rounded-full" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-20" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-8 w-8 rounded" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Mobile skeleton */}
                    <div className="md:hidden space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-11 h-11 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-5 w-32" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : isError ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                      <X className="w-8 h-8 text-destructive" />
                    </div>
                    <p className="font-medium text-destructive">
                      Failed to load contacts
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please check your connection and try again.
                    </p>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="py-12 text-center">
                    <div
                      className={cn(
                        "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4",
                        searchTerm
                          ? "bg-slate-100 dark:bg-slate-800"
                          : "bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30",
                      )}
                    >
                      {searchTerm ? (
                        <Search className="w-8 h-8 text-slate-400" />
                      ) : (
                        <Users className="w-8 h-8 text-blue-500" />
                      )}
                    </div>
                    <p className="font-medium text-lg">
                      {searchTerm
                        ? `No contacts found for "${searchTerm}"`
                        : "Add your first contact"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                      {searchTerm
                        ? "Try adjusting your search or check the archived tab"
                        : "Start building your client database by adding contact information for your photography clients"}
                    </p>
                    {!searchTerm && (
                      <Button
                        onClick={() => setIsDialogOpen(true)}
                        className="mt-4"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Contact
                      </Button>
                    )}
                    {searchTerm && (
                      <Button
                        variant="outline"
                        onClick={() => setSearchTerm("")}
                        className="mt-4"
                      >
                        Clear Search
                      </Button>
                    )}
                  </div>
                ) : (
                  <ContactsList
                    clients={filteredClients}
                    onDelete={handleDeleteClick}
                    onArchive={(clientId) =>
                      archiveClientMutation.mutate({ clientId, archive: true })
                    }
                    setLocation={setLocation}
                    isArchived={false}
                  />
                )}
              </TabsContent>
              <TabsContent value="archived" className="mt-0">
                {isLoading ? (
                  <div className="space-y-4">
                    {/* Desktop skeleton */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Contact Info</TableHead>
                            <TableHead>Projects</TableHead>
                            <TableHead>Latest Project</TableHead>
                            <TableHead>Added</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[1, 2, 3].map((i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Skeleton className="w-9 h-9 rounded-full" />
                                  <Skeleton className="h-4 w-28" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1.5">
                                  <Skeleton className="h-4 w-40" />
                                  <Skeleton className="h-4 w-28" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-5 w-8 rounded-full" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-24" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-20" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-8 w-8 rounded" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Mobile skeleton */}
                    <div className="md:hidden space-y-3">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-11 h-11 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-5 w-32" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : isError ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                      <X className="w-8 h-8 text-destructive" />
                    </div>
                    <p className="font-medium text-destructive">
                      Failed to load contacts
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please check your connection and try again.
                    </p>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="py-12 text-center">
                    <div
                      className={cn(
                        "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4",
                        searchTerm
                          ? "bg-slate-100 dark:bg-slate-800"
                          : "bg-gray-100 dark:bg-slate-800",
                      )}
                    >
                      {searchTerm ? (
                        <Search className="w-8 h-8 text-slate-400" />
                      ) : (
                        <Archive className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <p className="font-medium text-lg">
                      {searchTerm
                        ? `No archived contacts found for "${searchTerm}"`
                        : "No archived contacts"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                      {searchTerm
                        ? "Try adjusting your search or check the active tab"
                        : "Archived contacts will appear here when you archive them"}
                    </p>
                    {searchTerm && (
                      <Button
                        variant="outline"
                        onClick={() => setSearchTerm("")}
                        className="mt-4"
                      >
                        Clear Search
                      </Button>
                    )}
                  </div>
                ) : (
                  <ContactsList
                    clients={filteredClients}
                    onDelete={handleDeleteClick}
                    onArchive={(clientId) =>
                      archiveClientMutation.mutate({ clientId, archive: false })
                    }
                    setLocation={setLocation}
                    isArchived={true}
                  />
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {clientToDelete?.firstName}{" "}
              {clientToDelete?.lastName}? This will permanently delete the
              client and all related data including:
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
              <li>All projects for this client</li>
              <li>All estimates and proposals</li>
              <li>All bookings and appointments</li>
              <li>All messages and communication history</li>
              <li>All payment records</li>
            </ul>
            <p className="mt-4 text-sm font-medium text-destructive">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteClientMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteClientMutation.isPending
                ? "Deleting..."
                : "Delete Contact"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
