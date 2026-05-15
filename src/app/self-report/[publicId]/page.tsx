import { notFound } from "next/navigation";
import { ManualReportStatus } from "@/components/dashboard/manual-report-status";
import { getManualFeedbackReport } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SelfReportPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const report = await getManualFeedbackReport(publicId);

  if (!report) notFound();

  return <ManualReportStatus initialReport={report} />;
}
