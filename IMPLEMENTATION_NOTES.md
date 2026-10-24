# Implementation notes

- Added persistent light/dark theme toggle using localStorage and OS preference as initial default.
- Normalized conflict-check IDs to integers.
- Registration now validates CSRF, email, registration-number shape and confirms the submitted class group exists server-side. The existing registration-number-to-level logic remains client-assisted; production deployments should additionally validate against an official roster.
- Added academic session table and migration `database/migrations/2026_10_academic_sessions.sql`; student timetable now filters to the active session. Back up the database and apply the migration before using the updated student timetable against an existing database.
- Converted admin deactivation and department deletion to POST/CSRF patterns where legacy handlers matched; admin role creation/deactivation now checks super-admin permission. Review every destructive form before production.
- Generation/regeneration now start a transaction before deleting draft sessions and commit after persistence; persistence helper respects an outer transaction.
- Added dependency-free conflict regression tests in `tests/`.

Important: schema migration should be tested on a database backup first. Existing databases must apply the migration before using code that references `academic_session_id`. Automated tests and PHP syntax checks do not replace end-to-end browser/database testing.


Theme update: the application now uses a consistent light-only color scheme. Dark-mode styles, system dark-mode overrides, theme toggle injection, and saved theme preference logic have been removed.

Classroom update: SIWES and Project courses (SIW 219, COM 227, SWD 426, NCC 426) are no longer seeded or timetabled. Labs are removed (no lab rooms, no "requires lab" flag, no lab session type). Each class group has its own dedicated classroom (ND 1, ND 2, HND 1 SWD, HND 2 SWD, HND 1 NCC, HND 2 NCC) via `rooms.class_group_id`; the generator, alternatives finder and swap tool keep every class in its own room. Existing databases: back up, then import `database/migrations/2026_10_dedicated_classrooms.sql` (this clears existing timetable sessions — regenerate afterwards).
