<?php
/**
 * POST /api/lock.php
 * Body: { "session_id": int, "locked": bool }
 *
 * Toggles is_locked on a session. Locked sessions are skipped by swap,
 * move, and regenerate.
 */

require_once __DIR__ . '/_bootstrap.php';

$admin = apiRequireAdmin();
apiRequirePost();

$body = apiBody();
$sessionId = (int) ($body['session_id'] ?? 0);
$locked = filter_var($body['locked'] ?? true, FILTER_VALIDATE_BOOLEAN);

if (!$sessionId) {
    apiRespond(false, null, 'session_id is required.', 422);
}

$pdo = getDbConnection();
$stmt = $pdo->prepare('UPDATE timetable_sessions SET is_locked = ? WHERE session_id = ?');
$stmt->execute([$locked ? 1 : 0, $sessionId]);

if ($stmt->rowCount() === 0) {
    apiRespond(false, null, 'Session not found.', 404);
}

logActivity($admin['id'], ($locked ? 'Locked' : 'Unlocked') . " session #{$sessionId}");

apiRespond(true, null, $locked ? 'Session locked.' : 'Session unlocked.');
