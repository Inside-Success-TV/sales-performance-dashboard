import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, MessageSquareText, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BulletList, JsonSection } from "@/components/dashboard/json-section";
import { TrackRecentlyViewed } from "@/components/dashboard/recently-viewed";
import { getPerformanceCall } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const call = await getPerformanceCall(id);

  if (!call) notFound();

  const closeTitle =
    call.close_section_type === "what_made_this_close_work"
      ? "What Made This Close Work"
      : "Why No Close";

  return (
    <main className="min-h-screen bg-background">
      <TrackRecentlyViewed call={call} />
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <article className="space-y-5">
          <div>
            <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "mb-4 px-0")}>
              <ArrowLeft className="size-4" />
              All calls
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {call.call_status ? <Badge variant="secondary">{call.call_status}</Badge> : null}
              <Badge variant="outline">{formatDateTime(call.call_date)}</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">Call Coaching Report</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {call.rep_name} | {call.client_name || "Unknown client"} | {formatDateTime(call.call_date)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ExternalButton href={call.google_doc_link} label="Google Drive" icon={<FileText className="size-4" />} />
            <ExternalButton href={call.meeting_link} label="Zoom Meeting" icon={<Video className="size-4" />} />
            <ExternalButton href={call.transcript_link} label="Transcript" icon={<MessageSquareText className="size-4" />} />
          </div>

          {call.one_line_verdict ? (
            <div className="rounded-lg border-l-4 border-primary bg-card p-5 text-lg italic leading-8">
              {call.one_line_verdict}
            </div>
          ) : null}

          <ReportSection title="Biggest Strength">{call.biggest_strength || "Not provided"}</ReportSection>
          <ReportSection title="Biggest Fix">{call.biggest_fix || "Not provided"}</ReportSection>
          <ReportSection title="Coaching Tip">{call.coaching_tip || "Not provided"}</ReportSection>
          <ReportSection title="Rudy's Note">{call.rudys_note || "Not provided"}</ReportSection>

          <ReportSection title="What Went Well">
            <BulletList items={call.what_went_well} />
          </ReportSection>
          <ReportSection title="What To Improve">
            <BulletList items={call.what_to_improve} />
          </ReportSection>
          <ReportSection title={closeTitle}>
            <JsonSection value={call.close_section} />
          </ReportSection>
          <ReportSection title="Objections Surfaced">
            <BulletList items={call.objections_surfaced} />
          </ReportSection>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Meta label="Rep" value={call.rep_name} href={`/rep/${call.rep_slug}`} />
              <Meta label="Client" value={call.client_name} />
              <Meta label="Meeting ID" value={call.meeting_id} />
              <Meta label="Meeting title" value={call.meeting_title} />
              <Separator />
              <Meta label="Airtable record" value={call.airtable_record_id} mono />
              <Meta label="Google doc ID" value={call.google_doc_id} mono />
              <Meta label="Updated" value={formatDateTime(call.updated_at)} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground">{title}</h2>
      <div className="text-sm leading-7">{children}</div>
    </section>
  );
}

function ExternalButton({
  href,
  label,
  icon,
}: {
  href: string | null;
  label: string;
  icon: React.ReactNode;
}) {
  if (!href) return null;

  return (
    <a href={href} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "gap-1")}>
      {icon}
      {label}
      <ExternalLink className="size-4" />
    </a>
  );
}

function Meta({
  label,
  value,
  href,
  mono = false,
}: {
  label: string;
  value: string | null;
  href?: string;
  mono?: boolean;
}) {
  if (!value) return null;

  const content = (
    <span className={mono ? "break-all font-mono text-xs" : "break-words"}>{value}</span>
  );

  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      {href ? (
        <Link href={href} className="hover:underline">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
