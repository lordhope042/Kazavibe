<?php
require_once __DIR__ . '/../../includes/auth.php';
requireStudent();

$pdo = getDbConnection();
$student = currentStudent();

// Same fix as My Courses — lecturers teaching this class group's curriculum,
// not lecturers tied to (empty) course_registrations rows.
$lecturers = $pdo->prepare(
    "SELECT DISTINCT l.lecturer_id, l.full_name, l.email, l.phone,
            GROUP_CONCAT(DISTINCT c.course_code ORDER BY c.course_code SEPARATOR ', ') AS courses
     FROM courses c
     JOIN lecturers l ON l.lecturer_id = c.lecturer_id
     WHERE c.class_group_id = ? AND c.is_active = 1
     GROUP BY l.lecturer_id
     ORDER BY l.full_name"
);
$lecturers->execute([$student['class_group_id']]);
$lecturers = $lecturers->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>My Lecturers | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/student.css">
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>My Lecturers</h1>
    <p><?= count($lecturers) ?> teaching your courses</p>
  </header>

  <section class="panel">
    <table>
      <thead><tr><th>Name</th><th>Courses</th><th>Email</th><th>Phone</th></tr></thead>
      <tbody>
        <?php foreach ($lecturers as $l): ?>
          <tr>
            <td><?= htmlspecialchars($l['full_name']) ?></td>
            <td><?= htmlspecialchars($l['courses']) ?></td>
            <td><?= htmlspecialchars($l['email'] ?? '—') ?></td>
            <td><?= htmlspecialchars($l['phone'] ?? '—') ?></td>
          </tr>
        <?php endforeach; ?>
        <?php if (empty($lecturers)): ?>
          <tr><td colspan="4" class="empty-state">No lecturers assigned to your courses yet.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </section>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
