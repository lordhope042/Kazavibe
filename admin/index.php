<?php
require_once __DIR__ . '/../includes/auth.php';
requireAdmin();

$pdo = getDbConnection();
$admin = currentAdmin();

$totalCourses   = $pdo->query('SELECT COUNT(*) FROM courses WHERE is_active = 1')->fetchColumn();
$totalLecturers = $pdo->query('SELECT COUNT(*) FROM lecturers WHERE is_active = 1')->fetchColumn();
$totalGroups    = $pdo->query('SELECT COUNT(*) FROM class_groups')->fetchColumn();
$totalRooms     = $pdo->query('SELECT COUNT(*) FROM rooms WHERE is_active = 1')->fetchColumn();
$scheduled      = $pdo->query("SELECT COUNT(DISTINCT course_id) FROM timetable_sessions")->fetchColumn();
$conflicts      = $pdo->query('SELECT COUNT(*) FROM conflicts_log WHERE is_resolved = 0')->fetchColumn();

$recentActivity = $pdo->query(
    'SELECT action, created_at FROM activity_log ORDER BY created_at DESC LIMIT 5'
)->fetchAll();

$classGroups = $pdo->query('SELECT * FROM class_groups ORDER BY name')->fetchAll();
$selectedGroupId = $_GET['group'] ?? ($classGroups[0]['class_group_id'] ?? null);

$timetable = [];
if ($selectedGroupId) {
    $stmt = $pdo->prepare(
        'SELECT ts.time_slot_id, tsl.day_of_week, tsl.start_time, tsl.end_time,
                c.course_code, c.course_title, r.name AS room_name, c.session_type
         FROM timetable_sessions ts
         JOIN session_class_groups sg ON sg.session_id = ts.session_id
         JOIN time_slots tsl ON tsl.time_slot_id = ts.time_slot_id
         JOIN courses c ON c.course_id = ts.course_id
         JOIN rooms r ON r.room_id = ts.room_id
         WHERE sg.class_group_id = ?
         ORDER BY FIELD(tsl.day_of_week,"Monday","Tuesday","Wednesday","Thursday","Friday"), tsl.start_time'
    );
    $stmt->execute([$selectedGroupId]);
    $timetable = $stmt->fetchAll();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Dashboard | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="assets/css/admin.css">
</head>
<body>
<?php include __DIR__ . '/pages/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Dashboard</h1>
    <p>Welcome back, <strong><?= htmlspecialchars($admin['name']) ?></strong>. Here is the current scheduling overview.</p>
  </header>

  <section class="stat-cards">
    <div class="stat-card"><span class="label">Total Courses</span><span class="value"><?= $totalCourses ?></span></div>
    <div class="stat-card"><span class="label">Total Lecturers</span><span class="value"><?= $totalLecturers ?></span></div>
    <div class="stat-card"><span class="label">Class Groups</span><span class="value"><?= $totalGroups ?></span></div>
    <div class="stat-card"><span class="label">Classrooms</span><span class="value"><?= $totalRooms ?></span></div>
    <div class="stat-card"><span class="label">Scheduled</span><span class="value"><?= $scheduled ?> / <?= $totalCourses ?></span></div>
    <div class="stat-card <?= $conflicts > 0 ? 'alert' : '' ?>">
      <span class="label">Conflicts</span><span class="value"><?= $conflicts ?></span>
    </div>
  </section>

  <section class="panel timetable-preview">
    <div class="panel-header">
      <h2>Timetable Preview (This Week)</h2>
      <form method="get">
        <select name="group" onchange="this.form.submit()">
          <?php foreach ($classGroups as $g): ?>
            <option value="<?= $g['class_group_id'] ?>" <?= $g['class_group_id'] == $selectedGroupId ? 'selected' : '' ?>>
              <?= htmlspecialchars($g['name']) ?>
            </option>
          <?php endforeach; ?>
        </select>
      </form>
    </div>

    <?php if (empty($timetable)): ?>
      <p class="empty-state">No sessions generated yet for this class group.</p>
    <?php else: ?>
      <table class="timetable-grid">
        <thead>
          <tr><th>Time</th><?php foreach (DAYS_OF_WEEK as $d): ?><th><?= $d ?></th><?php endforeach; ?></tr>
        </thead>
        <tbody>
          <?php
          // group by time
          $byTime = [];
          foreach ($timetable as $row) {
              $key = $row['start_time'] . '-' . $row['end_time'];
              $byTime[$key][$row['day_of_week']] = $row;
          }
          foreach ($byTime as $timeKey => $days):
          ?>
            <tr>
              <td><?= $timeKey ?></td>
              <?php foreach (DAYS_OF_WEEK as $d): ?>
                <td>
                  <?php if (isset($days[$d])): ?>
                    <span class="session session-<?= $days[$d]['session_type'] ?>">
                      <strong><?= htmlspecialchars($days[$d]['course_code']) ?></strong><br>
                      <small><?= htmlspecialchars($days[$d]['course_title']) ?></small><br>
                      <small><?= htmlspecialchars($days[$d]['room_name']) ?></small>
                    </span>
                  <?php endif; ?>
                </td>
              <?php endforeach; ?>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>
  </section>

  <section class="panel recent-activity">
    <h2>Recent Activities</h2>
    <ul>
      <?php foreach ($recentActivity as $a): ?>
        <li><?= htmlspecialchars($a['action']) ?> <time><?= $a['created_at'] ?></time></li>
      <?php endforeach; ?>
      <?php if (empty($recentActivity)): ?>
        <li class="empty-state">No activity yet.</li>
      <?php endif; ?>
    </ul>
  </section>

  <section class="panel">
    <div class="panel-header">
      <div><h2>Quick actions</h2><p class="admin-note">Jump straight to the work that usually needs attention.</p></div>
    </div>
    <div class="actions">
      <a class="btn btn-primary" href="<?= BASE_URL ?>/admin/pages/timetable.php">Open timetable</a>
      <a class="btn btn-outline" href="<?= BASE_URL ?>/admin/pages/courses.php">Manage courses</a>
      <a class="btn btn-outline" href="<?= BASE_URL ?>/admin/pages/conflicts.php">Review conflicts</a>
      <a class="btn btn-outline" href="<?= BASE_URL ?>/admin/pages/reports.php">View reports</a>
    </div>
  </section>
</main>
<script src="../public/assets/js/theme.js"></script>
<script src="../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
