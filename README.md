[README (1).md](https://github.com/user-attachments/files/34529491/README.1.md)
<div align="center">

# 🔒 GroupLock

### Make commitments. Stay focused. Get it done—together.

**A collaborative productivity platform that makes group projects more accountable, fair, and rewarding.**

GroupLock combines shared tasks, deadlines, peer reviews, an XP leaderboard, and a Chrome extension that helps teammates follow through on the commitments they make.

[**🌐 Try GroupLock**](https://indyhackers-c-h-a-r.vercel.app) · [**💻 View Source**](https://github.com/ccbouchachi-lgtm/indyhackers-C.H.A.R)

*Built for Indy Init 2026.*

</div>

---

## 💡 Why GroupLock?

We've all had *that* group project: someone misses a deadline, another person picks up the slack, and everyone receives the same credit.

GroupLock was created to make teamwork more transparent and motivating. Instead of just listing what needs to get done, it connects **individual responsibility**, **team feedback**, and **focus tools** in one place.

Our idea is simple: **when everyone knows what they committed to—and has the tools to follow through—the whole team wins.**

## ✨ Features

| Feature | What it does |
| --- | --- |
| **👥 Groups & collaboration** | Organize teammates around shared projects and responsibilities. |
| **✅ Tasks & deadlines** | Assign work, accept responsibilities, and track upcoming deadlines. |
| **📤 Submissions & peer review** | Submit completed work and let the designated reviewer approve contributions. |
| **🏆 XP leaderboard** | Recognize participation and approved work with points and friendly competition. |
| **🔒 Opt-in focus mode** | Choose distracting websites to block if you miss a deadline on a task you've accepted. |
| **🧩 Chrome extension** | Pair your account and automatically check whether your focus restriction should be active. |

## ⚡ How Focus Mode Works

GroupLock's focus rules are tied to **deadlines you explicitly agree to**, not an arbitrary timer.

1. **Accept a task** with a deadline in your GroupLock group.
2. **Opt into focus mode** and choose the websites you want to restrict.
3. **Pair the Chrome extension** with your signed-in GroupLock account.
4. **Miss the deadline?** If the task is still unsubmitted, the extension activates your selected website blocks.
5. **Submit your work.** On the next status sync, the deadline-based restriction is removed—even if your reviewer hasn't approved the submission yet.

The extension checks focus status approximately every **30 seconds**, so updates may not be instantaneous. Manual site-blocking controls are available separately.

> **Your choice matters:** Deadline-based blocking only applies when a task is accepted, focus mode is enabled, and its deadline has passed without a submission.

## 🏆 Making Contributions Count

GroupLock's **XP leaderboard** adds a little friendly competition to group work. Members can see their progress and receive recognition for contributions reviewed by their teammates.

The goal isn't just to reward speed—it's to make work visible and encourage participation. Task approvals are handled by authorized reviewers, rather than allowing anyone to approve their own work.

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| **Web application** | Next.js, React, TypeScript |
| **Styling** | Tailwind CSS |
| **Authentication & data** | Supabase, PostgreSQL |
| **Extension** | JavaScript, Chrome Extension APIs |
| **Deployment** | Vercel |
| **Collaboration** | Git & GitHub |

## 🏗️ Architecture

```text
                       ┌────────────────────────┐
                       │   GroupLock Website    │
                       │     Next.js / React    │
                       └────────────┬───────────┘
                                    │
                        Sign-in, groups, tasks,
                        deadlines, submissions
                                    │
                       ┌────────────▼───────────┐
                       │    Backend / API       │
                       │  Auth & permission     │
                       │        checks          │
                       └─────────┬────┬─────────┘
                                 │    │
                     ┌───────────▼┐  ┌▼──────────────────┐
                     │  Supabase  │  │  Chrome Extension │
                     │ PostgreSQL │  │  Pairing + status │
                     │            │  │      polling      │
                     └────────────┘  └───────────────────┘
```

Supabase stores account profiles, groups, tasks, deadlines, and submissions. A database trigger creates a matching GroupLock profile when a new account signs up. The backend verifies signed-in users and their permissions, including which reviewer can approve a submission.

The Chrome extension uses an **account-specific pairing credential** to request the current focus status from the backend. It never needs your Supabase service-role key.

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- A Supabase project for authentication and data
- Google Chrome, if you want to test the extension

### 1. Run the web app

```bash
git clone https://github.com/ccbouchachi-lgtm/indyhackers-C.H.A.R.git
cd indyhackers-C.H.A.R/grouplock
npm install
```

Create a `.env.local` file with the Supabase settings required by the app. A typical local configuration looks like:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
```

> Check the project's Supabase client configuration for the exact variable names it expects. Configure the required database tables, access policies, and sign-up profile trigger in your development Supabase project. **Never commit `.env.local` or private service-role keys.**

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 2. Install the Chrome extension

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Choose the extension source directory containing `manifest.json`.
5. Open the extension, enter your running backend URL and account pairing credential, and select **Pair account**.

> Real account pairing requires a running backend connected to the appropriate Supabase project. Do not paste private Supabase keys into the extension.

### 3. Check the web app

From the `grouplock` directory:

```bash
npm run lint
npm run build
```

## 🎬 Demo Walkthrough

1. **Create an account** and sign in to GroupLock.
2. **Create or join a group** and assign a task with a deadline.
3. **Accept the task** and opt into focus mode.
4. **Pair the extension** and select websites to restrict.
5. **Let the task become overdue** to demonstrate automatic blocking.
6. **Submit your work** and watch the restriction disappear after the next sync.
7. **Review the submission** as the assigned reviewer.
8. **Open the leaderboard** to see how the team is progressing.

## 🔐 Security & Design Choices

- **Opt-in restrictions:** Focus-mode blocks depend on an accepted task and an explicit opt-in.
- **Permission-aware reviews:** The backend checks whether the current user can approve a submission.
- **Paired accounts:** The extension uses a dedicated pairing credential instead of storing a user's password or private database keys.
- **Graceful sync behavior:** The extension accounts for revoked credentials, expired restrictions, and temporary backend unavailability.
- **Submission ends the block:** A teammate shouldn't have to wait for reviewer approval just to regain access to their selected websites.

Chrome extensions can be disabled or removed by the user; GroupLock is designed as an accountability aid, not an unbreakable device lock.

## 🌱 What's Next?

We'd love to keep improving GroupLock with smarter point balancing for task difficulty, richer team productivity insights, and safeguards that make peer reviews even fairer.

## 💜 Built at Indy Init 2026

Made to turn stressful group projects into a more focused, fair, and collaborative experience.

**GroupLock — your deadlines, your team, your accountability.**
