import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ManualSubmitForm } from "@/components/dashboard/manual-submit-form";
import { isManualFeedbackEnabled } from "@/lib/manual-reports";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function SubmitPage() {
  if (!isManualFeedbackEnabled()) notFound();

  return (
    <main className="dashboard-page min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="dashboard-card dashboard-hero rounded-2xl border bg-card/95 p-5 md:p-6">
          <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "mb-4 px-0")}>
            <ArrowLeft className="size-4" />
            Home
          </Link>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Beta</Badge>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="size-3.5" />
              Self-submitted feedback
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
            Submit a sales call
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Paste a transcript or attach a Zoom link to generate a Lil Rudy coaching report for a closing-stage call.
          </p>
        </header>

        <section className="dashboard-card rounded-2xl border bg-card/95 p-4 md:p-5">
          <ManualSubmitForm />
        </section>
      </div>
    </main>
  );
}
