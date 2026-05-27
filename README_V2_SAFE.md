# Field Survey Tracker v2 Safe Patch

## What changed

1. Added Backup JSON button in the top bar.
2. Added Backup / Recovery panel in Admin.
3. Prevented local cache from being overwritten by accidental empty server responses.
4. Added soft-delete support using `deleted_at` and `deleted_by` when the database migration is installed.
5. Added fallback for old schemas that do not yet have `deleted_at` or `updated_at`.
6. Changed update logic so `created_by` is not overwritten when editing existing records.
7. Added phone call and Google Maps quick actions in list cards.
8. Added temporary admin bootstrap fallback while migrating. Long term, admin should come from the `admins` table and RLS policies.

## First safe steps

1. Deploy/open the patched `index.html`.
2. Login as admin.
3. Immediately click **Backup** and save the JSON file.
4. Run `supabase_safe_migration.sql` in Supabase SQL Editor.
5. Refresh the app and test: list, map, add, edit, delete, backup.

## Important about disappeared data

If data was truly deleted from Supabase and there is no database backup, it cannot be recovered by the app. If data only disappeared because of RLS, missing `created_by`, wrong admin policy, or cache overwrite, this patch and SQL migration are designed to make it visible again and prevent future accidental disappearance.
