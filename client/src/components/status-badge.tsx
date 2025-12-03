import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, AlertCircle, Copy, Loader2 } from "lucide-react";

interface StatusBadgeProps {
  status: "runned" | "not_runned" | "cloning" | "active" | "pending" | "expired" | "cancelled" | "suspended";
  className?: string;
}

const statusConfig = {
  runned: {
    label: "Running",
    icon: CheckCircle,
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  not_runned: {
    label: "Starting",
    icon: Clock,
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  cloning: {
    label: "Cloning",
    icon: Copy,
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  active: {
    label: "Active",
    icon: CheckCircle,
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  pending: {
    label: "Pending",
    icon: Loader2,
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  expired: {
    label: "Expired",
    icon: AlertCircle,
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  },
  cancelled: {
    label: "Cancelled",
    icon: AlertCircle,
    className: "bg-muted text-muted-foreground border-muted",
  },
  suspended: {
    label: "Suspended",
    icon: AlertCircle,
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium border",
        config.className,
        className
      )}
      data-testid={`status-badge-${status}`}
    >
      <Icon className={cn("h-3 w-3", status === "pending" && "animate-spin")} />
      {config.label}
    </Badge>
  );
}

interface LocationBadgeProps {
  location: "msk" | "ams";
  className?: string;
}

const locationConfig = {
  msk: { label: "Moscow", flag: "🇷🇺" },
  ams: { label: "Amsterdam", flag: "🇳🇱" },
};

export function LocationBadge({ location, className }: LocationBadgeProps) {
  const config = locationConfig[location] || locationConfig.msk;

  return (
    <Badge
      variant="secondary"
      className={cn("gap-1.5 font-medium", className)}
      data-testid={`location-badge-${location}`}
    >
      <span>{config.flag}</span>
      {config.label}
    </Badge>
  );
}
