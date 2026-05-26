# Tracker FE

Vite + React + TypeScript frontend for the Tracker-BE v1 API.

## Routes

- `/dashboard`
- `/tasks`
- `/planning`
- `/matrix`
- `/calendar`
- `/settings`
- `/import`
- `/errors`

## Setup

```bash
npm install
npm run dev
```

The API base URL is read from `VITE_API_BASE_URL` and defaults to
`http://localhost:8080`.

```bash
cp .env.example .env
```

## Validation

```bash
npm run build
```
