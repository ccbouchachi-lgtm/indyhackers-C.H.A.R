"use client";

import { useState } from "react";

const tasks = ["Map the user journey", "Build the landing page", "Review with your team"];

export function QuestBoard() {
  const [completed, setCompleted] = useState<number[]>([0]);
  const members = [
    { name: "Alex", initials: "AL", points: 240, progress: 80, color: "blue" },
    { name: "You", initials: "YO", points: 120 + completed.length * 50, progress: 40 + completed.length * 15, color: "teal" },
    { name: "Sam", initials: "SA", points: 200, progress: 65, color: "amber" },
  ].sort((a, b) => b.points - a.points);
  const rank = members.findIndex((member) => member.name === "You") + 1;
  return (
    <div className="race-board">
      <div className="race-header"><span className="font-semibold">Launch Crew <span className="ml-1 text-slate-400">/ Weekly sprint</span></span><span className="demo-tag">INTERACTIVE DEMO</span></div>
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-teal-700">A LITTLE FRIENDLY COMPETITION</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Make your next move.</h2></div><span className="sprint-badge">WEEK 01</span></div>
        <div className="race-track" aria-label="Team race progress">
          <div className="mb-4 flex justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-500"><span>The starting line</span><span>Finish line ▥</span></div>
          {members.map((member) => <div className="race-lane" key={member.name}><span className="lane-name">{member.name}</span><div className="lane-track"><div className={`lane-fill member-${member.color}`} style={{ width: `${member.progress}%` }}><span className="racer">{member.initials}</span></div></div><span className="lane-percent">{member.progress}%</span></div>)}
        </div>
        <div className="mt-6 flex items-center justify-between"><h3 className="text-sm font-semibold">Sprint leaderboard</h3><span className="text-[10px] text-slate-500">50 pts per demo task</span></div>
        <ol className="leaderboard" aria-label="Sprint leaderboard">{members.map((member, index) => <li key={member.name} className={member.name === "You" ? "is-you" : ""}><span className="rank">{String(index + 1).padStart(2, "0")}</span><span className={`member-avatar member-${member.color}`}>{member.initials}</span><span className="flex-1 font-medium">{member.name}{member.name === "You" && <span className="you-tag">YOU</span>}</span><span className="font-semibold tabular-nums">{member.points} <span className="text-[10px] font-normal text-slate-500">pts</span></span></li>)}</ol>
        <h3 className="mt-6 mb-3 text-sm font-semibold">Your next points are one task away.</h3>
        <div className="space-y-2">{tasks.map((task, index) => <button key={task} type="button" aria-pressed={completed.includes(index)} className={`task-button ${completed.includes(index) ? "task-done" : ""}`} onClick={() => setCompleted((previous) => previous.includes(index) ? previous.filter((item) => item !== index) : [...previous, index])}><span className="task-checkbox" aria-hidden="true">{completed.includes(index) ? "✓" : ""}</span><span className="flex-1 text-left">{task}</span><span className="task-points">+50 pts</span></button>)}</div>
        <p className="mt-4 text-xs font-medium text-teal-800" role="status">{rank === 1 ? "You’re in the lead. Keep the momentum going." : `You’re #${rank}. Complete a task to climb the leaderboard.`}</p>
        <div className="focus-pact"><span className="pact-icon" aria-hidden="true">✓</span><p><strong>Competition with accountability.</strong><br />Miss a deadline? Your agreed website restrictions still apply.</p></div>
        <p className="mt-3 text-center text-[10px] text-slate-500">Sample team · Tap tasks to try it · Progress resets on refresh</p>
      </div>
    </div>
  );
}
