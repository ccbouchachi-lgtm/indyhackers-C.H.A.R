"use client";

import { useSyncExternalStore } from "react";
import { createMockData } from "./mock-data";
import type { AppData, Task } from "./types";

// Integration boundary: replace these methods with contract-backed HTTP calls later.
// All writes currently stay in this browser. No authentication or blocking is performed.
const KEY = "grouplock.application.v1";
let data: AppData | undefined;
let storageWarning = "";
const listeners = new Set<() => void>();
function snapshot() {
  if (!data) {
    data = createMockData();
    try { const saved = localStorage.getItem(KEY); if (saved) { const parsed = JSON.parse(saved); if (parsed.version === 1 && Array.isArray(parsed.users) && Array.isArray(parsed.groups) && Array.isArray(parsed.tasks) && Array.isArray(parsed.activity) && Array.isArray(parsed.blockedSites) && parsed.users.some((user: { id: string }) => user.id === parsed.activeUserId)) data = parsed; } } catch { storageWarning = "Browser storage is unavailable or invalid. Changes will last for this session only."; }
  }
  return data!;
}
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useAppData() { return useSyncExternalStore(subscribe, snapshot, () => null); }
export function getStorageWarning() { return storageWarning; }
function save(next: AppData) { data = next; try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { storageWarning = "Browser storage is unavailable. Changes will last for this session only."; } listeners.forEach((listener) => listener()); }
const id = () => crypto.randomUUID();
function activity(current: AppData, task: Task, text: string): AppData { return { ...current, activity: [{ id: id(), userId: current.activeUserId, taskId: task.id, text, date: new Date().toISOString() }, ...current.activity] }; }
function ownedGroup(current: AppData, groupId: string) { const group = current.groups.find((g) => g.id === groupId && g.members.includes(current.activeUserId)); if (!group) throw new Error("Group not found or you are not a member."); return group; }
export const mockApi = {
  createDemoProfile(name: string, email: string) {
    const current = snapshot();
    const normalizedEmail = email.trim().toLowerCase();
    if (!name.trim() || name.trim().length > 80) throw new Error("Enter a display name of up to 80 characters.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) throw new Error("Enter a valid demo email address.");
    if (current.users.some((user) => user.email.toLowerCase() === normalizedEmail)) throw new Error("That demo email already exists in this browser. Choose it in the demo workspace account selector.");
    const user = { id: id(), name: name.trim(), email: normalizedEmail };
    save({ ...current, activeUserId: user.id, users: [...current.users, user] });
    return user.id;
  },
  switchUser(userId: string) { const current = snapshot(); if (!current.users.some((user) => user.id === userId)) throw new Error("Choose an existing demo profile."); save({ ...current, activeUserId: userId }); },
  createGroup(name: string, description: string) { const current = snapshot(); if (!name.trim()) throw new Error("Enter a group name."); const group = { id: id(), name: name.trim(), description: description.trim(), code: id().slice(0, 8).toUpperCase(), members: [current.activeUserId] }; save({ ...current, groups: [...current.groups, group] }); return group.id; },
  joinGroup(code: string) { const current = snapshot(); const group = current.groups.find((g) => g.code === code.trim().toUpperCase()); if (!group) throw new Error("That invite code was not found. Try BUILD24 for the demo group."); if (group.members.includes(current.activeUserId)) throw new Error("You are already a member of this group."); save({ ...current, groups: current.groups.map((g) => g.id === group.id ? { ...g, members: [...g.members, current.activeUserId] } : g) }); return group.id; },
  createTask(input: Pick<Task, "title" | "description" | "assignee" | "reviewer" | "deadline" | "groupId">) {
    const current = snapshot(); const group = ownedGroup(current, input.groupId);
    if (!input.title.trim() || !input.description.trim()) throw new Error("Enter a title and description.");
    if (!group.members.includes(input.assignee) || !group.members.includes(input.reviewer)) throw new Error("Choose members of this group.");
    if (input.assignee === input.reviewer) throw new Error("The reviewer must be different from the assignee.");
    if (!Number.isFinite(Date.parse(input.deadline)) || Date.parse(input.deadline) <= Date.now()) throw new Error("Choose a deadline in the future.");
    const task: Task = { ...input, title: input.title.trim(), description: input.description.trim(), id: id(), status: "assigned", submissions: [] };
    save(activity({ ...current, tasks: [...current.tasks, task] }, task, `Created ${task.title}`)); return task.id;
  },
  acceptTask(taskId: string) { const current = snapshot(); const task = current.tasks.find((t) => t.id === taskId); if (!task || task.assignee !== current.activeUserId || task.status !== "assigned") throw new Error("Only the assignee can accept a newly assigned task."); ownedGroup(current, task.groupId); save(activity({ ...current, tasks: current.tasks.map((t) => t.id === taskId ? { ...t, status: "accepted" } : t) }, task, `Accepted ${task.title}`)); },
  submitWork(taskId: string, text: string, url: string) {
    const current = snapshot(); const task = current.tasks.find((t) => t.id === taskId);
    if (!task || task.assignee !== current.activeUserId || !["accepted", "changes_requested"].includes(task.status)) throw new Error("Accept this task before submitting work.");
    ownedGroup(current, task.groupId); if (!text.trim()) throw new Error("Describe the work you completed.");
    if (url.trim()) { let parsed: URL; try { parsed = new URL(url.trim()); } catch { throw new Error("Enter a valid work URL."); } if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Use an http or https link."); }
    save(activity({ ...current, tasks: current.tasks.map((t) => t.id === taskId ? { ...t, status: "submitted", submissions: [...t.submissions, { id: id(), text: text.trim(), url: url.trim(), date: new Date().toISOString() }] } : t) }, task, `Submitted ${task.title} for review`));
  },
  reviewTask(taskId: string, approve: boolean, feedback: string) {
    const current = snapshot(); const task = current.tasks.find((t) => t.id === taskId);
    if (!task || task.reviewer !== current.activeUserId || task.status !== "submitted") throw new Error("Only the assigned reviewer can review a pending submission.");
    ownedGroup(current, task.groupId); if (!approve && !feedback.trim()) throw new Error("Explain the changes you need before requesting changes.");
    save(activity({ ...current, tasks: current.tasks.map((t) => t.id === taskId ? { ...t, status: approve ? "completed" : "changes_requested", submissions: t.submissions.map((submission, index) => index === t.submissions.length - 1 ? { ...submission, feedback: feedback.trim(), decision: approve ? "approved" : "changes_requested" } : submission) } : t) }, task, approve ? `Approved ${task.title}` : `Requested changes to ${task.title}`));
  },
  saveSites(sites: string[]) { save({ ...snapshot(), blockedSites: sites }); },
};
