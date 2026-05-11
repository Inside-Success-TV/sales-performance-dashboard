export type JsonObject = Record<string, unknown>;

export type CloseSectionType = "why_no_close" | "what_made_this_close_work" | null;

export type PerformanceCall = {
  id: number;
  airtable_record_id: string;
  scorecard_key: string | null;
  rep_name: string;
  rep_slug: string;
  rep_email: string | null;
  client_name: string | null;
  call_date: string | null;
  meeting_id: string | null;
  meeting_title: string | null;
  meeting_link: string | null;
  transcript_link: string | null;
  google_doc_id: string | null;
  google_doc_link: string | null;
  call_status: string | null;
  one_line_verdict: string | null;
  biggest_strength: string | null;
  biggest_fix: string | null;
  coaching_tip: string | null;
  rudys_note: string | null;
  what_went_well: string[];
  what_to_improve: string[];
  why_no_close: JsonObject | string | null;
  what_made_this_close_work: JsonObject | string | null;
  objections_surfaced: string[];
  close_section_type: CloseSectionType;
  close_section: JsonObject | string | null;
  created_at: string;
  updated_at: string;
};

export type DashboardFilters = {
  q?: string;
  rep?: string;
  client?: string;
  from?: string;
  to?: string;
};

export type RepSummary = {
  rep_name: string;
  rep_slug: string;
  call_count: number;
  latest_call_date: string | null;
};
