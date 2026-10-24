<?php require_once __DIR__ . '/../config/config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= APP_NAME ?></title>
<link rel="stylesheet" href="assets/css/landing.css">
</head>
<body>
<header class="nav">
  <a class="brand" href="#top" aria-label="HAFED POLY Timetable Management System">
    <img src="assets/img/logo.png" alt="HAFED POLY logo">
    <span><strong>CS Timetable</strong><small>Hussaini Adamu Federal Polytechnic</small></span>
  </a>
  <nav>
    <a href="#top" class="active">Home</a><a href="#features">Features</a><a href="#how">How It Works</a><a href="#about">About</a>
  </nav>
  <div class="cta"><a href="../auth/login.php" class="btn-outline">Login</a><a href="../auth/register.php" class="btn-solid">Get Started</a></div>
</header>

<main id="top">
<section class="hero">
  <div class="hero-copy">
    <span class="eyebrow">Computer Science Department · HAFED POLY</span>
    <h1>Plan smarter.<br><span>Schedule with confidence.</span></h1>
    <p>Generate, review and manage academic timetables without the usual clash of rooms, lecturers and class groups.</p>
    <div class="hero-actions"><a href="../auth/register.php" class="btn-solid btn-large">Get Started <span>→</span></a><a href="#how" class="text-link">See how it works <span>↗</span></a></div>
    <div class="trust-row"><span><i>✓</i> Automatic generation</span><span><i>✓</i> Conflict detection</span><span><i>✓</i> Easy adjustments</span></div>
  </div>
  <div class="hero-visual">
    <div class="glow"></div>
    <div class="schedule-card">
      <div class="schedule-head"><div><small>FIRST SEMESTER</small><strong>Weekly Timetable</strong></div><span class="status"><i></i> Published</span></div>
      <div class="schedule-grid">
        <div class="time-head"></div><div class="day">MON</div><div class="day">TUE</div><div class="day">WED</div><div class="day">THU</div><div class="day">FRI</div>
        <div class="time">8:00<br><em>AM</em></div><div class="slot green"><b>CSC 201</b><small>Room 201</small></div><div></div><div class="slot gold"><b>GNS 202</b><small>Room 203</small></div><div></div><div></div>
        <div class="time">10:00<br><em>AM</em></div><div></div><div class="slot dark"><b>CSC 203</b><small>Room 201</small></div><div></div><div class="slot green"><b>CSC 205</b><small>Room 201</small></div><div></div>
        <div class="time">12:00<br><em>PM</em></div><div class="slot gold"><b>GNS 204</b><small>Room 204</small></div><div></div><div class="slot green"><b>CSC 206</b><small>Room 202</small></div><div></div><div class="slot dark"><b>CSC 201</b><small>Room 201</small></div>
      </div>
      <div class="schedule-foot"><span>ND 200 · Computer Science</span><span>6 sessions today</span></div>
    </div>
    <div class="float-card conflict"><span class="icon">✓</span><div><b>No clashes detected</b><small>Rooms · Lecturers · Classes</small></div></div>
    <div class="float-card generated"><span class="icon">↗</span><div><b>Timetable generated</b><small>Ready for review</small></div></div>
  </div>
</section>

<section class="feature-strip" id="features">
  <div><span class="feature-icon">01</span><div><b>Generate automatically</b><small>Build schedules around your academic resources.</small></div></div>
  <div><span class="feature-icon">02</span><div><b>Detect conflicts</b><small>Catch room, lecturer and class clashes early.</small></div></div>
  <div><span class="feature-icon">03</span><div><b>Adjust with ease</b><small>Swap sessions and find alternative slots.</small></div></div>
</section>

<section class="how" id="how">
  <div class="section-heading"><span class="eyebrow">HOW IT WORKS</span><h2>From setup to published timetable.</h2><p>A straightforward workflow for the department.</p></div>
  <div class="steps"><article><span>01</span><h3>Set up</h3><p>Add courses, lecturers, class groups and available rooms.</p></article><article><span>02</span><h3>Generate</h3><p>Let the scheduling engine create a draft based on your data.</p></article><article><span>03</span><h3>Review</h3><p>Inspect the timetable, resolve conflicts and make adjustments.</p></article><article><span>04</span><h3>Publish</h3><p>Release the finished timetable for students to view.</p></article></div>
</section>

<section class="about" id="about"><div><span class="eyebrow">BUILT FOR THE DEPARTMENT</span><h2>One place for the academic schedule.</h2><p>Keep courses, lecturers, rooms, class groups and published timetables connected in one system designed around the Computer Science Department's workflow.</p></div><div class="about-card"><span>6</span><small>Academic group levels</small><hr><span>2</span><small>Semester periods</small><hr><span>1</span><small>Connected timetable system</small></div></section>
</main>
<footer class="footer"><div><strong>CS Timetable Management System</strong><span>Hussaini Adamu Federal Polytechnic, Kazaure</span></div><div><a href="../auth/login.php">Login</a><a href="../auth/register.php">Register</a></div><small>© <?= date('Y') ?> HAFED POLY Computer Science Department</small></footer>
<script src="assets/js/app.js" defer></script>
<script src="assets/js/theme.js"></script>
<script src="assets/js/confirm-dialog.js"></script>
</body>
</html>
