<?php
require_once __DIR__ . '/../../includes/auth.php';
requireStudent();
$student = currentStudent();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Settings | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/student.css">
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Settings</h1>
  </header>

  <section class="panel">
    <div class="panel-header"><h2>Account</h2></div>
    <p>Logged in as <strong><?= htmlspecialchars($student['name']) ?></strong> (<?= htmlspecialchars($student['reg_no']) ?>)</p>
    <div class="actions" style="margin-top:12px;">
      <a href="profile.php" class="btn btn-primary">Edit Profile &amp; Password</a>
      <a href="../logout.php" class="btn btn-outline">Logout</a>
    </div>
  </section>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
