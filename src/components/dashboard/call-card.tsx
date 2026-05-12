import Link from "next/link";
import { CalendarDays, ExternalLink, FileText, MessageSquareText, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, truncate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PerformanceCall } from "@/lib/types";

type CallCardProps = {
  call: PerformanceCall;
  compact?: boolean;
};

export function CallCard({ call, compact = false }: CallCardProps) {
  return (
    <Card className="rounded-lg shadow-sm transition-colors hover:border-primary/40">
      <CardHeader className={compact ? "gap-2 p-4" : "gap-3"}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {formatDate(call.call_date)}
          </span>
          <span className="inline-flex items-center gap-1">
            <UserRound className="size-3.5" />
            {call.rep_name}
          </span>
          {call.call_status ? <Badge variant="secondary">{call.call_status}</Badge> : null}
        </div>
        <CardTitle className={compact ? "text-base" : "text-lg"}>
          <Link href={`/call/${call.id}`} className="hover:underline">
            {call.client_name || "Unknown client"}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? "space-y-3 px-4 pb-4" : "space-y-4"}>
        {call.one_line_verdict ? (
          <p className="text-sm italic leading-6 text-muted-foreground">
            {truncate(call.one_line_verdict, compact ? 120 : 220)}
          </p>
        ) : null}

        {!compact ? (
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <SummaryBlock icon={<MessageSquareText className="size-4" />} label="Biggest Strength" value={call.biggest_strength} />
            <SummaryBlock icon={<FileText className="size-4" />} label="What I'd Polish" value={call.biggest_fix} />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link href={`/call/${call.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
            Open report
          </Link>
          {call.google_doc_link ? (
            <a
              href={call.google_doc_link}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "gap-1")}
            >
              <ExternalLink className="size-4" />
              Drive
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="leading-6">{truncate(value, 150) || "Not provided"}</p>
    </div>
  );
}
