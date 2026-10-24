<?php
require_once __DIR__ . '/../../includes/auth.php';
requireAdmin();

$pdo = getDbConnection();

if (isset($_GET['resolve'])) {
    $pdo->prepare('UPDATE conflicts_log SET is_resolved = 1 WHERE conflict_id = ?')->execute([$_GET['resolve']]);
    header('Location: conflicts.php');
    exit;
}

$conflicts = $pdo->query(
    "SELECT cl.*, c.course_code, ts.session_id
     FROM conflicts_log cl
     LEFT JOIN timetable_sessions ts ON ts.session_id = cl.session_id
     LEFT JOIN courses c ON c.course_id = ts.course_id
     WHERE cl.is_resolved = 0
     ORDER BY cl.created_at DESC"
)->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Conflicts | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/admin.css">
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Conflicts</h1>
    <p><?= count($conflicts) ?> unresolved</p>
  </header>

  <section class="panel">
    <table>
      <thead><tr><th>Type</th><th>Description</th><th>Course</th><th>Logged</th><th></th></tr></thead>
      <tbody>
        <?php foreach ($conflicts as $c): ?>
          <tr>
            <td><span class="badge badge-locked"><?= ucfirst($c['conflict_type']) ?></span></td>
            <td><?= htmlspecialchars($c['description']) ?></td>
            <td><?= htmlspecialchars($c['course_code'] ?? '—') ?></td>
            <td><?= $c['created_at'] ?></td>
            <td><a href="?resolve=<?= $c['conflict_id'] ?>" class="btn btn-outline">Mark Resolved</a></td>
          </tr>
        <?php endforeach; ?>
        <?php if (empty($conflicts)): ?>
          <tr><td colspan="5" class="empty-state">No conflicts — timetable is clean.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </section>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
