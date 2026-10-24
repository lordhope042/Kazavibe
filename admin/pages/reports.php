<?php
require_once __DIR__ . '/../../includes/auth.php';
requireAdmin();

$pdo = getDbConnection();

$semester = $_GET['semester'] ?? 'first';
$semester = in_array($semester, ['first', 'second'], true) ? $semester : 'first';
$view = $_GET['view'] ?? 'class_group';
$view = in_array($view, ['class_group', 'lecturer', 'classroom'], true) ? $view : 'class_group';

$classGroups = $pdo->query('SELECT * FROM class_groups ORDER BY program, level')->fetchAll();
$lecturers   = $pdo->query('SELECT * FROM lecturers WHERE is_active = 1 ORDER BY full_name')->fetchAll();
$rooms       = $pdo->query('SELECT * FROM rooms WHERE is_active = 1 ORDER BY name')->fetchAll();

$filterId = $_GET['filter_id'] ?? null;

$rows = [];
if ($filterId) {
    $joinCol = match ($view) {
        'class_group' => 'sg.class_group_id',
        'lecturer'    => 'ts.lecturer_id',
        'classroom'   => 'ts.room_id',
    };

    $stmt = $pdo->prepare(
        "SELECT ts.session_id, tsl.day_of_week, tsl.start_time, tsl.end_time,
                c.course_code, c.course_title, c.session_type, ts.status,
                r.name AS room_name, l.full_name AS lecturer_name,
                GROUP_CONCAT(DISTINCT cg.name ORDER BY cg.name SEPARATOR ', ') AS class_group_names
         FROM timetable_sessions ts
         JOIN courses c ON c.course_id = ts.course_id
         JOIN time_slots tsl ON tsl.time_slot_id = ts.time_slot_id
         JOIN rooms r ON r.room_id = ts.room_id
         LEFT JOIN lecturers l ON l.lecturer_id = ts.lecturer_id
         JOIN session_class_groups sg ON sg.session_id = ts.session_id
         JOIN class_groups cg ON cg.class_group_id = sg.class_group_id
         WHERE c.semester = ? AND $joinCol = ?
         GROUP BY ts.session_id
         ORDER BY FIELD(tsl.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday'), tsl.start_time"
    );
    $stmt->execute([$semester, $filterId]);
    $rows = $stmt->fetchAll();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Reports | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/admin.css">
<style>
  @media print {
    .sidebar, .no-print { display: none !important; }
    .content { margin-left: 0 !important; }
  }
</style>
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Reports</h1>
    <p>Printable timetable views by class group, lecturer, or classroom</p>
  </header>

  <section class="panel no-print">
    <form method="get" class="form-grid">
      <div>
        <label>Semester</label>
        <select name="semester" onchange="this.form.submit()">
          <option value="first" <?= $semester === 'first' ? 'selected' : '' ?>>First</option>
          <option value="second" <?= $semester === 'second' ? 'selected' : '' ?>>Second</option>
        </select>
      </div>
      <div>
        <label>View By</label>
        <select name="view" onchange="this.form.submit()">
          <option value="class_group" <?= $view === 'class_group' ? 'selected' : '' ?>>Class Group</option>
          <option value="lecturer" <?= $view === 'lecturer' ? 'selected' : '' ?>>Lecturer</option>
          <option value="classroom" <?= $view === 'classroom' ? 'selected' : '' ?>>Classroom</option>
        </select>
      </div>
      <div>
        <label><?= $view === 'class_group' ? 'Class Group' : ($view === 'lecturer' ? 'Lecturer' : 'Room') ?></label>
        <select name="filter_id" onchange="this.form.submit()">
          <option value="">Select...</option>
          <?php
          $options = $view === 'class_group' ? $classGroups : ($view === 'lecturer' ? $lecturers : $rooms);
          $idKey = $view === 'class_group' ? 'class_group_id' : ($view === 'lecturer' ? 'lecturer_id' : 'room_id');
          $labelKey = $view === 'class_group' ? 'name' : ($view === 'lecturer' ? 'full_name' : 'name');
          foreach ($options as $o):
          ?>
            <option value="<?= $o[$idKey] ?>" <?= $filterId == $o[$idKey] ? 'selected' : '' ?>>
              <?= htmlspecialchars($o[$labelKey]) ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <?php if ($filterId): ?>
        <div style="display:flex; align-items:flex-end;">
          <button type="button" class="btn btn-primary" onclick="window.print()">Print / Export</button>
        </div>
      <?php endif; ?>
    </form>
  </section>

  <?php if ($filterId): ?>
    <section class="panel">
      <div class="panel-header"><h2><?= ucfirst($semester) ?> Semester Timetable</h2></div>
      <?php if (empty($rows)): ?>
        <p class="empty-state">No sessions found for this selection.</p>
      <?php else: ?>
        <table>
          <thead><tr><th>Day</th><th>Time</th><th>Course</th><th>Class Group(s)</th><th>Lecturer</th><th>Room</th><th>Status</th></tr></thead>
          <tbody>
            <?php foreach ($rows as $r): ?>
              <tr>
                <td><?= $r['day_of_week'] ?></td>
                <td><?= substr($r['start_time'], 0, 5) ?>–<?= substr($r['end_time'], 0, 5) ?></td>
                <td><span class="session session-<?= $r['session_type'] ?>"><?= htmlspecialchars($r['course_code']) ?></span></td>
                <td><?= htmlspecialchars($r['class_group_names']) ?></td>
                <td><?= htmlspecialchars($r['lecturer_name'] ?? '—') ?></td>
                <td><?= htmlspecialchars($r['room_name']) ?></td>
                <td><span class="badge badge-<?= $r['status'] ?>"><?= ucfirst($r['status']) ?></span></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      <?php endif; ?>
    </section>
  <?php else: ?>
    <p class="empty-state">Choose a view and selection above to generate a report.</p>
  <?php endif; ?>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
