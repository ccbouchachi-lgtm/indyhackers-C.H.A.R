export type User = { id: string; name: string; email: string };
export type Group = { id: string; name: string; description: string; code: string; members: string[] };
export type TaskStatus = "assigned" | "accepted" | "submitted" | "changes_requested" | "completed";
export type Submission = { id: string; text: string; url: string; date: string; feedback?: string; decision?: "approved" | "changes_requested" };
export type Task = { id: string; groupId: string; title: string; description: string; assignee: string; reviewer: string; deadline: string; status: TaskStatus; submissions: Submission[] };
export type Activity = { id: string; userId: string; taskId: string; text: string; date: string };
export type AppData = { version: 1; activeUserId: string; users: User[]; groups: Group[]; tasks: Task[]; activity: Activity[]; blockedSites: string[] };
