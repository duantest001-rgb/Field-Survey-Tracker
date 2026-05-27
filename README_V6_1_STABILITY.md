# Field Survey Tracker v6.1 Stability Patch

This package is frontend-only for GitHub / Cloudflare Pages deployment.

## What changed

1. `auth.js`
   - Checks `profiles.status` before showing the main app.
   - Blocks inactive/no-profile users from entering the app.
   - Clears local auth/session immediately during logout, then signs out from Supabase with timeout.

2. `cache.js`
   - Uses user/version-specific cache keys: `fst:<APP_VERSION>:<user_id>:partner/customer`.
   - Keeps legacy cache as fallback only.
   - Adds a visible banner when the app is showing Local Cache instead of Remote DB.

3. `permissions.js`
   - New central permission layer.
   - Admin / manager / staff logic is reused by list, map, delete, edit and create actions.

4. `dataService.js`
   - Separates Remote DB data from Local Cache data.
   - Filters cached data through the permission layer before showing it.
   - Stops rendering dashboard on every data load unless the dashboard page is open.

5. `realtime.js`
   - Adds debounce for realtime reloads to avoid repeated heavy rendering.

6. `dashboard.js`
   - Renders only when `currentView === 'dash'`.

## Deploy

Upload all files in this folder to the GitHub repository connected to Cloudflare Pages.
Do not upload SQL files into this frontend package.

After deploy, open Cloudflare URL and press `Ctrl + F5`.

## Important

Database security still depends on Supabase RLS. This frontend patch improves stability and UX, but RLS remains the final source of truth.
