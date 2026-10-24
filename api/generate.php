<?php
/**
 * POST /api/generate.php
 * Body: { "semester": "first" | "second", "department_id": int, "class_group_id": int (optional, 0 or omitted = whole department) }
 *
 * Runs the greedy generator for the given department + semester (optionally
 * scoped to just ONE level/class group), wipes existing draft sessions for
 * that scope, and saves the new draft. Does NOT publish — admin must
 * review then call publish.php.
 *
 * Courses that already have a locked OR published session are skipped
 * entirely, and their existing placements are treated as occupied. Every
 * OTHER department's sessions — and, when a specific level was chosen,
 * every OTHER level's courses in this department — are also treated as
 * occupied and never touched, since rooms and lecturers are shared
 * resources, not owned by one department or one level.
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

    // Wipe only the target scope's draft sessions that aren't protected —
    // scoped explicitly (department, and level when given) as a safeguard,
    // not just relying on the exclude list.
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

    if (!empty($result['unscheduled'])) {
        $logStmt = $pdo->prepare(
            "INSERT INTO conflicts_log (session_id, conflict_type, description) VALUES (NULL, 'other', ?)"
        );
        foreach ($result['unscheduled'] as $u) {
            $logStmt->execute([
                "Course ID {$u['course_id']} only placed {$u['placed']}/{$u['required']} required sessions.",
            ]);
        }
    }

    $scopeLabel = $classGroupId ? "level #{$classGroupId} of department #{$departmentId}" : "department #{$departmentId}";
    logActivity($admin['id'], "Generated {$semester} semester timetable for {$scopeLabel} (draft)");

    apiRespond(true, [
        'placed_sessions'    => count($result['sessions']),
        'preserved_courses'  => count($protected['excludeCourseIds']),
        'unscheduled'        => $result['unscheduled'],
    ], 'Timetable generated as draft. Review before publishing.');
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    apiRespond(false, null, 'Generation failed: ' . $e->getMessage(), 500);
}
