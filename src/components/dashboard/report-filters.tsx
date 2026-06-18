import Link from "next/link";
import { CalendarDays, Search, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DashboardFilters } from "@/lib/types";
import { cn } from "@/lib/utils";

type ReportFiltersProps = {
  action: string;
  filters: DashboardFilters;
  repSlug?: string;
  clearHref: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  dateLabel?: string;
};

export function ReportFilters({
  action,
  filters,
  repSlug,
  clearHref,
  searchLabel = "Find a report",
  searchPlaceholder = "Client, meeting title, or date",
  dateLabel = "Meeting date",
}: ReportFiltersProps) {
  const hasFilters = Boolean(filters.q || filters.date);

  return (
    <form action={action} className="magic-card p-3">
      {repSlug ? <input type="hidden" name="rep" value={repSlug} /> : null}
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
        <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          {searchLabel}
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              name="q"
              defaultValue={filters.q || ""}
              placeholder={searchPlaceholder}
              className="magic-input h-10 pl-9"
            />
          </span>
        </label>

        <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          {dateLabel}
          <span className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <Input name="date" type="date" defaultValue={filters.date || ""} className="magic-input h-10 pl-9" />
          </span>
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className={cn(buttonVariants({ size: "default" }), "h-10 rounded-full bg-[#DC2626] px-5 text-white hover:bg-[#B91C1C]")}
          >
            Search
          </button>
          {hasFilters ? (
            <Link
              href={clearHref}
              className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-10 w-10 shrink-0 rounded-full border-slate-200 bg-white")}
              aria-label="Clear filters"
            >
              <X className="size-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
