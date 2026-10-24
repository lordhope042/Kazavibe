<?php
/**
 * Timetable scheduling engine.
 *
 * Priority order (highest first):
 *   1. No hard conflicts (lecturer / class / room / break)
 *   2. Fulfill required weekly sessions per course
 *   3. Lecturer availability
 *   4. Class availability
 *   5. Room availability (each class group uses its own dedicated classroom)
 *   6. Avoid the break slot
 *   7. Combine compatible classes where possible
 *   8. Optimize spread (avoid gaps / back-to-back overload)
 */

require_once __DIR__ . '/../../config/config.php';

/**
 * Returns true if placing $courseId in $roomId at $timeSlotId would violate
 * a hard constraint, given the sessions already placed in $existingSessions.
 *
 * $existingSessions: array of ['lecturer_id'=>, 'room_id'=>, 'time_slot_id'=>, 'class_group_ids'=>[]]
 */
function hasConflict(
    array $existingSessions,
    ?int $lecturerId,
    int $roomId,
    int $timeSlotId,
    array $classGroupIds,
    bool $slotIsBreak
): ?string {
    if ($slotIsBreak) {
        return 'break';
    }

    foreach ($existingSessions as $s) {
        if ((int) $s['time_slot_id'] !== (int) $timeSlotId) {
            continue;
        }
        if ($lecturerId !== null && (int) ($s['lecturer_id'] ?? 0) === $lecturerId) {
            return 'lecturer';
        }
        if ((int) $s['room_id'] === $roomId) {
            return 'classroom';
        }
        if (array_intersect(array_map('intval', $classGroupIds), array_map('intval', $s['class_group_ids'] ?? []))) {
            return 'class';
        }
    }

    return null; // no conflict
}

/**
 * Fetches all active, non-break time slots ordered by day then time.
 */
function getAvailableTimeSlots(PDO $pdo): array
{
    $stmt = $pdo->query(
        "SELECT * FROM time_slots WHERE is_active = 1
         ORDER BY FIELD(day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), start_time"
    );
    return $stmt->fetchAll();
}

/**
 * Fetches all active classrooms.
 */
function getAvailableRooms(PDO $pdo): array
{
    return $pdo->query('SELECT * FROM rooms WHERE is_active = 1')->fetchAll();
}

/**
 * Rooms a class group may be taught in. Every class group (ND 1, ND 2,
 * HND 1 SWD, HND 1 NCC, HND 2 SWD, HND 2 NCC) has its own dedicated
 * classroom, so that room is the only candidate. A group with no dedicated
 * room falls back to the shared pool of rooms not owned by any group.
 */
function roomsForClassGroup(array $rooms, int $classGroupId): array
{
    $own = array_values(array_filter($rooms, fn($r) => (int) ($r['class_group_id'] ?? 0) === $classGroupId));
    if (!empty($own)) {
        return $own;
    }
    return array_values(array_filter($rooms, fn($r) => empty($r['class_group_id'])));
}

/**
 * Gathers every session that must never be silently overwritten or
 * double-booked by a (re)generation run: locked sessions AND published
 * sessions (published = live/committed, even if not explicitly locked).
 *
 * Returns:
 *   'prePlaced'         => flat list in the same shape generateTimetable()
 *                           uses internally, so new placements avoid them
 *   'excludeCourseIds'  => course_ids that must be skipped entirely during
 *                           generation, since they already have a protected
 *                           session and shouldn't get a second one
 */
function getProtectedSessions(PDO $pdo, string $semester, int $departmentId, int $classGroupId = 0): array
{
    // Rooms and lecturers are shared resources across the WHOLE school, not
    // owned by one department — so every other department's existing
    // sessions are always protected (never touched, never deleted), and
    // their rooms/lecturers must still be respected when generating THIS
    // department's timetable. Otherwise two departments could double-book
    // the same physical room.
    $otherDeptStmt = $pdo->prepare(
        "SELECT DISTINCT ts.course_id
         FROM timetable_sessions ts
         JOIN courses c ON c.course_id = ts.course_id
         JOIN class_groups cg ON cg.class_group_id = c.class_group_id
         WHERE c.semester = ? AND cg.department_id != ?"
    );
    $otherDeptStmt->execute([$semester, $departmentId]);
    $otherDeptCourseIds = array_column($otherDeptStmt->fetchAll(), 'course_id');

    // Within THIS department, anything locked or published is also
    // protected and won't be touched by regeneration.
    $lockedStmt = $pdo->prepare(
        "SELECT DISTINCT ts.course_id
         FROM timetable_sessions ts
         JOIN courses c ON c.course_id = ts.course_id
         JOIN class_groups cg ON cg.class_group_id = c.class_group_id
         WHERE c.semester = ? AND cg.department_id = ? AND (ts.is_locked = 1 OR ts.status = 'published')"
    );
    $lockedStmt->execute([$semester, $departmentId]);
    $lockedCourseIds = array_column($lockedStmt->fetchAll(), 'course_id');

    $excludeCourseIds = array_values(array_unique(array_merge($otherDeptCourseIds, $lockedCourseIds)));

    // If a specific level was chosen (rather than "all levels in this
    // department"), every OTHER level's courses are excluded from THIS
    // generation run — pulled directly from courses, not just ones that
    // already have sessions, since a never-yet-scheduled course from
    // another level must still be skipped on a first-ever generation.
    if ($classGroupId > 0) {
        $otherLevelStmt = $pdo->prepare(
            "SELECT c.course_id
             FROM courses c
             JOIN class_groups cg ON cg.class_group_id = c.class_group_id
             WHERE c.semester = ? AND cg.department_id = ? AND c.class_group_id != ?"
        );
        $otherLevelStmt->execute([$semester, $departmentId, $classGroupId]);
        $excludeCourseIds = array_values(array_unique(array_merge(
            $excludeCourseIds,
            array_column($otherLevelStmt->fetchAll(), 'course_id')
        )));
    }

    if (empty($excludeCourseIds)) {
        return ['prePlaced' => [], 'excludeCourseIds' => []];
    }

    // Pull EVERY session belonging to a protected course — not just the
    // specific locked/published rows. If a course needs 2+ sessions per
    // week and only one got locked, the other unlocked sibling session still
    // physically occupies a (room, time_slot) that the generator must know
    // about; otherwise it can place a different course right on top of it.
    $placeholders = implode(',', array_fill(0, count($excludeCourseIds), '?'));
    $stmt = $pdo->prepare(
        "SELECT ts.session_id, ts.course_id, ts.lecturer_id, ts.room_id, ts.time_slot_id
         FROM timetable_sessions ts
         WHERE ts.course_id IN ($placeholders)"
    );
    $stmt->execute($excludeCourseIds);
    $protectedSessions = $stmt->fetchAll();

    $groupStmt = $pdo->prepare('SELECT class_group_id FROM session_class_groups WHERE session_id = ?');

    $prePlaced = [];
    foreach ($protectedSessions as $ps) {
        $groupStmt->execute([$ps['session_id']]);
        $prePlaced[] = [
            'lecturer_id'     => $ps['lecturer_id'],
            'room_id'         => $ps['room_id'],
            'time_slot_id'    => $ps['time_slot_id'],
            'class_group_ids' => array_column($groupStmt->fetchAll(), 'class_group_id'),
        ];
    }

    return [
        'prePlaced'        => $prePlaced,
        'excludeCourseIds' => $excludeCourseIds,
    ];
}

/**
 * Greedy generator: for every course needing sessions, tries to place each
 * required weekly session into the first slot/room combo that has no
 * conflict. Courses are processed in order of fewest available rooms first
 * (labs are scarcer), which tends to reduce backtracking.
 *
 * $departmentId scopes which department's courses get scheduled — rooms
 * and time slots are shared across all departments, but only this
 * department's own courses are placed. Pass prePlaced/excludeCourseIds
 * from getProtectedSessions() to respect locks and other departments.
 *
 * Returns ['sessions' => [...placed...], 'unscheduled' => [...course_ids that couldn't fit...]]
 */
function generateTimetable(PDO $pdo, string $semester, int $departmentId, array $prePlaced = [], array $excludeCourseIds = []): array
{
    $timeSlots = getAvailableTimeSlots($pdo);
    $rooms = getAvailableRooms($pdo);

    // Tag each slot with its position within its own day, so adjacency
    // (back-to-back sessions) can be detected without a second query.
    $dayPositions = [];
    foreach ($timeSlots as &$slot) {
        $day = $slot['day_of_week'];
        $dayPositions[$day] = ($dayPositions[$day] ?? -1) + 1;
        $slot['_day_index'] = $dayPositions[$day];
    }
    unset($slot);

    // Class-group sizes (active students), used to pick appropriately-sized
    // rooms instead of always grabbing the first room that merely fits.
    $classSizes = [];
    foreach ($pdo->query('SELECT class_group_id, COUNT(*) AS cnt FROM students WHERE is_active = 1 GROUP BY class_group_id') as $row) {
        $classSizes[$row['class_group_id']] = (int) $row['cnt'];
    }

    $stmt = $pdo->prepare(
        'SELECT c.* FROM courses c
         JOIN class_groups cg ON cg.class_group_id = c.class_group_id
         WHERE c.semester = ? AND c.is_active = 1 AND cg.department_id = ?'
    );
    $stmt->execute([$semester, $departmentId]);
    $courses = $stmt->fetchAll();

    if (!empty($excludeCourseIds)) {
        $courses = array_values(array_filter(
            $courses,
            fn($c) => !in_array($c['course_id'], $excludeCourseIds, true)
        ));
    }

    // Courses needing the most weekly sessions first (hardest to fit)
    usort($courses, fn($a, $b) => $b['sessions_required'] <=> $a['sessions_required']);

    $placed = $prePlaced;   // seed with already-locked/published sessions so new placements avoid them
    $newlyPlaced = [];      // only THESE get returned/saved — prePlaced rows already exist in the DB
    $unscheduled = [];

    // Track, per class group, how many sessions already sit on each day and
    // which day-positions are occupied — drives the spread/adjacency scoring.
    $dayCounts = [];
    $usedDayIndexes = [];
    $slotById = [];
    foreach ($timeSlots as $ts) {
        $slotById[$ts['time_slot_id']] = $ts;
    }
    foreach ($placed as $p) {
        $slotInfo = $slotById[$p['time_slot_id']] ?? null;
        if (!$slotInfo) {
            continue;
        }
        foreach ($p['class_group_ids'] as $cg) {
            $day = $slotInfo['day_of_week'];
            $dayCounts[$cg][$day] = ($dayCounts[$cg][$day] ?? 0) + 1;
            $usedDayIndexes[$cg][$day][] = $slotInfo['_day_index'];
        }
    }

    foreach ($courses as $course) {
        $classGroupIds = [$course['class_group_id']];
        $classSize = $classSizes[$course['class_group_id']] ?? 0;

        // Each class group is taught only in its own dedicated classroom.
        $basePool = roomsForClassGroup($rooms, (int) $course['class_group_id']);

        // Capacity-aware room ordering: rooms that fit the class first (smallest
        // sufficient room, to avoid handing a big hall to a small class), then
        // undersized rooms as a last resort (largest first, least-bad fallback).
        // Skipped when the class size is unknown (0) — no seeded students yet.
        $roomPool = $basePool;
        if ($classSize > 0) {
            usort($roomPool, function ($a, $b) use ($classSize) {
                $aFits = ($a['capacity'] ?? 0) >= $classSize;
                $bFits = ($b['capacity'] ?? 0) >= $classSize;
                if ($aFits !== $bFits) {
                    return $bFits <=> $aFits;
                }
                return $aFits
                    ? ($a['capacity'] ?? 0) <=> ($b['capacity'] ?? 0)
                    : ($b['capacity'] ?? 0) <=> ($a['capacity'] ?? 0);
            });
        }

        $sessionsPlacedForCourse = 0;

        // Rotate which slot gets scanned FIRST, based on the class group.
        // Without this, every class group's day-load/adjacency score starts
        // at zero independently, so every level's very first course always
        // finds Monday's first slot as the best (score-0) candidate and
        // they all end up identically stacked there. Rotating by class
        // group makes each level's schedule genuinely look different from
        // the others, while every hard constraint and the spread/adjacency
        // scoring within that level still apply exactly as before.
        $rotation = ($course['class_group_id'] * 7) % count($timeSlots);
        $scanOrder = array_merge(
            array_slice($timeSlots, $rotation),
            array_slice($timeSlots, 0, $rotation)
        );

        while ($sessionsPlacedForCourse < $course['sessions_required']) {
            $best = null;

            foreach ($scanOrder as $slot) {
                if ($slot['is_break']) {
                    continue;
                }

                foreach ($roomPool as $room) {
                    $conflict = hasConflict(
                        $placed,
                        $course['lecturer_id'],
                        $room['room_id'],
                        $slot['time_slot_id'],
                        $classGroupIds,
                        (bool) $slot['is_break']
                    );
                    if ($conflict !== null) {
                        continue;
                    }

                    // Lower score = better. Penalize days this class group
                    // already has more sessions on (spread across the week),
                    // and penalize sitting immediately next to an existing
                    // session for this class group (avoid needless back-to-back
                    // stacking, per the optimization preferences in the spec).
                    $day = $slot['day_of_week'];
                    $dayLoad = $dayCounts[$course['class_group_id']][$day] ?? 0;
                    $adjacent = false;
                    foreach ($usedDayIndexes[$course['class_group_id']][$day] ?? [] as $usedIdx) {
                        if (abs($usedIdx - $slot['_day_index']) === 1) {
                            $adjacent = true;
                            break;
                        }
                    }
                    $score = ($dayLoad * 10) + ($adjacent ? 3 : 0);

                    if ($best === null || $score < $best['score']) {
                        $best = ['slot' => $slot, 'room' => $room, 'score' => $score];
                        if ($score === 0) {
                            break 2; // fresh day, non-adjacent, best-fit room — can't improve on this
                        }
                    }
                }
            }

            if ($best === null) {
                break; // no valid (slot, room) combo left at all for this course
            }

            $newSession = [
                'course_id'       => $course['course_id'],
                'lecturer_id'     => $course['lecturer_id'],
                'semester'        => $semester,
                'room_id'         => $best['room']['room_id'],
                'time_slot_id'    => $best['slot']['time_slot_id'],
                'class_group_ids' => $classGroupIds,
            ];
            $placed[] = $newSession;
            $newlyPlaced[] = $newSession;
            $day = $best['slot']['day_of_week'];
            $dayCounts[$course['class_group_id']][$day] = ($dayCounts[$course['class_group_id']][$day] ?? 0) + 1;
            $usedDayIndexes[$course['class_group_id']][$day][] = $best['slot']['_day_index'];
            $sessionsPlacedForCourse++;
        }

        if ($sessionsPlacedForCourse < $course['sessions_required']) {
            $unscheduled[] = [
                'course_id' => $course['course_id'],
                'placed'    => $sessionsPlacedForCourse,
                'required'  => $course['sessions_required'],
            ];
        }
    }

    return ['sessions' => $newlyPlaced, 'unscheduled' => $unscheduled];
}

/**
 * Scans a semester's draft sessions for possible combine candidates — sessions
 * teaching the same course code with the same lecturer, but different class
 * groups, per the spec's auto-detection criteria. Returns SUGGESTIONS only;
 * nothing here merges anything. The admin reviews and confirms via combine.php.
 */
function detectPossibleCombinations(PDO $pdo, string $semester, int $departmentId): array
{
    $stmt = $pdo->prepare(
        "SELECT ts.session_id, ts.lecturer_id, ts.room_id, ts.time_slot_id,
                c.course_code, c.course_title,
                GROUP_CONCAT(DISTINCT sg.class_group_id) AS class_group_ids
         FROM timetable_sessions ts
         JOIN courses c ON c.course_id = ts.course_id
         JOIN class_groups cg ON cg.class_group_id = c.class_group_id
         JOIN session_class_groups sg ON sg.session_id = ts.session_id
         WHERE c.semester = ? AND cg.department_id = ? AND ts.status = 'draft' AND ts.is_combined = 0
               AND ts.lecturer_id IS NOT NULL
         GROUP BY ts.session_id"
    );
    $stmt->execute([$semester, $departmentId]);
    $sessions = $stmt->fetchAll();

    // Match on course_code + course_title + lecturer_id — all three, per the
    // spec. Course code alone isn't reliable: this dataset has coincidental
    // code collisions (e.g. "GNS 102" is used for two unrelated courses
    // across different sessions/levels), so title must match too. A NULL
    // lecturer is excluded above — two unassigned sessions are NOT "the
    // same lecturer", they're just both missing one.
    $groups = [];
    foreach ($sessions as $s) {
        $key = $s['course_code'] . '|' . $s['course_title'] . '|' . $s['lecturer_id'];
        $groups[$key][] = $s;
    }

    $suggestions = [];
    foreach ($groups as $group) {
        if (count($group) < 2) {
            continue;
        }
        $suggestions[] = [
            'course_code'  => $group[0]['course_code'],
            'course_title' => $group[0]['course_title'],
            'lecturer_id'  => $group[0]['lecturer_id'],
            'sessions'     => array_map(fn($g) => [
                'session_id'      => (int) $g['session_id'],
                'class_group_ids' => explode(',', $g['class_group_ids']),
            ], $group),
        ];
    }

    return $suggestions;
}

/**
 * Persists a generated timetable (from generateTimetable) as draft sessions.
 * Wipes existing draft sessions for the semester's courses first.
 */
function saveGeneratedTimetable(PDO $pdo, array $sessions): void
{
    $ownsTransaction = !$pdo->inTransaction();
    if ($ownsTransaction) $pdo->beginTransaction();
    try {
        $insert = $pdo->prepare(
            'INSERT INTO timetable_sessions (course_id, lecturer_id, semester, room_id, time_slot_id, status)
             VALUES (?, ?, ?, ?, ?, "draft")'
        );
        $linkGroup = $pdo->prepare(
            'INSERT INTO session_class_groups (session_id, class_group_id) VALUES (?, ?)'
        );

        foreach ($sessions as $s) {
            $insert->execute([$s['course_id'], $s['lecturer_id'], $s['semester'], $s['room_id'], $s['time_slot_id']]);
            $sessionId = (int) $pdo->lastInsertId();
            foreach ($s['class_group_ids'] as $cgId) {
                $linkGroup->execute([$sessionId, $cgId]);
            }
        }

        if ($ownsTransaction) $pdo->commit();
    } catch (Throwable $e) {
        if ($ownsTransaction && $pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

/**
 * Finds valid alternative (room, time_slot) pairs for an existing session,
 * excluding its current slot, respecting the same hard constraints.
 */
function findAlternatives(PDO $pdo, int $sessionId, int $limit = 5): array
{
    $stmt = $pdo->prepare(
        'SELECT ts.*, c.class_group_id
         FROM timetable_sessions ts
         JOIN courses c ON c.course_id = ts.course_id
         WHERE ts.session_id = ?'
    );
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch();
    if (!$session) {
        return [];
    }

    $existing = $pdo->prepare(
        'SELECT ts.room_id, ts.time_slot_id, ts.lecturer_id, sg.class_group_id
         FROM timetable_sessions ts
         JOIN session_class_groups sg ON sg.session_id = ts.session_id
         WHERE ts.session_id != ? AND ts.semester = ?'
    );
    $existing->execute([$sessionId, $session['semester']]);
    $existing = $existing->fetchAll();

    // group by session for class_group_ids
    $grouped = [];
    foreach ($existing as $row) {
        $key = $row['room_id'] . '-' . $row['time_slot_id'];
        $grouped[$key]['lecturer_id'] = $row['lecturer_id'];
        $grouped[$key]['room_id'] = $row['room_id'];
        $grouped[$key]['time_slot_id'] = $row['time_slot_id'];
        $grouped[$key]['class_group_ids'][] = $row['class_group_id'];
    }
    $existingSessions = array_values($grouped);

    $timeSlots = getAvailableTimeSlots($pdo);
    $rooms = roomsForClassGroup(getAvailableRooms($pdo), (int) $session['class_group_id']);

    $alternatives = [];
    foreach ($timeSlots as $slot) {
        if ($slot['is_break']) {
            continue;
        }
        foreach ($rooms as $room) {
            $conflict = hasConflict(
                $existingSessions,
                $session['lecturer_id'],
                $room['room_id'],
                $slot['time_slot_id'],
                [$session['class_group_id']],
                (bool) $slot['is_break']
            );
            if ($conflict === null) {
                $alternatives[] = ['room' => $room, 'time_slot' => $slot];
                if (count($alternatives) >= $limit) {
                    return $alternatives;
                }
            }
        }
    }

    return $alternatives;
}
