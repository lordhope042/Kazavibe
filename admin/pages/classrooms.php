<?php
require_once __DIR__ . '/../../includes/auth.php';
requireAdmin();

$pdo = getDbConnection();
$errors = [];
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id       = $_POST['room_id'] ?? null;
    $name     = trim($_POST['name'] ?? '');
    $type     = 'classroom';
    $groupId  = ($_POST['class_group_id'] ?? '') !== '' ? (int) $_POST['class_group_id'] : null;
    $capacity = $_POST['capacity'] !== '' ? (int) $_POST['capacity'] : null;

    if ($name === '') {
        $errors[] = 'Room name is required.';
    } else {
        try {
            if ($id) {
                $pdo->prepare('UPDATE rooms SET name=?, room_type=?, capacity=?, class_group_id=? WHERE room_id=?')
                    ->execute([$name, $type, $capacity, $groupId, $id]);
                $success = 'Room updated.';
            } else {
                $pdo->prepare('INSERT INTO rooms (name, room_type, capacity, class_group_id) VALUES (?,?,?,?)')
                    ->execute([$name, $type, $capacity, $groupId]);
                $success = 'Room added.';
            }
            logActivity(currentAdmin()['id'], "Saved room {$name}");
        } catch (PDOException $e) {
            $errors[] = str_contains($e->getMessage(), 'Duplicate')
                ? 'A room with that name already exists, or that class group already has a classroom.'
                : 'Could not save room: ' . $e->getMessage();
        }
    }
}

if (isset($_POST['deactivate_record_id'])) {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? null)) { http_response_code(419); exit('Security token expired.'); }
    $targetId = (int) $_POST['deactivate_record_id'];
    $pdo->prepare('UPDATE rooms SET is_active = 0 WHERE room_id = ?')->execute([$targetId]);
    logActivity(currentAdmin()['id'], 'Deactivated record #' . $targetId);
    header('Location: classrooms.php'); exit;
}

$editRoom = null;
if (isset($_GET['edit'])) {
    $stmt = $pdo->prepare('SELECT * FROM rooms WHERE room_id = ?');
    $stmt->execute([$_GET['edit']]);
    $editRoom = $stmt->fetch();
}

$rooms = $pdo->query('SELECT r.*, cg.name AS group_name FROM rooms r LEFT JOIN class_groups cg ON cg.class_group_id = r.class_group_id WHERE r.is_active = 1 ORDER BY r.name')->fetchAll();
$classGroups = $pdo->query('SELECT class_group_id, name FROM class_groups ORDER BY program, level, name')->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Classrooms | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/admin.css">
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Classrooms</h1>
    <p><?= count($rooms) ?> classrooms</p>
  </header>

  <?php foreach ($errors as $e): ?><div class="alert-box alert-error"><?= htmlspecialchars($e) ?></div><?php endforeach; ?>
  <?php if ($success): ?><div class="alert-box alert-success"><?= htmlspecialchars($success) ?></div><?php endif; ?>

  <section class="panel">
    <div class="panel-header"><h2><?= $editRoom ? 'Edit Room' : 'Add Room' ?></h2></div>
    <form method="post" class="form-grid">
      <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken()) ?>">
      <?php if ($editRoom): ?><input type="hidden" name="room_id" value="<?= $editRoom['room_id'] ?>"><?php endif; ?>
      <div>
        <label>Room Name</label>
        <input type="text" name="name" value="<?= htmlspecialchars($editRoom['name'] ?? '') ?>" placeholder="e.g. ND 1 Classroom" required>
      </div>
      <div>
        <label>Class Group (dedicated room)</label>
        <select name="class_group_id">
          <option value="">Shared / none</option>
          <?php foreach ($classGroups as $g): ?>
            <option value="<?= (int) $g['class_group_id'] ?>" <?= (string) ($editRoom['class_group_id'] ?? '') === (string) $g['class_group_id'] ? 'selected' : '' ?>><?= htmlspecialchars($g['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label>Capacity</label>
        <input type="number" name="capacity" value="<?= htmlspecialchars($editRoom['capacity'] ?? '') ?>" min="1">
      </div>
      <div style="grid-column:1/-1;" class="actions">
        <button type="submit" class="btn btn-primary"><?= $editRoom ? 'Update' : 'Add Room' ?></button>
        <?php if ($editRoom): ?><a href="classrooms.php" class="btn btn-outline">Cancel</a><?php endif; ?>
      </div>
    </form>
  </section>

  <section class="panel">
    <div class="panel-header"><h2>All Rooms</h2></div>
    <table>
      <thead><tr><th>Name</th><th>Class Group</th><th>Capacity</th><th></th></tr></thead>
      <tbody>
        <?php foreach ($rooms as $r): ?>
          <tr>
            <td><?= htmlspecialchars($r['name']) ?></td>
            <td><?= htmlspecialchars($r['group_name'] ?? 'Shared') ?></td>
            <td><?= htmlspecialchars($r['capacity'] ?? '—') ?></td>
            <td class="actions">
              <a href="?edit=<?= $r['room_id'] ?>" class="btn btn-outline">Edit</a>
              <form method="post" class="inline-form"><input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken()) ?>"><input type="hidden" name="deactivate_record_id" value="<?= (int) $r['room_id'] ?>"><button type="submit" class="btn btn-danger" data-confirm="Deactivate this room?">Deactivate</button></form>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if (empty($rooms)): ?><tr><td colspan="4" class="empty-state">No rooms yet.</td></tr><?php endif; ?>
      </tbody>
    </table>
  </section>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
