<?php
require_once __DIR__ . '/../../includes/auth.php';
requireStudent();

$pdo = getDbConnection();
$student = currentStudent();

$stmt = $pdo->prepare(
    'SELECT ts.time_slot_id, tsl.day_of_week, tsl.start_time, tsl.end_time,
            c.course_code, c.course_title, c.session_type,
            r.name AS room_name, l.full_name AS lecturer_name, ts.is_combined
     FROM timetable_sessions ts
     JOIN session_class_groups sg ON sg.session_id = ts.session_id
     JOIN time_slots tsl ON tsl.time_slot_id = ts.time_slot_id
     JOIN courses c ON c.course_id = ts.course_id
     JOIN rooms r ON r.room_id = ts.room_id
     LEFT JOIN lecturers l ON l.lecturer_id = ts.lecturer_id
     WHERE sg.class_group_id = ? AND ts.status = "published"
       AND ts.academic_session_id = (SELECT academic_session_id FROM academic_sessions WHERE is_active = 1 ORDER BY academic_session_id DESC LIMIT 1)
     ORDER BY FIELD(tsl.day_of_week,"Monday","Tuesday","Wednesday","Thursday","Friday"), tsl.start_time'
);
$stmt->execute([$student['class_group_id']]);
$timetable = $stmt->fetchAll();

$byTime = [];
foreach ($timetable as $row) {
    $key = $row['start_time'] . '-' . $row['end_time'];
    $byTime[$key][$row['day_of_week']] = $row;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>My Timetable | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/student.css">
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
    <h1>My Timetable</h1>
    <p>Weekly schedule for your class group</p>
  </header>

  <?php if (!empty($timetable)): ?>
    <div class="actions no-print" style="margin-bottom:16px;">
      <button class="btn btn-primary" onclick="window.print()">Download / Print Timetable</button>
    </div>
  <?php endif; ?>

  <section class="panel">
    <?php if (empty($timetable)): ?>
      <p class="empty-state">No published timetable yet. Check back once your department publishes it.</p>
    <?php else: ?>
      <table class="timetable-grid">
        <thead>
          <tr><th>Time</th><?php foreach (DAYS_OF_WEEK as $d): ?><th><?= $d ?></th><?php endforeach; ?></tr>
        </thead>
        <tbody>
          <?php foreach ($byTime as $timeKey => $days):
            [$start, $end] = explode('-', $timeKey);
          ?>
            <tr>
              <td><?= substr($start, 0, 5) ?>–<?= substr($end, 0, 5) ?></td>
              <?php foreach (DAYS_OF_WEEK as $d): ?>
                <td>
                  <?php if (isset($days[$d])): ?>
                    <span class="session session-<?= $days[$d]['session_type'] ?>">
                      <strong><?= htmlspecialchars($days[$d]['course_code']) ?></strong><br>
                      <small><?= htmlspecialchars($days[$d]['course_title']) ?></small><br>
                      <small><?= htmlspecialchars($days[$d]['room_name']) ?></small>
                      <?php if ($days[$d]['is_combined']): ?><br><small>Combined</small><?php endif; ?>
                    </span>
                  <?php endif; ?>
                </td>
              <?php endforeach; ?>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>

      <div class="legend">
        <?php foreach (SESSION_TYPE_COLORS as $type => $color): ?>
          <span class="legend-item"><span class="dot" style="background:<?= $color ?>"></span> <?= ucfirst($type) ?></span>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </section>
</main>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
