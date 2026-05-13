import Link from "next/link";
import { ArrowDownWideNarrow, Clock3, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CallCard } from "@/components/dashboard/call-card";
import { getDashboardData } from "@/lib/db";
import { formatMiamiDateTime } from "@/lib/format";
import { readFilters, type RawSearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = readFilters(await searchParams);
  const selectedRepSlug = filters.rep;
  const { calls, reps, lastUpdatedAt, configured, error } = await getDashboardData(
    selectedRepSlug ? { rep: selectedRepSlug } : {},
  );
  const selectedRepName =
    reps.find((rep) => rep.rep_slug === selectedRepSlug)?.rep_name || calls[0]?.rep_name || "";
  const hasSelectedRep = Boolean(selectedRepSlug);

  return (
    <main className="dashboard-page min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="dashboard-card dashboard-hero rounded-2xl border bg-card/95 p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Inside Success TV</Badge>
                {!configured ? <Badge variant="destructive">Database not connected</Badge> : null}
              </div>
              <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
                Lil Rudy Sales Feedback Bot
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Select a rep to see their feedback reports, newest received first.
              </p>
            </div>

            {lastUpdatedAt ? (
              <div className="inline-flex shrink-0 items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-xs text-muted-foreground shadow-xs">
                <Clock3 className="size-3.5" />
                <span>Latest report {formatMiamiDateTime(lastUpdatedAt)}</span>
              </div>
            ) : null}
          </div>

          <form method="get" className="mt-6 grid gap-3 rounded-xl border bg-background/80 p-3 md:grid-cols-[1fr_auto]">
            <div className="grid gap-1.5">
              <label htmlFor="rep" className="text-xs font-semibold uppercase text-muted-foreground">
                Rep
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="rep"
                  name="rep"
                  defaultValue={selectedRepSlug || ""}
                  required
                  className="h-10 w-full rounded-lg border border-input bg-card py-2 pl-9 pr-8 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">Select a rep</option>
                  {reps.map((rep) => (
                    <option key={rep.rep_slug} value={rep.rep_slug}>
                      {rep.rep_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit" className="h-10 self-end px-4">
              Show calls
            </Button>
          </form>

          {hasSelectedRep ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="outline" className="gap-1 rounded-md bg-background/70">
                <ArrowDownWideNarrow className="size-3.5" />
                Newest received first
              </Badge>
              <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-1")}>
                Clear selection
              </Link>
            </div>
          ) : null}
        </header>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!configured ? (
          <div className="rounded-lg border bg-card p-4 text-sm leading-6 text-muted-foreground">
            Connect `DATABASE_URL` and `INGEST_SECRET` in Vercel, then run `scripts/schema.sql` or let the ingest route create the table on first post.
          </div>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                {hasSelectedRep ? `${selectedRepName || "Selected rep"}'s calls` : "Choose a rep"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasSelectedRep
                  ? `${calls.length} ${calls.length === 1 ? "report" : "reports"} received by the dashboard.`
                  : "The call list appears after a rep is selected."}
              </p>
            </div>
          </div>

          {hasSelectedRep ? (
            calls.length ? (
              <div className="grid gap-3">
                {calls.map((call) => (
                  <CallCard key={call.id} call={call} compact showRep={false} />
                ))}
              </div>
            ) : (
              <EmptyState repName={selectedRepName} />
            )
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
    <div className="rounded-xl border bg-card/80 p-8 text-center">
      <UserRound className="mx-auto mb-3 size-8 text-muted-foreground" />
      <h3 className="text-base font-semibold">No rep selected</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Pick a rep above to open a focused list of their latest feedback.
      </p>
    </div>
  );
}

function EmptyState({ repName }: { repName: string }) {
  return (
    <div className="rounded-xl border bg-card/80 p-8 text-center">
      <h3 className="text-base font-semibold">No reports found</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {repName ? `${repName} does not have dashboard reports yet.` : "This rep does not have dashboard reports yet."}
      </p>
    </div>
  );
}
