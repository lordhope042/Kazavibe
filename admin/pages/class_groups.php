<?php
require_once __DIR__ . '/../../includes/auth.php';
requireAdmin();

$pdo = getDbConnection();
$errors = [];
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $departmentId   = $_POST['department_id'] ?? '';
    $name           = trim($_POST['name'] ?? '');
    $program        = $_POST['program'] ?? '';
    $level          = $_POST['level'] ?? '';
    $specialization = $_POST['specialization'] ?? '';

    // Enforce the same rule the DB constraint does, with a clearer message
    $validND  = $program === 'ND'  && in_array($level, ['100', '200'], true) && $specialization === '';
    $validHND = $program === 'HND' && in_array($level, ['300', '400'], true) && in_array($specialization, ['SWD', 'NCC'], true);

    if (!$departmentId || $name === '' || !($validND || $validHND)) {
        $errors[] = 'All fields are required. ND only takes levels 100/200 with no specialization; HND only takes levels 300/400 with a SWD or NCC specialization.';
    } else {
        try {
            $pdo->prepare(
                'INSERT INTO class_groups (department_id, name, program, level, specialization) VALUES (?,?,?,?,?)'
            )->execute([$departmentId, $name, $program, $level, $specialization ?: null]);
            $success = 'Class group added.';
            logActivity(currentAdmin()['id'], "Added class group {$name}");
        } catch (PDOException $e) {
            $errors[] = str_contains($e->getMessage(), 'Duplicate')
                ? 'A class group with that name already exists.'
                : 'Could not save class group: ' . $e->getMessage();
        }
    }
}

$departments = $pdo->query('SELECT * FROM departments ORDER BY name')->fetchAll();

$groups = $pdo->query(
    "SELECT cg.*, d.name AS department_name,
            COUNT(DISTINCT c.course_id) AS course_count,
            COUNT(DISTINCT s.student_id) AS student_count
     FROM class_groups cg
     JOIN departments d ON d.department_id = cg.department_id
     LEFT JOIN courses c ON c.class_group_id = cg.class_group_id AND c.is_active = 1
     LEFT JOIN students s ON s.class_group_id = cg.class_group_id AND s.is_active = 1
     GROUP BY cg.class_group_id
     ORDER BY d.name, cg.program, cg.level, cg.specialization"
)->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Class Groups | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/admin.css">
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Class Groups</h1>
    <p>ND (100/200) and HND (300/400, SWD/NCC) — one set per department</p>
  </header>

  <?php foreach ($errors as $e): ?><div class="alert-box alert-error"><?= htmlspecialchars($e) ?></div><?php endforeach; ?>
  <?php if ($success): ?><div class="alert-box alert-success"><?= htmlspecialchars($success) ?></div><?php endif; ?>

  <section class="panel">
    <div class="panel-header"><h2>Add Class Group</h2></div>
    <?php if (empty($departments)): ?>
      <p class="empty-state">Add a department first on the Departments page.</p>
    <?php else: ?>
      <form method="post" class="form-grid">
      <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken()) ?>">
        <div>
          <label>Department</label>
          <select name="department_id" required>
            <option value="">Select...</option>
            <?php foreach ($departments as $d): ?>
              <option value="<?= $d['department_id'] ?>"><?= htmlspecialchars($d['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div>
          <label>Name</label>
          <input type="text" name="name" placeholder="e.g. ND 100 or HND 300 - SWD" required>
        </div>
        <div>
          <label>Program</label>
          <select name="program" required>
            <option value="ND">ND</option>
            <option value="HND">HND</option>
          </select>
        </div>
        <div>
          <label>Level</label>
          <select name="level" required>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="300">300</option>
            <option value="400">400</option>
          </select>
        </div>
        <div>
          <label>Specialization (HND only)</label>
          <select name="specialization">
            <option value="">— None (ND) —</option>
            <option value="SWD">SWD</option>
            <option value="NCC">NCC</option>
          </select>
        </div>
        <div style="grid-column:1/-1;" class="actions">
          <button type="submit" class="btn btn-primary">Add Class Group</button>
        </div>
      </form>
    <?php endif; ?>
  </section>

  <section class="panel">
    <table>
      <thead><tr><th>Department</th><th>Name</th><th>Program</th><th>Level</th><th>Specialization</th><th>Courses</th><th>Students</th></tr></thead>
      <tbody>
        <?php foreach ($groups as $g): ?>
          <tr>
            <td><?= htmlspecialchars($g['department_name']) ?></td>
            <td><?= htmlspecialchars($g['name']) ?></td>
            <td><?= htmlspecialchars($g['program']) ?></td>
            <td><?= htmlspecialchars($g['level']) ?></td>
            <td><?= htmlspecialchars($g['specialization'] ?? '—') ?></td>
            <td><?= $g['course_count'] ?></td>
            <td><?= $g['student_count'] ?></td>
          </tr>
        <?php endforeach; ?>
        <?php if (empty($groups)): ?><tr><td colspan="7" class="empty-state">No class groups yet.</td></tr><?php endif; ?>
      </tbody>
    </table>
  </section>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
