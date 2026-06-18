export const ENHANCED_REPORT_CUTOFF_ISO = "2026-06-17T17:14:00.000Z";

export type ReportVersion = "legacy" | "enhanced";

const ENHANCED_REPORT_CUTOFF_MS = new Date(ENHANCED_REPORT_CUTOFF_ISO).getTime();

export function getReportVersion(createdAt: string | Date | null | undefined): ReportVersion {
  if (!createdAt) return "legacy";

  const createdAtMs = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  if (!Number.isFinite(createdAtMs)) return "legacy";

  return createdAtMs >= ENHANCED_REPORT_CUTOFF_MS ? "enhanced" : "legacy";
}

export function isEnhancedReport(createdAt: string | Date | null | undefined) {
  return getReportVersion(createdAt) === "enhanced";
}

export function getReportVersionLabel(version: ReportVersion) {
  return version === "enhanced" ? "Enhanced" : "Legacy";
}
