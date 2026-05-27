# File Responsibility Map

| File | Responsibility |
|---|---|
| `css/app.css` | style, Lao font, responsive layout |
| `js/config.js` | Supabase config, app version, global state/constants |
| `js/utils.js` | escaping, validation, table helpers |
| `js/cache.js` | offline events, localStorage cache, backup cache helpers |
| `js/ui.js` | toast and common UI feedback |
| `js/auth.js` | auth state, login, register, logout, role check |
| `js/realtime.js` | Supabase realtime subscriptions |
| `js/mapService.js` | Leaflet map, markers, GPS map view |
| `js/dataService.js` | load/save/delete/upload records |
| `js/exportService.js` | Excel/JSON export/import backup |
| `js/listView.js` | records list rendering and search highlight |
| `js/dashboard.js` | dashboard charts and counters |
| `js/adminUsersTeams.js` | admin panel, profiles, teams, role/status/team assignment |
| `js/navigation.js` | tab/view switching and dashboard/admin navigation |
| `js/modal.js` | add/edit modal, status selector, dynamic fields |
| `js/locationService.js` | current GPS and map picking for modal |
| `js/photoService.js` | photo preview and modal event listeners |
| `js/app.js` | app-level init/version badge |
