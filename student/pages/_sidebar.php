<?php
$currentPage = $currentPage ?? basename($_SERVER['SCRIPT_NAME']);

function studentNavActive(string $file, string $current): string
{
    return $file === $current ? ' active' : '';
}
?>
<button class="sidebar-toggle" type="button" aria-label="Open navigation" aria-controls="app-sidebar">☰</button>
<div class="sidebar-backdrop" aria-hidden="true"></div>
<nav class="sidebar" id="app-sidebar">
  <div class="brand">
    <img src="<?= BASE_URL ?>/public/assets/img/logo.png" alt="HAFED POLY logo">
    <div>
      <strong>HUSSAINI ADAMU</strong>
      <small>FEDERAL POLYTECHNIC, KAZAURE</small>
      <small>JIGAWA STATE</small>
    </div>
  </div>

  <ul class="nav-links">
    <li class="nav-section">Home</li>
    <li><a href="<?= BASE_URL ?>/student/index.php" class="<?= studentNavActive('index.php', $currentPage) ?>">Dashboard</a></li>
    <li><a href="<?= BASE_URL ?>/student/pages/my_timetable.php" class="<?= studentNavActive('my_timetable.php', $currentPage) ?>">My Timetable</a></li>

    <li class="nav-section">Academic</li>
    <li><a href="<?= BASE_URL ?>/student/pages/my_courses.php" class="<?= studentNavActive('my_courses.php', $currentPage) ?>">My Courses</a></li>
    <li><a href="<?= BASE_URL ?>/student/pages/my_lecturers.php" class="<?= studentNavActive('my_lecturers.php', $currentPage) ?>">My Lecturers</a></li>
    <li><a href="<?= BASE_URL ?>/student/pages/exams.php" class="<?= studentNavActive('exams.php', $currentPage) ?>">Exams</a></li>
    <li><a href="<?= BASE_URL ?>/student/pages/academic_calendar.php" class="<?= studentNavActive('academic_calendar.php', $currentPage) ?>">Academic Calendar</a></li>

    <li class="nav-section">Updates</li>
    <li><a href="<?= BASE_URL ?>/student/pages/announcements.php" class="<?= studentNavActive('announcements.php', $currentPage) ?>">Announcements</a></li>
    <li><a href="<?= BASE_URL ?>/student/pages/notifications.php" class="<?= studentNavActive('notifications.php', $currentPage) ?>">Notifications</a></li>

    <li class="nav-section">Account</li>
    <li><a href="<?= BASE_URL ?>/student/pages/profile.php" class="<?= studentNavActive('profile.php', $currentPage) ?>">Profile</a></li>
    <li><a href="<?= BASE_URL ?>/student/pages/settings.php" class="<?= studentNavActive('settings.php', $currentPage) ?>">Settings</a></li>
  </ul>

  <a class="logout" href="<?= BASE_URL ?>/student/logout.php">Log out</a>
</nav>
<script src="<?= BASE_URL ?>/public/assets/js/app.js" defer></script>
