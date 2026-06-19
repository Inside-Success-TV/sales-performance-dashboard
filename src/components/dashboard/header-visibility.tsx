"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function HeaderVisibility({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/sign-in" || pathname.startsWith("/sign-in/")) return null;

  return <>{children}</>;
}
