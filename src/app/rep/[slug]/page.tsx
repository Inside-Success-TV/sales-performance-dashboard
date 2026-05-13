import Link from "next/link";
import { ArrowDownWideNarrow, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CallCard } from "@/components/dashboard/call-card";
import { getDashboardData } from "@/lib/db";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RepPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { calls, reps } = await getDashboardData({ rep: slug });
  const repName = reps.find((rep) => rep.rep_slug === slug)?.rep_name || calls[0]?.rep_name || "Rep";

  return (
    <main className="dashboard-page min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="dashboard-card dashboard-hero rounded-2xl border bg-card/95 p-5 md:p-6">
          <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "mb-4 px-0")}>
            <ArrowLeft className="size-4" />
            Home
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">{repName}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {calls.length} {calls.length === 1 ? "report" : "reports"} received by the dashboard.
              </p>
            </div>
            <Badge variant="outline" className="gap-1 rounded-md bg-background/70">
              <ArrowDownWideNarrow className="size-3.5" />
              Newest received first
            </Badge>
          </div>
        </div>

        <section className="grid gap-3">
          {calls.length ? (
            calls.map((call) => <CallCard key={call.id} call={call} compact showRep={false} />)
          ) : (
            <div className="rounded-xl border bg-card/80 p-8 text-center text-sm text-muted-foreground">
              No reports found for this rep.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
