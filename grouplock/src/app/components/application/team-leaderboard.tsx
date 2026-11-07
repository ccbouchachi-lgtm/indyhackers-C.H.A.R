"use client";

import Link from "next/link";
import { useState } from "react";
import type { AppData } from "@/lib/types";

export function TeamLeaderboard({ data, showTop = false }: { data: AppData; showTop?: boolean }) {
  const groups = data.groups.filter((group) => group.members.includes(data.activeUserId));
  const [selectedId, setSelectedId] = useState("");
  const [showBadges, setShowBadges] = useState(false);
  const group = groups.find((item) => item.id === selectedId) ?? groups[0];
  if (!group) return <section id="team-leaderboard" className="app-card mt-7"><h2>Your team leaderboard</h2><p className="app-help">Join or create a group to see progress and top contributors.</p><Link className="button button-blue" href="/groups/join">Join a group</Link></section>;
  const members = group.members.map((userId) => {
    const user = data.users.find((item) => item.id === userId)!;
    const tasks = data.tasks.filter((task) => task.groupId === group.id && task.assignee === userId);
    const done = tasks.filter((task) => task.status === "completed").length;
    return { ...user, done, total: tasks.length, points: done * 50, progress: tasks.length ? Math.round(done / tasks.length * 100) : 0 };
  }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  const me = members.find((member) => member.id === data.activeUserId)!;
  const ahead = [...members].reverse().find((member) => member.points > me.points);
  const nextLevel = (Math.floor(me.points / 250) + 1) * 250;
  const nextRankTasks = ahead ? Math.floor((ahead.points - me.points) / 50) + 1 : 0;
  const rank = (points: number) => members.findIndex((member) => member.points === points) + 1;
  const badge = (done: number) => done >= 10 ? "Pace setter" : done >= 5 ? "Momentum maker" : done >= 1 ? "First finish" : "On the starting line";

  return <section id="team-leaderboard" aria-labelledby="team-leaderboard-title" className="app-card mt-7">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="eyebrow text-teal-700">TURN UP THE COMPETITION</p><h2 id="team-leaderboard-title" className="mt-2">Your team leaderboard</h2></div>
      <label className="flex items-center gap-2 text-xs text-slate-600">Group<select className="rounded-lg border border-slate-200 bg-white p-2 text-slate-900" value={group.id} onChange={(event) => setSelectedId(event.target.value)}>{groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </div>
    <p className="app-help">50 points per approved task. Equal scores share a rank. Race lanes show each member’s task completion.</p>
    <div className="lb-challenge">
      <div><span className="eyebrow">FUEL YOUR NEXT MOVE</span><h3 className="mt-2 text-lg font-semibold">{ahead ? `${nextRankTasks} approved ${nextRankTasks === 1 ? "task" : "tasks"} to pass ${ahead.name}.` : me.points ? "You’re setting the pace. Keep the fire going." : "Make the first move."}</h3><p className="mt-2 text-xs leading-6 text-slate-600">{ahead ? "Every finished commitment brings the next rank closer." : "Complete a task and get it approved to put points on the board."}</p></div>
      <Link href={`/groups/${group.id}`} className="button button-blue shrink-0">Find your next task →</Link>
    </div>
    <div className="lb-level"><div className="flex flex-wrap justify-between gap-2 text-xs"><strong>Level {Math.floor(me.points / 250) + 1} · {badge(me.done)}</strong><span>{nextLevel - me.points} pts to your next level</span></div><div className="lb-level-track" role="progressbar" aria-label="Progress to next level" aria-valuenow={me.points % 250} aria-valuemin={0} aria-valuemax={250}><div style={{ width: `${me.points % 250 / 250 * 100}%` }} /></div><p className="mt-2 text-[10px] text-slate-500">50 points per approved task · 250 points per level</p></div>
    {showTop && <div className="my-6">
      <h3 className="text-sm font-semibold">Top 3 contributors · The podium</h3>
      <p className="app-help">Approved work earns your spot. Equal scores share a rank; names break display-order ties.</p>
      <div className="lb-podium">{members.slice(0, 3).map((member, index) => <div key={member.id} className={`lb-podium-card lb-place-${index + 1} ${member.id === data.activeUserId ? "lb-you" : ""}`}>
        <span className="lb-medal" aria-hidden="true">{member.points === 0 ? "◇" : rank(member.points) === 1 ? "♛" : rank(member.points) === 2 ? "✦" : "✧"}</span>
        <span className="lb-podium-avatar">{member.name.slice(0, 2).toUpperCase()}</span><p className="mt-3 text-sm font-semibold">{member.name}{member.id === data.activeUserId ? " (you)" : ""}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{member.points} <span className="text-xs font-normal text-slate-500">pts</span></p><span className="lb-achievement">{badge(member.done)}</span><div className="lb-podium-base">RANK #{rank(member.points)}<small>{member.done} approved {member.done === 1 ? "task" : "tasks"}</small></div>
      </div>)}</div>
      {members.length < 3 && <p className="app-help">Invite more teammates to fill the top three.</p>}
    </div>}
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">The race is heating up</h3><span className="text-[10px] text-slate-500">Approved / assigned tasks</span></div>
    <div className="race-track" aria-label={`${group.name} task completion`}>
      {members.map((member) => <div key={member.id} className="race-lane"><span className="w-24 shrink-0 truncate text-xs" title={member.name}>{member.id === data.activeUserId ? "You" : member.name}</span><div className="lane-track" role="progressbar" aria-label={`${member.name} task completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={member.progress}><div className="lane-fill member-teal" style={{ width: `${member.progress}%` }}>{member.progress > 0 && <span className="lb-runner" aria-hidden="true">➜</span>}</div></div><span className="lane-percent">{member.progress}%</span></div>)}
    </div>
    <ol className="leaderboard" aria-label={`${group.name} rankings`}>
      {members.map((member) => <li key={member.id} className={member.id === data.activeUserId ? "is-you" : ""}><span className="rank">#{members.findIndex((item) => item.points === member.points) + 1}</span><span className="member-avatar member-teal">{member.name.slice(0, 2).toUpperCase()}</span><span className="flex-1">{member.name}{member.id === data.activeUserId && <span className="you-tag">YOU</span>}<small className="mt-1 block text-[10px] text-slate-500">{member.done} of {member.total} tasks approved</small></span><span className="font-semibold">{member.points} <span className="text-[10px] font-normal text-slate-500">pts</span></span></li>)}
    </ol>
    <button type="button" className="lb-badge-toggle" aria-expanded={showBadges} aria-controls="leaderboard-badges" onClick={() => setShowBadges(!showBadges)}>{showBadges ? "Hide achievements −" : "Explore achievements +"}</button>
    {showBadges && <div id="leaderboard-badges" className="lb-badges">{[["✦", "First finish", 1], ["⚡", "Momentum maker", 5], ["♛", "Pace setter", 10]].map(([icon, name, target]) => <div key={name} className={me.done >= Number(target) ? "lb-earned" : ""}><span aria-hidden="true">{icon}</span><strong>{name}</strong><small>{target} approved {Number(target) === 1 ? "task" : "tasks"} · {me.done >= Number(target) ? "Unlocked" : `${Number(target) - me.done} to go`}</small></div>)}</div>}
    <Link href={`/groups/${group.id}`} className="mt-4 inline-block text-xs font-semibold text-teal-700">Open group workspace →</Link>
  </section>;
}
