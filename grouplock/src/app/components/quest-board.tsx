"use client";

import { useState } from "react";

const quests = ["Map the user journey", "Build the landing page", "Review with your party"];

export function QuestBoard() {
  const [completed, setCompleted] = useState<number[]>([0]);
  const count = completed.length;
  return (
    <div className="quest-board">
      <div className="quest-header"><span>✦ THE SUGAR SQUAD</span><span className="demo-tag">PLAYABLE DEMO</span></div>
      <div className="p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">WORLD 01 · CUPCAKE COMMONS</p><h2 className="mt-2 text-2xl font-extrabold">Small quests. Sweet wins.</h2></div><span className="quest-mascot" aria-hidden="true">🍬</span></div>
        <div className="quest-map" aria-label={`${count} of 3 quests complete`}>
          <div className="map-trail" aria-hidden="true" />
          {["🍭", "🍪", "🧁", "🏰"].map((icon, index) => <div key={icon} className={`map-stop stop-${index} ${index <= count ? "unlocked" : ""}`}><span aria-hidden="true">{icon}</span><span className="stop-label">{["START", "FOCUS", "FINISH", "SWEET WIN"][index]}</span></div>)}
        </div>
        <div className="flex items-center justify-between text-xs font-bold"><span>Party progress</span><span aria-live="polite">{count * 50} / 150 candy XP</span></div>
        <div className="xp-track" role="progressbar" aria-label="Demo quest progress" aria-valuenow={count} aria-valuemin={0} aria-valuemax={3}><div style={{ width: `${count / 3 * 100}%` }} /></div>
        <div className="mt-5 space-y-2">{quests.map((quest, index) => <button key={quest} type="button" aria-pressed={completed.includes(index)} className={`quest-task ${completed.includes(index) ? "quest-done" : ""}`} onClick={() => setCompleted((previous) => previous.includes(index) ? previous.filter((item) => item !== index) : [...previous, index])}><span className="quest-checkbox" aria-hidden="true">{completed.includes(index) ? "✓" : ""}</span><span className="flex-1 text-left">{quest}</span><span className="quest-reward">+50 XP</span></button>)}</div>
        <p className="quest-message" aria-live="polite">{count === 3 ? "🎉 Sweet victory! Your party reached the candy castle." : "✦ Tap a quest to try it. Every little win moves you forward."}</p>
        <div className="focus-pact"><span aria-hidden="true">🔒</span><p><strong>Your party’s focus pact</strong><br />Miss a deadline? The website restrictions you agreed on kick in.</p></div>
        <p className="mt-3 text-center text-[10px] text-purple-800/70">Demo progress only · resets when you refresh</p>
      </div>
    </div>
  );
}
