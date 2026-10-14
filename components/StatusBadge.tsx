import { BadgeCheck, Ban, CircleCheck, CircleDollarSign, CircleX, Clock3, MessageCircle, RotateCcw, Sparkles, type LucideIcon } from "lucide-react";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

type Status = "Requested" | "Reserved" | "Confirmed" | "Completed" | "Canceled" | "New" | "Responded" | "Declined" | "Active" | "Pending" | "Suspended" | "Success" | "Failure" | "Failed" | "Refunded" | "Paid" | "Outstanding" | "Waived" | "Needs reschedule or reject" | "Needs changes" | "Approved" | "Rejected";
const styles: Record<string, { className: string; icon: LucideIcon; key: string }> = {
  Requested: { className: "status-info", icon: Clock3, key: "requested" },
  Reserved: { className: "status-positive", icon: BadgeCheck, key: "reserved" },
  Confirmed: { className: "status-positive", icon: CircleCheck, key: "confirmed" },
  Completed: { className: "status-positive", icon: CircleCheck, key: "completed" },
  Active: { className: "status-positive", icon: CircleCheck, key: "active" },
  Responded: { className: "status-positive", icon: MessageCircle, key: "responded" },
  Success: { className: "status-positive", icon: CircleCheck, key: "success" },
  Paid: { className: "status-positive", icon: CircleCheck, key: "paid" },
  Refunded: { className: "status-info", icon: RotateCcw, key: "refunded" },
  New: { className: "status-info", icon: Sparkles, key: "new" },
  Pending: { className: "status-pending", icon: Clock3, key: "pending" },
  Outstanding: { className: "status-pending", icon: CircleDollarSign, key: "outstanding" },
  Waived: { className: "status-info", icon: CircleCheck, key: "waived" },
  Failure: { className: "status-negative", icon: CircleX, key: "failure" },
  Failed: { className: "status-negative", icon: CircleX, key: "failed" },
  Canceled: { className: "status-negative", icon: Ban, key: "canceled" },
  Declined: { className: "status-negative", icon: CircleX, key: "declined" },
  Suspended: { className: "status-negative", icon: Ban, key: "suspended" },
  "Needs reschedule or reject": { className: "status-pending", icon: Clock3, key: "overlapFlag" },
  "Needs changes": { className: "status-pending", icon: Clock3, key: "needsChanges" },
  Approved: { className: "status-positive", icon: CircleCheck, key: "approved" },
  Rejected: { className: "status-negative", icon: CircleX, key: "rejected" },
};

export function StatusBadge({ status, locale }: { status: Status | string; locale: Locale }) {
  const config = styles[status] ?? { className: "status-info", icon: Clock3, key: status };
  const Icon = config.icon;
  const label = t(config.key, locale);
  return <span className={`badge status-badge ${config.className}`} aria-label={`${label} — ${t("statusLegend", locale)}`}>
    <Icon size={14} aria-hidden="true" /><span>{label}</span>
  </span>;
}
