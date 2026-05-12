import Link from "next/link";
import { ArrowDownWideNarrow, Clock3, Database, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CallCard } from "@/components/dashboard/call-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { RecentlyViewed } from "@/components/dashboard/recently-viewed";
import { getDashboardData } from "@/lib/db";
import { formatDate, formatMiamiDateTime } from "@/lib/format";
import { readFilters, type RawSearchParams } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = readFilters(await searchParams);
  const { calls, reps, latestByRep, lastUpdatedAt, configured, error } = await getDashboardData(filters);
  const lastUpdatedLabel = lastUpdatedAt
    ? `Last updated ${formatMiamiDateTime(lastUpdatedAt)} Miami time`
    : "No calls ingested yet";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border bg-card/80 p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Inside Success TV</Badge>
              <Badge variant={configured ? "outline" : "destructive"}>
                {configured ? "Live database" : "Database not connected"}
              </Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-normal">Sales Performance Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Coaching reports from the n8n performance workflow, organized by rep and searchable across the full narrative.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="gap-1 rounded-md border-primary/20 bg-primary/5 text-primary">
                <ArrowDownWideNarrow className="size-3" />
                Newest first
              </Badge>
              <Badge variant="outline" className="gap-1 rounded-md">
                <Clock3 className="size-3" />
                {lastUpdatedLabel}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:min-w-64">
            <Metric label="Calls" value={calls.length} />
            <Metric label="Reps" value={reps.length} />
          </div>
          </div>
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

        <FilterBar filters={filters} reps={reps} />
        <RecentlyViewed calls={calls} />

        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Call Library</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{calls.length} reports</span>
                <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:block" />
                <span className="hidden items-center gap-1 sm:inline-flex">
                  <ArrowDownWideNarrow className="size-3.5" />
                  Newest at top
                </span>
              </div>
            </div>

            {calls.length ? (
              <div className="grid gap-4">
                {calls.map((call) => (
                  <CallCard key={call.id} call={call} />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
            <Card className="rounded-lg shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UsersRound className="size-4" />
                  Latest From Each Rep
                </CardTitle>
              </CardHeader>
              <CardContent className="dashboard-scroll max-h-[420px] space-y-3 overflow-y-auto pr-2">
                {latestByRep.length ? (
                  latestByRep.map((call) => (
                    <Link
                      key={call.id}
                      href={`/call/${call.id}`}
                      className="block rounded-md border bg-background/70 p-3 text-sm transition-colors hover:border-primary/50 hover:bg-accent/40"
                    >
                      <span className="block font-medium">{call.rep_name}</span>
                      <span className="block truncate text-muted-foreground">
                        {call.client_name || "Unknown client"} · {formatDate(call.call_date)}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">New calls will appear here after ingest.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="size-4" />
                  Reps
                </CardTitle>
              </CardHeader>
              <CardContent className="dashboard-scroll max-h-[360px] space-y-2 overflow-y-auto pr-2">
                {reps.length ? (
                  reps.map((rep) => (
                    <Link
                      key={rep.rep_slug}
                      href={`/rep/${rep.rep_slug}`}
                      className="flex items-center justify-between rounded-md border bg-background/70 px-3 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-accent/40"
                    >
                      <span className="font-medium">{rep.rep_name}</span>
                      <span className="text-muted-foreground">{rep.call_count}</span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No reps have dashboard reports yet.</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border bg-card p-10 text-center">
      <h2 className="text-lg font-semibold">No matching reports</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Once n8n posts completed coaching docs to the ingest endpoint, the calls will be grouped here by rep.
      </p>
    </div>
  );
}
