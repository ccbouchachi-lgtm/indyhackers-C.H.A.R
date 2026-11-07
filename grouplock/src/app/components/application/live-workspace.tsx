"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { liveApi, webApi, WebApiError, type LiveGroup, type LiveGroupDetail, type LiveTask, type SignedInProfile } from "@/lib/web-api";

function formData(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  return new FormData(event.currentTarget);
}

function field(data: FormData, name: string) {
  return String(data.get(name) ?? "").trim();
}

export function LiveWorkspace() {
  const [profile, setProfile] = useState<SignedInProfile>();
  const [groups, setGroups] = useState<LiveGroup[]>([]);
  const [detail, setDetail] = useState<LiveGroupDetail>();
  const [tasks, setTasks] = useState<LiveTask[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);

  async function loadGroup(id: string) {
    const [nextGroup, nextTasks] = await Promise.all([liveApi.group(id), liveApi.tasks(id)]);
    setDetail(nextGroup);
    setTasks(nextTasks);
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const user = await webApi.me();
        const list = await liveApi.groups();
        const firstGroup = list[0];
        const groupData = firstGroup ? await Promise.all([liveApi.group(firstGroup.id), liveApi.tasks(firstGroup.id)]) : undefined;
        if (!active) return;
        setProfile(user);
        setGroups(list);
        if (groupData) {
          setDetail(groupData[0]);
          setTasks(groupData[1]);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof WebApiError && err.status === 401) setSignedOut(true);
        else setError((err as Error).message);
      } finally {
        if (active) setBusy(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      if (err instanceof WebApiError && err.status === 401) setSignedOut(true);
      else setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function groupSubmit(event: FormEvent<HTMLFormElement>, mode: "create" | "join") {
    const data = formData(event);
    const form = event.currentTarget;
    void run(async () => {
      const group = mode === "create"
        ? (await liveApi.createGroup(field(data, "name"))).group
        : await liveApi.joinGroup(field(data, "inviteCode"));
      setGroups(await liveApi.groups());
      await loadGroup(group.id);
      form.reset();
    });
  }

  function assign(event: FormEvent<HTMLFormElement>, groupId: string) {
    const data = formData(event);
    const form = event.currentTarget;
    void run(async () => {
      const assignedTo = field(data, "assignedTo");
      const reviewerId = field(data, "reviewerId");
      if (assignedTo === reviewerId) throw new Error("Choose a different reviewer and assignee.");
      const task = await liveApi.assign(groupId, {
        assignedTo, reviewerId,
        title: field(data, "title"),
        description: field(data, "description"),
        deadline: new Date(field(data, "deadline")).toISOString(),
      });
      setTasks(current => [...current, task]);
      form.reset();
    });
  }

  function updateTask(task: LiveTask) {
    setTasks(current => current.map(item => item.id === task.id ? task : item));
  }

  return <div className="application">
    <header className="app-nav">
      <Link className="app-brand" href="/">▣ GroupLock<span>.</span></Link>
      <nav><Link href="/work" aria-current="page">Groups & tasks</Link><Link href="/account">Account & extension</Link></nav>
    </header>
    <main className="app-main">
      <div className="app-title"><h1>Groups & tasks</h1>{profile && !signedOut && <p>Signed in as {profile.username}</p>}</div>
      {signedOut && <p><Link className="button button-blue" href="/login">Sign in to continue</Link></p>}
      {error && <p role="alert" className="app-error">{error}</p>}
      {busy && <p role="status" className="app-help">Updating workspace…</p>}
      {profile && !signedOut && <fieldset disabled={busy} className="grid gap-6">
        <section className="app-card">
          <h2>Groups</h2>
          <div className="app-columns">
            <form className="app-form" onSubmit={event => groupSubmit(event, "create")}>
              <label>New group name<input name="name" required maxLength={100} /></label>
              <button className="button button-blue">Create group</button>
            </form>
            <form className="app-form" onSubmit={event => groupSubmit(event, "join")}>
              <label>Invite code<input name="inviteCode" required maxLength={32} /></label>
              <button className="button button-white">Join group</button>
            </form>
          </div>
          {groups.length > 0 && <div className="app-form mt-4">
            <label>Current group<select value={detail?.group.id ?? ""} onChange={event => {
              const id = event.target.value;
              void run(() => loadGroup(id));
            }}>
              {!detail && <option value="" disabled>Choose a group</option>}
              {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select></label>
            {detail && <button className="button button-white" type="button" onClick={() => run(() => loadGroup(detail.group.id))}>Refresh group and tasks</button>}
          </div>}
        </section>
        {detail && <>
          <section className="app-card">
            <h2>{detail.group.name}</h2>
            <p className="app-help">Members: {detail.members.map(member => member.username).join(", ")}</p>
            {detail.inviteCode && <div className="app-form"><label>Share this invite code<input value={detail.inviteCode} readOnly onFocus={event => event.currentTarget.select()} /></label></div>}
            {(detail.group.role === "owner" || detail.group.role === "admin") && (detail.members.length < 2
              ? <p className="app-help">Invite another member to assign a task with a separate reviewer.</p>
              : <form key={detail.group.id} className="app-form mt-4" onSubmit={event => assign(event, detail.group.id)}>
                <h3>Assign a task</h3>
                <label>Task title<input name="title" required maxLength={160} /></label>
                <label>Description<textarea name="description" maxLength={5000} /></label>
                <label>Assignee<select name="assignedTo" required><option value="">Choose an assignee</option>{detail.members.map(member => <option key={member.userId} value={member.userId}>{member.username}</option>)}</select></label>
                <label>Reviewer<select name="reviewerId" required><option value="">Choose a reviewer</option>{detail.members.map(member => <option key={member.userId} value={member.userId}>{member.username}</option>)}</select></label>
                <label>Deadline (local time)<input name="deadline" type="datetime-local" required /></label>
                <button className="button button-blue">Assign task</button>
              </form>)}
          </section>
          {tasks.length === 0 && <p>No tasks assigned yet.</p>}
          {tasks.map(task => <section key={task.id} className="app-card">
            <h2>{task.title}</h2>
            <p>{task.description}</p>
            <p className="app-help">
              {task.status.replaceAll("_", " ")}{task.isOverdue ? " · Overdue" : ""} · Due {new Date(task.deadline).toLocaleString()}
            </p>
            <p className="app-help">Assignee: {detail.members.find(member => member.userId === task.assignedTo)?.username} · Reviewer: {detail.members.find(member => member.userId === task.reviewerId)?.username}</p>
            {task.submissionUrl && <a href={task.submissionUrl} target="_blank" rel="noreferrer">Open submission</a>}
            {task.assignedTo === profile.id && task.status === "assigned" && <form className="app-form mt-4" onSubmit={event => {
              const data = formData(event);
              void run(async () => {
                const focusAgreement = data.has("focus")
                  ? { allowedDomains: [], expiresAt: new Date(field(data, "expiresAt")).toISOString() }
                  : undefined;
                updateTask((await liveApi.accept(task.id, focusAgreement)).task);
              });
            }}>
              <label><span><input name="focus" type="checkbox" /> Let my Chrome extension block selected sites when overdue</span></label>
              <label>Focus agreement expiration (local time, required if enabled)<input name="expiresAt" type="datetime-local" /></label>
              <button className="button button-blue">Accept task</button>
            </form>}
            {task.assignedTo === profile.id && (task.status === "accepted" || task.status === "changes_requested") && <form className="app-form mt-4" onSubmit={event => {
              const data = formData(event);
              void run(async () => updateTask(await liveApi.submit(task, field(data, "url"))));
            }}>
              <label>Work link (HTTPS)<input name="url" type="url" placeholder="https://…" required /></label>
              <button className="button button-blue">Submit work</button>
            </form>}
            {task.reviewerId === profile.id && task.status === "submitted" && <div className="app-actions mt-4">
              <button type="button" className="button button-blue" onClick={() => run(async () => updateTask(await liveApi.review(task, "approve")))}>Approve</button>
              <button type="button" className="button button-white" onClick={() => run(async () => updateTask(await liveApi.review(task, "request_changes")))}>Request changes</button>
            </div>}
          </section>)}
        </>}
      </fieldset>}
    </main>
  </div>;
}
