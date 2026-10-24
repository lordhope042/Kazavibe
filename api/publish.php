<?php
/**
 * POST /api/publish.php
 * Body: { "semester": "first" | "second", "department_id": int, "class_group_id": int (optional) }
 *
 * Flips draft sessions to published for the given department + semester
 * (optionally scoped to just one level), and pushes a notification to
 * every affected student. This is the final step of Review -> Approve ->
 * Publish. Scoped independently, so one level or department can be
 * reviewed and published without forcing everything else to publish too.
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
$levelSql = $classGroupId ? ' AND c.class_group_id = ?' : '';
$scopeParams = array_merge([$semester, $departmentId], $classGroupId ? [$classGroupId] : []);

try {
    $pdo->beginTransaction();

    $countStmt = $pdo->prepare(
        "SELECT COUNT(*) FROM timetable_sessions ts
         JOIN courses c ON c.course_id = ts.course_id
         JOIN class_groups cg ON cg.class_group_id = c.class_group_id
         WHERE c.semester = ? AND cg.department_id = ?{$levelSql} AND ts.status = 'draft'"
    );
    $countStmt->execute($scopeParams);
    $draftCount = (int) $countStmt->fetchColumn();

    if ($draftCount === 0) {
        $pdo->rollBack();
        apiRespond(false, null, 'No draft timetable found for that scope. Generate one first.', 404);
    }

    $pdo->prepare(
        "UPDATE timetable_sessions ts
         JOIN courses c ON c.course_id = ts.course_id
         JOIN class_groups cg ON cg.class_group_id = c.class_group_id
         SET ts.status = 'published'
         WHERE c.semester = ? AND cg.department_id = ?{$levelSql} AND ts.status = 'draft'"
    )->execute($scopeParams);

    // Notify every student whose class group has a session in this scope
    $studentStmt = $pdo->prepare(
        "SELECT DISTINCT s.student_id
         FROM students s
         JOIN session_class_groups sg ON sg.class_group_id = s.class_group_id
         JOIN timetable_sessions ts ON ts.session_id = sg.session_id
         JOIN courses c ON c.course_id = ts.course_id
         JOIN class_groups cg ON cg.class_group_id = c.class_group_id
         WHERE c.semester = ? AND cg.department_id = ?{$levelSql} AND ts.status = 'published'"
    );
    $studentStmt->execute($scopeParams);
    $students = $studentStmt->fetchAll();

    $notifyStmt = $pdo->prepare(
        'INSERT INTO notifications (student_id, message) VALUES (?, ?)'
    );
    $message = ucfirst($semester) . ' semester timetable has been published.';
    foreach ($students as $row) {
        $notifyStmt->execute([$row['student_id'], $message]);
    }

    $pdo->commit();
    $scopeLabel = $classGroupId ? "level #{$classGroupId} of department #{$departmentId}" : "department #{$departmentId}";
    logActivity($admin['id'], "Published {$semester} semester timetable for {$scopeLabel} ({$draftCount} sessions)");

    apiRespond(true, [
        'published_sessions' => $draftCount,
        'notified_students'  => count($students),
    ], 'Timetable published successfully.');
} catch (Throwable $e) {
    $pdo->rollBack();
    apiRespond(false, null, 'Publish failed: ' . $e->getMessage(), 500);
}
