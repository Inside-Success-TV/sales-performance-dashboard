import { ArrowDownWideNarrow, CheckCircle2, Sparkles, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CallCard } from "@/components/dashboard/call-card";
import { RepPicker } from "@/components/dashboard/rep-picker";
import { ReportFilters } from "@/components/dashboard/report-filters";
import { TrackUsageEvent } from "@/components/dashboard/usage-tracker";
import { getDashboardData } from "@/lib/db";
import { readFilters, type RawSearchParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = readFilters(await searchParams);
  const selectedRepSlug = filters.rep;
  const { calls, reps, configured, error } = await getDashboardData(
    selectedRepSlug ? { ...filters, rep: selectedRepSlug } : {},
  );
  const selectedRepName =
    reps.find((rep) => rep.rep_slug === selectedRepSlug)?.rep_name || calls[0]?.rep_name || "";
  const hasSelectedRep = Boolean(selectedRepSlug);

  return (
    <main className="magic-page">
      <TrackUsageEvent
        eventName="dashboard_home_viewed"
        eventData={{
          source: "official_dashboard",
          target_rep_slug: selectedRepSlug || null,
          target_rep_name: selectedRepName || null,
        }}
      />
      <div className="magic-container flex flex-col gap-6">
        <header className="magic-card magic-hero p-5 md:p-7">
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div className="max-w-3xl pt-2">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="magic-kicker">
                  <Sparkles className="size-3.5" />
                  Inside Success TV
                </span>
                {!configured ? <Badge variant="destructive">Database not connected</Badge> : null}
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-slate-950 md:text-5xl">
                Stop losing deals you could have closed.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Magic Mike turns every sales call into clear coaching: what worked, what was missed, and what to do next.
              </p>
              <div className="mt-5 grid gap-2 text-sm font-medium text-slate-700 sm:grid-cols-3">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#DC2626]" />
                  Rep-first view
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#DC2626]" />
                  Newest reports first
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#DC2626]" />
                  Enhanced report labels
                </span>
              </div>
            </div>

            <div className="magic-soft-panel p-4">
              <RepPicker reps={reps} selectedRepSlug={selectedRepSlug} />
              {hasSelectedRep ? (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <Badge variant="outline" className="gap-1 rounded-full bg-white/80 text-slate-600">
                    <ArrowDownWideNarrow className="size-3.5" />
                    Newest meetings first
                  </Badge>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!configured ? (
          <div className="magic-card p-4 text-sm leading-6 text-muted-foreground">
            Connect `DATABASE_URL` and `INGEST_SECRET` in Vercel, then run `scripts/schema.sql` or let the ingest route create the table on first post.
          </div>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
                {hasSelectedRep ? `${selectedRepName || "Selected rep"}'s calls` : "Choose a rep"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {hasSelectedRep
                  ? `${calls.length} ${calls.length === 1 ? "report" : "reports"} found.`
                  : "The call list appears after a rep is selected."}
              </p>
            </div>
          </div>

          {hasSelectedRep ? (
            <>
              <ReportFilters
                action="/"
                filters={filters}
                repSlug={selectedRepSlug}
                clearHref={`/?rep=${encodeURIComponent(selectedRepSlug || "")}`}
              />
              {calls.length ? (
                <div className="grid gap-3">
                  {calls.map((call) => <CallCard key={call.id} call={call} compact showRep={false} />)}
                </div>
              ) : (
                <EmptyState repName={selectedRepName} hasFilters={Boolean(filters.q || filters.date)} />
              )}
            </>
          ) : (
            <SelectionState />
          )}
        </section>
      </div>
    </main>
  );
}

function SelectionState() {
  return (
    <div className="magic-card p-10 text-center">
      <UserRound className="mx-auto mb-3 size-8 text-slate-400" />
      <h3 className="text-base font-semibold text-slate-950">No rep selected</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Feedback reports are grouped by rep.
      </p>
    </div>
  );
}

function EmptyState({ repName, hasFilters }: { repName: string; hasFilters?: boolean }) {
  return (
    <div className="magic-card p-10 text-center">
      <h3 className="text-base font-semibold text-slate-950">No reports found</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilters
          ? "No reports match that search."
          : repName
            ? `${repName} does not have dashboard reports yet.`
            : "This rep does not have dashboard reports yet."}
      </p>
    </div>
  );
}
