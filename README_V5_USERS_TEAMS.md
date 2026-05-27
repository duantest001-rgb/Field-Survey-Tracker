# Field Survey Tracker v5 — Users & Teams

## What changed
- Added Admin > Users & Roles screen.
- Added Admin > Teams screen.
- Admin can update user role, team, and active/inactive status from the web app.
- New registered users default to `staff` + `inactive` until admin activates them.
- Team-based RLS added:
  - admin: all data
  - manager: own team data + assigned/created records
  - staff: own/assigned records

## Setup
1. Run `supabase_v5_users_teams_migration.sql` in Supabase SQL Editor.
2. Replace `index.html` in GitHub with this v5 file.
3. Commit and let Cloudflare Pages deploy.
4. Open app, logout/login, then go to Admin > Users & Roles.

## User onboarding
1. Staff registers/logs in with email.
2. Admin opens Users & Roles.
3. Admin sets role, team, and status = active.

## Notes
- Do not create auth users from the frontend; Supabase Auth registration creates the user.
- Admin can only manage users that already exist in Supabase Auth/profile.
