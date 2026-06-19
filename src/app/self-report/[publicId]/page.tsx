import { notFound } from "next/navigation";
import { ManualReportStatus } from "@/components/dashboard/manual-report-status";
import { ReportEngagementTracker, TrackUsageEvent } from "@/components/dashboard/usage-tracker";
import { getManualFeedbackReport } from "@/lib/db";
import { resolveManualReportStatus } from "@/lib/manual-reports";
import { isReportChatEnabledForManualReport } from "@/lib/report-chat";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function SelfReportPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const report = await getManualFeedbackReport(publicId);

  if (!report) notFound();

  const resolvedReport = resolveManualReportStatus(report);
  const reportChatEnabled = isReportChatEnabledForManualReport(resolvedReport);
  const manualUsageEventData = {
    source: "manual_report",
    target_rep_slug: slugify(report.rep_name),
    target_rep_name: report.rep_name,
    manual_public_id: report.public_id,
    metadata: {
      client_name: report.client_name,
      status: report.status,
    },
  };

  return (
    <>
      <TrackUsageEvent eventName="manual_report_viewed" eventData={manualUsageEventData} />
      <ReportEngagementTracker eventData={manualUsageEventData} />
      <ManualReportStatus initialReport={resolvedReport} reportChatEnabled={reportChatEnabled} />
    </>
  );
}
