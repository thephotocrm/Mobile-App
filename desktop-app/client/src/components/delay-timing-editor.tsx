import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, PlayCircle } from "lucide-react";

export type AnchorType = "STAGE_ENTRY" | "BOOKING_START" | "BOOKING_END";

export interface DelayTimingValue {
  delayDays: number;
  delayHours: number;
  delayMinutes: number;
  sendAtHour?: number;
  sendAtMinute?: number;
  anchorType?: AnchorType;
}

export function deriveTimingMode(
  value: DelayTimingValue,
): "immediate" | "delayed" {
  // Any non-zero delay (positive or negative) means delayed timing
  const isImmediate =
    value.delayDays === 0 && value.delayHours === 0 && value.delayMinutes === 0;
  return isImmediate ? "immediate" : "delayed";
}

export function getAnchorTypeLabel(anchorType: AnchorType): string {
  switch (anchorType) {
    case "STAGE_ENTRY":
      return "When entering stage";
    case "BOOKING_START":
      return "Relative to booking start";
    case "BOOKING_END":
      return "Relative to booking end";
    default:
      return "When entering stage";
  }
}

interface DelayTimingEditorProps {
  value: DelayTimingValue;
  onChange: (value: DelayTimingValue) => void;
  allowImmediate?: boolean;
  disabled?: boolean;
  showAnchorType?: boolean;
}

function safeParseInt(input: string): number {
  const parsed = parseInt(input);
  return isNaN(parsed) ? 0 : parsed;
}

export function DelayTimingEditor({
  value,
  onChange,
  allowImmediate = true,
  disabled = false,
  showAnchorType = false,
}: DelayTimingEditorProps) {
  const timingMode = deriveTimingMode(value);
  const anchorType = value.anchorType || "STAGE_ENTRY";
  const isBookingRelative =
    anchorType === "BOOKING_START" || anchorType === "BOOKING_END";

  // Check all timing values for "before" status - any negative value means "before booking"
  const isBeforeTiming =
    value.delayMinutes < 0 || value.delayHours < 0 || value.delayDays < 0;
  const absoluteMinutes = Math.abs(value.delayMinutes);
  const displayDays = Math.abs(value.delayDays);
  const displayHours = Math.abs(value.delayHours);

  const handleTimingModeChange = (mode: "immediate" | "delayed") => {
    if (mode === "immediate") {
      onChange({
        ...value,
        delayDays: 0,
        delayHours: 0,
        delayMinutes: 0,
        sendAtHour: undefined,
        sendAtMinute: undefined,
      });
    } else {
      // Check for any existing delay (positive or negative)
      const hasExistingDelay =
        value.delayDays !== 0 ||
        value.delayHours !== 0 ||
        value.delayMinutes !== 0;
      onChange({
        ...value,
        delayMinutes: hasExistingDelay ? value.delayMinutes : 5,
        delayHours: value.delayHours || 0,
        delayDays: value.delayDays || 0,
      });
    }
  };

  const handleAnchorTypeChange = (newAnchorType: AnchorType) => {
    onChange({
      ...value,
      anchorType: newAnchorType,
    });
  };

  const handleBeforeAfterChange = (timing: "before" | "after") => {
    const currentAbsMinutes = Math.abs(value.delayMinutes);
    const currentAbsHours = Math.abs(value.delayHours);
    const currentAbsDays = Math.abs(value.delayDays);

    if (timing === "before") {
      onChange({
        ...value,
        delayMinutes: -Math.abs(currentAbsMinutes || 60),
        delayHours: -Math.abs(currentAbsHours),
        delayDays: -Math.abs(currentAbsDays),
      });
    } else {
      onChange({
        ...value,
        delayMinutes: Math.abs(currentAbsMinutes || 60),
        delayHours: Math.abs(currentAbsHours),
        delayDays: Math.abs(currentAbsDays),
      });
    }
  };

  const handleDelayDaysChange = (inputValue: string) => {
    const days = safeParseInt(inputValue);
    const signedDays = isBeforeTiming ? -Math.abs(days) : Math.abs(days);
    const wasDayBased = Math.abs(value.delayDays) >= 1;
    const nowDayBased = days >= 1;

    if (!wasDayBased && nowDayBased) {
      onChange({
        ...value,
        delayDays: signedDays,
        delayHours: 0,
        delayMinutes: 0,
        sendAtHour: value.sendAtHour ?? 9,
        sendAtMinute: value.sendAtMinute ?? 0,
      });
    } else if (wasDayBased && !nowDayBased) {
      const defaultMinutes = isBeforeTiming ? -60 : 60;
      onChange({
        ...value,
        delayDays: signedDays,
        delayHours: 0,
        delayMinutes: defaultMinutes,
        sendAtHour: undefined,
        sendAtMinute: undefined,
      });
    } else {
      onChange({
        ...value,
        delayDays: signedDays,
      });
    }
  };

  const handleDelayHoursChange = (inputValue: string) => {
    const hours = safeParseInt(inputValue);
    const signedHours = isBeforeTiming ? -Math.abs(hours) : Math.abs(hours);
    onChange({
      ...value,
      delayHours: signedHours,
    });
  };

  const handleDelayMinutesChange = (inputValue: string) => {
    const minutes = safeParseInt(inputValue);
    const signedMinutes = isBeforeTiming
      ? -Math.abs(minutes)
      : Math.abs(minutes);
    onChange({
      ...value,
      delayMinutes: signedMinutes,
    });
  };

  const getTimingDescription = () => {
    if (anchorType === "STAGE_ENTRY") {
      return "Time after entering this stage";
    } else if (anchorType === "BOOKING_START") {
      return isBeforeTiming
        ? "Time before booking starts"
        : "Time after booking starts";
    } else {
      return isBeforeTiming
        ? "Time before booking ends"
        : "Time after booking ends";
    }
  };

  return (
    <div className="space-y-3">
      {showAnchorType && (
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Trigger Reference Point
          </Label>
          <Select
            value={anchorType}
            onValueChange={(val) => handleAnchorTypeChange(val as AnchorType)}
            disabled={disabled}
          >
            <SelectTrigger data-testid="select-anchor-type">
              <SelectValue placeholder="Select when to trigger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STAGE_ENTRY">
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4" />
                  <span>When entering stage</span>
                </div>
              </SelectItem>
              <SelectItem value="BOOKING_START">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Relative to booking start</span>
                </div>
              </SelectItem>
              <SelectItem value="BOOKING_END">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Relative to booking end</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {anchorType === "STAGE_ENTRY"
              ? "Triggers when a project enters this pipeline stage"
              : "Triggers relative to a scheduled booking (discovery call, meeting, etc.)"}
          </p>
        </div>
      )}

      {allowImmediate && (
        <>
          <Label>
            Send Timing{" "}
            {timingMode === "delayed" && (
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                (Delay Active)
              </span>
            )}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={timingMode === "immediate" ? "default" : "outline"}
              className="w-full"
              onClick={() => handleTimingModeChange("immediate")}
              disabled={disabled}
              data-testid="button-timing-immediate"
            >
              {isBookingRelative ? "At Event Time" : "Send Immediately"}
            </Button>
            <Button
              type="button"
              variant={timingMode === "delayed" ? "default" : "outline"}
              className="w-full"
              onClick={() => handleTimingModeChange("delayed")}
              disabled={disabled}
              data-testid="button-timing-delayed"
            >
              {isBookingRelative ? "Before/After Event" : "Send After Delay"}
            </Button>
          </div>
        </>
      )}

      {timingMode === "delayed" && (
        <div className="space-y-3 p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
          {isBookingRelative && (
            <div className="space-y-2">
              <Label className="text-xs">Timing Direction</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={isBeforeTiming ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => handleBeforeAfterChange("before")}
                  disabled={disabled}
                  data-testid="button-timing-before"
                >
                  Before {anchorType === "BOOKING_START" ? "Start" : "End"}
                </Button>
                <Button
                  type="button"
                  variant={!isBeforeTiming ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => handleBeforeAfterChange("after")}
                  disabled={disabled}
                  data-testid="button-timing-after"
                >
                  After {anchorType === "BOOKING_START" ? "Start" : "End"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isBeforeTiming
                  ? `Send before the booking ${anchorType === "BOOKING_START" ? "starts" : "ends"}`
                  : `Send after the booking ${anchorType === "BOOKING_START" ? "starts" : "ends"}`}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Delay (Days)</Label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              disabled={disabled}
              data-testid="input-delay-days"
              value={displayDays}
              onChange={(e) => handleDelayDaysChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {displayDays >= 1
                ? "Sends on a specific day at a set time"
                : "Use hours/minutes for exact delays under 1 day"}
            </p>
          </div>

          {displayDays >= 1 && (
            <div className="space-y-2">
              <Label className="text-xs">Send At (Time of Day)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Hour (0-23)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    placeholder="9"
                    disabled={disabled}
                    data-testid="input-send-at-hour"
                    value={value.sendAtHour ?? 9}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        sendAtHour: safeParseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Minute (0-59)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0"
                    disabled={disabled}
                    data-testid="input-send-at-minute"
                    value={value.sendAtMinute ?? 0}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        sendAtMinute: safeParseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {isBookingRelative
                  ? `Example: "1 day ${isBeforeTiming ? "before" : "after"} @ 9:00 AM"`
                  : 'Example: "1 day @ 9:00 AM" sends the next day at 9:00 AM'}
              </p>
            </div>
          )}

          {displayDays === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {getTimingDescription()}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    placeholder="0"
                    disabled={disabled}
                    data-testid="input-delay-hours"
                    value={displayHours}
                    onChange={(e) => handleDelayHoursChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Minutes</Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0"
                    disabled={disabled}
                    data-testid="input-delay-minutes"
                    value={absoluteMinutes}
                    onChange={(e) => handleDelayMinutesChange(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {isBookingRelative
                  ? `Sends ${isBeforeTiming ? "before" : "after"} the ${anchorType === "BOOKING_START" ? "booking start" : "booking end"}`
                  : "Sends exactly this amount of time after the trigger"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
