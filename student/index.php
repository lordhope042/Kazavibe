<?php
require_once __DIR__ . '/../includes/auth.php';
requireStudent();

$pdo = getDbConnection();
$student = currentStudent();

$registeredCourses = $pdo->prepare(
    'SELECT COUNT(*) FROM course_registrations WHERE student_id = ?'
);
$registeredCourses->execute([$student['id']]);
$registeredCount = $registeredCourses->fetchColumn();

$today = date('l'); // e.g. 'Monday'
$todayClasses = $pdo->prepare(
    'SELECT COUNT(*) FROM timetable_sessions ts
     JOIN session_class_groups sg ON sg.session_id = ts.session_id
     JOIN time_slots tsl ON tsl.time_slot_id = ts.time_slot_id
     WHERE sg.class_group_id = ? AND tsl.day_of_week = ? AND ts.status = "published"'
);
$todayClasses->execute([$student['class_group_id'], $today]);
$todayCount = $todayClasses->fetchColumn();

$totalLecturers = $pdo->prepare(
    'SELECT COUNT(DISTINCT c.lecturer_id) FROM courses c
     JOIN course_registrations cr ON cr.course_id = c.course_id
     WHERE cr.student_id = ?'
);
$totalLecturers->execute([$student['id']]);
$lecturerCount = $totalLecturers->fetchColumn();

$upcomingExams = $pdo->query(
    "SELECT COUNT(*) FROM academic_calendar WHERE event_type = 'exam' AND event_date >= CURDATE()"
)->fetchColumn();

$announcements = $pdo->prepare(
    "SELECT * FROM announcements
     WHERE audience IN ('all','students')
        OR (audience = 'class_group' AND class_group_id = ?)
     ORDER BY created_at DESC LIMIT 3"
);
$announcements->execute([$student['class_group_id']]);
$announcements = $announcements->fetchAll();

$stmt = $pdo->prepare(
    'SELECT ts.time_slot_id, tsl.day_of_week, tsl.start_time, tsl.end_time,
            c.course_code, c.course_title, r.name AS room_name, c.session_type
     FROM timetable_sessions ts
     JOIN session_class_groups sg ON sg.session_id = ts.session_id
     JOIN time_slots tsl ON tsl.time_slot_id = ts.time_slot_id
     JOIN courses c ON c.course_id = ts.course_id
     JOIN rooms r ON r.room_id = ts.room_id
     WHERE sg.class_group_id = ? AND ts.status = "published"
     ORDER BY FIELD(tsl.day_of_week,"Monday","Tuesday","Wednesday","Thursday","Friday"), tsl.start_time'
);
$stmt->execute([$student['class_group_id']]);
$timetable = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Dashboard | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="assets/css/student.css">
</head>
<body>
<?php include __DIR__ . '/pages/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Dashboard</h1>
    <p><?= htmlspecialchars($student['reg_no']) ?> · Your academic overview for today.</p>
  </header>

  <section class="stat-cards">
    <div class="stat-card"><span class="label">Registered Courses</span><span class="value"><?= $registeredCount ?></span></div>
    <div class="stat-card"><span class="label">Today's Classes</span><span class="value"><?= $todayCount ?></span></div>
    <div class="stat-card"><span class="label">Total Lecturers</span><span class="value"><?= $lecturerCount ?></span></div>
    <div class="stat-card"><span class="label">Upcoming Exams</span><span class="value"><?= $upcomingExams ?></span></div>
  </section>

  <section class="panel timetable-preview">
    <div class="panel-header"><h2>My Timetable (This Week)</h2></div>

    <?php if (empty($timetable)): ?>
      <p class="empty-state">No published timetable yet.</p>
    <?php else: ?>
      <table class="timetable-grid">
        <thead>
          <tr><th>Time</th><?php foreach (DAYS_OF_WEEK as $d): ?><th><?= $d ?></th><?php endforeach; ?></tr>
        </thead>
        <tbody>
          <?php
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

  <section class="panel announcements">
    <h2>Announcements</h2>
    <ul>
      <?php foreach ($announcements as $a): ?>
        <li><strong><?= htmlspecialchars($a['title']) ?></strong><br><?= htmlspecialchars($a['body']) ?></li>
      <?php endforeach; ?>
      <?php if (empty($announcements)): ?>
        <li class="empty-state">No announcements.</li>
      <?php endif; ?>
    </ul>
  </section>

  <section class="panel">
    <div class="panel-header"><div><h2>Quick access</h2><p class="admin-note">Open the documents and schedules you use most.</p></div></div>
    <div class="actions">
      <a href="pages/my_timetable.php" class="btn btn-outline">My Timetable (PDF)</a>
      <a href="pages/my_courses.php" class="btn btn-outline">Course Registration Slip</a>
      <a href="pages/exams.php" class="btn btn-outline">Exam Schedule</a>
      <a href="pages/academic_calendar.php" class="btn btn-outline">Academic Calendar</a>
    </div>
    <p class="admin-note mt-10">Opens the page — use its Download / Print button to save as PDF.</p>
  </section>
</main>
<script src="../public/assets/js/theme.js"></script>
<script src="../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
