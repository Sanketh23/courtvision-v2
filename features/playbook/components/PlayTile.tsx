import Link from "next/link";
import type { ReactNode } from "react";
import type { PlaybookItem } from "@/features/playbook/types";
import { cn, formatRelativeTime } from "@/lib/utils";

/**
 * A play tile (UI_WORKFLOWS §5.5) in grid, list, or strip orientation.
 * The thumbnail is supplied by the route (features don't import features,
 * so the play-rendering component can't be imported here).
 */
export function PlayTile({
  item,
  thumbnail,
  variant,
  showStatus,
}: {
  item: PlaybookItem;
  thumbnail: ReactNode;
  variant: "grid" | "list" | "strip";
  showStatus: boolean;
}) {
  const meta = `Edited ${formatRelativeTime(item.updatedAt)} · ${item.durationSeconds.toFixed(1)}s · ${item.actionCount} ${item.actionCount === 1 ? "action" : "actions"}`;

  if (variant === "grid") {
    return (
      <Link
        href={`/play/${item.id}`}
        className="block overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/50"
      >
        <div className="border-b border-border bg-secondary/30">{thumbnail}</div>
        <div className="space-y-1.5 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{item.name}</span>
            {showStatus && item.status !== "published" && <StatusPill status={item.status} />}
          </div>
          <div className="flex flex-wrap gap-1">
            <Pill>{item.category}</Pill>
            {item.tags.slice(0, 2).map((tag) => (
              <Pill key={tag} muted>
                {tag}
              </Pill>
            ))}
          </div>
          <p className="truncate text-xs text-muted-foreground">{meta}</p>
        </div>
      </Link>
    );
  }

  const compact = variant === "strip";
  return (
    <Link
      href={`/play/${item.id}`}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/50",
        compact && "w-56 shrink-0",
      )}
    >
      <div className="w-12 shrink-0 overflow-hidden rounded border border-border">{thumbnail}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{item.name}</span>
          {showStatus && item.status !== "published" && <StatusPill status={item.status} />}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {compact
            ? `Edited ${formatRelativeTime(item.updatedAt)}`
            : `${item.category} · ${item.durationSeconds.toFixed(1)}s`}
        </p>
      </div>
    </Link>
  );
}

export function Pill({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] capitalize",
        muted ? "bg-secondary text-muted-foreground" : "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: "draft" | "published" | "archived" }) {
  const styles = {
    draft: "bg-amber-100 text-amber-800",
    published: "bg-green-100 text-green-800",
    archived: "bg-secondary text-muted-foreground",
  } as const;
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}
