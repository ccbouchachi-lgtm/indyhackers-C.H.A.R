"use client";

import Link from "next/link";
import { useState } from "react";
import type { AppData } from "@/lib/types";

export function TeamLeaderboard({ data, showTop = false }: { data: AppData; showTop?: boolean }) {
  const groups = data.groups.filter((group) => group.members.includes(data.activeUserId));
  const [selectedId, setSelectedId] = useState("");
  const group = groups.find((item) => item.id === selectedId) ?? groups[0];
  if (!group) return <section id="team-leaderboard" className="app-card mt-7"><h2>Your team leaderboard</h2><p className="app-help">Join or create a group to see progress and top contributors.</p><Link className="button button-blue" href="/groups/join">Join a group</Link></section>;
  const members = group.members.map((userId) => {
    const user = data.users.find((item) => item.id === userId)!;
    const tasks = data.tasks.filter((task) => task.groupId === group.id && task.assignee === userId);
    const done = tasks.filter((task) => task.status === "completed").length;
    return { ...user, done, total: tasks.length, points: done * 50, progress: tasks.length ? Math.round(done / tasks.length * 100) : 0 };
  }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  return <section id="team-leaderboard" aria-labelledby="team-leaderboard-title" className="app-card mt-7">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="eyebrow text-teal-700">FRIENDLY COMPETITION</p><h2 id="team-leaderboard-title" className="mt-2">Your team leaderboard</h2></div>
      <label className="flex items-center gap-2 text-xs text-slate-600">Group<select className="rounded-lg border border-slate-200 bg-white p-2 text-slate-900" value={group.id} onChange={(event) => setSelectedId(event.target.value)}>{groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </div>
    <p className="app-help">50 points per approved task. Equal scores share a rank. Race lanes show each member’s task completion.</p>
    {showTop && <div className="my-6">
      <h3 className="text-sm font-semibold">Top 3 contributors</h3>
      <p className="app-help">Ranked by approved tasks in {group.name}. Ties share a rank; names break display-order ties.</p>
      <div className="grid gap-3 sm:grid-cols-3">{members.slice(0, 3).map((member) => <div key={member.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><span className="text-xs font-semibold text-teal-700">#{members.findIndex((item) => item.points === member.points) + 1}</span><p className="mt-2 text-sm font-semibold">{member.name}{member.id === data.activeUserId ? " (you)" : ""}</p><p className="mt-1 text-xl font-semibold">{member.points} <span className="text-xs font-normal text-slate-500">pts</span></p><p className="mt-2 text-[11px] text-slate-500">{member.done} approved {member.done === 1 ? "task" : "tasks"}</p></div>)}</div>
      {members.length < 3 && <p className="app-help">Invite more teammates to fill the top three.</p>}
    </div>}
    <div className="race-track" aria-label={`${group.name} task completion`}>
      {members.map((member) => <div key={member.id} className="race-lane"><span className="w-24 shrink-0 truncate text-xs" title={member.name}>{member.id === data.activeUserId ? "You" : member.name}</span><div className="lane-track" role="progressbar" aria-label={`${member.name} task completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={member.progress}><div className="lane-fill member-teal" style={{ width: `${member.progress}%` }} /></div><span className="lane-percent">{member.progress}%</span></div>)}
    </div>
    <ol className="leaderboard" aria-label={`${group.name} rankings`}>
      {members.map((member) => <li key={member.id} className={member.id === data.activeUserId ? "is-you" : ""}><span className="rank">#{members.findIndex((item) => item.points === member.points) + 1}</span><span className="member-avatar member-teal">{member.name.slice(0, 2).toUpperCase()}</span><span className="flex-1">{member.name}{member.id === data.activeUserId && <span className="you-tag">YOU</span>}<small className="mt-1 block text-[10px] text-slate-500">{member.done} of {member.total} tasks approved</small></span><span className="font-semibold">{member.points} <span className="text-[10px] font-normal text-slate-500">pts</span></span></li>)}
    </ol>
    <Link href={`/groups/${group.id}`} className="mt-4 inline-block text-xs font-semibold text-teal-700">Open group workspace →</Link>
  </section>;
}
