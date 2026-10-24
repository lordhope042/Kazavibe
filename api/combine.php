<?php
/**
 * POST /api/combine.php
 * Body: { "session_ids": [int, int, ...] }  (2 or more)
 *
 * Merges sessions that teach the same course_code + lecturer in the same
 * semester (typically across different class groups) into one session.
 * The FIRST session_id in the array becomes the primary — its room/time
 * slot is kept, and every class_group from the other sessions is attached
 * to it. The other session rows are deleted.
 *
 * Requires: all sessions must share course_code + lecturer_id + semester,
 * or the merge is rejected (this is what "compatible" means here).
 */

require_once __DIR__ . '/_bootstrap.php';

$admin = apiRequireAdmin();
apiRequirePost();

$body = apiBody();
$sessionIds = array_map('intval', (array) ($body['session_ids'] ?? []));
$sessionIds = array_values(array_unique(array_filter($sessionIds)));

if (count($sessionIds) < 2) {
    apiRespond(false, null, 'Provide at least two session IDs to combine.', 422);
}

$pdo = getDbConnection();

$placeholders = implode(',', array_fill(0, count($sessionIds), '?'));
$stmt = $pdo->prepare(
    "SELECT ts.session_id, ts.room_id, ts.time_slot_id, ts.is_locked, ts.lecturer_id, ts.course_id,
            c.course_code, c.semester
     FROM timetable_sessions ts
     JOIN courses c ON c.course_id = ts.course_id
     WHERE ts.session_id IN ($placeholders)"
);
$stmt->execute($sessionIds);
$sessions = $stmt->fetchAll();

if (count($sessions) !== count($sessionIds)) {
    apiRespond(false, null, 'One or more sessions not found.', 404);
}

$primary = $sessions[0];
$primaryTitle = $pdo->prepare('SELECT course_title FROM courses WHERE course_id = ?');
$primaryTitle->execute([$primary['course_id']]);
$primary['course_title'] = $primaryTitle->fetchColumn();

foreach ($sessions as $s) {
    if ($s['is_locked']) {
        apiRespond(false, null, "Session #{$s['session_id']} is locked and cannot be combined.", 409);
    }

    $titleStmt = $pdo->prepare('SELECT course_title FROM courses WHERE course_id = ?');
    $titleStmt->execute([$s['course_id']]);
    $title = $titleStmt->fetchColumn();

    if ($s['course_code'] !== $primary['course_code']
        || $title !== $primary['course_title']
        || $s['lecturer_id'] === null
        || $s['lecturer_id'] !== $primary['lecturer_id']
        || $s['semester'] !== $primary['semester']) {
        apiRespond(
            false,
            null,
            'Sessions must share the same course code, course title, lecturer, and semester to combine (course code alone is not reliable — this dataset has coincidental code collisions between unrelated courses).',
            422
        );
    }
}

$secondaryIds = array_slice(array_column($sessions, 'session_id'), 1);

// Collect every class group across ALL sessions being merged (primary + secondaries),
// then verify the union can legally sit in the primary's slot — otherwise merging
// would silently double-book whichever group's own separate session collides.
$allGroupIds = [];
$groupLookupStmt = $pdo->prepare('SELECT class_group_id FROM session_class_groups WHERE session_id = ?');
foreach ($sessionIds as $sid) {
    $groupLookupStmt->execute([$sid]);
    foreach ($groupLookupStmt->fetchAll() as $row) {
        $allGroupIds[] = $row['class_group_id'];
    }
}
$allGroupIds = array_values(array_unique($allGroupIds));

$existingForCheck = $pdo->prepare(
    'SELECT ts.session_id, ts.room_id, ts.time_slot_id, ts.lecturer_id, sg.class_group_id
     FROM timetable_sessions ts
     JOIN session_class_groups sg ON sg.session_id = ts.session_id
     WHERE ts.session_id NOT IN (' . implode(',', array_fill(0, count($sessionIds), '?')) . ')
           AND ts.semester = ?'
);
$existingForCheck->execute(array_merge($sessionIds, [$primary['semester']]));
$existingRows = $existingForCheck->fetchAll();

$grouped = [];
foreach ($existingRows as $row) {
    $key = $row['session_id'];
    $grouped[$key]['lecturer_id'] = $row['lecturer_id'];
    $grouped[$key]['room_id'] = $row['room_id'];
    $grouped[$key]['time_slot_id'] = $row['time_slot_id'];
    $grouped[$key]['class_group_ids'][] = $row['class_group_id'];
}
$existingSessions = array_values($grouped);

$slotStmt = $pdo->prepare('SELECT is_break FROM time_slots WHERE time_slot_id = ?');
$slotStmt->execute([$primary['time_slot_id']]);
$primarySlotIsBreak = (bool) $slotStmt->fetchColumn();

$conflict = hasConflict(
    $existingSessions,
    $primary['lecturer_id'],
    $primary['room_id'],
    $primary['time_slot_id'],
    $allGroupIds,
    $primarySlotIsBreak
);

if ($conflict !== null) {
    apiRespond(
        false,
        ['conflict_type' => $conflict],
        'Combining these would double-book one of the class groups — another session already occupies that slot.',
        409
    );
}

try {
    $pdo->beginTransaction();

    // Collect class groups from every secondary session and attach them to the primary
    $groupStmt = $pdo->prepare('SELECT class_group_id FROM session_class_groups WHERE session_id = ?');
    $attachStmt = $pdo->prepare(
        'INSERT IGNORE INTO session_class_groups (session_id, class_group_id) VALUES (?, ?)'
    );

    foreach ($secondaryIds as $sid) {
        $groupStmt->execute([$sid]);
        foreach ($groupStmt->fetchAll() as $row) {
            $attachStmt->execute([$primary['session_id'], $row['class_group_id']]);
        }
    }

    // Delete the now-redundant secondary sessions (cascades their session_class_groups rows)
    $delPlaceholders = implode(',', array_fill(0, count($secondaryIds), '?'));
    $pdo->prepare("DELETE FROM timetable_sessions WHERE session_id IN ($delPlaceholders)")
        ->execute($secondaryIds);

    $pdo->prepare('UPDATE timetable_sessions SET is_combined = 1 WHERE session_id = ?')
        ->execute([$primary['session_id']]);

    $pdo->commit();
    logActivity($admin['id'], "Combined sessions [" . implode(',', $sessionIds) . "] into #{$primary['session_id']}");

    apiRespond(true, ['primary_session_id' => $primary['session_id']], 'Classes combined successfully.');
} catch (Throwable $e) {
    $pdo->rollBack();
    apiRespond(false, null, 'Combine failed: ' . $e->getMessage(), 500);
}
