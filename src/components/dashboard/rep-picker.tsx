"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, Loader2, Search, UserRound } from "lucide-react";
import type { RepSummary } from "@/lib/types";
import { trackUsageEvent } from "@/components/dashboard/usage-tracker";
import { cn } from "@/lib/utils";

type RepPickerProps = {
  reps: RepSummary[];
  selectedRepSlug?: string;
  basePath?: string;
};

export function RepPicker({ reps, selectedRepSlug, basePath = "/" }: RepPickerProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedRep = reps.find((item) => item.rep_slug === selectedRepSlug);
  const filteredReps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return reps.slice(0, 80);

    return reps
      .filter((rep) => rep.rep_name.toLowerCase().includes(normalizedQuery))
      .slice(0, 80);
  }, [query, reps]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function selectRep(repSlug: string) {
    const rep = reps.find((item) => item.rep_slug === repSlug);
    if (repSlug) {
      trackUsageEvent("rep_selected", {
        source: basePath === "/manual-reports" ? "manual_reports" : "official_dashboard",
        target_rep_slug: repSlug,
        target_rep_name: rep?.rep_name || null,
      });
    }
    setOpen(false);
    startTransition(() => {
      router.push(repSlug ? `${basePath}?rep=${encodeURIComponent(repSlug)}` : basePath);
    });
  }

  return (
    <div ref={wrapperRef} className="relative grid gap-2">
      <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        Select your name
      </label>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-busy={isPending}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-4 text-left shadow-sm outline-none transition-colors hover:border-red-200 focus-visible:border-red-300 focus-visible:ring-3 focus-visible:ring-red-100"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
            <UserRound className="size-4" />
          </span>
          <span className="min-w-0">
            <span className={cn("block truncate text-sm font-semibold", selectedRep ? "text-slate-950" : "text-slate-500")}>
              {selectedRep?.rep_name || "Select a rep"}
            </span>
            <span className="block text-xs text-slate-400">
              {selectedRep ? `${selectedRep.call_count} reports` : `${reps.length} reps available`}
            </span>
          </span>
        </span>
        {isPending ? <Loader2 className="size-4 animate-spin text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search reps"
                className="magic-input h-10 w-full pl-9 text-sm outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="dashboard-scroll max-h-72 overflow-y-auto p-2" role="listbox">
            <button
              type="button"
              role="option"
              aria-selected={!selectedRepSlug}
              onClick={() => selectRep("")}
              className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              All reps
              {!selectedRepSlug ? <Check className="size-4 text-[#DC2626]" /> : null}
            </button>
            {filteredReps.map((rep) => (
              <button
                key={rep.rep_slug}
                type="button"
                role="option"
                aria-selected={selectedRepSlug === rep.rep_slug}
                onClick={() => selectRep(rep.rep_slug)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-[#FEF2F2]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-800">{rep.rep_name}</span>
                  <span className="text-xs text-slate-400">{rep.call_count} reports</span>
                </span>
                {selectedRepSlug === rep.rep_slug ? <Check className="size-4 shrink-0 text-[#DC2626]" /> : null}
              </button>
            ))}
            {!filteredReps.length ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">No reps found</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
