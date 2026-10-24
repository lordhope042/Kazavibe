<?php
require_once __DIR__ . '/../../includes/auth.php';
requireAdmin();

$pdo = getDbConnection();
$errors = [];
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id           = $_POST['lecturer_id'] ?? null;
    $name         = trim($_POST['full_name'] ?? '');
    $email        = trim($_POST['email'] ?? '') ?: null;
    $phone        = trim($_POST['phone'] ?? '') ?: null;
    $selectedIds  = array_map('intval', $_POST['course_ids'] ?? []);

    if ($name === '') {
        $errors[] = 'Full name is required.';
    } else {
        try {
            $pdo->beginTransaction();

            if ($id) {
                $pdo->prepare('UPDATE lecturers SET full_name=?, email=?, phone=? WHERE lecturer_id=?')
                    ->execute([$name, $email, $phone, $id]);
                $lecturerId = $id;
                $success = 'Lecturer updated.';
            } else {
                $pdo->prepare('INSERT INTO lecturers (full_name, email, phone) VALUES (?,?,?)')
                    ->execute([$name, $email, $phone]);
                $lecturerId = $pdo->lastInsertId();
                $success = 'Lecturer added.';
            }

            // Unassign any courses this lecturer previously had that were
            // unchecked, then assign whichever ones are checked now.
            if (!empty($selectedIds)) {
                $placeholders = implode(',', array_fill(0, count($selectedIds), '?'));
                $pdo->prepare("UPDATE courses SET lecturer_id = NULL WHERE lecturer_id = ? AND course_id NOT IN ($placeholders)")
                    ->execute(array_merge([$lecturerId], $selectedIds));
                $pdo->prepare("UPDATE courses SET lecturer_id = ? WHERE course_id IN ($placeholders)")
                    ->execute(array_merge([$lecturerId], $selectedIds));
            } else {
                $pdo->prepare('UPDATE courses SET lecturer_id = NULL WHERE lecturer_id = ?')->execute([$lecturerId]);
            }

            $pdo->commit();
            logActivity(currentAdmin()['id'], "Saved lecturer {$name} (" . count($selectedIds) . ' courses assigned)');
        } catch (PDOException $e) {
            $pdo->rollBack();
            $errors[] = str_contains($e->getMessage(), 'Duplicate')
                ? 'That email is already in use.'
                : 'Could not save lecturer: ' . $e->getMessage();
        }
    }
}

if (isset($_POST['deactivate_record_id'])) {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? null)) { http_response_code(419); exit('Security token expired.'); }
    $targetId = (int) $_POST['deactivate_record_id'];
    $pdo->prepare('UPDATE lecturers SET is_active = 0 WHERE lecturer_id = ?')->execute([$targetId]);
    $pdo->prepare('UPDATE courses SET lecturer_id = NULL WHERE lecturer_id = ?')->execute([$targetId]);
    logActivity(currentAdmin()['id'], 'Deactivated record #' . $targetId);
    header('Location: lecturers.php'); exit;
}

$editLecturer = null;
$assignedCourseIds = [];
if (isset($_GET['edit'])) {
    $stmt = $pdo->prepare('SELECT * FROM lecturers WHERE lecturer_id = ?');
    $stmt->execute([$_GET['edit']]);
    $editLecturer = $stmt->fetch();

    if ($editLecturer) {
        $assignedStmt = $pdo->prepare('SELECT course_id FROM courses WHERE lecturer_id = ?');
        $assignedStmt->execute([$editLecturer['lecturer_id']]);
        $assignedCourseIds = array_column($assignedStmt->fetchAll(), 'course_id');
    }
}

// Every active course, grouped by class group, with whichever lecturer
// currently teaches it (so the admin can see if they're reassigning
// something away from someone else).
$allCourses = $pdo->query(
    "SELECT c.course_id, c.course_code, c.course_title, c.semester,
            cg.name AS class_group_name, l.full_name AS current_lecturer_name
     FROM courses c
     JOIN class_groups cg ON cg.class_group_id = c.class_group_id
     LEFT JOIN lecturers l ON l.lecturer_id = c.lecturer_id
     WHERE c.is_active = 1
     ORDER BY cg.program, cg.level, c.semester, c.course_code"
)->fetchAll();

$coursesByGroup = [];
foreach ($allCourses as $c) {
    $coursesByGroup[$c['class_group_name']][] = $c;
}

$lecturers = $pdo->query(
    "SELECT l.*, COUNT(c.course_id) AS course_count
     FROM lecturers l
     LEFT JOIN courses c ON c.lecturer_id = l.lecturer_id AND c.is_active = 1
     WHERE l.is_active = 1
     GROUP BY l.lecturer_id
     ORDER BY l.full_name"
)->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Lecturers | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/admin.css">
<style>
  .course-picker {
    max-height: 260px; overflow-y: auto; border: 1px solid var(--border);
    border-radius: 6px; padding: 10px 14px; background: var(--white);
  }
  .course-picker h4 { margin: 10px 0 4px; font-size: 12px; color: var(--muted); text-transform: uppercase; }
  .course-picker h4:first-child { margin-top: 0; }
  .course-picker label { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 3px 0; font-weight: normal; text-transform: none; color: var(--text); }
  .course-picker input[type="checkbox"] { width: auto; }
  .course-picker .taken-by { color: var(--red); font-size: 11px; margin-left: auto; }
</style>
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Lecturers</h1>
    <p><?= count($lecturers) ?> registered lecturers</p>
  </header>

  <?php foreach ($errors as $e): ?><div class="alert-box alert-error"><?= htmlspecialchars($e) ?></div><?php endforeach; ?>
  <?php if ($success): ?><div class="alert-box alert-success"><?= htmlspecialchars($success) ?></div><?php endif; ?>

  <section class="panel">
    <div class="panel-header"><h2><?= $editLecturer ? 'Edit Lecturer' : 'Add Lecturer' ?></h2></div>
    <form method="post" class="form-grid">
      <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken()) ?>">
      <?php if ($editLecturer): ?><input type="hidden" name="lecturer_id" value="<?= $editLecturer['lecturer_id'] ?>"><?php endif; ?>
      <div>
        <label>Full Name</label>
        <input type="text" name="full_name" value="<?= htmlspecialchars($editLecturer['full_name'] ?? '') ?>" required>
      </div>
      <div>
        <label>Email</label>
        <input type="email" name="email" value="<?= htmlspecialchars($editLecturer['email'] ?? '') ?>">
      </div>
      <div>
        <label>Phone</label>
        <input type="text" name="phone" value="<?= htmlspecialchars($editLecturer['phone'] ?? '') ?>">
      </div>

      <div style="grid-column:1/-1;">
        <label>Courses Taught</label>
        <div class="course-picker">
          <?php foreach ($coursesByGroup as $groupName => $courses): ?>
            <h4><?= htmlspecialchars($groupName) ?></h4>
            <?php foreach ($courses as $c): ?>
              <?php
                $isChecked = in_array($c['course_id'], $assignedCourseIds, true);
                $takenByOther = $c['current_lecturer_name'] && !$isChecked;
              ?>
              <label>
                <input type="checkbox" name="course_ids[]" value="<?= $c['course_id'] ?>" <?= $isChecked ? 'checked' : '' ?>>
                <?= htmlspecialchars($c['course_code']) ?> — <?= htmlspecialchars($c['course_title']) ?> (<?= ucfirst($c['semester']) ?>)
                <?php if ($takenByOther): ?>
                  <span class="taken-by">currently: <?= htmlspecialchars($c['current_lecturer_name']) ?></span>
                <?php endif; ?>
              </label>
            <?php endforeach; ?>
          <?php endforeach; ?>
          <?php if (empty($allCourses)): ?><p class="empty-state">No courses yet — add some on the Courses page first.</p><?php endif; ?>
        </div>
        <p class="field-hint" style="font-size:12px; color:var(--muted); margin-top:6px;">
          Checking a course that's currently taught by someone else will reassign it to this lecturer.
        </p>
      </div>

      <div style="grid-column:1/-1;" class="actions">
        <button type="submit" class="btn btn-primary"><?= $editLecturer ? 'Update' : 'Add Lecturer' ?></button>
        <?php if ($editLecturer): ?><a href="lecturers.php" class="btn btn-outline">Cancel</a><?php endif; ?>
      </div>
    </form>
  </section>

  <section class="panel">
    <div class="panel-header"><h2>All Lecturers</h2></div>
    <table>
      <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Courses</th><th></th></tr></thead>
      <tbody>
        <?php foreach ($lecturers as $l): ?>
          <tr>
            <td><?= htmlspecialchars($l['full_name']) ?></td>
            <td><?= htmlspecialchars($l['email'] ?? '—') ?></td>
            <td><?= htmlspecialchars($l['phone'] ?? '—') ?></td>
            <td><?= $l['course_count'] ?></td>
            <td class="actions">
              <a href="?edit=<?= $l['lecturer_id'] ?>" class="btn btn-outline">Edit</a>
              <form method="post" class="inline-form"><input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken()) ?>"><input type="hidden" name="deactivate_record_id" value="<?= (int) $l['lecturer_id'] ?>"><button type="submit" class="btn btn-danger" data-confirm="Deactivate this lecturer? Their courses will become unassigned.">Deactivate</button></form>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if (empty($lecturers)): ?><tr><td colspan="5" class="empty-state">No lecturers yet.</td></tr><?php endif; ?>
      </tbody>
    </table>
  </section>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
