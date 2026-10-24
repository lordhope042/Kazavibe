<?php
require_once __DIR__ . '/../../includes/auth.php';
requireAdmin();

$pdo = getDbConnection();
$admin = currentAdmin();
$errors = [];
$success = null;

// Password change
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['new_password'])) {
    $newPassword = $_POST['new_password'];
    $confirm = $_POST['confirm_password'] ?? '';

    if (strlen($newPassword) < 8) {
        $errors[] = 'New password must be at least 8 characters.';
    } elseif ($newPassword !== $confirm) {
        $errors[] = 'Passwords do not match.';
    } else {
        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $pdo->prepare('UPDATE admins SET password_hash = ? WHERE admin_id = ?')
            ->execute([$hash, $admin['id']]);
        $success = 'Password updated.';
    }
}

$adminCount = $pdo->query('SELECT COUNT(*) FROM admins WHERE is_active = 1')->fetchColumn();
$breakSlots = $pdo->query("SELECT COUNT(*) FROM time_slots WHERE is_break = 1")->fetchColumn();
$totalSlots = $pdo->query('SELECT COUNT(*) FROM time_slots')->fetchColumn();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Settings | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/admin.css">
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Settings</h1>
  </header>

  <?php foreach ($errors as $e): ?><div class="alert-box alert-error"><?= htmlspecialchars($e) ?></div><?php endforeach; ?>
  <?php if ($success): ?><div class="alert-box alert-success"><?= htmlspecialchars($success) ?></div><?php endif; ?>

  <section class="panel">
    <div class="panel-header"><h2>System Overview</h2></div>
    <table>
      <tbody>
        <tr><th>Application</th><td><?= APP_NAME ?></td></tr>
        <tr><th>Active Admins</th><td><?= $adminCount ?></td></tr>
        <tr><th>Time Slots Configured</th><td><?= $totalSlots ?> (<?= $breakSlots ?> break periods)</td></tr>
      </tbody>
    </table>
    <p style="margin-top:10px; color:var(--muted); font-size:13px;">
      Time slots, break periods, and working days are seeded directly in the database
      (<code>database/seed.sql</code>). A dedicated UI for editing these isn't built yet —
      adjust the <code>time_slots</code> table directly, or ask to have this page extended.
    </p>
  </section>

  <section class="panel">
    <div class="panel-header"><h2>Change Your Password</h2></div>
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
