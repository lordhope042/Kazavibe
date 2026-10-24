<?php
require_once __DIR__ . '/../../includes/auth.php';
requireStudent();

$pdo = getDbConnection();

$events = $pdo->query(
    "SELECT * FROM academic_calendar ORDER BY event_date"
)->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Academic Calendar | <?= APP_SHORT_NAME ?></title>
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
    <h1>Academic Calendar</h1>
    <p><?= APP_NAME ?></p>
  </header>

  <?php if (!empty($events)): ?>
    <div class="actions no-print" style="margin-bottom:16px;">
      <button class="btn btn-primary" onclick="window.print()">Download / Print Calendar</button>
    </div>
  <?php endif; ?>

  <section class="panel">
    <table>
      <thead><tr><th>Event</th><th>Type</th><th>Date</th><th>Ends</th></tr></thead>
      <tbody>
        <?php foreach ($events as $e): ?>
          <tr>
            <td><?= htmlspecialchars($e['title']) ?></td>
            <td><span class="badge badge-published"><?= ucfirst(str_replace('_', ' ', $e['event_type'])) ?></span></td>
            <td><?= date('D, d M Y', strtotime($e['event_date'])) ?></td>
            <td><?= $e['end_date'] ? date('D, d M Y', strtotime($e['end_date'])) : '—' ?></td>
          </tr>
        <?php endforeach; ?>
        <?php if (empty($events)): ?>
          <tr><td colspan="4" class="empty-state">No calendar events yet.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </section>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
