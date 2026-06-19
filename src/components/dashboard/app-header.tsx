import Link from "next/link";
import { Bot } from "lucide-react";
import { auth } from "@/auth";
import { HeaderVisibility } from "@/components/dashboard/header-visibility";
import { MainNav } from "@/components/dashboard/main-nav";
import { ProfileMenu } from "@/components/dashboard/profile-menu";

export async function AppHeader() {
  const session = await auth();
  const userName = session?.user?.name?.trim() || "Signed-in user";
  const userEmail = session?.user?.email?.trim() || "Google account";

  return (
    <HeaderVisibility>
      <header className="magic-app-header sticky top-0 z-40 border-b backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[84rem] flex-col items-start justify-center gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-0">
          <Link href="/" className="flex min-w-0 items-center gap-3 font-semibold">
            <span className="magic-brand-mark grid size-11 place-items-center rounded-2xl text-white">
              <Bot className="size-6" />
            </span>
            <span className="leading-tight">
              <span className="block text-[19px] font-extrabold tracking-normal text-slate-900">
                Magic Mike <span className="text-[#DC2626]">Bot</span>
              </span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Inside Success TV
              </span>
            </span>
          </Link>

          <div className="flex w-full min-w-0 items-center justify-between gap-4 sm:w-auto sm:justify-end lg:gap-5">
            <MainNav />
            <ProfileMenu userName={userName} userEmail={userEmail} />
          </div>
        </div>
      </header>
    </HeaderVisibility>
  );
}
