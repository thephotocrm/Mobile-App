import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Settings,
  Eye,
  Code2,
  Smartphone,
  Calendar,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Photographer {
  id: string;
  businessName: string;
  publicToken: string;
  brandPrimary?: string;
}

type WidgetType = "lead-form" | "booking-calendar";

export default function WidgetGenerator() {
  const { toast } = useToast();
  const [widgetType, setWidgetType] = useState<WidgetType>("lead-form");
  const [activeTab, setActiveTab] = useState("setup");
  const [noDateYet, setNoDateYet] = useState(false);
  const [eventDate, setEventDate] = useState("");

  const [config, setConfig] = useState({
    title: "Get In Touch",
    description: "Let's discuss your photography needs",
    primaryColor: "#3b82f6",
    backgroundColor: "#ffffff",
    buttonText: "Send Inquiry",
    successMessage: "Thank you! We'll be in touch soon.",
    showPhone: true,
    showMessage: true,
    showEventDate: true,
    projectTypes: ["WEDDING", "ENGAGEMENT", "PORTRAIT"],
  });

  const { data: photographer, isLoading } = useQuery<Photographer>({
    queryKey: ["/api/photographer"],
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Embed code copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const generateEmbedCode = () => {
    if (!photographer?.publicToken) return "";

    const baseUrl = window.location.origin;
    return `<!-- Photographer Widget -->
<div class="photo-crm-widget" data-photographer-token="${photographer.publicToken}"></div>
<script src="${baseUrl}/widget/embed.js"></script>`;
  };

  const generateBookingEmbedCode = () => {
    if (!photographer?.publicToken) return "";

    const baseUrl = window.location.origin;
    return `<!-- Booking Calendar Widget -->
<div class="photo-crm-booking" data-photographer-token="${photographer.publicToken}"></div>
<script src="${baseUrl}/widget/booking-embed.js"></script>`;
  };

  const renderBookingPreview = () => {
    const primaryColor = photographer?.brandPrimary || "#3b82f6";
    const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthName = currentMonth.toLocaleString("default", { month: "long" });
    const year = currentMonth.getFullYear();
    const daysInMonth = new Date(
      year,
      currentMonth.getMonth() + 1,
      0,
    ).getDate();
    const startDay = currentMonth.getDay();

    return (
      <div className="max-w-md mx-auto rounded-xl shadow-lg overflow-hidden bg-white">
        {/* Header */}
        <div
          className="px-5 py-4 text-center"
          style={{ backgroundColor: primaryColor }}
        >
          <h3 className="text-lg font-semibold text-white">
            {photographer?.businessName || "Book an Appointment"}
          </h3>
          <p className="text-sm text-white/90 mt-1">Select a date and time</p>
        </div>

        {/* Calendar */}
        <div className="p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button className="px-3 py-2 border border-gray-200 rounded-md text-gray-600">
              ‹
            </button>
            <span className="font-semibold text-gray-900">
              {monthName} {year}
            </span>
            <button className="px-3 py-2 border border-gray-200 rounded-md text-gray-600">
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {days.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}
            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isPast =
                day < today.getDate() &&
                currentMonth.getMonth() === today.getMonth();
              const isToday =
                day === today.getDate() &&
                currentMonth.getMonth() === today.getMonth();
              const hasAvailability =
                !isPast && [1, 2, 3, 4, 5].includes((startDay + i) % 7); // Weekdays have availability

              return (
                <div
                  key={day}
                  className={`relative text-center p-2 rounded-md text-sm ${
                    isPast
                      ? "text-gray-300"
                      : hasAvailability
                        ? "bg-gray-100 text-gray-900 cursor-pointer hover:opacity-80"
                        : "text-gray-400"
                  }`}
                  style={hasAvailability ? { backgroundColor: "#f3f4f6" } : {}}
                >
                  {day}
                  {hasAvailability && (
                    <span
                      className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ backgroundColor: primaryColor }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Sample time slots (shown as if a date was selected) */}
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium text-gray-700 mb-3">
              Available times for today
            </div>
            <div className="grid grid-cols-2 gap-2">
              {["9:00 AM", "10:00 AM", "2:00 PM", "3:00 PM"].map((time) => (
                <button
                  key={time}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-500 hover:bg-blue-500 hover:text-white transition-colors"
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWidgetPreview = () => (
    <div
      className="max-w-md mx-auto p-6 rounded-lg shadow-lg border"
      style={{
        backgroundColor: config.backgroundColor,
        borderColor: config.primaryColor + "33",
      }}
    >
      <div className="text-center mb-6">
        <h3
          className="text-xl font-semibold mb-2"
          style={{ color: config.primaryColor }}
        >
          {config.title}
        </h3>
        <p className="text-gray-600">{config.description}</p>
      </div>

      <form className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              First Name *
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded-md"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Last Name *
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded-md"
              placeholder="Doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <input
            type="email"
            className="w-full p-2 border rounded-md"
            placeholder="john@example.com"
          />
        </div>

        {config.showPhone && (
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              className="w-full p-2 border rounded-md"
              placeholder="(555) 123-4567"
            />
          </div>
        )}

        {config.showEventDate && (
          <div>
            <label className="block text-sm font-medium mb-1">Event Date</label>
            <input
              type="date"
              className="w-full p-2 border rounded-md"
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value);
                if (e.target.value) setNoDateYet(false);
              }}
              disabled={noDateYet}
              style={{
                opacity: noDateYet ? 0.5 : 1,
                cursor: noDateYet ? "not-allowed" : "text",
              }}
            />
            <div className="mt-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={noDateYet}
                  onChange={(e) => {
                    setNoDateYet(e.target.checked);
                    if (e.target.checked) setEventDate("");
                  }}
                  className="mr-2"
                />
                <span className="text-sm">I don't have a date yet</span>
              </label>
            </div>
          </div>
        )}

        {config.showMessage && (
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              className="w-full p-2 border rounded-md"
              rows={3}
              placeholder="Tell us about your photography needs..."
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 px-4 text-white rounded-md font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: config.primaryColor }}
        >
          {config.buttonText}
        </button>
      </form>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!photographer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Please log in to access the widget generator.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Widget Generator</h1>
            <p className="text-muted-foreground">
              Create embeddable widgets for your website
            </p>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Widget Type Selector */}
        <div className="mb-6">
          <Label className="text-sm font-medium mb-3 block">Widget Type</Label>
          <div className="flex gap-3">
            <button
              onClick={() => setWidgetType("lead-form")}
              className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                widgetType === "lead-form"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div
                className={`p-2 rounded-lg ${widgetType === "lead-form" ? "bg-primary/10" : "bg-muted"}`}
              >
                <FileText
                  className={`w-5 h-5 ${widgetType === "lead-form" ? "text-primary" : "text-muted-foreground"}`}
                />
              </div>
              <div className="text-left">
                <div
                  className={`font-medium ${widgetType === "lead-form" ? "text-primary" : ""}`}
                >
                  Lead Form
                </div>
                <div className="text-sm text-muted-foreground">
                  Capture inquiries with a contact form
                </div>
              </div>
            </button>
            <button
              onClick={() => setWidgetType("booking-calendar")}
              className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                widgetType === "booking-calendar"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div
                className={`p-2 rounded-lg ${widgetType === "booking-calendar" ? "bg-primary/10" : "bg-muted"}`}
              >
                <Calendar
                  className={`w-5 h-5 ${widgetType === "booking-calendar" ? "text-primary" : "text-muted-foreground"}`}
                />
              </div>
              <div className="text-left">
                <div
                  className={`font-medium ${widgetType === "booking-calendar" ? "text-primary" : ""}`}
                >
                  Booking Calendar
                </div>
                <div className="text-sm text-muted-foreground">
                  Let clients book appointments directly
                </div>
              </div>
            </button>
          </div>
        </div>

        {widgetType === "lead-form" ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="flex flex-col md:grid md:grid-cols-3 w-full gap-1 md:gap-0 h-auto md:h-10">
              <TabsTrigger
                value="setup"
                data-testid="tab-setup"
                className="flex items-center gap-2 justify-start w-full md:justify-center"
              >
                <Settings className="w-4 h-4" />
                Setup & Configure
              </TabsTrigger>
              <TabsTrigger
                value="customize"
                data-testid="tab-customize"
                className="flex items-center gap-2 justify-start w-full md:justify-center"
              >
                <Eye className="w-4 h-4" />
                Customize & Preview
              </TabsTrigger>
              <TabsTrigger
                value="embed"
                data-testid="tab-embed"
                className="flex items-center gap-2 justify-start w-full md:justify-center"
              >
                <Code2 className="w-4 h-4" />
                Get Embed Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-6">
              {/* Setup Tab */}
              <Card>
                <CardHeader>
                  <CardTitle>Widget Configuration</CardTitle>
                  <CardDescription>
                    Configure your widget settings and appearance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Widget Title</Label>
                      <Input
                        id="title"
                        data-testid="input-title"
                        value={config.title}
                        onChange={(e) =>
                          setConfig({ ...config, title: e.target.value })
                        }
                        placeholder="Get In Touch"
                      />
                    </div>
                    <div>
                      <Label htmlFor="buttonText">Button Text</Label>
                      <Input
                        id="buttonText"
                        data-testid="input-button-text"
                        value={config.buttonText}
                        onChange={(e) =>
                          setConfig({ ...config, buttonText: e.target.value })
                        }
                        placeholder="Send Inquiry"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      data-testid="input-description"
                      value={config.description}
                      onChange={(e) =>
                        setConfig({ ...config, description: e.target.value })
                      }
                      placeholder="Let's discuss your photography needs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <Input
                        id="primaryColor"
                        data-testid="input-primary-color"
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) =>
                          setConfig({ ...config, primaryColor: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="backgroundColor">Background Color</Label>
                      <Input
                        id="backgroundColor"
                        data-testid="input-background-color"
                        type="color"
                        value={config.backgroundColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            backgroundColor: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="embed" className="space-y-6">
              {/* Embed Tab */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Code2 className="w-5 h-5" />
                        <span>Embed Code</span>
                      </CardTitle>
                      <CardDescription>
                        Copy and paste this code into your website where you
                        want the lead capture form to appear:
                      </CardDescription>
                    </div>
                    <Button
                      data-testid="button-copy-embed"
                      onClick={() => copyToClipboard(generateEmbedCode())}
                      size="sm"
                      variant="outline"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                      <code>{generateEmbedCode()}</code>
                    </pre>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md border border-blue-200 dark:border-blue-800 mt-4">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Installation Instructions:
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                      <li>Copy the embed code above</li>
                      <li>
                        Paste it into your website's HTML where you want the
                        form to appear
                      </li>
                      <li>
                        The form will automatically load and be ready to receive
                        inquiries
                      </li>
                      <li>All submissions will appear in your CRM dashboard</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customize" className="space-y-6">
              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Smartphone className="w-5 h-5" />
                    <span>Live Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                    {renderWidgetPreview()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          /* Booking Calendar Section */
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Smartphone className="w-5 h-5" />
                    <span>Widget Preview</span>
                  </CardTitle>
                  <CardDescription>
                    This is how your booking calendar will appear on your
                    website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                    {renderBookingPreview()}
                  </div>
                </CardContent>
              </Card>

              {/* Embed Code */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Code2 className="w-5 h-5" />
                        <span>Embed Code</span>
                      </CardTitle>
                      <CardDescription>
                        Copy and paste this code into your website
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() =>
                        copyToClipboard(generateBookingEmbedCode())
                      }
                      size="sm"
                      variant="outline"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                      <code>{generateBookingEmbedCode()}</code>
                    </pre>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md border border-blue-200 dark:border-blue-800 mt-4">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      How It Works:
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                      <li>Copy the embed code above</li>
                      <li>
                        Paste it into your website where you want the calendar
                      </li>
                      <li>Clients select a date and available time slot</li>
                      <li>
                        They fill in their details and confirm the booking
                      </li>
                      <li>
                        Bookings appear in your CRM calendar automatically
                      </li>
                    </ol>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-md border border-amber-200 dark:border-amber-800 mt-4">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      Important:
                    </h4>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Make sure you've set up your availability in the
                      Scheduling page. The calendar will only show dates/times
                      where you have availability configured.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
