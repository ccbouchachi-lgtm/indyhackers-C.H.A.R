"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { webApi } from "@/lib/web-api";
import { EmberArt } from "../growth-art";

export function RealLogin() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setPending(true);
    setError("");
    try {
      await webApi.login(String(fields.get("email")), String(fields.get("password")));
      form.reset();
      router.replace("/account");
      router.refresh();
    } catch (err) {
      const password = form.elements.namedItem("password") as HTMLInputElement | null;
      if (password) password.value = "";
      setError((err as Error).message);
      setPending(false);
    }
  }
  return <div className="application auth-page">
    <header className="app-nav"><Link className="app-brand" href="/">▣ GroupLock<span>.</span></Link><Link className="nav-link text-sm" href="/signup">Create account →</Link></header>
    <main className="auth-grid">
      <section className="auth-story"><p className="eyebrow text-teal-700">WELCOME BACK</p><h1>Sign in. Bring the heat.</h1><p>Connect your GroupLock account and pair your Chrome extension to your own focus settings.</p><EmberArt /><Link className="app-back" href="/">← Back to GroupLock</Link></section>
      <section className="app-card auth-card" aria-labelledby="login-title"><p className="eyebrow text-teal-700">YOUR GROUPLOCK ACCOUNT</p><h2 id="login-title" className="mt-3">Sign In</h2><p className="app-help">Sign in with your confirmed GroupLock account.</p>
        <form className="app-form mt-6" onSubmit={submit} aria-busy={pending}>
          <label>Email<input name="email" type="email" autoComplete="username" maxLength={254} required disabled={pending} /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" maxLength={256} required disabled={pending} /></label>
          {error && <p role="alert" className="app-error">{error}</p>}
          <button className="button button-blue" disabled={pending}>{pending ? "Signing in…" : "Sign In →"}</button>
          <p className="app-help">New to GroupLock? <Link className="app-work-link" href="/signup">Create an account</Link></p>
        </form>
      </section>
    </main>
  </div>;
}
