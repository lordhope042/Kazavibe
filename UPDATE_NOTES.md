# Timetable Generator — UI & Refactor Update

## What changed

- Consolidated admin and student dashboard styling into one shared `public/assets/css/app.css` design system.
- Removed duplicated Google Fonts dependencies; the UI now uses system fonts for a lighter, faster package.
- Redesigned the admin/student navigation with grouped sections and a mobile slide-out sidebar.
- Added shared mobile navigation JavaScript in `public/assets/js/app.js`.
- Refined cards, forms, tables, buttons, badges, alerts and responsive layouts.
- Added a visual timetable grid when an admin selects a specific class group; the existing management list remains available for actions.
- Added clearer confirmations for generate, regenerate, publish, combine and swap operations.
- Added button locking during timetable API requests to reduce accidental double submissions.
- Added CSRF protection to timetable APIs and normal POST forms.
- Regenerating/generating/publishing keeps the existing scheduling logic intact.
- Regenerated admin sidebar structure so scheduling, academic setup and system tools are easier to find.
- Simplified the student sidebar into Home, Academic, Updates and Account groups.
- Refreshed the public landing page and removed the unsupported `100% Conflict-Free` claim.
- Lightweight preview CSS now reuses the actual application styles instead of duplicating them.
- Added login-time session ID regeneration and a fresh CSRF token after successful authentication.

## Preserved

The existing timetable generation engine and its scheduling concepts were not replaced. Existing generation, regeneration, locking, moving, swapping, alternatives, combining, publishing, conflict logging and student timetable functionality remain in place.

## Validation

- All 44 PHP files pass `php -l` syntax checks.
- Public landing page was smoke-tested through PHP's built-in server.
- Shared CSS assets were smoke-tested through the same server.
- The registration page still requires the configured MySQL database because it loads class-group data during page rendering.

## Latest UI/structure update
- Admin Courses now separates each academic cohort into First Semester and Second Semester tabs.
- Cohorts remain separated as ND 100, ND 200, HND NCC 300/400 and HND SWD 300/400.
- Student registration now uses a responsive split-screen branded layout.
- Student login now uses the same visual system and responsive layout.
- Existing registration/login authentication and level-detection logic was preserved.


Theme update: the application now uses a consistent light-only color scheme. Dark-mode styles, system dark-mode overrides, theme toggle injection, and saved theme preference logic have been removed.
