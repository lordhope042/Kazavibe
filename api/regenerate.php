<?php
/**
 * POST /api/regenerate.php
 * Body: { "semester": "first" | "second", "department_id": int, "class_group_id": int (optional) }
 *
 * Like generate.php, but explicitly framed around locks: any course with
 * at least one locked OR published session is left completely untouched.
 * Every other department's sessions — and, when a specific level was
 * chosen, every other level's courses in this department — are also
 * always protected. Everything else in the target scope is wiped and
 * regenerated fresh around those protected placements.
 */

require_once __DIR__ . '/_bootstrap.php';

$admin = apiRequireAdmin();
apiRequirePost();

$body = apiBody();
$semester = $body['semester'] ?? null;
$departmentId = (int) ($body['department_id'] ?? 0);
$classGroupId = (int) ($body['class_group_id'] ?? 0);

if (!in_array($semester, ['first', 'second'], true)) {
    apiRespond(false, null, 'semester must be "first" or "second".', 422);
}
if (!$departmentId) {
    apiRespond(false, null, 'department_id is required.', 422);
}

$pdo = getDbConnection();

try {
    $pdo->beginTransaction();
    $protected = getProtectedSessions($pdo, $semester, $departmentId, $classGroupId);

    $excludeList = $protected['excludeCourseIds'] ?: [0];
    $placeholders = implode(',', array_fill(0, count($excludeList), '?'));
    $levelSql = $classGroupId ? ' AND c.class_group_id = ?' : '';
    $params = array_merge([$semester, $departmentId], $classGroupId ? [$classGroupId] : [], $excludeList);
    $pdo->prepare(
        "DELETE ts FROM timetable_sessions ts
         JOIN courses c ON c.course_id = ts.course_id
         JOIN class_groups cg ON cg.class_group_id = c.class_group_id
         WHERE c.semester = ? AND cg.department_id = ? AND ts.status = 'draft'{$levelSql}
               AND c.course_id NOT IN ($placeholders)"
    )->execute($params);

    $result = generateTimetable($pdo, $semester, $departmentId, $protected['prePlaced'], $protected['excludeCourseIds']);
    saveGeneratedTimetable($pdo, $result['sessions']);
    $pdo->commit();

    $scopeLabel = $classGroupId ? "level #{$classGroupId} of department #{$departmentId}" : "department #{$departmentId}";
    logActivity($admin['id'], "Regenerated {$semester} semester timetable for {$scopeLabel}");

    apiRespond(true, [
        'placed_sessions'   => count($result['sessions']),
        'preserved_courses' => count($protected['excludeCourseIds']),
        'unscheduled'       => $result['unscheduled'],
    ], 'Timetable regenerated, locked and published sessions preserved.');
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    apiRespond(false, null, 'Regenerate failed: ' . $e->getMessage(), 500);
}
