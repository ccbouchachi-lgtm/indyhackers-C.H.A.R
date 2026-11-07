"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { webApi, WebApiError, type SignedInProfile } from "@/lib/web-api";

export function Account() {
  const router = useRouter();
  const [origin] = useState(() => typeof window === "undefined" ? "" : window.location.origin);
  const [profile, setProfile] = useState<SignedInProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [credential, setCredential] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    webApi.me().then((user) => { if (active) setProfile(user); }).catch((err: Error) => {
      if (active) setError(err instanceof WebApiError && err.status === 401 ? "Sign in with your confirmed account to create an extension credential." : err.message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function pair() {
    if (busy || credential) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await webApi.pair();
      if (typeof result.credential !== "string" || !result.credential) throw new Error("The server did not return a credential. Please try again.");
      setCredential(result.credential);
      setNotice("Credential created for your signed-in account. Copy it before leaving this page.");
    } catch (err) {
      if (err instanceof WebApiError && err.status === 401) { setProfile(null); setCredential(""); }
      setError((err as Error).message);
    } finally { setBusy(false); }
  }
  async function logout() {
    if (busy) return;
    setBusy(true); setError(""); setCredential(""); setRevealed(false); setNotice("");
    try { await webApi.logout(); setProfile(null); router.replace("/login"); router.refresh(); }
    catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return <div className="application">
    <header className="app-nav"><Link className="app-brand" href="/">▣ GroupLock<span>.</span></Link><nav aria-label="Account navigation"><Link href="/account" aria-current="page">Account & extension</Link><Link href="/dashboard">Demo workspace</Link>{profile ? <button className="button button-white" disabled={busy} onClick={logout}>Sign Out</button> : <Link href="/login">Sign In</Link>}</nav></header>
    <main className="app-main">
      <div className="app-title"><div><p className="eyebrow text-teal-700">ACCOUNT & EXTENSION</p><h1>Your focus. Your account.</h1></div></div>
      {loading && <p role="status" className="app-help">Checking your signed-in account…</p>}
      {error && <p role="alert" className="app-error mb-6">{error}</p>}
      {!loading && !profile && <section className="app-card"><h2>Sign in to continue</h2><p className="app-description">This page uses your real backend session, independently of the demo workspace.</p><Link href="/login" className="button button-blue">Go to Sign In →</Link><button className="button button-white ml-3" onClick={() => window.location.reload()}>Retry session check</button></section>}
      {profile && <div className="app-columns"><section className="app-card"><h2>Signed in as {profile.username}</h2><p className="app-help">{profile.email}</p><p className="app-description">Your identity is verified by the backend session. Extension credentials belong to this account, not the demo account selector.</p><p className="app-help">Group and task screens are still a separate browser-local demo.</p></section>
        <section className="app-card"><p className="eyebrow text-teal-700">CHROME EXTENSION</p><h2 className="mt-3">Connect your focus companion.</h2><p className="app-description">Create a credential, then copy it into your GroupLock Chrome extension. Treat it like a password. It is shown only on this page and is not saved in browser storage.</p>
          <button className="button button-blue" disabled={busy || !!credential} onClick={pair}>{busy ? "Please wait…" : credential ? "Credential created" : "Create extension credential"}</button>
          <p role="status" className="app-success mt-4">{notice}</p>
          {credential && <div className="app-form mt-5"><label>Extension credential<input type={revealed ? "text" : "password"} value={credential} readOnly autoComplete="off" spellCheck={false} onFocus={(event) => event.currentTarget.select()} /></label><div className="app-actions"><button className="button button-blue" disabled={busy} onClick={async () => { try { await navigator.clipboard.writeText(credential); setNotice("Credential copied. Paste it into your own Chrome extension."); } catch { setRevealed(true); setNotice("Clipboard unavailable. Select the credential field and copy it manually."); } }}>Copy credential</button><button className="button button-white" aria-pressed={revealed} onClick={() => setRevealed(!revealed)}>{revealed ? "Hide" : "Show"} credential</button></div></div>}
          <label className="mt-6 block text-xs font-semibold">App URL<input className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 font-normal" value={origin} readOnly onFocus={(event) => event.currentTarget.select()} /></label>
          <ol className="mt-6 list-decimal space-y-3 pl-5 text-xs leading-6 text-slate-600"><li>In Chrome, open the GroupLock extension.</li><li>Enter this app’s exact HTTPS origin. For local development, use its localhost origin.</li><li>Paste your credential and click <strong>Pair account</strong>, then <strong>Sync now</strong>.</li></ol>
          <p className="app-help">Creating a credential does not confirm the extension is paired. Check connection and sync status in Chrome.</p>
        </section></div>}
    </main>
  </div>;
}
