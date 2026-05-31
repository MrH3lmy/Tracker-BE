# Task Priority Tracker Frontend

This package contains the Vite + React frontend for the task-priority tracker. It provides the browser UI for reviewing priorities, planning work, managing task data, and configuring tracker behavior.

## Product overview

The app is organized around the primary workflows in the task-priority tracker:

- **Dashboard**: card-based summary views for the current state of tracked tasks and priority signals.
- **Tasks**: the main task-management workspace, including an Excel-like task grid for scanning, editing, and organizing task records.
- **Planning**: focused planning tools for today and weekly prioritization.
- **Matrix**: priority-matrix views for comparing urgency, importance, and related scoring dimensions.
- **Calendar**: calendar-oriented task planning and schedule review.
- **Settings**: configuration for tracker behavior and prioritization rules.
- **Import**: tools for bringing task data into the tracker.

## Local development

Run commands from the `frontend/` directory:

```bash
npm run dev
```

Starts the Vite development server with hot module replacement.

```bash
npm run build
```

Runs the TypeScript build and creates a production Vite build.

```bash
npm run lint
```

Runs ESLint across the frontend source tree.

```bash
npm run preview
```

Serves the production build locally for previewing.

## Environment configuration

The frontend API client reads the following Vite environment variable:

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL prepended to API paths in `src/apiClient.ts`. Leave unset or set to an empty string to use same-origin API requests, or set it to a backend origin such as `http://localhost:8000` when the API runs separately. |

Example `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Because this is a Vite app, the variable must use the `VITE_` prefix to be exposed to browser code.

## UI architecture

- Routes are declared in `src/router/routes.tsx`, which defines the app tabs and page components.
- API query and mutation hooks live in `src/hooks/useApiQueries.ts` and wrap the shared API client with React Query.
- Global styling lives in `src/App.css` and `src/index.css`, including app-wide design tokens, layout primitives, and baseline element styles.

## Design direction

- A **responsive app shell** should keep navigation and core actions usable across desktop and smaller screens.
- The Tasks experience should continue toward an **Excel-like task grid** optimized for dense task review and quick edits.
- Dashboard and tool pages should use **card-based layouts** for readable summaries, focused controls, and progressive disclosure of details.
