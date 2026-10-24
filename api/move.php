<?php
/**
 * POST /api/move.php
 * Body: { "session_id": int, "room_id": int, "time_slot_id": int }
 *
 * Applies a specific (room, time_slot) to a session — typically one of the
 * options returned by alternative.php. Re-validates before applying.
 * Rejects locked sessions.
 */

require_once __DIR__ . '/_bootstrap.php';

$admin = apiRequireAdmin();
apiRequirePost();

$body = apiBody();
$sessionId  = (int) ($body['session_id'] ?? 0);
$roomId     = (int) ($body['room_id'] ?? 0);
$timeSlotId = (int) ($body['time_slot_id'] ?? 0);

if (!$sessionId || !$roomId || !$timeSlotId) {
    apiRespond(false, null, 'session_id, room_id, and time_slot_id are required.', 422);
}

$pdo = getDbConnection();

$stmt = $pdo->prepare(
    'SELECT ts.*, c.class_group_id AS primary_class_group_id
     FROM timetable_sessions ts
     JOIN courses c ON c.course_id = ts.course_id
     WHERE ts.session_id = ?'
);
$stmt->execute([$sessionId]);
$session = $stmt->fetch();

if (!$session) {
    apiRespond(false, null, 'Session not found.', 404);
}
if ($session['is_locked']) {
    apiRespond(false, null, 'Cannot move a locked session. Unlock it first.', 409);
}

$classGroups = $pdo->prepare('SELECT class_group_id FROM session_class_groups WHERE session_id = ?');
$classGroups->execute([$sessionId]);
$groupIds = array_column($classGroups->fetchAll(), 'class_group_id');

$existing = $pdo->prepare(
    "SELECT ts.session_id, ts.room_id, ts.time_slot_id, ts.lecturer_id, sg.class_group_id
     FROM timetable_sessions ts
     JOIN session_class_groups sg ON sg.session_id = ts.session_id
     WHERE ts.session_id != ? AND ts.semester = ?"
);
$existing->execute([$sessionId, $session['semester']]);
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

$slotStmt = $pdo->prepare('SELECT is_break FROM time_slots WHERE time_slot_id = ?');
$slotStmt->execute([$timeSlotId]);
$isBreak = (bool) $slotStmt->fetchColumn();

$conflict = hasConflict($existingSessions, $session['lecturer_id'], $roomId, $timeSlotId, $groupIds, $isBreak);

if ($conflict !== null) {
    apiRespond(false, ['conflict_type' => $conflict], 'That slot is no longer available.', 409);
}

$pdo->prepare('UPDATE timetable_sessions SET room_id = ?, time_slot_id = ? WHERE session_id = ?')
    ->execute([$roomId, $timeSlotId, $sessionId]);

logActivity($admin['id'], "Moved session #{$sessionId} to a new room/time slot");

apiRespond(true, null, 'Session moved successfully.');
