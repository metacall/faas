# MetaCall FaaS — UI Dashboard

A local developer dashboard for the [MetaCall FaaS](https://github.com/metacall/faas) platform, built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**.

It lets you deploy, inspect, invoke, and observe your MetaCall functions — all from a clean web interface running alongside the local FaaS server.

---

## Features

| Area | What you can do |
|---|---|
| **Dashboard** | Live server-status indicator, deployment summary, quick-action cards |
| **Deployments** | Table of all active deployments with status badges and per-function drill-down |
| **Deploy Hub** | Choose between package upload or Git repository deployment |
| **Package Wizard** | Step-by-step wizard — drag-and-drop ZIP → validate → deploy |
| **Repository Deploy** | Clone a GitHub/GitLab repo, pick a branch, deploy with one click |
| **Deployment Detail** | Browse all exposed functions, invoke them live with the built-in tester |
| **Logs Viewer** | Real-time log streaming per deployment, auto-scroll, copy support |
| **Settings** | Server URL, auth token, environment configuration |
| **Plans** | Subscription plan overview (billing mock) |
| **Assistant** | Floating AI chat panel |

---

## Tech Stack

| | |
|---|---|
| **Framework** | React  |
| **Language** | TypeScript  |
| **Bundler** | Vite |
| **Styling** | Tailwind CSS |
| **Routing** | React Router |
| **Icons** | Lucide React |
| **HTTP** | Axios |
| **Auth** | JWT via `localStorage` |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20.1.0
- npm ≥ 10.0.0
- A running MetaCall FaaS server (default: `http://localhost:9000`)

### 1. Install dependencies

```bash
cd faas/ui
npm install
```

### 2. Configure environment

```bash
cp .env .env.local
```

Edit `.env.local`:

```env
# URL of your local FaaS server
VITE_FAAS_URL=http://localhost:9000

# Optional: pre-set a JWT token so you skip the login screen in dev
VITE_FAAS_TOKEN=<your-jwt-token>
```

### 3. Start the dev server

```bash
npm run dev
```

The UI will be available at **http://localhost:5173**.

> The FaaS backend must be running separately. See [`faas/README.md`](../README.md) for backend setup.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check and build for production (`dist/`) |
| `npm run lint` | Run ESLint |
| `npm run preview` | Serve the production build locally |

---

## Project Structure

```
faas/ui/
├── public/              # Static assets
├── src/
│   ├── api/
│   │   └── client.ts    # Typed Axios API client (all FaaS endpoints)
│   ├── components/
│   │   ├── layout/      # AppShell, Navbar, Sidebar, Footer
│   │   └── ui/          # Button, Card, Badge, Spinner, DropZone, etc.
│   ├── hooks/           # useServerStatus, custom React hooks
│   ├── pages/           # One file per route/page
│   ├── types/           # Shared TypeScript types
│   ├── App.tsx          # Router + auth guard
│   └── main.tsx         # Entry point
├── .env                 # Default environment variables
├── vite.config.ts
└── package.json
```

---

## Authentication

The UI uses **JWT bearer tokens**. On first visit you are redirected to `/login`. Tokens are stored in `localStorage` under the key `faas_token`.

For local development, set `VITE_FAAS_TOKEN` in `.env.local` to skip the login screen entirely.

---

## Connecting to the Backend

All API calls go through `src/api/client.ts`. The base URL is read from `VITE_FAAS_URL` at build time. The client attaches the JWT automatically to every request.

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for branch conventions, code style, commit format, and the pull request process.

---

## License

Apache 2.0 — see [LICENSE](../../faas/LICENSE).
