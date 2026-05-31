import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  DollarSign,
  ExternalLink,
  FileText,
  ShieldCheck,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { RepNoShowChatPanel } from "@/components/dashboard/rep-no-show-chat-panel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMiamiDateTime } from "@/lib/format";
import {
  getRepNoShowAnalytics,
  normalizeRepNoShowWindow,
  REP_NO_SHOW_WINDOWS,
  type RepNoShowAnalytics,
  type RepNoShowCall,
  type RepNoShowRepRow,
  type RepNoShowWeeklyPoint,
} from "@/lib/rep-no-show";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rep No-Show Impact | Magic Mike Bot",
  robots: {
    index: false,
    follow: false,
  },
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("en-US");

export default async function RepNoShowPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string | string[] }>;
}) {
  const { days } = await searchParams;
  const periodDays = normalizeRepNoShowWindow(days);
  const analytics = await getRepNoShowAnalytics(periodDays);

  return (
    <main className="dashboard-page min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="dashboard-card dashboard-hero rounded-2xl border bg-card/95 p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="size-3.5" />
                  Hidden manager view
                </Badge>
                <Badge variant="outline" className="gap-1 bg-background/70">
                  <UserX className="size-3.5" />
                  Operations visibility
                </Badge>
                {!analytics.summary.configured ? (
                  <Badge variant="destructive">Airtable not connected</Badge>
                ) : null}
              </div>
              <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
                Rep No-Show Impact
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Call 1 attendance signals are tracked separately from Call 2+ coaching, so managers
                can see operational leakage without mixing it into feedback reports.
              </p>
            </div>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground lg:items-end">
              <PeriodSelector selectedDays={analytics.summary.periodDays} />
              <div className="inline-flex items-center gap-2 rounded-lg border bg-background/75 px-3 py-2">
                <Clock3 className="size-4 text-foreground" />
                Updated {formatMiamiDateTime(analytics.summary.generatedAt)}
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Link href="/manager/usage" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
                  Usage
                </Link>
                <Link href="/manager/sales-correlation" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
                  Sales impact
                </Link>
              </div>
            </div>
          </div>
        </header>

        <StatusMessage analytics={analytics} />

        <ExecutiveReadout analytics={analytics} />

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={UserX}
            title="Rep no-shows"
            value={formatNumber(analytics.summary.repNoShows)}
            description={`Last ${analytics.summary.periodDays} days`}
          />
          <MetricCard
            icon={Users}
            title="No-show rate"
            value={formatPercent(analytics.summary.noShowRate)}
            description={`${formatNumber(analytics.summary.eligibleCalls)} eligible calls`}
          />
          <MetricCard
            icon={DollarSign}
            title="Opportunity at risk"
            value={formatCurrency(analytics.summary.estimatedOpportunityAtRisk)}
            description={`${formatPercent(analytics.summary.closeRate)} close rate x ${formatCurrency(analytics.summary.minPackageValue)}`}
          />
          <MetricCard
            icon={CalendarDays}
            title="Call 1 no-shows"
            value={formatNumber(analytics.summary.call1NoShows)}
            description={`${formatNumber(analytics.summary.call2PlusNoShows)} from Call 2+`}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
          <WeeklyTrendCard weekly={analytics.weekly} />
          <TopRepsCard reps={analytics.topReps} />
        </section>

        <RecentNoShowsCard calls={analytics.recentNoShows} />

        <p className="max-w-4xl text-xs leading-5 text-muted-foreground">
          Estimates are directional and conservative. The current formula uses rep no-shows x
          close-rate assumption x minimum package value. It should be described as opportunity at
          risk, not confirmed missed sales.
        </p>

        <RepNoShowChatPanel periodDays={analytics.summary.periodDays} />
      </div>
    </main>
  );
}

function PeriodSelector({ selectedDays }: { selectedDays: number }) {
  return (
    <div className="inline-flex rounded-lg border bg-background/75 p-1">
      {REP_NO_SHOW_WINDOWS.map((days) => (
        <Link
          key={days}
          href={`/manager/rep-no-show?days=${days}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            selectedDays === days
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {days}d
        </Link>
      ))}
    </div>
  );
}

function StatusMessage({ analytics }: { analytics: RepNoShowAnalytics }) {
  if (!analytics.summary.error) return null;

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
      {analytics.summary.error}
    </div>
  );
}

function ExecutiveReadout({ analytics }: { analytics: RepNoShowAnalytics }) {
  const change = analytics.summary.weekOverWeekChange;
  const improved = change < 0;
  const flat = change === 0;

  return (
    <Card className="dashboard-card border bg-card/95">
      <CardContent className="grid gap-4 pt-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <AlertTriangle className="size-3.5" />
              Executive readout
            </Badge>
            <Badge variant="outline">Last {analytics.summary.periodDays} days</Badge>
            <Badge variant="outline">{formatPercent(analytics.summary.closeRate)} close-rate assumption</Badge>
          </div>
          <h2 className="max-w-3xl text-2xl font-semibold leading-tight tracking-normal">
            {getExecutiveHeadline(analytics)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Rep no-shows are tracked from accepted sales-call attendance signals, including Call 1.
            Coaching reports remain focused on Call 2+ performance.
          </p>
        </div>

        <div className="rounded-xl border bg-background/80 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Change vs prior period
            </p>
            <Badge variant={improved ? "secondary" : flat ? "outline" : "destructive"}>
              {improved ? "Improved" : flat ? "Flat" : "Higher"}
            </Badge>
          </div>
          <p className={cn("mt-3 flex items-center gap-2 text-3xl font-semibold tracking-normal", improved && "text-primary", !improved && !flat && "text-destructive")}>
            {improved ? <ArrowDownRight className="size-6" /> : <ArrowUpRight className="size-6" />}
            {change > 0 ? "+" : ""}
            {formatNumber(change)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Previous period had {formatNumber(analytics.summary.previousRepNoShows)} rep no-shows.
          </p>
          <div className="mt-4 rounded-lg border bg-card/80 px-3 py-2">
            <p className="text-xs text-muted-foreground">Potential revenue protected</p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency(analytics.summary.estimatedRevenueProtected)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="dashboard-card border bg-card/95">
      <CardContent className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 break-words text-3xl font-semibold tracking-normal">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-background text-primary">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function WeeklyTrendCard({ weekly }: { weekly: RepNoShowWeeklyPoint[] }) {
  const maxNoShows = Math.max(1, ...weekly.map((point) => point.noShows));

  return (
    <Card className="dashboard-card border bg-card/95">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-4" />
          Weekly Trend
        </CardTitle>
        <CardDescription>Rep no-shows surfaced from accepted sales-call attendance.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {weekly.map((point) => (
            <div key={point.weekStart} className="grid grid-cols-[4.5rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
              <span className="text-xs text-muted-foreground">{point.label}</span>
              <div className="h-8 rounded-md border bg-background">
                <div
                  className="h-full rounded-md bg-primary/80"
                  style={{ width: `${Math.max(4, (point.noShows / maxNoShows) * 100)}%` }}
                />
              </div>
              <span className="text-right font-medium">{formatNumber(point.noShows)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TopRepsCard({ reps }: { reps: RepNoShowRepRow[] }) {
  return (
    <Card className="dashboard-card border bg-card/95">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4" />
          Reps To Watch
        </CardTitle>
        <CardDescription>Sorted by rep no-show count in the selected period.</CardDescription>
      </CardHeader>
      <CardContent>
        {reps.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rep</TableHead>
                <TableHead className="text-right">No-shows</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reps.map((rep) => (
                <TableRow key={rep.repSlug}>
                  <TableCell>
                    <div className="font-medium">{rep.repName}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(rep.call1NoShows)} Call 1 / {formatNumber(rep.eligibleCalls)} calls
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatNumber(rep.noShows)}</TableCell>
                  <TableCell className="text-right">{formatPercent(rep.noShowRate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(rep.estimatedOpportunityAtRisk)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState text="No rep no-shows found for this period." />
        )}
      </CardContent>
    </Card>
  );
}

function RecentNoShowsCard({ calls }: { calls: RepNoShowCall[] }) {
  return (
    <Card className="dashboard-card border bg-card/95">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4" />
          Recent No-Shows
        </CardTitle>
        <CardDescription>Enough context for manager follow-up without a crowded audit table.</CardDescription>
      </CardHeader>
      <CardContent>
        {calls.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Rep</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Call</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Links</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell className="min-w-36 text-sm">{formatMiamiDateTime(call.callDate)}</TableCell>
                  <TableCell className="font-medium">{call.repName}</TableCell>
                  <TableCell>{call.clientName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{call.callNumber}</Badge>
                  </TableCell>
                  <TableCell className="max-w-sm text-sm text-muted-foreground">
                    {call.attendanceReason || call.attendanceStatus || "Rep absence detected"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <ExternalLinkButton href={call.meetingLink} label="Zoom" />
                      <ExternalLinkButton href={call.transcriptLink} label="Transcript" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState text="No recent rep no-shows found for this period." />
        )}
      </CardContent>
    </Card>
  );
}

function ExternalLinkButton({ href, label }: { href: string; label: string }) {
  if (!href) {
    return (
      <span className="text-xs text-muted-foreground">
        {label === "Zoom" ? "No Zoom" : "No transcript"}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {label}
      <ExternalLink className="size-3" />
    </a>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border bg-background/80 p-4 text-sm leading-6 text-muted-foreground">
      {text}
    </div>
  );
}

function getExecutiveHeadline(analytics: RepNoShowAnalytics) {
  if (analytics.summary.error) {
    return "Connect read-only Airtable access to show live rep no-show impact.";
  }

  if (analytics.summary.repNoShows === 0) {
    return "No rep no-shows surfaced in the selected period.";
  }

  return `${formatNumber(analytics.summary.repNoShows)} rep no-shows surfaced, with ${formatCurrency(analytics.summary.estimatedOpportunityAtRisk)} in estimated opportunity at risk.`;
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
