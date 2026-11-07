"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EmberArt } from "../growth-art";
import { getStorageWarning, mockApi, useAppData } from "@/lib/mock-api";

export function AuthEntry({ signup = false }: { signup?: boolean }) {
  const data = useAppData();
  const router = useRouter();
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      if (signup) {
        mockApi.createDemoProfile(String(form.get("name")), String(form.get("email")));
        setCreated(true);
      } else {
        mockApi.switchUser(String(form.get("account")));
        router.push("/dashboard");
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return <div className="application auth-page">
    <header className="app-nav"><Link className="app-brand" href="/">▣ GroupLock<span>.</span></Link><Link className="nav-link text-sm" href={signup ? "/login" : "/signup"}>{signup ? "Sign In →" : "Get Started →"}</Link></header>
    <main className="auth-grid">
      <section className="auth-story">
        <p className="eyebrow text-teal-700">FUEL YOUR FOLLOW-THROUGH</p>
        <h1>{signup ? "Your next great team starts here." : "Welcome back. Bring the heat."}</h1>
        <p>Clear commitments, focused work, and a little friendly competition. Make your next move with GroupLock.</p>
        <EmberArt />
        <Link className="app-back" href="/">← Back to GroupLock</Link>
      </section>
      <section className="app-card auth-card" aria-labelledby="auth-title">
        <p className="eyebrow text-teal-700">{created ? "STEP 2 OF 2 · FIND YOUR TEAM" : signup ? "STEP 1 OF 2 · YOUR PROFILE" : "LOGIN"}</p>
        <h2 id="auth-title" className="mt-3">{created ? "Your demo profile is ready." : signup ? "Get started with GroupLock" : "Sign In to GroupLock"}</h2>
        <div className="auth-notice"><strong>Demo mode · Authentication not connected</strong><p>{signup ? "This creates a profile only in this browser. It does not register a real account. Use a sample name and email; no password is collected." : "Real account login is not available yet. Choose a local demo profile to explore the workspace. This does not authenticate you."}</p></div>
        {!data ? <p role="status" className="app-help">Loading demo profiles…</p> : created ? <div className="app-form">
          <p className="app-help" role="status">Continue by creating a group or joining with an invite code. Try BUILD24 to meet the sample team.</p>
          {getStorageWarning() && <p className="app-error" role="status">{getStorageWarning()}</p>}
          <Link href="/groups/create" className="button button-blue">Create my group →</Link>
          <Link href="/groups/join" className="button button-white">Join with an invite code</Link>
          <Link href="/dashboard" className="text-sm font-semibold text-teal-700">Explore dashboard first →</Link>
        </div> : <form onSubmit={submit} className="app-form">
          {signup ? <>
            <label>Display name<input name="name" required maxLength={80} autoComplete="off" placeholder="e.g. Taylor" /></label>
            <label>Demo email<input name="email" type="email" required maxLength={254} autoComplete="off" placeholder="taylor@example.com" /></label>
          </> : <label>Demo profile<select name="account" defaultValue={data.activeUserId} required>{data.users.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}</select></label>}
          {error && <p role="alert" className="app-error">{error}</p>}
          <button className="button button-blue">{signup ? "Create demo profile →" : "Open demo dashboard →"}</button>
          <p className="app-help">{signup ? "Already have a local demo profile?" : "Want to try onboarding?"} <Link className="app-work-link" href={signup ? "/login" : "/signup"}>{signup ? "Go to Sign In" : "Set up a demo profile"}</Link></p>
        </form>}
      </section>
    </main>
  </div>;
}
