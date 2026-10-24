<?php
require_once __DIR__ . '/../../includes/auth.php';
requireStudent();

$pdo = getDbConnection();
$student = currentStudent();

// A student's courses are the fixed curriculum for their own classification
// (ND1, ND2, HND-SWD, or HND-NCC) — exactly matching the real registration
// slips, which list a whole level's courses automatically rather than
// something a student opts into one at a time.
$courses = $pdo->prepare(
    'SELECT c.*, l.full_name AS lecturer_name, cg.name AS class_group_name
     FROM courses c
     LEFT JOIN lecturers l ON l.lecturer_id = c.lecturer_id
     JOIN class_groups cg ON cg.class_group_id = c.class_group_id
     WHERE c.class_group_id = ? AND c.is_active = 1
     ORDER BY c.semester, c.course_code'
);
$courses->execute([$student['class_group_id']]);
$courses = $courses->fetchAll();

// Group by semester — First Semester / Second Semester as distinct
// sections, same grouping style used on the admin Courses page.
$coursesBySemester = ['first' => [], 'second' => []];
foreach ($courses as $c) {
    $coursesBySemester[$c['semester']][] = $c;
}

$classGroupName = $pdo->prepare('SELECT name FROM class_groups WHERE class_group_id = ?');
$classGroupName->execute([$student['class_group_id']]);
$classGroupName = $classGroupName->fetchColumn();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>My Courses | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/student.css">
<style>
  @media print {
    .sidebar, .no-print { display: none !important; }
    .content { margin-left: 0 !important; }
  }
  .print-header { display: none; }
  @media print { .print-header { display: block; margin-bottom: 20px; } }
</style>
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <div class="print-header">
    <h2><?= APP_NAME ?> — Course Registration Slip</h2>
    <p><?= htmlspecialchars($student['name']) ?> · <?= htmlspecialchars($student['reg_no']) ?> · <?= htmlspecialchars($classGroupName) ?></p>
    <hr>
  </div>

  <header class="topbar">
    <h1>My Courses</h1>
    <p><?= count($courses) ?> courses for <?= htmlspecialchars($classGroupName) ?></p>
  </header>

  <?php if (!empty($courses)): ?>
    <div class="actions no-print" style="margin-bottom:16px;">
      <button class="btn btn-primary" onclick="window.print()">Download / Print Registration Slip</button>
    </div>
  <?php endif; ?>

  <?php foreach (['first' => 'First Semester', 'second' => 'Second Semester'] as $key => $label): ?>
    <?php if (!empty($coursesBySemester[$key])): ?>
      <section class="panel">
        <div class="panel-header">
          <h2><?= $label ?> <span style="color:var(--muted); font-weight:normal; font-size:13px;">(<?= count($coursesBySemester[$key]) ?> courses)</span></h2>
        </div>
        <table>
          <thead><tr><th>Code</th><th>Title</th><th>Units</th><th>Lecturer</th></tr></thead>
          <tbody>
            <?php foreach ($coursesBySemester[$key] as $c): ?>
              <tr>
                <td><?= htmlspecialchars($c['course_code']) ?></td>
                <td><?= htmlspecialchars($c['course_title']) ?></td>
                <td><?= $c['credit_unit'] ?></td>
                <td><?= htmlspecialchars($c['lecturer_name'] ?? '—') ?></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </section>
    <?php endif; ?>
  <?php endforeach; ?>
  <?php if (empty($courses)): ?>
    <section class="panel"><p class="empty-state">No registered courses yet.</p></section>
  <?php endif; ?>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
