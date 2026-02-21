# Hot Leads Frontend

React + Vite + Clerk + Tailwind frontend for the Hot Leads platform. Dashboard to search by city and healthcare specialty and view sortable hot leads with CSV export.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set:

   - `VITE_API_URL` – backend API base URL (e.g. `http://localhost:8000`)
   - `VITE_CLERK_PUBLISHABLE_KEY` – Clerk publishable key

3. Run the dev server:

   ```bash
   npm run dev
   ```

## Build

```bash
npm run build
```

Output is in `dist/`. Deploy to Vercel with build command `npm run build` and output directory `dist`.

This repository is intended to be used as a **standalone Git repository**. Clone or push it to its own remote (e.g. `github.com/yourorg/hotlead-frontend`).
