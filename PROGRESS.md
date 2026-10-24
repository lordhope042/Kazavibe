# Progress Tracker — CS Department Timetable Generator (HAFED POLY, Kazaure)

Last updated: 2026-08-19 (unified login + student registration added)

## Goal
A web-based system (HTML/CSS/JS/PHP/MySQL, XAMPP) that auto-generates
conflict-free timetables for the CS department's 6 class groups, with an
admin side (full control) and a student side (view-only).

---

## ✅ Done

### Database
- [x] `database/schema.sql` — 15 tables, full relationships
- [x] `class_groups` uses real structure: `program` (ND/HND), `level`
      (100/200/300/400), `specialization` (SWD/NCC, HND only)
- [x] `database/seed.sql` — real course data for all 6 class groups
      (ND 100, ND 200, HND 300/400 SWD, HND 300/400 NCC), 3 sample students

### Auth
- [x] Admin login/logout (`admin/login.php`, `admin/logout.php`)
- [x] Student login/logout (`student/login.php`, `student/logout.php`)
- [x] Session helpers, activity logging (`includes/auth.php`)
- [x] **Unified login page** (`auth/login.php`) — role tabs (Student | Admin),
      one URL for both, old `admin/login.php` / `student/login.php` now
      redirect here for backward compatibility
- [x] Student self-registration (`auth/register.php`) — admin accounts are
      still created via the admin Users & Roles page, not self-registration

### Scheduling engine
- [x] `includes/functions/timetable_functions.php`
      — greedy generator, hard-constraint conflict checker
        (lecturer / class / room / break), find-alternatives,
        lock-aware regeneration

### API endpoints (`api/`)
- [x] `generate.php` — build draft timetable for a semester
- [x] `regenerate.php` — rebuild while preserving locked sessions
- [x] `publish.php` — draft → published, notifies students
- [x] `swap.php` — exchange two sessions' room/time
- [x] `move.php` — apply a chosen alternative slot
- [x] `lock.php` — lock/unlock a session
- [x] `combine.php` — merge matching sessions across class groups
- [x] `alternative.php` — find valid alternative slots (read-only)

### Admin pages (`admin/`)
- [x] Dashboard (`index.php`) — stat cards, timetable preview, activity feed
- [x] Courses (`pages/courses.php`) — full CRUD
- [x] Lecturers (`pages/lecturers.php`) — full CRUD
- [x] Classrooms (`pages/classrooms.php`) — full CRUD
- [x] Class Groups (`pages/class_groups.php`) — read-only overview
- [x] Timetable (`pages/timetable.php`) — generate/regenerate/publish,
      per-session lock/find-alternative, combine/swap via checkboxes,
      wired live to the API
- [x] Conflicts (`pages/conflicts.php`) — view + mark resolved
- [x] Reports (`pages/reports.php`) — printable/exportable view by
      class group, lecturer, or classroom, with print-to-PDF via browser
- [x] Settings (`pages/settings.php`) — system overview, admin password change
- [x] Users & Roles (`pages/users_roles.php`) — create/deactivate admin accounts
- [x] `assets/css/admin.css` — HAFED POLY red/green/white theme

### Student pages (`student/`)
- [x] Dashboard (`index.php`)
- [x] `assets/css/student.css`

### Student pages (`student/`)
- [x] Dashboard (`index.php`)
- [x] My Timetable (`pages/my_timetable.php`) — full weekly view, session legend
- [x] My Courses (`pages/my_courses.php`) — registered courses
- [x] My Lecturers (`pages/my_lecturers.php`)
- [x] Exams (`pages/exams.php`) — reads `academic_calendar` where event_type='exam'
- [x] Announcements (`pages/announcements.php`)
- [x] Academic Calendar (`pages/academic_calendar.php`)
- [x] Notifications (`pages/notifications.php`) — mark as read
- [x] Profile (`pages/profile.php`) — view info, change password
- [x] Settings (`pages/settings.php`) — lightweight, links to profile
- [x] `assets/css/student.css` — extended with shared component styles
      (panels, buttons, forms, alerts, badges, legend, announcement list)

### Public
- [x] Landing page (`public/index.php`, `assets/css/landing.css`)

### Seed data additions
- [x] `time_slots` — Mon–Fri, 8am–4pm hourly, 1–2pm break (matches mockup)
- [x] Sample rooms (Rm 201–205, Lab 1–2) — still placeholders, replace
      with real HAFED POLY CS department rooms when known

---

## 🚧 Not built yet

Every sidebar link (admin and student) now has a matching page.
What's left is data and hardening, not missing pages.

### Data / setup
- [ ] Real lecturer list (names only exist as sample/placeholder so far)
- [ ] Real room/lab list for HAFED POLY CS department (current rooms
      are placeholders: Rm 201-205, Lab 1-2)
- [ ] Real student roster beyond the 3 sample students
- [ ] `admin/pages/conflicts.php` and `admin/pages/reports.php` were NOT
      given department scoping in this pass — Conflicts shows every
      department's conflicts mixed together, Reports' class-group/lecturer/
      classroom filters implicitly narrow enough that it's usable but not
      explicitly department-aware. Low priority since conflicts_log has no
      structured department link yet (would need adding). Revisit once a
      second real department actually exists.
- [ ] Admin dashboard (`admin/index.php`) still shows global stats across
      all departments rather than being department-scoped — reasonable as
      a "super admin" overview for now, but worth revisiting once there
      are multiple real departments with meaningfully different data.
- [ ] Announcements / academic_calendar sample content — tables exist
      and pages read them, but no rows are seeded yet
- [ ] Course registrations for the 3 sample students — `course_registrations`
      table is empty, so My Courses / My Lecturers pages will show
      nothing until rows are added
- [x] Downloads (PDF export of timetable/exam schedule/calendar/registration
      slip) — implemented via browser print-to-PDF (same pattern as admin
      Reports page), buttons on My Timetable, My Courses, Exams, Academic
      Calendar, plus a Downloads panel on the student dashboard linking to all four
- [x] Renamed "matric number" to "Registration Number" (`reg_no`) throughout
      the schema, seed data, auth logic, and every UI label/placeholder —
      matches the real registration slip terminology
- [x] Redesign extended to all 9 student pages (dashboard + 8 sub-pages)
      via `student.css` — same parchment/seal/ledger system as auth/landing,
      same class names so no PHP markup changes were needed
- [x] Fixed a real bug: both admin and student sidebars used relative paths
      (`../public/...`, `pages/...`) for the logo and nav links, which only
      resolved correctly from `index.php`. Every page under `*/pages/*.php`
      had a broken logo and broken nav links. Rewrote both sidebars to use
      absolute `BASE_URL`-anchored paths, and added dynamic "active" state
      detection (previously hardcoded to always highlight Dashboard)
- [x] Students can now log in with either their registration number OR
      their email (previously reg no only); `studentLogin()` matches either
      column. Login page tries admin first then student when an email is
      entered, since email is now ambiguous between the two roles
- [x] Registration form: typing a registration number auto-detects the
      program/specialization from its prefix (ND/CS, HND/SWD, HND/NCC) via
      JS, and replaces the flat 6-option Class Group dropdown with a
      filtered "Level" dropdown showing only that program's valid levels
- [x] Reworked further: Level is no longer a manual selection at all — it's
      fully auto-derived (read-only display) from the reg no's entry-year
      suffix via a new editable mapping, `config/intake_levels.php`.
      **Registration is never blocked** — every valid reg-no format can
      register. "Finished" cohorts (ND 20/21/22) get assigned their final
      level (200) with a friendly reminder banner, not a block. Any
      unmapped year falls back to the program's default level with an
      "unconfirmed, check with admin" notice, also non-blocking. Current
      confirmed mapping: ND 20/21/22 → 200 (finished, reminder shown),
      23 → 200, 24/25 → 100 (school skipped a 24 intake, merged into 25).
      HND mirrors the same pattern onto 300/400 but hasn't been explicitly
      reconfirmed — see comments in `config/intake_levels.php`.
      Only a genuinely unparseable reg-no format still blocks submission,
      since a class group can't be determined at all in that case.
- [x] Added a show/hide password toggle (eye icon) on both login and
      register forms, all password fields

### Testing / hardening
- [ ] No PHP interpreter available in the build environment to lint —
      files haven't been execution-tested, only reviewed for consistency
- [ ] Registration/account-creation flow for students (currently only
      seeded directly into the DB, no signup form)
- [ ] Password hashing confirmed in `auth.php` logic but seed.sql
      students have placeholder `'CHANGE_ME'` password hashes — not
      usable for real login until replaced

---

## Logic Audit (2026-08-23) — actually executed against a real database
For the first time, PHP CLI + a real MariaDB server were installed in the
build environment and the actual code was run — not just reviewed — against
the real `schema.sql`/`seed.sql`. This caught real bugs that pure code
review had missed:

- [x] **Fixed a critical bug in `api/swap.php`**: swapping two sessions did
      two sequential single-row UPDATEs, which transiently violated the
      `UNIQUE(room_id, time_slot_id)` constraint the instant the first
      UPDATE landed (since the second session still held that exact slot
      at that moment). **Every real swap attempt would have failed.**
      Fixed by parking session A in a genuinely free scratch slot first,
      then moving B into A's old spot, then A into B's old spot — three
      updates, never a transient duplicate. Verified against a real DB:
      the old code threw `Duplicate entry` on the exact scenario; the new
      code completes cleanly and lands both sessions correctly.
- [x] **Fixed a real bug in auto-combine detection**: `detectPossibleCombinations()`
      matched only on course_code + lecturer_id. Since no lecturers are
      assigned yet in the seed data, every course with a NULL lecturer was
      incorrectly treated as "the same lecturer" as every other NULL-lecturer
      course sharing a code — surfacing 36 false-positive suggestions,
      including pairing two genuinely unrelated courses that coincidentally
      share the code "GNS 102" in the source data. Fixed to require
      course_title match too, and to exclude NULL lecturers entirely (two
      unassigned sessions are not "the same lecturer"). Verified: 0 false
      positives now; a real matching scenario (same lecturer, same
      course+title, two class groups) correctly produces exactly 1 suggestion.
- [x] Same course_title gap existed in `api/combine.php`'s manual-combine
      validation (only checked course_code, not title) — fixed identically.
- [x] Added optimization the spec explicitly required but the generator
      never did: pure first-fit greedy placement is now a scored best-fit —
      penalizes days a class group is already loaded on (spreads sessions
      across the week) and penalizes back-to-back adjacency (avoids
      needless consecutive-period stacking). Verified against real
      generated data: every class group's sessions land nearly evenly
      across all 5 weekdays (e.g. HND 400 SWD: 4/4/3/3/3), not clustered.
- [x] Added capacity-aware room selection (previously ignored `rooms.capacity`
      entirely) — rooms that fit the class group's actual student count are
      now preferred, smallest-sufficient first, addressing the spec's
      "using suitable classrooms" and "avoiding unnecessary room allocation"
      optimization goals.
- [x] Added a "Suggested Combinations" panel to `admin/pages/timetable.php`,
      wired to the new auto-detection — the spec explicitly wants the
      generator to surface possible combinations, not just support manual
      combine. Confirmed and rejected/locked/published-session protection
      in generate.php and regenerate.php were already correctly implemented
      (verified by re-reading, no changes needed there).
- [x] Verified end-to-end against real data with zero hard-constraint
      violations: generated 88-90 sessions across multiple runs, checked
      lecturer/room/class-group/break conflicts directly via SQL — all
      zero, every time, including after the swap and combine fixes.

**What this means**: everything above was previously shipped as
logically-reviewed-but-never-executed code. This is the first time any of
it has actually run against a real database with real constraints enforced.
The swap bug in particular would not have been caught any other way.

### Second audit pass — Find Alternative, Lock, Regenerate
- [x] Verified `findAlternatives()` against real data: correctly finds
      valid alternative slots, never suggests a session's own current
      placement.
- [x] **Fixed a second critical bug**, more severe than the first:
      `generateTimetable()`'s returned `sessions` array included the
      seeded `prePlaced` entries (already-existing locked/published rows)
      mixed in with genuinely new placements. `saveGeneratedTimetable()`
      blindly INSERTs everything it's given — so **every single Generate
      or Regenerate call ever made after locking or publishing anything
      would crash** (`Column 'course_id' cannot be null`, since prePlaced
      entries never carried one). This affected both `generate.php` and
      `regenerate.php` identically. Fixed by tracking new placements in a
      separate array from the conflict-checking seed, and returning only
      the new ones.
- [x] That fix exposed a **third, related bug**: when a course requires
      more than one weekly session and only one of them gets locked, the
      *other* unlocked sibling session for that same course was invisible
      to the conflict-checker — `getProtectedSessions()` only looked at
      individually locked/published rows, not every session belonging to
      a now-excluded course. The generator would then happily place a
      different course directly on top of that untouched sibling session,
      violating the room-uniqueness constraint. Reproduced on a clean DB
      with a real 2-session course (GNS 102) and confirmed the exact
      failure. Fixed: once a course is protected (any locked/published
      session), ALL of its existing sessions now feed into the
      conflict-checking seed, not just the specific protected rows.
- [x] Re-verified end-to-end on a clean database: locked one session of a
      2-session-required course, ran the real regenerate flow, confirmed
      both sessions of that course (the locked one AND its untouched
      unlocked sibling) survived exactly where they started, and the full
      conflict regression check (lecturer/room/class-group/break) came
      back clean — 88 sessions, zero violations.

**Severity note**: these two bugs meant the Lock feature — a core,
explicitly-specified requirement ("locked entries remain unchanged when
regenerating") — was completely non-functional the moment it was actually
exercised. Every regenerate after any lock would have crashed outright.
This is exactly why the audit moved to real execution instead of stopping
at code review.

- Registration slips showed "Your Level: 200" for all three sample
  students (ND, HND-SWD, HND-NCC) despite course levels shown being
  100/200 and 300/400 respectively — unresolved inconsistency in the
  source data, currently sidestepped by placing sample students at
  the level matching their non-carry-over courses.

### Third fix — My Courses / My Lecturers showed nothing for anyone
- [x] Both pages were entirely driven by the `course_registrations` table,
      which nobody had ever populated (empty for all students) — so every
      student, regardless of ND/ND2/HND-SWD/HND-NCC classification, saw
      zero courses and zero lecturers. Fixed to derive directly from the
      student's own `class_group_id`, matching how the real registration
      slips actually work (a fixed curriculum per level, auto-listed —
      not something a student opts into course-by-course). Verified
      against real data for all 3 sample students: each now sees only
      their own classification's courses with zero cross-contamination
      (ND 200 → COM/GNS/EED courses; HND 300 SWD → SWD/AIT courses;
      HND 300 NCC → NCC/AIT courses).

### Fourth fix — reported by real XAMPP testing
- [x] **Fixed a real fatal error the person hit on their own machine**:
      `admin/pages/timetable.php` called `detectPossibleCombinations()`
      (added during the earlier logic audit) but never required
      `includes/functions/timetable_functions.php`, where that function
      lives — only `includes/auth.php` was required. Scanned every other
      admin/student page for the same missing-require pattern; this was
      the only one affected. Verified fixed by actually serving the page
      over HTTP with a real session and confirming full render (88
      sessions' worth of table rows, no fatal error) — not just a syntax
      check this time, an actual request/response round-trip.
- [x] Added course assignment directly to the Lecturers page — previously
      a lecturer could only be assigned courses one at a time, from the
      Courses page. Now adding/editing a lecturer shows every active
      course grouped by class group with checkboxes (pre-checked for
      whatever they already teach); saving updates each checked course's
      `lecturer_id` and unassigns any unchecked ones. If a checked course
      currently belongs to someone else, it shows who and reassigns it.
      Verified all three real scenarios against actual data: initial
      multi-course assignment, unchecking a course to unassign it, and
      stealing a course from a different lecturer — all landed correctly
      in the database exactly as expected.

### Fifth fix — multi-department support and per-level views
- [x] Added real multi-department support: new `departments` table,
      `class_groups.department_id` FK, admin `departments.php` CRUD page.
      Each department gets its own timetable — the generator only ever
      touches its own department's courses, but treats every OTHER
      department's existing sessions as permanently protected (rooms and
      lecturers are shared resources across the whole school, not owned by
      one department — so a locked/published session in Department B must
      still block Department A's generator from double-booking that same
      room/lecturer). This required extending `getProtectedSessions()`,
      `generateTimetable()`, `detectPossibleCombinations()`, and all three
      workflow endpoints (generate/regenerate/publish) to take a
      `department_id` parameter.
- [x] `class_groups.php` is no longer read-only — admins can now add new
      class groups under any department (needed once departments beyond
      CS exist).
- [x] Added a genuine "View by Class Group" filter to the admin Timetable
      page (Department + **Level** + Semester selectors) — this was an
      explicit spec requirement that was never actually built as a filter
      before; all sessions across all levels were always shown mixed
      together in one table. Verified against real data: filtering to
      "ND 100" returns exactly that level's sessions (14 of 88 total),
      zero cross-contamination with other levels. Generation itself stays
      scoped to the whole department at once (not per-level) since
      conflict-checking has to see all of a department's shared resources
      together — the level filter is a viewing concern only.
- [x] **Reverted an earlier over-interpretation**: initially added Saturday
      to the schedule reading "every day of the week" literally. Corrected
      per explicit instruction — the working week is Monday–Friday only;
      "every day... don't minimize" meant fully using all 5 weekdays, not
      adding weekend days. `time_slots` is back to 40 rows (8/day × 5 days),
      verified via real generation: 88 sessions placed, zero landing outside
      Mon–Fri.

### Sixth fix — per-level Generate/Regenerate/Publish
- [x] Extended Generate/Regenerate/Publish to work at THREE possible
      scopes: whole department (no level selected), or one specific level
      alone (e.g. "HND NCC 300" only), independently of every other level.
      Same underlying principle as department protection: generating one
      level treats every OTHER level's courses in that department as
      permanently protected (their existing room/lecturer bookings must
      still be respected, even though they're never touched or deleted).
      Fixed a subtle edge case while building this: the exclusion query
      only found other-level courses that ALREADY had sessions — meaning
      on a first-ever generation, a different level's never-yet-scheduled
      courses wouldn't have been excluded at all. Fixed to pull directly
      from the courses table instead.
- [x] Verified end-to-end against real data: generated ND100 alone (14
      sessions, nothing else touched), then generated HND-NCC-300
      completely separately (correctly saw all 14 of ND100's sessions as
      protected, added 12 new ones of its own, total 26). Full regression
      check across both independently-generated levels sharing the same
      room/lecturer pool: zero room conflicts, zero lecturer conflicts,
      zero break violations. Confirmed ND100's sessions were byte-for-byte
      unchanged after the second generation ran.
- [x] Admin Timetable page's Generate/Regenerate/Publish buttons now send
      the currently-selected level (`class_group_id`) along with
      department + semester, and relabel themselves ("Generate (ND 100
      only)") when a specific level is selected rather than "All Levels".

### Seventh fix — CRITICAL: second semester generation crashed outright
- [x] **Found and fixed the most severe bug yet**, flagged by the person
      asking me to confirm first/second semester timetables were properly
      considered. The `timetable_sessions` table's uniqueness constraint
      was `UNIQUE(room_id, time_slot_id)` — with no semester dimension at
      all. Since first and second semester are separate, non-overlapping
      stretches of the year, "Room 201, Monday 8am" in first semester and
      the identical slot in second semester are two different real-world
      bookings, not a conflict — but the database didn't know that.
      **Reproduced exactly**: generated first semester successfully (88
      sessions), then generated second semester and it crashed outright
      with `Duplicate entry '6-1' for key 'uniq_room_slot'` the moment it
      tried to reuse a room+slot combo first semester had already claimed
      — which is nearly guaranteed to happen given how few rooms/slots
      exist relative to how many sessions need placing.
- [x] Fixed by adding a `semester` column directly to `timetable_sessions`
      (denormalized from `courses.semester`, but necessary so the database
      itself can enforce the constraint correctly) and changing it to
      `UNIQUE(room_id, time_slot_id, semester)`. Updated
      `saveGeneratedTimetable()` to populate it.
- [x] That fix then surfaced the SAME semester-blindness bug in four other
      places that queried existing sessions for conflict-checking without
      scoping by semester — `swap.php`, `move.php`, `findAlternatives()`,
      and `combine.php`. Each would have either wrongly rejected valid
      operations (treating a different-semester session at the same
      nominal slot as a false conflict) or, in swap's case, wasted its
      scratch-slot search avoiding combos that were only "taken" in a
      different semester. All four fixed to filter by `ts.semester = ?`.
- [x] Verified end-to-end: re-ran the exact crash scenario (generate first,
      then second) — 88 + 82 = 170 sessions, no crash. Confirmed real
      room+slot reuse is actually happening across semesters (proving the
      fix isn't accidental — e.g. Room 1/Slot 1 genuinely used by both
      "first" and "second"). Full regression check scoped per semester:
      zero violations in either one individually. Tested swap within a
      fully-populated two-semester database — completed cleanly, correctly
      ignored first semester's identical slots when finding scratch space.

### Eighth fix — grouped displays, generator staggering, defensive logging
- [x] Fixed a real error the person hit live: "Regenerate failed" with an
      FK constraint violation on `activity_log.admin_id`. Root cause: a
      browser session held an admin_id from before the last database
      reseed, so it no longer existed in `admins`. Made `logActivity()`
      defensive — a failed log write (auxiliary, non-critical) can no
      longer make a genuinely successful generate/regenerate/publish
      report as failed. Reproduced the exact FK error directly and
      confirmed it's now caught internally rather than propagating up.
- [x] Added slot-scan rotation per class group in the generator, so
      different levels don't all deterministically converge on the exact
      same opening slot (previously every level's day-load score started
      at zero identically, so the very first course for every level always
      won ties toward Monday's earliest slot). Verified this does shift
      results (e.g. one level's earliest session moved from 8am to 10am),
      though noted honestly to the person that with enough courses per
      level, some overlap across levels at the same nominal time is
      inherent and not actually a conflict — different class groups
      genuinely can share a time slot without any real clash.
- [x] Grouped the admin Timetable page's "All Levels" view into distinct
      per-level sections (each with its own header and table) instead of
      one flat table with every level's sessions interleaved
      chronologically. Verified: exactly 6 section headers rendered for
      the 6 real class groups.
- [x] Grouped the admin Courses page the same way — courses are now shown
      in per-level sections (ND 100, ND 200, etc.) instead of one flat
      list, matching the grouping style already used in the Lecturers
      page's course picker. Also added department filtering to this page,
      which it never had before despite multi-department support existing
      elsewhere. Verified: correct section count rendered, no errors.
- [x] Grouped the student My Courses page by semester (First/Second) —
      the equivalent grouping for a single student, since they only ever
      see one level's worth of courses to begin with. Verified: exactly 2
      semester sections rendered, no errors.

### Ninth fix — operating hours corrected
- [x] Changed `time_slots` seed to the confirmed real schedule: Morning
      block 8:00am-12:00pm, break 1:00-2:00pm, afternoon block 2:00-4:00pm
      — with 12:00-1:00pm dropped entirely (not offered for class, not a
      formal break either, just not scheduled at all). Previously the
      seed had a 12:00-13:00 teaching slot that shouldn't have existed.
      Now 7 slots/day × 5 days = 35 total (was 40). Verified via real
      generation: 88 sessions placed, 0 unscheduled despite the reduced
      slot count, zero room conflicts, zero break violations, and
      specifically zero sessions using the removed 12:00 hour.

### Tenth fix — course titles now visible, not just codes
- [x] Timetable session badges (student My Timetable, admin Timetable,
      admin dashboard preview, student dashboard preview) previously
      showed only the course code (e.g. "COM 211"), with the full title
      only available as a hover tooltip — invisible on mobile/touch and
      easy to miss. Now shows the course title directly, visibly, on all
      four pages. The two dashboard preview queries didn't even select
      `course_title` before this fix — added it to both. Verified via
      real page rendering: title text confirmed present in the actual
      HTML output (not just the tooltip attribute), zero errors across
      all four pages.

## Resolved decisions
- Sidebar's "Combine Classes" and "Swap & Alternatives" links now
  point directly at `timetable.php`, since that's where the
  functionality actually lives (checkbox-select combine/swap, plus
  per-row lock/find-alternative). No separate pages needed.

---

## How to resume
1. Read this file first.
2. Check `database/schema.sql` and `database/seed.sql` for current
   data model before making schema changes.
3. Cross-check against `admin/pages/_sidebar.php` and
   `student/pages/_sidebar.php` for the full intended page list —
   any link without a matching file under "Not built yet" above.


Theme update: the application now uses a consistent light-only color scheme. Dark-mode styles, system dark-mode overrides, theme toggle injection, and saved theme preference logic have been removed.
