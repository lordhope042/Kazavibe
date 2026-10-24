<?php
/**
 * POST /api/alternative.php
 * Body: { "session_id": int, "limit": int (optional, default 5) }
 *
 * Returns valid (room, time_slot) alternatives for the given session,
 * excluding its current placement. Read-only — does not move anything.
 */

require_once __DIR__ . '/_bootstrap.php';

apiRequireAdmin();
apiRequirePost();

$body = apiBody();
$sessionId = (int) ($body['session_id'] ?? 0);
$limit = (int) ($body['limit'] ?? 5);

if (!$sessionId) {
    apiRespond(false, null, 'session_id is required.', 422);
}

$pdo = getDbConnection();
$alternatives = findAlternatives($pdo, $sessionId, $limit);

if (empty($alternatives)) {
    apiRespond(true, [], 'No valid alternative slots found — try adjusting rooms or hours.');
}

$formatted = array_map(function ($alt) {
    return [
        'room_id'      => $alt['room']['room_id'],
        'room_name'    => $alt['room']['name'],
        'time_slot_id' => $alt['time_slot']['time_slot_id'],
        'day_of_week'  => $alt['time_slot']['day_of_week'],
        'start_time'   => $alt['time_slot']['start_time'],
        'end_time'     => $alt['time_slot']['end_time'],
    ];
}, $alternatives);

apiRespond(true, $formatted);
