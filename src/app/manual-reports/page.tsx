import Link from "next/link";
import type React from "react";
import {
  ArrowLeft,
  ArrowDownWideNarrow,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  MessageSquareText,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ReportFilters } from "@/components/dashboard/report-filters";
import { ReportVersionBadge } from "@/components/dashboard/report-version-badge";
import { RepPicker } from "@/components/dashboard/rep-picker";
import { TrackedExternalLink, TrackedLink, TrackUsageEvent } from "@/components/dashboard/usage-tracker";
import { getManualFeedbackReports } from "@/lib/db";
import { formatMiamiDateTime, truncate } from "@/lib/format";
import { isManualFeedbackEnabled } from "@/lib/manual-reports";
import { readFilters, type RawSearchParams } from "@/lib/search-params";
import { slugify } from "@/lib/slug";
import type { DashboardFilters, ManualFeedbackReport, RepSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ManualReportsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  if (!isManualFeedbackEnabled()) notFound();

  const filters = readFilters(await searchParams);
  const selectedRepSlug = filters.rep;
  const allReports = await getManualFeedbackReports(500);
  const reps = buildManualRepSummaries(allReports);
  const selectedRepName =
    reps.find((rep) => rep.rep_slug === selectedRepSlug)?.rep_name ||
    allReports.find((report) => slugify(report.rep_name) === selectedRepSlug)?.rep_name ||
    "";
  const reports = selectedRepSlug
    ? filterManualReports(
        allReports.filter((report) => slugify(report.rep_name) === selectedRepSlug),
        filters,
      )
    : [];
  const hasSelectedRep = Boolean(selectedRepSlug);
  const hasFilters = Boolean(filters.q || filters.date);

  return (
    <main className="magic-page">
      <TrackUsageEvent
        eventName="manual_reports_page_viewed"
        eventData={{
          source: "manual_reports",
          target_rep_slug: selectedRepSlug || null,
          target_rep_name: selectedRepName || null,
        }}
      />
      <div className="magic-container flex flex-col gap-6">
        <header className="magic-card magic-hero p-5 md:p-7">
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div className="max-w-3xl pt-2">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Link
                  href="/"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full px-0 text-slate-500 hover:text-[#B91C1C]")}
                >
                  <ArrowLeft className="size-4" />
                  Home
                </Link>
                <span className="magic-kicker">
                  <Sparkles className="size-3.5" />
                  Self-submitted feedback
                </span>
              </div>
              <h1 className="text-4xl font-semibold leading-tight tracking-normal text-slate-950 md:text-5xl">
                Self-submitted reports
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Review manually submitted call coaching without mixing it into the official production report list.
              </p>
              <div className="mt-5 grid gap-2 text-sm font-medium text-slate-700 sm:grid-cols-2">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#DC2626]" />
                  Separate from official reports
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#DC2626]" />
                  Enhanced feedback ready
                </span>
              </div>
            </div>

            <div className="magic-soft-panel p-4">
              <div className="mb-3 flex justify-end">
                <Link
                  href="/submit"
                  className={cn(buttonVariants({ size: "sm" }), "h-9 rounded-full bg-[#DC2626] px-4 text-white hover:bg-[#B91C1C]")}
                >
                  <Send className="size-4" />
                  Get feedback
                </Link>
              </div>
              <RepPicker reps={reps} selectedRepSlug={selectedRepSlug} basePath="/manual-reports" />

              {hasSelectedRep ? (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <Badge variant="outline" className="gap-1 rounded-full bg-white/80 text-slate-600">
                    <ArrowDownWideNarrow className="size-3.5" />
                    Newest completed first
                  </Badge>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="space-y-4">
          <div className="px-1">
            <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
              {hasSelectedRep ? `${selectedRepName || "Selected rep"}'s self-submitted reports` : "Choose a rep"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {hasSelectedRep
                ? `${reports.length} completed manual ${reports.length === 1 ? "report" : "reports"} found.`
                : "The manual report list appears after a rep is selected."}
            </p>
          </div>

          {hasSelectedRep ? (
            <>
              <ReportFilters
                action="/manual-reports"
                filters={filters}
                repSlug={selectedRepSlug}
                clearHref={`/manual-reports?rep=${encodeURIComponent(selectedRepSlug || "")}`}
                searchPlaceholder="Client, report text, or date"
                dateLabel="Completed date"
              />
              {reports.length ? (
                <div className="grid gap-3">
                  {reports.map((report) => <ManualReportCard key={report.public_id} report={report} />)}
                </div>
              ) : (
                <EmptyState repName={selectedRepName} hasFilters={hasFilters} />
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

function buildManualRepSummaries(reports: ManualFeedbackReport[]): RepSummary[] {
  const reps = new Map<string, RepSummary>();

  for (const report of reports) {
    const repSlug = slugify(report.rep_name);
    const existing = reps.get(repSlug);
    if (!existing) {
      reps.set(repSlug, {
        rep_name: report.rep_name,
        rep_slug: repSlug,
        call_count: 1,
        latest_call_date: report.updated_at,
      });
      continue;
    }

    existing.call_count += 1;
    if (!existing.latest_call_date || new Date(report.updated_at) > new Date(existing.latest_call_date)) {
      existing.latest_call_date = report.updated_at;
    }
  }

  return [...reps.values()].sort((a, b) => a.rep_name.localeCompare(b.rep_name));
}

function filterManualReports(reports: ManualFeedbackReport[], filters: DashboardFilters) {
  const query = filters.q?.trim().toLowerCase();

  return reports.filter((report) => {
    if (filters.date && getMiamiDateKey(report.updated_at) !== filters.date) return false;
    if (!query) return true;

    return buildManualSearchText(report).includes(query);
  });
}

function buildManualSearchText(report: ManualFeedbackReport) {
  return [
    report.rep_name,
    report.client_name,
    report.one_line_verdict,
    report.biggest_strength,
    report.biggest_fix,
    report.coaching_tip,
    report.rudys_note,
    report.source_type,
    report.input_type,
    report.call_status,
    formatMiamiDateTime(report.updated_at),
    getMiamiDateKey(report.updated_at),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getMiamiDateKey(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}

function ManualReportCard({ report }: { report: ManualFeedbackReport }) {
  const reportDocLink = report.report_doc_link || report.google_doc_link;
  const transcriptLink = report.transcript_drive_link || report.transcript_link;
  const zoomLink = report.original_zoom_link || report.zoom_link;
  const title = report.client_name || `${report.rep_name}'s feedback`;
  const sourceLabel = report.source_type || report.input_type;
  const trackingData = {
    source: "manual_reports",
    target_rep_slug: slugify(report.rep_name),
    target_rep_name: report.rep_name,
    manual_public_id: report.public_id,
    metadata: {
      client_name: report.client_name,
      status: report.status,
    },
  };

  return (
    <article className="magic-card p-4 transition-all hover:-translate-y-px hover:border-red-200 hover:shadow-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <ReportVersionBadge createdAt={report.created_at} />
            {report.status ? (
              <Badge variant="outline" className="h-6 rounded-full bg-slate-50 text-xs capitalize text-slate-500">
                {report.status.replace(/_/g, " ")}
              </Badge>
            ) : null}
          </div>
          <h2 className="text-base font-semibold leading-6 text-slate-950">
            <TrackedLink
              href={`/self-report/${report.public_id}`}
              eventName="report_card_clicked"
              eventData={trackingData}
              className="hover:text-[#B91C1C]"
            >
              {title}
            </TrackedLink>
          </h2>

          {report.one_line_verdict ? (
            <p className="text-sm leading-6 text-slate-600 md:max-w-2xl">
              {truncate(report.one_line_verdict, 185)}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5" />
              {report.rep_name}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              Completed {formatMiamiDateTime(report.updated_at)}
            </span>
            {sourceLabel ? (
              <span className="capitalize">
                {sourceLabel.replace(/_/g, " ")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5 md:justify-end">
          <TrackedLink
            href={`/self-report/${report.public_id}`}
            eventName="report_card_clicked"
            eventData={trackingData}
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "h-9 rounded-full border-slate-200 bg-white px-4 hover:bg-[#FEF2F2] hover:text-[#B91C1C]",
            )}
          >
            Open report
          </TrackedLink>
          <ExternalButton href={reportDocLink} label="Doc" icon={<FileText className="size-4" />} eventName="google_doc_clicked" eventData={trackingData} />
          <ExternalButton href={transcriptLink} label="Transcript" icon={<MessageSquareText className="size-4" />} eventName="transcript_clicked" eventData={trackingData} />
          <ExternalButton href={zoomLink} label="Zoom" icon={<ExternalLink className="size-4" />} eventName="zoom_clicked" eventData={trackingData} />
        </div>
      </div>
    </article>
  );
}

function SelectionState() {
  return (
    <div className="magic-card p-10 text-center">
      <UserRound className="mx-auto mb-3 size-8 text-slate-400" />
      <h3 className="text-base font-semibold text-slate-950">No rep selected</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Self-submitted reports are grouped by rep.
      </p>
    </div>
  );
}

function EmptyState({ repName, hasFilters }: { repName: string; hasFilters?: boolean }) {
  return (
    <div className="magic-card p-10 text-center">
      <FileText className="mx-auto mb-3 size-8 text-slate-400" />
      <h3 className="text-base font-semibold text-slate-950">No completed self-submitted reports found</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilters
          ? "No self-submitted reports match that search."
          : repName
            ? `${repName} does not have completed self-submitted reports yet.`
            : "This rep does not have completed self-submitted reports yet."}
      </p>
    </div>
  );
}

function ExternalButton({
  href,
  label,
  icon,
  eventName,
  eventData,
}: {
  href: string | null;
  label: string;
  icon: React.ReactNode;
  eventName: "google_doc_clicked" | "zoom_clicked" | "transcript_clicked";
  eventData: {
    source: string;
    target_rep_slug: string;
    target_rep_name: string;
    manual_public_id: string;
    metadata: {
      client_name: string | null;
      status: ManualFeedbackReport["status"];
    };
  };
}) {
  if (!href) return null;

  return (
    <TrackedExternalLink
      href={href}
      eventName={eventName}
      eventData={eventData}
      target="_blank"
      rel="noreferrer"
      className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "h-9 rounded-full px-3 text-slate-500 hover:text-[#B91C1C]")}
    >
      {icon}
      {label}
    </TrackedExternalLink>
  );
}
