import { Suspense, type ReactNode } from "react";
import { WorkspaceShell } from "@/app/components/application/workspace";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="app-loading" role="status">Loading your workspace…</div>}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Suspense>
  );
}
