# Field Survey Tracker v6 - Multi-file Refactor

ສະບັບນີ້ແຍກ `index.html` ໄຟລ໌ດຽວ ອອກເປັນໂຄງສ້າງຫຼາຍໄຟລ໌ ເພື່ອໃຫ້ແກ້ງ່າຍ ແລະ ກວດບັນຫາໄດ້ຖືກຈຸດ.

## Structure

```text
index.html
css/app.css
js/config.js
js/utils.js
js/cache.js
js/ui.js
js/auth.js
js/realtime.js
js/mapService.js
js/dataService.js
js/exportService.js
js/listView.js
js/dashboard.js
js/adminUsersTeams.js
js/navigation.js
js/modal.js
js/locationService.js
js/photoService.js
js/app.js
sql/*.sql
```

## ຈຸດປະສົງ

- ຢຸດການ patch ໃນ `index.html` ໄຟລ໌ດຽວ
- ແຍກ auth/logout/cache/data/users/teams/map/dashboard ໃຫ້ຊັດ
- ຮັກສາ logic ເກົ່າໄວ້ກ່ອນ ບໍ່ລຶບຂໍ້ມູນ
- ພ້ອມໃຫ້ແກ້ຂັ້ນຕໍ່ໄປແບບມືອາຊີບ

## Deploy

Upload/replace ໂຄງສ້າງນີ້ໃນ GitHub repo ແລ້ວ Cloudflare Pages ຈະ deploy ຈາກ `index.html`.

## ຂໍ້ຄວນລະວັງ

ສະບັບ v6.0 ນີ້ເປັນ refactor ແຍກໄຟລ໌ກ່ອນ. ຍັງບໍ່ແມ່ນ rewrite ໃໝ່ທັງໝົດ. ຂັ້ນຕໍ່ໄປຄວນປັບ `auth.js`, `cache.js`, `dataService.js` ໃຫ້ stable ກວ່າເກົ່າ.
