import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CallCard } from "@/components/dashboard/call-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { getDashboardData } from "@/lib/db";
import { readFilters, type RawSearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RepPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { slug } = await params;
  const filters = readFilters(await searchParams, { rep: slug });
  const { calls, reps } = await getDashboardData(filters);
  const repName = reps.find((rep) => rep.rep_slug === slug)?.rep_name || calls[0]?.rep_name || "Rep";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "mb-4 px-0")}>
            <ArrowLeft className="size-4" />
            All calls
          </Link>
          <h1 className="text-3xl font-semibold">{repName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            All dashboard-ingested coaching reports for this rep from launch forward.
          </p>
        </div>

        <FilterBar filters={filters} reps={reps} repLocked clearHref={`/rep/${slug}`} />

        <section className="grid gap-4">
          {calls.length ? (
            calls.map((call) => <CallCard key={call.id} call={call} />)
          ) : (
            <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
              No reports found for this rep.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
