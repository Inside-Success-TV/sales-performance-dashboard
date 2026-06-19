import Link from "next/link";
import { Bot, ChevronDown, LogOut, Mail, UserCircle } from "lucide-react";
import { auth, signOut } from "@/auth";
import { HeaderVisibility } from "@/components/dashboard/header-visibility";
import { MainNav } from "@/components/dashboard/main-nav";

export async function AppHeader() {
  const session = await auth();
  const userName = session?.user?.name?.trim() || "Signed-in user";
  const userEmail = session?.user?.email?.trim() || "Google account";

  return (
    <HeaderVisibility>
      <header className="magic-app-header sticky top-0 z-40 border-b backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex min-h-[72px] w-full max-w-6xl flex-col items-start justify-center gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-0">
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

          <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <MainNav />
            <ProfileMenu userName={userName} userEmail={userEmail} />
          </div>
        </div>
      </header>
    </HeaderVisibility>
  );
}

function ProfileMenu({ userName, userEmail }: { userName: string; userEmail: string }) {
  const initials = getInitials(userName, userEmail);

  return (
    <details className="group relative shrink-0">
      <summary
        aria-label="Open profile menu"
        className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-[#DC2626] [&::-webkit-details-marker]:hidden"
      >
        <span className="grid size-8 place-items-center rounded-full bg-slate-100 text-[12px] font-extrabold uppercase tracking-normal group-open:bg-[#DC2626] group-open:text-white">
          {initials}
        </span>
      </summary>

      <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/12">
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
              <UserCircle className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-normal text-slate-950">{userName}</p>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{userEmail}</p>
            </div>
          </div>
        </div>

        <div className="space-y-1 p-2">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500">
            <Mail className="size-4 text-slate-400" />
            Google profile
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/sign-in" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-[#DC2626]"
            >
              <span className="inline-flex items-center gap-2">
                <LogOut className="size-4" />
                Log out
              </span>
              <ChevronDown className="size-4 rotate-[-90deg] opacity-50" />
            </button>
          </form>
        </div>
      </div>
    </details>
  );
}

function getInitials(name: string, email: string) {
  const source = name !== "Signed-in user" ? name : email.split("@")[0] || "U";
  const parts = source
    .replace(/[^a-zA-Z0-9\s._-]/g, " ")
    .split(/[\s._-]+/)
    .filter(Boolean);

  return (parts[0]?.[0] || "U").concat(parts[1]?.[0] || "").slice(0, 2).toUpperCase();
}
