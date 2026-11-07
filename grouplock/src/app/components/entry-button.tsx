import Link from "next/link";
import type { ReactNode } from "react";

export function EntryButton({ children, className, mode = "start" }: { children: ReactNode; className?: string; mode?: "start" | "signin" }) {
  return <Link href={mode === "signin" ? "/profile" : "/groups/create"} className={className}>{children}</Link>;
}
