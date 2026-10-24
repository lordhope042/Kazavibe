<?php
require_once __DIR__ . '/../../includes/auth.php';
requireAdmin();

$pdo = getDbConnection();
$currentAdminId = currentAdmin()['id'];
$errors = [];
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? null)) { http_response_code(419); exit('Security token expired.'); }
    $name  = trim($_POST['full_name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $role  = $_POST['role'] ?? 'admin';
    if (($role === 'super_admin' || isset($_POST['deactivate_admin_id'])) && (currentAdmin()['role'] ?? '') !== 'super_admin') { http_response_code(403); exit('Only a super admin can perform this action.'); }
    $password = $_POST['password'] ?? '';

    if ($name === '' || $email === '' || strlen($password) < 8) {
        $errors[] = 'Name, email, and a password of at least 8 characters are required.';
    } else {
        try {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $pdo->prepare('INSERT INTO admins (full_name, email, password_hash, role) VALUES (?,?,?,?)')
                ->execute([$name, $email, $hash, $role]);
            $success = 'Admin account created.';
            logActivity($currentAdminId, "Created admin account for {$name}");
        } catch (PDOException $e) {
            $errors[] = str_contains($e->getMessage(), 'Duplicate')
                ? 'That email is already registered.'
                : 'Could not create account: ' . $e->getMessage();
        }
    }
}

if (isset($_POST['deactivate_admin_id'])) {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? null)) { http_response_code(419); exit('Security token expired.'); }
    if ((currentAdmin()['role'] ?? '') !== 'super_admin') { http_response_code(403); exit('Only a super admin can deactivate accounts.'); }
    $target = (int) $_POST['deactivate_admin_id'];
    if ($target > 0 && $target !== (int) $currentAdminId) { $pdo->prepare('UPDATE admins SET is_active = 0 WHERE admin_id = ?')->execute([$target]); logActivity($currentAdminId, 'Deactivated admin #' . $target); }
    header('Location: users_roles.php'); exit;
}

$admins = $pdo->query('SELECT * FROM admins WHERE is_active = 1 ORDER BY full_name')->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Users &amp; Roles | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/admin.css">
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Users &amp; Roles</h1>
    <p><?= count($admins) ?> active admin accounts</p>
  </header>

  <?php foreach ($errors as $e): ?><div class="alert-box alert-error"><?= htmlspecialchars($e) ?></div><?php endforeach; ?>
  <?php if ($success): ?><div class="alert-box alert-success"><?= htmlspecialchars($success) ?></div><?php endif; ?>

  <section class="panel">
    <div class="panel-header"><h2>Add Admin</h2></div>
    <form method="post" class="form-grid">
      <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken()) ?>">
      <div>
        <label>Full Name</label>
        <input type="text" name="full_name" required>
      </div>
      <div>
        <label>Email</label>
        <input type="email" name="email" required>
      </div>
      <div>
        <label>Password</label>
        <input type="password" name="password" minlength="8" required>
      </div>
      <div>
        <label>Role</label>
        <select name="role">
          <option value="admin">Admin</option>
          <?php if ((currentAdmin()['role'] ?? '') === 'super_admin'): ?><option value="super_admin">Super Admin</option><?php endif; ?>
        </select>
      </div>
      <div style="grid-column:1/-1;">
        <button type="submit" class="btn btn-primary">Create Account</button>
      </div>
    </form>
  </section>

  <section class="panel">
    <div class="panel-header"><h2>All Admins</h2></div>
    <table>
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
      <tbody>
        <?php foreach ($admins as $a): ?>
          <tr>
            <td><?= htmlspecialchars($a['full_name']) ?> <?= $a['admin_id'] == $currentAdminId ? '(you)' : '' ?></td>
            <td><?= htmlspecialchars($a['email']) ?></td>
            <td><span class="badge badge-published"><?= $a['role'] === 'super_admin' ? 'Super Admin' : 'Admin' ?></span></td>
            <td class="actions">
              <?php if ($a['admin_id'] != $currentAdminId): ?>
                <form method="post" class="inline-form"><input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken()) ?>"><input type="hidden" name="deactivate_admin_id" value="<?= (int) $a['admin_id'] ?>"><button type="submit" class="btn btn-danger" data-confirm="Deactivate this admin account?">Deactivate</button></form>
              <?php endif; ?>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </section>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
