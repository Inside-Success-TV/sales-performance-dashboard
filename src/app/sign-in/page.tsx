import type { Metadata } from "next";
import { LogIn, ShieldCheck } from "lucide-react";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign in | Magic Mike Bot",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const callbackUrl = Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const redirectTo = getSafeRedirect(callbackUrl);

  return (
    <main className="magic-page flex min-h-[calc(100vh-72px)] items-center">
      <div className="mx-auto w-full max-w-lg px-5 py-16 sm:px-8">
        <Card className="magic-card overflow-hidden border-slate-200 bg-white shadow-xl">
          <CardContent className="p-7 sm:p-9">
            <div className="mb-7">
              <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-[#DC2626] text-white shadow-lg shadow-red-200">
                <ShieldCheck className="size-6" />
              </span>
              <h1 className="text-3xl font-extrabold tracking-normal text-slate-950">
                Sign in to Magic Mike
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Use your approved Google account to open reports and track verified dashboard usage.
              </p>
            </div>

            {error ? (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                This Google account is not approved for Magic Mike. Use an Inside Success TV,
                Inside Success, or Mawer Capital email.
              </div>
            ) : null}

            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo });
              }}
            >
              <Button type="submit" className="h-12 w-full rounded-full text-base font-bold">
                <LogIn className="size-5" />
                Continue with Google
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function getSafeRedirect(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/sign-in")) return "/";
  return value;
}
