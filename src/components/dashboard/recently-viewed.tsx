"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PerformanceCall } from "@/lib/types";

const RECENT_KEY = "sales-performance-dashboard:recent";

type RecentItem = {
  id: number;
  label: string;
  rep: string;
  date: string | null;
};

export function TrackRecentlyViewed({ call }: { call: PerformanceCall }) {
  useEffect(() => {
    const item: RecentItem = {
      id: call.id,
      label: call.client_name || "Unknown client",
      rep: call.rep_name,
      date: call.call_date,
    };
    const existing = readRecent().filter((recent) => recent.id !== call.id);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...existing].slice(0, 8)));
  }, [call]);

  return null;
}

export function RecentlyViewed({ calls }: { calls: PerformanceCall[] }) {
  const [recent] = useState<RecentItem[]>(() => {
    if (typeof window === "undefined") return [];
    return readRecent();
  });
  const callMap = useMemo(() => new Map(calls.map((call) => [call.id, call])), [calls]);

  const visible = recent.slice(0, 4);
  if (!visible.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock3 className="size-4" />
        Recently Viewed
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {visible.map((item) => {
          const call = callMap.get(item.id);
          return (
            <Link
              key={item.id}
              href={`/call/${item.id}`}
              className={cn(buttonVariants({ variant: "outline" }), "block h-auto justify-start rounded-lg p-3 text-left")}
            >
              <span className="block truncate text-sm font-medium">{call?.client_name || item.label}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {call?.rep_name || item.rep} · {formatDate(call?.call_date || item.date)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function readRecent(): RecentItem[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
