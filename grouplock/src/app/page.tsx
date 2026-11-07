import { EntryButton } from "./components/entry-button";

function Lock({ small = false }: { small?: boolean }) {
  return <span className={`lock-mark ${small ? "lock-small" : ""}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></svg></span>;
}

const steps = [
  { number: "01", icon: "01", title: "Build your team.", text: "Create a group, invite your teammates, and get everyone working toward the same goal." },
  { number: "02", icon: "02", title: "Set the commitments.", text: "Assign tasks, set clear deadlines, and agree on which distracting websites to restrict if a deadline slips." },
  { number: "03", icon: "03", title: "Move up together.", text: "Finish tasks, track your progress, and challenge your teammates. Miss a deadline, and your agreed restrictions help bring your focus back." },
];

export default function Home() {
  return (
    <div id="top" className="grouplock-world min-h-screen">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="border-b border-slate-100">
        <nav className="page-width flex h-22 items-center justify-between gap-5" aria-label="Main navigation">
          <a href="#top" className="flex items-center gap-2.5 text-xl font-bold tracking-tight" aria-label="GroupLock home"><Lock small />GroupLock<span className="text-blue-600">.</span></a>
          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex"><a className="nav-link" href="#how-it-works">How it works</a><a className="nav-link" href="#why-grouplock">Why GroupLock</a></div>
          <div className="flex items-center gap-3 sm:gap-6"><EntryButton mode="signin" className="nav-link text-sm font-semibold">Sign In</EntryButton><EntryButton className="button button-dark hidden sm:inline-flex">Get Started <span aria-hidden="true">↗</span></EntryButton></div>
        </nav>
      </header>
      <main id="main">
        <section className="hero-section">
          <div className="page-width grid items-center gap-16 py-20 lg:grid-cols-[1fr_1fr] lg:gap-12 lg:py-28">
            <div>
              <div className="eyebrow mb-7"><span className="h-2 w-2 rounded-full bg-blue-600" /> SHARED GOALS. FRIENDLY COMPETITION.</div>
              <h1 className="max-w-xl text-[clamp(3rem,5.2vw,4.6rem)] leading-[1.06] font-semibold tracking-[-0.065em]">Your Deadlines.<br /><span className="text-blue-600">Your Accountability.</span></h1>
              <p className="mt-7 max-w-md text-lg leading-8 text-slate-500">Turn team commitments into forward momentum. Complete tasks, climb the leaderboard, and give each other a reason to stay focused.</p>
              <div className="mt-9 flex flex-wrap items-center gap-4"><EntryButton className="button button-blue">Get Started <span aria-hidden="true">→</span></EntryButton><a href="#how-it-works" className="button button-white">See how it works <span aria-hidden="true">↗</span></a></div>
              <div className="mt-7 flex items-center gap-2 text-xs text-slate-500"><svg aria-hidden="true" width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor"><path d="m4 10 4 4 8-8" strokeWidth="2" /></svg> Real deadlines. Shared progress. A little healthy rivalry.</div>
            </div>
            <div className="preview-scene">
              <div className="race-board p-8 sm:p-12">
                <div className="mb-7 flex items-center gap-3"><Lock /><span className="eyebrow text-teal-700">YOUR TEAM’S NEXT CHAPTER</span></div>
                <h2 className="text-3xl font-semibold tracking-tight">A little rivalry.<br />A lot of progress.</h2>
                <p className="mt-5 text-sm leading-7 text-slate-500">Your team’s rankings, progress, and next commitments live in your workspace. Sign in to see where you stand.</p>
                <div className="my-7 space-y-3" aria-hidden="true">{["w-4/5", "w-3/5", "w-2/5"].map((width) => <div key={width} className="h-3 rounded-full bg-slate-100"><div className={`h-full rounded-full bg-teal-200 ${width}`} /></div>)}</div>
                <EntryButton mode="signin" className="button button-blue">Sign In to view your leaderboard →</EntryButton>
              </div>
            </div>
          </div>
        </section>
        <section id="why-grouplock" className="border-y border-slate-100 bg-slate-50/70">
          <div className="page-width flex flex-col justify-between gap-5 py-7 text-sm sm:flex-row sm:items-center"><p className="font-medium text-slate-500">Built for teams that want to <span className="text-slate-950">get things done.</span></p><div className="flex flex-wrap gap-x-7 gap-y-3 text-xs font-medium text-slate-600"><span>✦ Student teams</span><span>✦ Hackathon crews</span><span>✦ Side-project builders</span></div></div>
        </section>
        <section id="how-it-works" className="page-width py-20 sm:py-24">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow mb-4 text-blue-600">HOW YOUR TEAM GETS AHEAD</p><h2 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">A stronger team. One task at a time.</h2></div><p className="max-w-xs text-sm leading-6 text-slate-500">Set clear expectations, see where everyone stands, and turn friendly competition into consistent progress.</p></div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">{steps.map((step) => <article key={step.number} className="step-card"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600" aria-hidden="true">{step.icon}</span><span className="font-mono text-xs text-slate-300">/ {step.number}</span></div><h3 className="mt-7 text-lg font-semibold tracking-tight">{step.title}</h3><p className="mt-3 text-sm leading-7 text-slate-500">{step.text}</p></article>)}</div>
          <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-2xl team-cta px-8 py-9 text-white sm:flex-row sm:items-center"><div><h2 className="text-2xl font-semibold tracking-tight">Give your team a reason to keep moving.</h2><p className="mt-2 text-sm text-slate-400">Your team sets the goals. Your team agrees on the rules.</p></div><EntryButton className="button button-blue shrink-0">Start your team <span aria-hidden="true">→</span></EntryButton></div>
        </section>
      </main>
      <footer className="border-t border-slate-100"><div className="page-width flex flex-col items-center justify-between gap-4 py-7 sm:flex-row"><a href="#top" className="flex items-center gap-2 text-sm font-bold"><Lock small />GroupLock.</a><p className="text-xs text-slate-400">Stay focused. Move forward. Together.</p><a href="#top" className="nav-link text-xs text-slate-500">Back to top ↑</a></div></footer>
    </div>
  );
}
