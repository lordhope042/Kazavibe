<?php
require_once __DIR__ . '/../../includes/auth.php';
requireStudent();

$pdo = getDbConnection();
$student = currentStudent();

if (isset($_GET['read'])) {
    $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND student_id = ?')
        ->execute([$_GET['read'], $student['id']]);
    header('Location: notifications.php');
    exit;
}

$stmt = $pdo->prepare('SELECT * FROM notifications WHERE student_id = ? ORDER BY created_at DESC');
$stmt->execute([$student['id']]);
$notifications = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Notifications | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/student.css">
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Notifications</h1>
    <p><?= count(array_filter($notifications, fn($n) => !$n['is_read'])) ?> unread</p>
  </header>

  <section class="panel">
    <ul class="announcement-list">
      <?php foreach ($notifications as $n): ?>
        <li class="<?= $n['is_read'] ? '' : 'unread' ?>">
          <p><?= htmlspecialchars($n['message']) ?></p>
          <small><?= date('d M Y, g:i a', strtotime($n['created_at'])) ?></small>
          <?php if (!$n['is_read']): ?>
            <a href="?read=<?= $n['notification_id'] ?>" class="btn btn-outline">Mark read</a>
          <?php endif; ?>
        </li>
      <?php endforeach; ?>
      <?php if (empty($notifications)): ?>
        <li class="empty-state">No notifications yet.</li>
      <?php endif; ?>
    </ul>
  </section>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
