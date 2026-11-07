/** Real same-origin API requests. Sessions are managed by backend HttpOnly cookies. */
export type SignedInProfile = {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export class WebApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "WebApiError";
  }
}

export async function requestApi<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new WebApiError(0, "NETWORK_ERROR", "Unable to reach GroupLock. Check your connection and try again.");
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new WebApiError(response.status, payload?.error?.code ?? "REQUEST_FAILED", payload?.error?.message ?? "Request failed. Please try again.");
  }
  if (!payload || typeof payload !== "object" || !("data" in payload)) throw new WebApiError(response.status, "INVALID_RESPONSE", "The server returned an unexpected response.");
  return payload.data as T;
}

export const webApi = {
  login: (email: string, password: string) => requestApi<SignedInProfile>("/api/auth/login", "POST", { email: email.trim(), password }),
  me: () => requestApi<SignedInProfile>("/api/auth/me"),
  logout: () => requestApi<null>("/api/auth/logout", "POST"),
  pair: () => requestApi<{ connection: { id: string; revokedAt: string | null }; credential: string }>("/api/extension/pair", "POST"),
};

export type LiveRole = "owner" | "admin" | "member";
export type LiveGroup = { id: string; name: string; role: LiveRole };
export type LiveGroupDetail = {
  group: LiveGroup;
  members: { userId: string; username: string }[];
  inviteCode: string | null;
};
export type LiveTask = {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  reviewerId: string;
  deadline: string;
  status: "assigned" | "accepted" | "submitted" | "changes_requested" | "approved";
  submissionVersion: number;
  submissionUrl: string | null;
  isOverdue: boolean;
};
type TaskInput = Pick<LiveTask, "title" | "description" | "assignedTo" | "reviewerId" | "deadline">;
type FocusConsent = { expiresAt: string; allowedDomains: string[] };

export const liveApi = {
  signup: (username: string, email: string, password: string) =>
    requestApi<{ requiresEmailConfirmation: boolean }>("/api/auth/signup", "POST", { username, email, password }),
  groups: () => requestApi<LiveGroup[]>("/api/groups"),
  group: (id: string) => requestApi<LiveGroupDetail>(`/api/groups/${id}`),
  createGroup: (name: string) => requestApi<{ group: LiveGroup }>("/api/groups", "POST", { name }),
  joinGroup: (inviteCode: string) => requestApi<LiveGroup>("/api/groups/join", "POST", { inviteCode }),
  tasks: (id: string) => requestApi<LiveTask[]>(`/api/groups/${id}/tasks`),
  assign: (id: string, input: TaskInput) => requestApi<LiveTask>(`/api/groups/${id}/tasks`, "POST", input),
  accept: (id: string, focusAgreement?: FocusConsent) =>
    requestApi<{ task: LiveTask }>(`/api/tasks/${id}/accept`, "POST", focusAgreement ? { focusAgreement } : {}),
  submit: (task: LiveTask, submissionUrl: string) => requestApi<LiveTask>(`/api/tasks/${task.id}/submit`, "POST", {
    submissionUrl, expectedSubmissionVersion: task.submissionVersion,
  }),
  review: (task: LiveTask, decision: "approve" | "request_changes") =>
    requestApi<LiveTask>(`/api/tasks/${task.id}/review`, "POST", { decision, submissionVersion: task.submissionVersion }),
};
