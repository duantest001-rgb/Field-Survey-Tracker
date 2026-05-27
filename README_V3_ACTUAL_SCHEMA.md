# Field Survey Tracker v3 - Actual Schema Safe Migration

This package is based on the database inspection CSVs you exported from Supabase.

Current inspected database:
- Tables: admins, audit_logs, customers, partners, profiles
- Data count: admins=1, partners=2, customers=0, profiles=0
- Important issue: current partners/customers RLS policies are open (`true`) for select/insert/update/delete.
- Important issue: admins table does not have `email` yet.

## What to do

1. Do not run old migration files again.
2. Backup existing `partners` data first from Supabase Table Editor or SQL result CSV.
3. Run `supabase_safe_migration.sql` from this package.
4. Run the verification queries at the bottom of that SQL.
5. Deploy `index.html` only after the SQL succeeds.

This migration is non-destructive: it does not drop or truncate existing app data.
