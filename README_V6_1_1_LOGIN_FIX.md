# v6.1.1 Login Fix

This frontend-only patch fixes a login blocking issue caused by `auth.js` loading before the services it calls (`teardownRealtime`, `initMap`, `loadAll`, `setupRealtime`).

## Changed
- Moved `js/auth.js` to load after realtime/map/data/admin/navigation/modal services.
- Added defensive checks in `auth.js` before calling service functions.
- Updated app version badge to `v6.1.1-login-fix`.

## Deploy
Upload all frontend files to GitHub/Cloudflare. No SQL changes required.
