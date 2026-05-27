# Field Survey Tracker v6 - Frontend Only

ຊຸດນີ້ແມ່ນສຳລັບ deploy ໃນ GitHub / Cloudflare Pages ເທົ່ານັ້ນ.

## ມີໃນຊຸດນີ້

```text
index.html
css/app.css
js/*.js
docs/FILE_MAP.md
```

## ບໍ່ມີໃນຊຸດນີ້

- SQL migration
- Supabase database scripts

SQL ແຍກໄວ້ຄົນລະຊຸດ ເພາະບໍ່ຄວນ upload ໄປ Cloudflare Pages ປົນກັບ frontend.

## ວິທີນຳໃຊ້

1. Upload/replace `index.html`, `css/`, `js/`, `docs/` ໃນ GitHub repo.
2. Commit changes.
3. ລໍ Cloudflare Pages deploy.
4. ເປີດเว็บແລ້ວ hard refresh: `Ctrl + F5`.

## ໂຄງສ້າງ JS

- `js/auth.js` = login/logout/session/role
- `js/cache.js` = local cache / recovery helpers
- `js/dataService.js` = partners/customers CRUD
- `js/adminUsersTeams.js` = users/teams/roles
- `js/mapService.js` = map/markers
- `js/dashboard.js` = dashboard/charts
- `js/app.js` = app init/version badge
