import type { AppData } from "./types";

// Fixtures only. No backend calls, real accounts, or extension state are implied.
const day = (offset: number) => { const date = new Date(); date.setDate(date.getDate() + offset); date.setHours(17, 0, 0, 0); return date.toISOString(); };
export function createMockData(): AppData {
  return {
    version: 1, activeUserId: "you",
    users: [{ id: "you", name: "You", email: "you@example.com" }, { id: "alex", name: "Alex Morgan", email: "alex@example.com" }, { id: "sam", name: "Sam Lee", email: "sam@example.com" }],
    groups: [
      { id: "launch", name: "Launch Crew", description: "Building something worth shipping, one commitment at a time.", code: "LAUNCH24", members: ["you", "alex", "sam"] },
      { id: "study", name: "Study Sprint", description: "A focused space for this week’s learning goals.", code: "STUDY24", members: ["you", "sam"] },
      { id: "builders", name: "Weekend Builders", description: "Make progress on our side projects together.", code: "BUILD24", members: ["alex", "sam"] },
    ],
    tasks: [
      { id: "landing", groupId: "launch", title: "Build the landing page", description: "Implement the responsive homepage and share the preview link for review.", assignee: "you", reviewer: "alex", deadline: day(1), status: "assigned", submissions: [] },
      { id: "journey", groupId: "launch", title: "Review the user journey", description: "Check the flow from group creation to submission review.", assignee: "alex", reviewer: "you", deadline: day(2), status: "submitted", submissions: [{ id: "initial", text: "The journey map covers group setup, task acceptance, and review. Ready for your feedback.", url: "https://example.com/journey", date: day(-1) }] },
      { id: "research", groupId: "study", title: "Summarize the research notes", description: "Write a concise summary of the key takeaways.", assignee: "you", reviewer: "sam", deadline: day(3), status: "accepted", submissions: [] },
      { id: "outline", groupId: "launch", title: "Outline the project scope", description: "Agree on the first milestone.", assignee: "you", reviewer: "alex", deadline: day(-2), status: "completed", submissions: [{ id: "outline-sub", text: "Scope and milestones agreed by the team.", url: "", date: day(-3), feedback: "Clear and actionable. Approved.", decision: "approved" }] },
    ],
    activity: [{ id: "seed", userId: "you", taskId: "outline", text: "Completed Outline the project scope", date: day(-2) }],
    blockedSites: ["youtube.com", "reddit.com"],
  };
}
