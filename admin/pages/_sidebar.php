<?php
$currentPage = $currentPage ?? basename($_SERVER['SCRIPT_NAME']);

function adminNavActive(string $file, string $current): string
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
    <li class="nav-section">Overview</li>
    <li><a href="<?= BASE_URL ?>/admin/index.php" class="<?= adminNavActive('index.php', $currentPage) ?>">Dashboard</a></li>

    <li class="nav-section">Scheduling</li>
    <li><a href="<?= BASE_URL ?>/admin/pages/timetable.php" class="<?= adminNavActive('timetable.php', $currentPage) ?>">Timetable</a></li>
    <li><a href="<?= BASE_URL ?>/admin/pages/conflicts.php" class="<?= adminNavActive('conflicts.php', $currentPage) ?>">Conflicts</a></li>
    <li><a href="<?= BASE_URL ?>/admin/pages/reports.php" class="<?= adminNavActive('reports.php', $currentPage) ?>">Reports</a></li>

    <li class="nav-section">Academic Setup</li>
    <li><a href="<?= BASE_URL ?>/admin/pages/departments.php" class="<?= adminNavActive('departments.php', $currentPage) ?>">Departments</a></li>
    <li><a href="<?= BASE_URL ?>/admin/pages/class_groups.php" class="<?= adminNavActive('class_groups.php', $currentPage) ?>">Class Groups</a></li>
    <li><a href="<?= BASE_URL ?>/admin/pages/courses.php" class="<?= adminNavActive('courses.php', $currentPage) ?>">Courses</a></li>
    <li><a href="<?= BASE_URL ?>/admin/pages/lecturers.php" class="<?= adminNavActive('lecturers.php', $currentPage) ?>">Lecturers</a></li>
    <li><a href="<?= BASE_URL ?>/admin/pages/classrooms.php" class="<?= adminNavActive('classrooms.php', $currentPage) ?>">Classrooms</a></li>

    <li class="nav-section">System</li>
    <li><a href="<?= BASE_URL ?>/admin/pages/users_roles.php" class="<?= adminNavActive('users_roles.php', $currentPage) ?>">Users &amp; Roles</a></li>
    <li><a href="<?= BASE_URL ?>/admin/pages/settings.php" class="<?= adminNavActive('settings.php', $currentPage) ?>">Settings</a></li>
  </ul>

  <a class="logout" href="<?= BASE_URL ?>/admin/logout.php">Log out</a>
</nav>
<script src="<?= BASE_URL ?>/public/assets/js/app.js" defer></script>
