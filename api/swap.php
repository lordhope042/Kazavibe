<?php
/**
 * POST /api/swap.php
 * Body: { "session_id_a": int, "session_id_b": int }
 *
 * Exchanges the time slots of two sessions. Each session keeps its own
 * (dedicated) classroom. Both must be unlocked.
 * Re-validates the result against hard constraints; rejects if either
 * swapped placement would create a new conflict.
 */

require_once __DIR__ . '/_bootstrap.php';

$admin = apiRequireAdmin();
apiRequirePost();

$body = apiBody();
$idA = (int) ($body['session_id_a'] ?? 0);
$idB = (int) ($body['session_id_b'] ?? 0);

if (!$idA || !$idB || $idA === $idB) {
    apiRespond(false, null, 'Provide two distinct session IDs.', 422);
}

$pdo = getDbConnection();

$stmt = $pdo->prepare('SELECT * FROM timetable_sessions WHERE session_id IN (?, ?)');
$stmt->execute([$idA, $idB]);
$sessions = $stmt->fetchAll(PDO::FETCH_UNIQUE);

if (count($sessions) !== 2) {
    apiRespond(false, null, 'One or both sessions not found.', 404);
}

$a = $sessions[$idA];
$b = $sessions[$idB];

if ($a['is_locked'] || $b['is_locked']) {
    apiRespond(false, null, 'Cannot swap a locked session.', 409);
}
if ($a['semester'] !== $b['semester']) {
    apiRespond(false, null, 'Cannot swap sessions from different semesters.', 422);
}
$semester = $a['semester'];

// Build the "existing sessions" list (excluding a and b) for conflict
// checking — scoped to the SAME semester only. First and second semester
// are separate, non-overlapping stretches of the year, so a session in a
// different semester using the same room/slot is not a real conflict.
$existing = $pdo->prepare(
    'SELECT ts.session_id, ts.room_id, ts.time_slot_id, ts.lecturer_id, sg.class_group_id
     FROM timetable_sessions ts
     JOIN session_class_groups sg ON sg.session_id = ts.session_id
     WHERE ts.session_id NOT IN (?, ?) AND ts.semester = ?'
);
$existing->execute([$idA, $idB, $semester]);
$existing = $existing->fetchAll();

$grouped = [];
foreach ($existing as $row) {
    $key = $row['session_id'];
    $grouped[$key]['lecturer_id'] = $row['lecturer_id'];
    $grouped[$key]['room_id'] = $row['room_id'];
    $grouped[$key]['time_slot_id'] = $row['time_slot_id'];
    $grouped[$key]['class_group_ids'][] = $row['class_group_id'];
}
$existingSessions = array_values($grouped);

function classGroupsFor(PDO $pdo, int $sessionId): array
{
    $s = $pdo->prepare('SELECT class_group_id FROM session_class_groups WHERE session_id = ?');
    $s->execute([$sessionId]);
    return array_column($s->fetchAll(), 'class_group_id');
}

$aGroups = classGroupsFor($pdo, $idA);
$bGroups = classGroupsFor($pdo, $idB);

$slotStmt = $pdo->prepare('SELECT is_break FROM time_slots WHERE time_slot_id = ?');

$slotStmt->execute([$b['time_slot_id']]);
$aNewSlotIsBreak = (bool) $slotStmt->fetchColumn();
$conflictForA = hasConflict($existingSessions, $a['lecturer_id'], $a['room_id'], $b['time_slot_id'], $aGroups, $aNewSlotIsBreak);

$slotStmt->execute([$a['time_slot_id']]);
$bNewSlotIsBreak = (bool) $slotStmt->fetchColumn();
$conflictForB = hasConflict($existingSessions, $b['lecturer_id'], $b['room_id'], $a['time_slot_id'], $bGroups, $bNewSlotIsBreak);

if ($conflictForA !== null || $conflictForB !== null) {
    apiRespond(false, [
        'conflict_a' => $conflictForA,
        'conflict_b' => $conflictForB,
    ], 'Swap would create a conflict.', 409);
}

try {
    $pdo->beginTransaction();

    // The table enforces UNIQUE(room_id, time_slot_id), and swapping two
    // sessions means each one's target is the OTHER's current occupied
    // slot. Two straight sequential UPDATEs collide the instant the first
    // one lands, since session B still holds that exact slot at that
    // moment — the DB checks uniqueness immediately, not at commit. Park A
    // in any genuinely free slot first, move B into A's old spot, then
    // move A from the scratch spot into B's old spot. Three updates,
    // never a transient duplicate.
    $scratch = $pdo->prepare(
        'SELECT r.room_id, t.time_slot_id
         FROM rooms r
         CROSS JOIN time_slots t
         LEFT JOIN timetable_sessions ts ON ts.room_id = r.room_id AND ts.time_slot_id = t.time_slot_id AND ts.semester = ?
         WHERE r.is_active = 1 AND t.is_active = 1 AND t.is_break = 0 AND ts.session_id IS NULL
         LIMIT 1'
    );
    $scratch->execute([$semester]);
    $scratch = $scratch->fetch();

    if (!$scratch) {
        $pdo->rollBack();
        apiRespond(false, null, 'No free slot available to perform the swap safely (timetable is fully saturated).', 409);
    }

    $update = $pdo->prepare('UPDATE timetable_sessions SET room_id = ?, time_slot_id = ? WHERE session_id = ?');
    $update->execute([$scratch['room_id'], $scratch['time_slot_id'], $idA]); // park A
    $update->execute([$b['room_id'], $a['time_slot_id'], $idB]);             // B keeps its room, takes A's old time
    $update->execute([$a['room_id'], $b['time_slot_id'], $idA]);             // A keeps its room, takes B's old time

    $pdo->commit();
    logActivity($admin['id'], "Swapped session #{$idA} and #{$idB}");

    apiRespond(true, null, 'Sessions swapped successfully.');
} catch (Throwable $e) {
    $pdo->rollBack();
    apiRespond(false, null, 'Swap failed: ' . $e->getMessage(), 500);
}
