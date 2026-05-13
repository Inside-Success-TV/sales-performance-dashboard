import { ArrowLeft, CalendarDays, Database, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const HOME_CARDS = [0, 1, 2, 3];
const REPORT_SECTIONS = [0, 1, 2, 3, 4, 5];
const SIDE_ITEMS = [0, 1, 2, 3, 4];

export function LoadingProgress() {
  return (
    <div className="fixed inset-x-0 top-14 z-50 h-0.5 overflow-hidden bg-primary/10">
      <div className="loading-progress h-full bg-primary" />
    </div>
  );
}

export function DashboardHomeLoading() {
  return (
    <main className="dashboard-page min-h-screen bg-background" aria-label="Loading dashboard">
      <LoadingProgress />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="dashboard-card dashboard-hero rounded-2xl border bg-card/90 p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-9 w-80 max-w-full" />
              <Skeleton className="h-4 w-[34rem] max-w-full" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:min-w-64">
              <MetricSkeleton />
              <MetricSkeleton />
            </div>
          </div>
        </section>

        <FilterSkeleton />

        <section className="grid items-start gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="grid gap-4">
              {HOME_CARDS.map((item) => (
                <CallCardSkeleton key={item} />
              ))}
            </div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-28">
            <SideListSkeleton icon={<UsersRound className="size-4" />} title="Latest From Each Rep" />
            <SideListSkeleton icon={<Database className="size-4" />} title="Reps" compact />
          </aside>
        </section>
      </div>
    </main>
  );
}

export function RepPageLoading() {
  return (
    <main className="min-h-screen bg-background" aria-label="Loading rep reports">
      <LoadingProgress />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="size-4" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <FilterSkeleton />
        <section className="grid gap-4">
          {HOME_CARDS.map((item) => (
            <CallCardSkeleton key={item} />
          ))}
        </section>
      </div>
    </main>
  );
}

export function ReportPageLoading() {
  return (
    <main className="min-h-screen bg-background" aria-label="Loading report">
      <LoadingProgress />
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <article className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowLeft className="size-4" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-36" />
            </div>
            <Skeleton className="h-9 w-80 max-w-full" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-28" />
          </div>

          {REPORT_SECTIONS.map((item) => (
            <ReportSectionSkeleton key={item} />
          ))}
        </article>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="dashboard-card rounded-lg">
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              {SIDE_ITEMS.map((item) => (
                <div key={item} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function MetricSkeleton() {
  return (
    <div className="rounded-lg border bg-background/80 px-4 py-3 shadow-xs ring-1 ring-primary/5">
      <Skeleton className="mb-2 h-7 w-12" />
      <Skeleton className="h-3 w-14" />
    </div>
  );
}

function FilterSkeleton() {
  return (
    <section className="dashboard-card rounded-xl border bg-card/95 p-3">
      <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_160px_160px_140px_140px_auto]">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    </section>
  );
}

function CallCardSkeleton() {
  return (
    <Card className="dashboard-card rounded-lg border-border/80 bg-card/95">
      <CardHeader className="gap-3 border-b bg-muted/15">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="size-3.5 text-muted-foreground" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <div className="grid gap-3 md:grid-cols-2">
          <SummarySkeleton />
          <SummarySkeleton />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

function SummarySkeleton() {
  return (
    <div className="rounded-md border bg-background/80 p-3">
      <Skeleton className="mb-3 h-4 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-10/12" />
    </div>
  );
}

function SideListSkeleton({
  icon,
  title,
  compact = false,
}: {
  icon: React.ReactNode;
  title: string;
  compact?: boolean;
}) {
  return (
    <Card className="dashboard-card rounded-lg">
      <CardHeader className="border-b bg-muted/20 pb-3">
        <div className="flex items-center gap-2 text-base font-medium">
          {icon}
          {title}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {SIDE_ITEMS.map((item) => (
          <div key={item} className="rounded-md border bg-background/80 p-3">
            <Skeleton className="h-4 w-32" />
            {!compact ? <Skeleton className="mt-2 h-4 w-40" /> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReportSectionSkeleton() {
  return (
    <section className="rounded-lg border bg-card p-5">
      <Skeleton className="mb-5 h-4 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="mt-3 h-4 w-11/12" />
      <Skeleton className="mt-3 h-4 w-9/12" />
    </section>
  );
}
