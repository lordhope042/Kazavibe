<?php
require_once __DIR__ . '/../../includes/auth.php';
requireStudent();

$pdo = getDbConnection();
$student = currentStudent();

$stmt = $pdo->prepare(
    'SELECT s.*, cg.name AS class_group_name
     FROM students s
     JOIN class_groups cg ON cg.class_group_id = s.class_group_id
     WHERE s.student_id = ?'
);
$stmt->execute([$student['id']]);
$profile = $stmt->fetch();

$errors = [];
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $newPassword = $_POST['new_password'] ?? '';
    $confirm = $_POST['confirm_password'] ?? '';

    if (strlen($newPassword) < 8) {
        $errors[] = 'New password must be at least 8 characters.';
    } elseif ($newPassword !== $confirm) {
        $errors[] = 'Passwords do not match.';
    } else {
        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $pdo->prepare('UPDATE students SET password_hash = ? WHERE student_id = ?')
            ->execute([$hash, $student['id']]);
        $success = 'Password updated.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Profile | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/student.css">
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Profile</h1>
  </header>

  <?php foreach ($errors as $e): ?><div class="alert-box alert-error"><?= htmlspecialchars($e) ?></div><?php endforeach; ?>
  <?php if ($success): ?><div class="alert-box alert-success"><?= htmlspecialchars($success) ?></div><?php endif; ?>

  <section class="panel">
    <div class="panel-header"><h2>Your Information</h2></div>
    <table>
      <tbody>
        <tr><th>Full Name</th><td><?= htmlspecialchars($profile['full_name']) ?></td></tr>
        <tr><th>Registration Number</th><td><?= htmlspecialchars($profile['reg_no']) ?></td></tr>
        <tr><th>Email</th><td><?= htmlspecialchars($profile['email']) ?></td></tr>
        <tr><th>Class Group</th><td><?= htmlspecialchars($profile['class_group_name']) ?></td></tr>
      </tbody>
    </table>
  </section>

  <section class="panel">
    <div class="panel-header"><h2>Change Password</h2></div>
    <form method="post" class="form-grid">
      <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken()) ?>">
      <div>
        <label>New Password</label>
        <input type="password" name="new_password" minlength="8" required>
      </div>
      <div>
        <label>Confirm Password</label>
        <input type="password" name="confirm_password" minlength="8" required>
      </div>
      <div style="grid-column:1/-1;">
        <button type="submit" class="btn btn-primary">Update Password</button>
      </div>
    </form>
  </section>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
