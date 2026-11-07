[GroupLock_README.md](https://github.com/user-attachments/files/34529543/GroupLock_README.md)
# GroupLock

GroupLock is a collaborative productivity platform designed to make group projects more organized, accountable, and focused. It brings task management, deadlines, peer reviews, an XP leaderboard, and a Chrome extension together in one place.

**Website:** https://indyhackers-c-h-a-r.vercel.app  
**Repository:** https://github.com/ccbouchachi-lgtm/indyhackers-C.H.A.R

## Why GroupLock?

Group projects often come with missed deadlines, uneven workloads, and limited visibility into who has completed their work. GroupLock helps teams set clear expectations, track contributions, and stay accountable without having to manage everything across separate tools.

## Features

- **Groups and tasks:** Organize teammates, assign responsibilities, and set deadlines.
- **Task submissions and peer review:** Submit work and have it reviewed by the assigned reviewer.
- **XP leaderboard:** Recognize contributions and encourage participation through a points-based leaderboard.
- **Opt-in focus mode:** Select distracting websites to restrict if an accepted task becomes overdue.
- **Chrome extension:** Pair an account with the extension to keep focus restrictions in sync with task status.

## How Focus Mode Works

GroupLock connects focus restrictions to deadlines that users have agreed to.

1. A user accepts a task with a deadline.
2. The user opts into focus mode and selects websites to block.
3. The user pairs the Chrome extension with their GroupLock account.
4. If the deadline passes before the task is submitted, the extension activates the selected website restrictions.
5. When the user submits the task, the restriction is removed at the next sync, even if the reviewer has not yet approved the work.

The extension checks focus status approximately every 30 seconds. Its separate manual blocking controls can also be used without a deadline-triggered restriction.

## Leaderboard and Accountability

GroupLock's XP leaderboard makes contributions visible and adds a friendly competitive element to group work. Teammates can track progress as tasks are completed and reviewed. The backend enforces reviewer permissions so submissions cannot be approved by just anyone.

## Built With

| Component | Technologies |
| --- | --- |
| Web application | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Authentication and database | Supabase, PostgreSQL |
| Chrome extension | JavaScript, Chrome Extension APIs |
| Deployment | Vercel |
| Version control | Git, GitHub |

## Architecture

GroupLock consists of three connected components:

1. **Web application:** Provides account sign-in, groups, tasks, deadlines, submissions, and leaderboard views.
2. **Backend and database:** Stores application data in Supabase and checks authentication and permissions. A database trigger creates a GroupLock profile when a user signs up.
3. **Chrome extension:** Uses an account-specific pairing credential to request focus status from the backend and apply or remove selected website restrictions.

The extension communicates with the backend rather than accessing privileged Supabase credentials directly.

## Getting Started

### Prerequisites

- Node.js and npm
- A development Supabase project
- Google Chrome for extension testing

### Run the web application

Clone the repository and install dependencies:

```bash
git clone https://github.com/ccbouchachi-lgtm/indyhackers-C.H.A.R.git
cd indyhackers-C.H.A.R/grouplock
npm install
```

Create a `.env.local` file with the Supabase configuration required by the application. For example:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

Check the app's Supabase client configuration for the exact environment variable names, and set up the required database schema, policies, and profile trigger in your development project. Never commit `.env.local` or service-role keys.

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Load the Chrome extension

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the extension directory containing `manifest.json`.
5. Open the extension and enter the running backend URL and your account pairing credential.
6. Pair the extension with your GroupLock account.

Live pairing requires a running backend connected to the development Supabase project. Do not enter private database keys into the extension.

### Run application checks

From the `grouplock` directory:

```bash
npm run lint
npm run build
```

## Demo Walkthrough

1. Create an account and sign in.
2. Create or join a group and assign a task with a deadline.
3. Accept the task and opt into focus mode.
4. Pair the Chrome extension and select websites to restrict.
5. Demonstrate website blocking when the task becomes overdue.
6. Submit the task and observe the restriction lift after the next sync.
7. Review the submission as the designated reviewer.
8. Visit the leaderboard to see team progress.

## Security and Design

- Focus restrictions are opt-in and tied to accepted tasks.
- The backend checks user permissions before accepting protected actions, including submission approvals.
- The extension uses a pairing credential instead of requiring the user's password or private Supabase keys.
- Focus status is synchronized with the backend, so submitting a task clears deadline-based restrictions without waiting for a review decision.
- Chrome extensions can be disabled or removed by the user. GroupLock is intended as an accountability tool rather than a device-level lock.

## Future Improvements

We plan to explore more nuanced XP rewards based on task difficulty, deeper productivity insights, and additional safeguards for fair peer reviews.

## About

GroupLock was built for Indy Init 2026 to make collaborative projects easier to manage and more rewarding for everyone involved.
