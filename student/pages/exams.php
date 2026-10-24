<?php
require_once __DIR__ . '/../../includes/auth.php';
requireStudent();

$pdo = getDbConnection();

$exams = $pdo->query(
    "SELECT * FROM academic_calendar
     WHERE event_type = 'exam' AND event_date >= CURDATE()
     ORDER BY event_date"
)->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Exams | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/student.css">
<style>
  @media print {
    .sidebar, .no-print { display: none !important; }
    .content { margin-left: 0 !important; }
  }
</style>
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Upcoming Exams</h1>
    <p><?= count($exams) ?> scheduled</p>
  </header>

  <?php if (!empty($exams)): ?>
    <div class="actions no-print" style="margin-bottom:16px;">
      <button class="btn btn-primary" onclick="window.print()">Download / Print Exam Schedule</button>
    </div>
  <?php endif; ?>

  <section class="panel">
    <table>
      <thead><tr><th>Title</th><th>Date</th><th>Ends</th></tr></thead>
      <tbody>
        <?php foreach ($exams as $e): ?>
          <tr>
            <td><?= htmlspecialchars($e['title']) ?></td>
            <td><?= date('D, d M Y', strtotime($e['event_date'])) ?></td>
            <td><?= $e['end_date'] ? date('D, d M Y', strtotime($e['end_date'])) : '—' ?></td>
          </tr>
        <?php endforeach; ?>
        <?php if (empty($exams)): ?>
          <tr><td colspan="3" class="empty-state">No upcoming exams scheduled.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </section>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
