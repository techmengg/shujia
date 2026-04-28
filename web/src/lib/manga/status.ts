export type NormalizedStatus =
  | "completed"
  | "reading"
  | "on-hold"
  | "dropped"
  | "plan-to-read"
  | "unknown";

export function normalizeStatus(status: string | null | undefined): NormalizedStatus {
  if (!status) return "unknown";
  const s = status.trim().toLowerCase();
  if (s.includes("complete")) return "completed";
  if (s.includes("reading") || s.includes("ongoing") || s.includes("current")) return "reading";
  if (s.includes("hold") || s.includes("pause")) return "on-hold";
  if (s.includes("drop")) return "dropped";
  if (s.includes("plan") || s.includes("queue")) return "plan-to-read";
  return "unknown";
}

const LABELS: Record<NormalizedStatus, string> = {
  completed: "Completed",
  reading: "Reading",
  "on-hold": "On hold",
  dropped: "Dropped",
  "plan-to-read": "Plan to read",
  unknown: "",
};

export function statusLabel(status: string | null | undefined): string | null {
  const label = LABELS[normalizeStatus(status)];
  return label.length ? label : null;
}
