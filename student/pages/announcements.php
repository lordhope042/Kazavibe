<?php
require_once __DIR__ . '/../../includes/auth.php';
requireStudent();

$pdo = getDbConnection();
$student = currentStudent();

$stmt = $pdo->prepare(
    "SELECT a.*, ad.full_name AS posted_by_name
     FROM announcements a
     LEFT JOIN admins ad ON ad.admin_id = a.posted_by
     WHERE a.audience IN ('all','students')
        OR (a.audience = 'class_group' AND a.class_group_id = ?)
     ORDER BY a.created_at DESC"
);
$stmt->execute([$student['class_group_id']]);
$announcements = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Announcements | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/student.css">
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Announcements</h1>
    <p><?= count($announcements) ?> total</p>
  </header>

  <section class="panel">
    <ul class="announcement-list">
      <?php foreach ($announcements as $a): ?>
        <li>
          <strong><?= htmlspecialchars($a['title']) ?></strong>
          <p><?= nl2br(htmlspecialchars($a['body'])) ?></p>
          <small><?= htmlspecialchars($a['posted_by_name'] ?? 'Administration') ?> · <?= date('d M Y', strtotime($a['created_at'])) ?></small>
        </li>
      <?php endforeach; ?>
      <?php if (empty($announcements)): ?>
        <li class="empty-state">No announcements yet.</li>
      <?php endif; ?>
    </ul>
  </section>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
