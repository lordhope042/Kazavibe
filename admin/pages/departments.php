<?php
require_once __DIR__ . '/../../includes/auth.php';
requireAdmin();

$pdo = getDbConnection();
$errors = [];
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id        = $_POST['department_id'] ?? null;
    $name      = trim($_POST['name'] ?? '');
    $shortCode = strtoupper(trim($_POST['short_code'] ?? ''));

    if ($name === '' || $shortCode === '') {
        $errors[] = 'Department name and short code are required.';
    } else {
        try {
            if ($id) {
                $pdo->prepare('UPDATE departments SET name=?, short_code=? WHERE department_id=?')
                    ->execute([$name, $shortCode, $id]);
                $success = 'Department updated.';
            } else {
                $pdo->prepare('INSERT INTO departments (name, short_code) VALUES (?,?)')
                    ->execute([$name, $shortCode]);
                $success = 'Department added. Add its class groups next.';
            }
            logActivity(currentAdmin()['id'], "Saved department {$name}");
        } catch (PDOException $e) {
            $errors[] = str_contains($e->getMessage(), 'Duplicate')
                ? 'A department with that name or short code already exists.'
                : 'Could not save department: ' . $e->getMessage();
        }
    }
}

if (isset($_POST['delete_department_id'])) {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? null)) { http_response_code(419); exit('Security token expired.'); }
    $deleteId = (int) $_POST['delete_department_id'];
    $inUse = $pdo->prepare('SELECT COUNT(*) FROM class_groups WHERE department_id = ?');
    $inUse->execute([$deleteId]);
    if ($inUse->fetchColumn() > 0) {
        $errors[] = 'Cannot delete a department that still has class groups. Reassign or remove them first.';
    } else {
        $pdo->prepare('DELETE FROM departments WHERE department_id = ?')->execute([$deleteId]);
        logActivity(currentAdmin()['id'], 'Deleted department #' . $deleteId);
        header('Location: departments.php'); exit;
    }
}

$editDept = null;
if (isset($_GET['edit'])) {
    $stmt = $pdo->prepare('SELECT * FROM departments WHERE department_id = ?');
    $stmt->execute([$_GET['edit']]);
    $editDept = $stmt->fetch();
}

$departments = $pdo->query(
    "SELECT d.*, COUNT(DISTINCT cg.class_group_id) AS class_group_count
     FROM departments d
     LEFT JOIN class_groups cg ON cg.department_id = d.department_id
     GROUP BY d.department_id
     ORDER BY d.name"
)->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Departments | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/admin.css">
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Departments</h1>
    <p>Each department has its own separate timetable — rooms and lecturers are shared, courses and schedules are not.</p>
  </header>

  <?php foreach ($errors as $e): ?><div class="alert-box alert-error"><?= htmlspecialchars($e) ?></div><?php endforeach; ?>
  <?php if ($success): ?><div class="alert-box alert-success"><?= htmlspecialchars($success) ?></div><?php endif; ?>

  <section class="panel">
    <div class="panel-header"><h2><?= $editDept ? 'Edit Department' : 'Add Department' ?></h2></div>
    <form method="post" class="form-grid">
      <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken()) ?>">
      <?php if ($editDept): ?><input type="hidden" name="department_id" value="<?= $editDept['department_id'] ?>"><?php endif; ?>
      <div>
        <label>Department Name</label>
        <input type="text" name="name" value="<?= htmlspecialchars($editDept['name'] ?? '') ?>" placeholder="e.g. Electrical Engineering" required>
      </div>
      <div>
        <label>Short Code</label>
        <input type="text" name="short_code" value="<?= htmlspecialchars($editDept['short_code'] ?? '') ?>" placeholder="e.g. EE" maxlength="20" required>
      </div>
      <div style="grid-column:1/-1;" class="actions">
        <button type="submit" class="btn btn-primary"><?= $editDept ? 'Update' : 'Add Department' ?></button>
        <?php if ($editDept): ?><a href="departments.php" class="btn btn-outline">Cancel</a><?php endif; ?>
      </div>
    </form>
  </section>

  <section class="panel">
    <div class="panel-header"><h2>All Departments</h2></div>
    <table>
      <thead><tr><th>Name</th><th>Code</th><th>Class Groups</th><th></th></tr></thead>
      <tbody>
        <?php foreach ($departments as $d): ?>
          <tr>
            <td><?= htmlspecialchars($d['name']) ?></td>
            <td><?= htmlspecialchars($d['short_code']) ?></td>
            <td><?= $d['class_group_count'] ?></td>
            <td class="actions">
              <a href="?edit=<?= $d['department_id'] ?>" class="btn btn-outline">Edit</a>
              <form method="post" class="inline-form"><input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken()) ?>"><input type="hidden" name="delete_department_id" value="<?= (int) $d['department_id'] ?>"><button type="submit" class="btn btn-danger" data-confirm="Delete this department?">Delete</button></form>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if (empty($departments)): ?><tr><td colspan="4" class="empty-state">No departments yet.</td></tr><?php endif; ?>
      </tbody>
    </table>
  </section>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
