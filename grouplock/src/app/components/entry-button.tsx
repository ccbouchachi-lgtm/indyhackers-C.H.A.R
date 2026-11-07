"use client";

import { useId, useRef, type ReactNode } from "react";

export function EntryButton({ children, className, mode = "start" }: { children: ReactNode; className?: string; mode?: "start" | "signin" }) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className={className} onClick={() => dialog.current?.showModal()}>{children}</button>
    <dialog ref={dialog} className="entry-dialog" aria-labelledby={titleId} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="p-8">
        <p className="eyebrow text-blue-600">GROUPLOCK · PROJECT PREVIEW</p>
        <h2 id={titleId} className="mt-4 text-2xl font-semibold tracking-tight">{mode === "signin" ? "Your workspace is coming soon." : "Ready to lock in?"}</h2>
        <p className="mt-4 text-sm leading-7 text-slate-500">{mode === "signin" ? "Sign-in is not connected yet. Once accounts are available, you’ll be able to return to your team’s tasks and commitments here." : "Group creation is not connected yet. Start by choosing your teammates, listing your tasks, and agreeing on deadlines and website restrictions together."}</p>
        <form method="dialog" className="mt-6"><button className="button button-blue w-full">Got it</button></form>
      </div>
    </dialog>
  </>;
}
