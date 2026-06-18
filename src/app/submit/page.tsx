import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ManualSubmitForm } from "@/components/dashboard/manual-submit-form";
import { TrackUsageEvent } from "@/components/dashboard/usage-tracker";
import { isManualFeedbackEnabled } from "@/lib/manual-reports";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function SubmitPage() {
  if (!isManualFeedbackEnabled()) notFound();

  return (
    <main className="magic-page">
      <TrackUsageEvent eventName="manual_submit_opened" eventData={{ source: "manual_submit" }} />
      <div className="magic-container flex max-w-5xl flex-col gap-6">
        <header className="magic-card magic-hero p-5 md:p-7">
          <div className="relative">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full px-0 text-slate-500 hover:text-[#B91C1C]")}
              >
                <ArrowLeft className="size-4" />
                Home
              </Link>
              <Link
                href="/manual-reports"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-full border-slate-200 bg-white px-4")}
              >
                <FileText className="size-4" />
                Self-submitted reports
              </Link>
            </div>
            <span className="magic-kicker">
              <Sparkles className="size-3.5" />
              Self-submitted feedback
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-normal text-slate-950 md:text-5xl">
              Generate call feedback
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Add a Zoom recording link or paste a transcript to generate a Magic Mike coaching report for a closing-stage call.
            </p>
            <div className="mt-5 grid gap-2 text-sm font-medium text-slate-700 sm:grid-cols-3">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#DC2626]" />
                Zoom or transcript
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#DC2626]" />
                Private status page
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#DC2626]" />
                Enhanced ready
              </span>
            </div>
          </div>
        </header>

        <section className="magic-card p-4 md:p-5">
          <ManualSubmitForm />
        </section>
      </div>
    </main>
  );
}
