import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CircleAlert,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  History,
  MousePointerClick,
  Send,
  ShieldCheck,
  Timer,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
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
import { getUsageAnalytics } from "@/lib/db";
import { formatMiamiDateTime } from "@/lib/format";
import type {
  UsageDailyPoint,
  UsageLegacySummary,
  UsageManualSummary,
  UsageOfficialSummary,
  UsageRepEngagement,
  UsageUnmappedUser,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Usage Analytics | Magic Mike Bot",
  robots: {
    index: false,
    follow: false,
  },
};

const numberFormatter = new Intl.NumberFormat("en-US");

export default async function ManagerUsagePage() {
  const analytics = await getUsageAnalytics();
  const hasEvents = analytics.totals.events_30d > 0;

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
                {!analytics.configured ? (
                  <Badge variant="destructive">Database not connected</Badge>
                ) : null}
              </div>
              <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
                Magic Mike Bot Usage
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Verified Google sign-in usage is tracked by viewer rep. Legacy anonymous events and
                self-submitted feedback stay separate, so current adoption does not mix with old test traffic.
              </p>
            </div>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground lg:items-end">
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
                <HeaderStat
                  icon={Users}
                  label="Official reps"
                  value={analytics.official.total_reps}
                />
                <HeaderStat
                  icon={FileText}
                  label="Official feedback"
                  value={analytics.official.total_reports}
                />
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg border bg-background/75 px-3 py-2">
                <Clock3 className="size-4 text-foreground" />
                Updated {formatMiamiDateTime(analytics.generatedAt)}
              </div>
              <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "w-fit")}>
                Open dashboard
              </Link>
            </div>
          </div>
        </header>

        {analytics.error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {analytics.error}
          </div>
        ) : null}

        {!analytics.configured ? (
          <div className="rounded-lg border bg-card p-4 text-sm leading-6 text-muted-foreground">
            Connect `DATABASE_URL` before this page can show live usage.
          </div>
        ) : null}

        {!hasEvents && analytics.configured ? (
          <div className="rounded-lg border bg-card p-4 text-sm leading-6 text-muted-foreground">
            Verified rep usage starts from the Google sign-in deployment. Older anonymous dashboard
            visits are preserved as legacy history but are not used for current rep engagement.
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Engaged reports today"
            value={analytics.official.report_engagements_today}
            description="10+ seconds of visible reading"
            icon={Timer}
          />
          <MetricCard
            title="Engaged reports this week"
            value={analytics.official.report_engagements_7d}
            description="Verified official report engagement"
            icon={BarChart3}
          />
          <MetricCard
            title="Verified users"
            value={analytics.official.verified_users_7d}
            description="Signed-in Google users in 7 days"
            icon={UserCheck}
          />
          <MetricCard
            title="Mapped reps active"
            value={analytics.official.reps_with_activity_7d}
            description="Matched to a rep identity"
            icon={CheckCircle2}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
          <DailyReportViewsCard daily={analytics.daily} />
          <OfficialSignalCard official={analytics.official} />
        </section>

        <RepEngagementCard reps={analytics.repEngagement} />

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
          <UnmappedUsersCard users={analytics.unmappedUsers} />
          <LegacyUsageCard legacy={analytics.legacy} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)]">
          <ManualUsageCard manual={analytics.manual} />
        </section>
      </div>
    </main>
  );
}

function HeaderStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-36 items-center justify-between gap-3 rounded-lg border bg-background/75 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-foreground" />
        <span className="truncate text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="text-base font-semibold text-foreground">{formatNumber(value)}</span>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="dashboard-card border bg-card/95">
      <CardContent className="flex items-start justify-between gap-3 pt-1">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal">
            {formatNumber(value)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-background text-primary">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function DailyReportViewsCard({ daily }: { daily: UsageDailyPoint[] }) {
  const maxViews = Math.max(
    1,
    ...daily.map((point) => point.official_report_views + point.manual_report_views),
  );

  return (
    <Card className="dashboard-card border bg-card/95">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-4" />
          Daily Report Activity
        </CardTitle>
        <CardDescription>
          Official bars count verified 10-second engagements. Self-submitted views remain separate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {daily.length ? (
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-primary" />
                Official engaged
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-accent-foreground/70" />
                Self-submitted
              </span>
            </div>
            {daily.map((point) => {
              const totalViews = point.official_report_views + point.manual_report_views;

              return (
                <div
                  key={point.day}
                  className="grid grid-cols-[3.5rem_minmax(0,1fr)_6.5rem] items-center gap-3"
                >
                  <span className="text-xs text-muted-foreground">{formatDayLabel(point.day)}</span>
                  <div
                    className="flex h-8 overflow-hidden rounded-lg bg-muted"
                    aria-label={`${point.official_report_views} official views and ${point.manual_report_views} self-submitted views`}
                  >
                    <div
                      className="h-full bg-primary/85"
                      style={{ width: getStackWidth(point.official_report_views, maxViews) }}
                    />
                    <div
                      className="h-full bg-accent-foreground/70"
                      style={{ width: getStackWidth(point.manual_report_views, maxViews) }}
                    />
                  </div>
                  <span className="text-right text-sm font-medium">
                    {formatNumber(totalViews)}
                    <span className="ml-1 text-xs text-muted-foreground">views</span>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyPanel text="No report views have been recorded yet." />
        )}
      </CardContent>
    </Card>
  );
}

function OfficialSignalCard({ official }: { official: UsageOfficialSummary }) {
  return (
    <Card className="dashboard-card border bg-card/95">
      <CardHeader className="border-b">
        <CardTitle>Verified Coaching Signals</CardTitle>
        <CardDescription>Signed-in official report activity only. Legacy anonymous rows are excluded.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <SignalRow
          icon={Eye}
          label="Official opens in 7 days"
          value={official.report_views_7d}
        />
        <SignalRow
          icon={Timer}
          label="Reading minutes in 7 days"
          value={Math.round(official.engagement_seconds_7d / 60)}
        />
        <SignalRow
          icon={CircleAlert}
          label="Unmapped signed-in users"
          value={official.unmapped_users_30d}
        />
        <SignalRow
          icon={MousePointerClick}
          label="Report link clicks in 7 days"
          value={official.link_clicks_7d}
        />
        <SignalRow
          icon={Users}
          label="Rep filter picks in 7 days"
          value={official.rep_selections_7d}
        />
        <div className="rounded-lg border bg-background/70 px-3 py-2">
          <p className="text-xs text-muted-foreground">Last official activity</p>
          <p className="mt-1 text-sm font-medium">
            {official.last_activity_at ? formatMiamiDateTime(official.last_activity_at) : "No activity yet"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function RepEngagementCard({ reps }: { reps: UsageRepEngagement[] }) {
  return (
    <Card className="dashboard-card border bg-card/95">
      <CardHeader className="border-b">
        <CardTitle>Verified Rep Engagement</CardTitle>
        <CardDescription>
          Rows are based on the signed-in viewer rep. Engagement requires 10 seconds of visible report reading.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reps.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rep</TableHead>
                <TableHead className="text-right">Reports</TableHead>
                <TableHead className="text-right">Opens</TableHead>
                <TableHead className="text-right">Engaged</TableHead>
                <TableHead>Own vs others</TableHead>
                <TableHead>Secondary signals</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reps.map((rep) => {
                const linkClicks = rep.doc_clicks + rep.zoom_clicks + rep.transcript_clicks;

                return (
                  <TableRow key={rep.rep_slug}>
                    <TableCell>
                      <span className="font-medium">{rep.rep_name}</span>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(rep.generated_reports)}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(rep.report_views)}
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(rep.report_engagements)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline">
                          {formatNumber(rep.own_report_engagements)} own
                        </Badge>
                        <Badge variant="outline">
                          {formatNumber(rep.other_report_engagements)} others
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline">
                          {formatMinutes(rep.engagement_seconds)} read
                        </Badge>
                        <Badge variant="outline">{formatNumber(rep.rep_selections)} picks</Badge>
                        <Badge variant="outline">{formatNumber(linkClicks)} link clicks</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {rep.last_activity_at ? formatMiamiDateTime(rep.last_activity_at) : "No activity"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyPanel text="No verified rep usage has been recorded yet." />
        )}
      </CardContent>
    </Card>
  );
}

function UnmappedUsersCard({ users }: { users: UsageUnmappedUser[] }) {
  return (
    <Card className="dashboard-card border bg-card/95">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <CircleAlert className="size-4" />
          Unmapped Signed-In Users
        </CardTitle>
        <CardDescription>
          These users are allowed to sign in, but their Google identity did not safely match a rep.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {users.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Events</TableHead>
                <TableHead className="text-right">Engaged</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.viewer_email}>
                  <TableCell>
                    <span className="font-medium">{user.viewer_name || user.viewer_email}</span>
                    <p className="mt-1 text-xs text-muted-foreground">{user.viewer_email}</p>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(user.events_30d)}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(user.report_engagements_30d)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.last_activity_at ? formatMiamiDateTime(user.last_activity_at) : "No activity"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyPanel text="No unmapped signed-in users in the last 30 days." />
        )}
      </CardContent>
    </Card>
  );
}

function LegacyUsageCard({ legacy }: { legacy: UsageLegacySummary }) {
  return (
    <Card className="dashboard-card border bg-card/95">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" />
          Legacy Anonymous Usage
        </CardTitle>
        <CardDescription>
          Historical pre-login rows are preserved here, but excluded from verified rep metrics.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <SignalRow icon={FileText} label="Legacy events in 30 days" value={legacy.events_30d} />
        <SignalRow icon={Eye} label="Legacy report opens" value={legacy.report_views_30d} />
        <SignalRow icon={Users} label="Legacy sessions" value={legacy.sessions_30d} />
        <div className="rounded-lg border bg-background/70 px-3 py-2">
          <p className="text-xs text-muted-foreground">Last legacy activity</p>
          <p className="mt-1 text-sm font-medium">
            {legacy.last_activity_at ? formatMiamiDateTime(legacy.last_activity_at) : "No legacy activity"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ManualUsageCard({ manual }: { manual: UsageManualSummary }) {
  return (
    <Card className="dashboard-card border bg-card/95">
      <CardHeader className="border-b">
        <CardTitle>Self-Submitted Feedback</CardTitle>
        <CardDescription>
          Manual submissions are tracked separately from official coaching reports.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <SignalRow icon={FileText} label="Total self-submitted reports" value={manual.total_reports} />
          <SignalRow icon={CheckCircle2} label="Completed reports" value={manual.completed_reports} />
          <SignalRow icon={Send} label="Submissions in 7 days" value={manual.submissions_7d} />
          <SignalRow icon={Eye} label="Manual report views in 7 days" value={manual.report_views_7d} />
        </div>
        <div className="grid gap-2 rounded-lg border bg-background/70 p-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Form/list opens</span>
            <span className="font-medium">{formatNumber(manual.page_opens_7d)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Anonymous sessions</span>
            <span className="font-medium">{formatNumber(manual.active_sessions_7d)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Manual link clicks</span>
            <span className="font-medium">{formatNumber(manual.link_clicks_7d)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Active pending/processing</span>
            <span className="font-medium">{formatNumber(manual.pending_reports)}</span>
          </div>
        </div>
        <div className="rounded-lg border bg-background/70 px-3 py-2">
          <p className="text-xs text-muted-foreground">Last self-submitted activity</p>
          <p className="mt-1 text-sm font-medium">
            {manual.last_activity_at ? formatMiamiDateTime(manual.last_activity_at) : "No activity yet"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SignalRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/70 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-foreground">
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-lg font-semibold">{formatNumber(value)}</span>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-background/60 p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function getStackWidth(value: number, max: number) {
  if (!value) return "0%";
  return `${Math.round((value / max) * 100)}%`;
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatMinutes(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return `${formatNumber(minutes)}m`;
}

function formatDayLabel(day: string) {
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return day;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}
