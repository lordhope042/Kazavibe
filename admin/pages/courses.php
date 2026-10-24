<?php
require_once __DIR__ . '/../../includes/auth.php';
requireAdmin();

$pdo = getDbConnection();
$errors = [];
$success = null;

// ---------- Handle form submit (add or update) ----------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $courseId    = $_POST['course_id'] ?? null;
    $code        = trim($_POST['course_code'] ?? '');
    $title       = trim($_POST['course_title'] ?? '');
    $classGroup  = $_POST['class_group_id'] ?? '';
    $semester    = $_POST['semester'] ?? '';
    $lecturer    = $_POST['lecturer_id'] ?: null;
    $credit      = (int) ($_POST['credit_unit'] ?? 0);
    $sessions    = max(1, (int) ($_POST['sessions_required'] ?? 1));
    $sessionType = $_POST['session_type'] ?? 'lecture';

    if ($code === '' || $title === '' || !$classGroup || !$semester) {
        $errors[] = 'Course code, title, class group, and semester are required.';
    }

    if (empty($errors)) {
        try {
            if ($courseId) {
                $stmt = $pdo->prepare(
                    'UPDATE courses SET course_code=?, course_title=?, class_group_id=?, semester=?,
                     lecturer_id=?, credit_unit=?, sessions_required=?, session_type=?
                     WHERE course_id=?'
                );
                $stmt->execute([$code, $title, $classGroup, $semester, $lecturer, $credit, $sessions, $sessionType, $courseId]);
                $success = 'Course updated.';
            } else {
                $stmt = $pdo->prepare(
                    'INSERT INTO courses (course_code, course_title, class_group_id, semester, lecturer_id,
                     credit_unit, sessions_required, session_type)
                     VALUES (?,?,?,?,?,?,?,?)'
                );
                $stmt->execute([$code, $title, $classGroup, $semester, $lecturer, $credit, $sessions, $sessionType]);
                $success = 'Course added.';
            }
            logActivity(currentAdmin()['id'], "Saved course {$code}");
        } catch (PDOException $e) {
            $errors[] = str_contains($e->getMessage(), 'Duplicate')
                ? 'That course code already exists for this class group and semester.'
                : 'Could not save course: ' . $e->getMessage();
        }
    }
}

// ---------- Handle delete ----------
if (isset($_POST['deactivate_record_id'])) {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? null)) { http_response_code(419); exit('Security token expired.'); }
    $targetId = (int) $_POST['deactivate_record_id'];
    $pdo->prepare('UPDATE courses SET is_active = 0 WHERE course_id = ?')->execute([$targetId]);
    logActivity(currentAdmin()['id'], 'Deactivated record #' . $targetId);
    header('Location: courses.php'); exit;
}

$departments = $pdo->query('SELECT * FROM departments ORDER BY name')->fetchAll();
$departmentId = (int) ($_GET['department_id'] ?? ($departments[0]['department_id'] ?? 0));
if (!in_array($departmentId, array_column($departments, 'department_id'), true) && !empty($departments)) {
    $departmentId = (int) $departments[0]['department_id'];
}

$classGroups = $pdo->prepare(
    "SELECT * FROM class_groups
     WHERE department_id = ?
     ORDER BY
       CASE WHEN program = 'ND' THEN 0 ELSE 1 END,
       CASE level WHEN '100' THEN 100 WHEN '200' THEN 200 WHEN '300' THEN 300 WHEN '400' THEN 400 ELSE 999 END,
       CASE specialization WHEN 'NCC' THEN 0 WHEN 'SWD' THEN 1 ELSE 2 END"
);
$classGroups->execute([$departmentId]);
$classGroups = $classGroups->fetchAll();
$lecturers   = $pdo->query('SELECT * FROM lecturers WHERE is_active = 1 ORDER BY full_name')->fetchAll();

$editCourse = null;
if (isset($_GET['edit'])) {
    $stmt = $pdo->prepare('SELECT * FROM courses WHERE course_id = ?');
    $stmt->execute([$_GET['edit']]);
    $editCourse = $stmt->fetch();
}

$courses = $pdo->prepare(
    "SELECT c.*, cg.name AS class_group_name, cg.program, cg.level, cg.specialization, l.full_name AS lecturer_name
     FROM courses c
     JOIN class_groups cg ON cg.class_group_id = c.class_group_id
     LEFT JOIN lecturers l ON l.lecturer_id = c.lecturer_id
     WHERE c.is_active = 1 AND cg.department_id = ?
     ORDER BY
       CASE WHEN cg.program = 'ND' THEN 0 ELSE 1 END,
       CASE cg.level WHEN '100' THEN 100 WHEN '200' THEN 200 WHEN '300' THEN 300 WHEN '400' THEN 400 ELSE 999 END,
       CASE cg.specialization WHEN 'NCC' THEN 0 WHEN 'SWD' THEN 1 ELSE 2 END,
       c.semester, c.course_code"
);
$courses->execute([$departmentId]);
$courses = $courses->fetchAll();

// Group courses by program + specialization + level so each academic
// cohort has its own clear section: ND 100, ND 200, HND NCC 300,
// HND NCC 400, HND SWD 300 and HND SWD 400.
$coursesByLevel = [];
foreach ($courses as $c) {
    $program = strtoupper(trim($c['program'] ?? ''));
    $level = trim((string) ($c['level'] ?? ''));
    $specialization = strtoupper(trim($c['specialization'] ?? ''));
    $groupKey = $program . '|' . $specialization . '|' . $level;

    if ($program === 'HND' && $specialization !== '') {
        $groupName = 'HND ' . $specialization . ' ' . $level;
    } else {
        $groupName = trim($program . ' ' . $level);
    }

    if (!isset($coursesByLevel[$groupKey])) {
        $coursesByLevel[$groupKey] = [
            'name' => $groupName,
            'level' => $level,
            'program' => $program,
            'specialization' => $specialization,
            'rows' => ['first' => [], 'second' => []],
        ];
    }
    
    $semesterKey = strtolower($c['semester'] ?? 'first') === 'second' ? 'second' : 'first';
    $coursesByLevel[$groupKey]['rows'][$semesterKey][] = $c;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Courses | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/admin.css">
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Courses</h1>
    <form method="get" style="margin:0;">
      <select name="department_id" onchange="this.form.submit()">
        <?php foreach ($departments as $d): ?>
          <option value="<?= $d['department_id'] ?>" <?= $departmentId === (int) $d['department_id'] ? 'selected' : '' ?>><?= htmlspecialchars($d['name']) ?></option>
        <?php endforeach; ?>
      </select>
    </form>
  </header>


  <?php foreach ($errors as $e): ?><div class="alert-box alert-error"><?= htmlspecialchars($e) ?></div><?php endforeach; ?>
  <?php if ($success): ?><div class="alert-box alert-success"><?= htmlspecialchars($success) ?></div><?php endif; ?>

  <section class="panel">
    <div class="panel-header"><h2><?= $editCourse ? 'Edit Course' : 'Add Course' ?></h2></div>
    <form method="post" class="form-grid">
      <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken()) ?>">
      <?php if ($editCourse): ?><input type="hidden" name="course_id" value="<?= $editCourse['course_id'] ?>"><?php endif; ?>

      <div>
        <label>Course Code</label>
        <input type="text" name="course_code" value="<?= htmlspecialchars($editCourse['course_code'] ?? '') ?>" placeholder="e.g. SWD 312" required>
      </div>
      <div>
        <label>Course Title</label>
        <input type="text" name="course_title" value="<?= htmlspecialchars($editCourse['course_title'] ?? '') ?>" required>
      </div>
      <div>
        <label>Class Group</label>
        <select name="class_group_id" required>
          <option value="">Select...</option>
          <?php foreach ($classGroups as $g): ?>
            <option value="<?= $g['class_group_id'] ?>" <?= ($editCourse['class_group_id'] ?? '') == $g['class_group_id'] ? 'selected' : '' ?>>
              <?= htmlspecialchars($g['name']) ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label>Semester</label>
        <select name="semester" required>
          <option value="first" <?= ($editCourse['semester'] ?? '') === 'first' ? 'selected' : '' ?>>First</option>
          <option value="second" <?= ($editCourse['semester'] ?? '') === 'second' ? 'selected' : '' ?>>Second</option>
        </select>
      </div>
      <div>
        <label>Lecturer</label>
        <select name="lecturer_id">
          <option value="">Unassigned</option>
          <?php foreach ($lecturers as $l): ?>
            <option value="<?= $l['lecturer_id'] ?>" <?= ($editCourse['lecturer_id'] ?? '') == $l['lecturer_id'] ? 'selected' : '' ?>>
              <?= htmlspecialchars($l['full_name']) ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label>Credit Units</label>
        <input type="number" name="credit_unit" value="<?= htmlspecialchars($editCourse['credit_unit'] ?? 2) ?>" min="1" max="10">
      </div>
      <div>
        <label>Sessions Required / Week</label>
        <input type="number" name="sessions_required" value="<?= htmlspecialchars($editCourse['sessions_required'] ?? 1) ?>" min="1" max="7">
      </div>
      <div>
        <label>Session Type</label>
        <select name="session_type">
          <?php foreach (['lecture','practical','tutorial','elective'] as $t): ?>
            <option value="<?= $t ?>" <?= ($editCourse['session_type'] ?? 'lecture') === $t ? 'selected' : '' ?>><?= ucfirst($t) ?></option>
          <?php endforeach; ?>
        </select>
      </div>

      <div style="grid-column:1/-1;" class="actions">
        <button type="submit" class="btn btn-primary"><?= $editCourse ? 'Update Course' : 'Add Course' ?></button>
        <?php if ($editCourse): ?><a href="courses.php" class="btn btn-outline">Cancel</a><?php endif; ?>
      </div>
    </form>
  </section>

  <?php foreach ($coursesByLevel as $group): ?>
    <?php $firstCount = count($group['rows']['first']); $secondCount = count($group['rows']['second']); ?>
    <section class="panel course-level-panel">
      <div class="panel-header course-level-header">
        <div>
          <h2><?= htmlspecialchars($group['name']) ?></h2>
          <span class="course-level-meta"><?= $firstCount + $secondCount ?> courses total</span>
        </div>
        <div class="semester-tabs" role="tablist" aria-label="<?= htmlspecialchars($group['name']) ?> semesters">
          <button type="button" class="semester-tab active" data-semester-tab="<?= htmlspecialchars($group['program'].'-'.$group['specialization'].'-'.$group['level']) ?>-first">First Semester <span><?= $firstCount ?></span></button>
          <button type="button" class="semester-tab" data-semester-tab="<?= htmlspecialchars($group['program'].'-'.$group['specialization'].'-'.$group['level']) ?>-second">Second Semester <span><?= $secondCount ?></span></button>
        </div>
      </div>

      <?php foreach (['first' => 'First Semester', 'second' => 'Second Semester'] as $semesterKey => $semesterLabel): ?>
        <div class="semester-panel <?= $semesterKey === 'first' ? 'is-active' : '' ?>" data-semester-panel="<?= htmlspecialchars($group['program'].'-'.$group['specialization'].'-'.$group['level']) ?>-<?= $semesterKey ?>">
          <div class="semester-heading">
            <div><strong><?= $semesterLabel ?></strong><small><?= count($group['rows'][$semesterKey]) ?> course<?= count($group['rows'][$semesterKey]) === 1 ? '' : 's' ?></small></div>
          </div>
          <?php if (!empty($group['rows'][$semesterKey])): ?>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>Code</th><th>Title</th><th>Lecturer</th><th>Units</th><th>Sessions</th><th>Type</th><th></th></tr>
                </thead>
                <tbody>
                  <?php foreach ($group['rows'][$semesterKey] as $c): ?>
                    <tr>
                      <td><strong><?= htmlspecialchars($c['course_code']) ?></strong></td>
                      <td><?= htmlspecialchars($c['course_title']) ?></td>
                      <td><?= htmlspecialchars($c['lecturer_name'] ?? '—') ?></td>
                      <td><?= $c['credit_unit'] ?></td>
                      <td><?= $c['sessions_required'] ?></td>
                      <td><span class="session session-<?= $c['session_type'] ?>"><?= ucfirst($c['session_type']) ?></span></td>
                      <td class="actions">
                        <a href="?edit=<?= $c['course_id'] ?>&department_id=<?= $departmentId ?>" class="btn btn-outline">Edit</a>
                        <form method="post" class="inline-form"><input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken()) ?>"><input type="hidden" name="deactivate_record_id" value="<?= (int) $c['course_id'] ?>"><button type="submit" class="btn btn-danger" data-confirm="Deactivate this course?">Deactivate</button></form>
                      </td>
                    </tr>
                  <?php endforeach; ?>
                </tbody>
              </table>
            </div>
          <?php else: ?>
            <div class="empty-state semester-empty">No courses have been added for <?= strtolower($semesterLabel) ?> yet.</div>
          <?php endif; ?>
        </div>
      <?php endforeach; ?>
    </section>
  <?php endforeach; ?>
  <?php if (empty($courses)): ?>
    <section class="panel"><p class="empty-state">No courses yet for this department.</p></section>
  <?php endif; ?>
</main>
<script>
document.querySelectorAll('.semester-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const key = tab.dataset.semesterTab;
    const levelPanel = tab.closest('.course-level-panel');
    levelPanel.querySelectorAll('.semester-tab').forEach(t => t.classList.remove('active'));
    levelPanel.querySelectorAll('.semester-panel').forEach(p => p.classList.remove('is-active'));
    tab.classList.add('active');
    const target = levelPanel.querySelector(`[data-semester-panel="${CSS.escape(key)}"]`);
    if (target) target.classList.add('is-active');
  });
});
</script>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
