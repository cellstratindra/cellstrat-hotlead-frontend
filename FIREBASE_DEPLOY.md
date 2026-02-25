# Firebase Hosting deploy (SPA)

## Fix for "Page Not Found" on `/dashboard`, back button, or deep links

This app is a **Single Page Application (SPA)**. Routes like `/dashboard`, `/my-leads`, `/coverage`, `/settings` are handled by React Router in the browser. Firebase Hosting must serve `index.html` for those paths so the app can load and then route.

**`firebase.json`** is already configured with:

- **public:** `dist` (Vite build output)
- **rewrites:** `"**" → "/index.html"` so every request that doesn’t match a static file gets the SPA shell.

## Deploy steps (required)

1. **From this directory** (the frontend app folder):
   ```bash
   npm run build
   firebase deploy
   ```
   Or in one step:
   ```bash
   npm run deploy
   ```

2. **Always run `npm run build` before deploy.**  
   If you deploy without building, or from the wrong folder, `dist/` may be missing or stale and Firebase may serve a 404 for deep links.

3. **Run Firebase from this directory.**  
   If you run `firebase deploy` from the repo root, Firebase may use a different or missing config; the rewrite rule lives in this folder's `firebase.json`.

## After deploy

- `https://your-app.web.app/` and `https://your-app.web.app/dashboard` (and any other route) should return the same HTML (the SPA), so the back button and direct links work.
- If you still see the Firebase "Page Not Found" page, clear cache and redeploy using the steps above.
