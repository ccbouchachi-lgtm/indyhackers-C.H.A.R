"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { liveApi } from "@/lib/web-api";

export function RealSignup() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const result = await liveApi.signup(String(fields.get("username")), String(fields.get("email")), String(fields.get("password")));
      form.reset();
      if (result.requiresEmailConfirmation) setConfirmation(true);
      else router.replace("/account");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="application">
    <header className="app-nav"><Link className="app-brand" href="/">▣ GroupLock<span>.</span></Link><Link href="/login">Sign In</Link></header>
    <main className="app-main">
      <section className="app-card">
        <h1>Create your GroupLock account</h1>
        {confirmation ? <p role="status">Check your inbox to confirm your email, then <Link href="/login">sign in</Link>.</p> :
          <form className="app-form mt-6" onSubmit={submit}>
            <label>Display name<input name="username" autoComplete="nickname" required maxLength={80} /></label>
            <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
            <label>Password<input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={256} /></label>
            {error && <p className="app-error" role="alert">{error}</p>}
            <button className="button button-blue" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
          </form>}
        <p className="app-help mt-4"><Link href="/demo-signup">Try the sample workspace</Link></p>
      </section>
    </main>
  </div>;
}
