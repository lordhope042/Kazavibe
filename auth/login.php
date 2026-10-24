<?php
require_once __DIR__ . '/../includes/auth.php';

$error = null;
$identifierValue = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $identifier = trim($_POST['identifier'] ?? '');
    $password = $_POST['password'] ?? '';
    $identifierValue = $identifier;

    if ($identifier === '' || $password === '') {
        $error = 'Enter your email or registration number, and your password.';
    } else {
        // A registration number never looks like an email, so that case is
        // student-only. An email could belong to either an admin or a
        // student, so try admin first, then fall back to student — whichever
        // table the credentials actually match decides where the user lands.
        $looksLikeEmail = str_contains($identifier, '@');
        $loggedIn = false;

        if ($looksLikeEmail) {
            if (adminLogin($identifier, $password)) {
                header('Location: ' . BASE_URL . '/admin/index.php');
                exit;
            }
            if (studentLogin($identifier, $password)) {
                header('Location: ' . BASE_URL . '/student/index.php');
                exit;
            }
        } else {
            if (studentLogin($identifier, $password)) {
                header('Location: ' . BASE_URL . '/student/index.php');
                exit;
            }
        }

        $error = 'Incorrect credentials. Check your email/registration number and password.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Login | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="assets/css/auth.css">
</head>
<body class="auth-page">
<div class="auth-shell">
  <section class="auth-showcase">
    <div class="showcase-glow glow-one"></div><div class="showcase-glow glow-two"></div>
    <div class="brand-mark">
      <span class="seal"><img src="../public/assets/img/logo.png" alt="HAFED POLY logo" onerror="this.style.display='none'"></span>
      <div><strong>HAFED POLY</strong><small>Computer Science Department</small></div>
    </div>
    <div class="showcase-copy">
      <span class="eyebrow">TIMETABLE MANAGEMENT SYSTEM</span>
      <h1>Your timetable,<br><em>made simple.</em></h1>
      <p>Sign in to view your class schedule, courses, lecturers, exams and important academic updates in one place.</p>
    </div>
    <div class="mini-timetable" aria-hidden="true">
      <div class="mini-head"><span>WEEKLY TIMETABLE</span><b>FIRST SEMESTER</b></div>
      <div class="mini-grid">
        <span></span><b>MON</b><b>TUE</b><b>WED</b><b>THU</b><b>FRI</b>
        <small>08:00</small><i>CSC 201</i><i>GNS 202</i><i></i><i>CSC 205</i><i></i>
        <small>10:00</small><i></i><i>CSC 203</i><i>GNS 204</i><i></i><i>CSC 201</i>
        <small>12:00</small><i>CSC 206</i><i></i><i>CSC 207</i><i>GNS 206</i><i></i>
      </div>
    </div>
    <div class="showcase-footer"><span>Hussaini Adamu Federal Polytechnic, Kazaure</span><span>Student Portal</span></div>
  </section>

  <section class="auth-form-side">
    <div class="auth-card">
      <div class="mobile-brand brand-mark">
        <span class="seal"><img src="../public/assets/img/logo.png" alt="logo" onerror="this.style.display='none'"></span>
        <div><strong>HAFED POLY</strong><small>Computer Science Department</small></div>
      </div>
      <div class="form-heading"><span class="eyebrow">STUDENT PORTAL</span><h2>Welcome back</h2><p>Sign in with your registration number or email.</p></div>
      <?php if ($error): ?><div class="alert-box alert-error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
      <form method="post">
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken()) ?>">
        <label>Registration Number or Email</label>
        <input type="text" name="identifier" placeholder="e.g. ND/CS/25/039 or you@hafedpoly.edu.ng" value="<?= htmlspecialchars($identifierValue) ?>" required autofocus>
        <label>Password</label>
        <div class="password-field"><input type="password" name="password" id="password" required><button type="button" class="toggle-password" data-target="password" aria-label="Show password"><svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg><svg class="icon-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button></div>
        <button type="submit" class="btn-submit">Log In <span>→</span></button>
      </form>
      <div class="auth-footer">New student? <a href="register.php">Create an account</a></div>
    </div>
  </section>
</div>
<script>
document.querySelectorAll('.toggle-password').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.querySelector('.icon-eye').style.display = isHidden ? 'none' : 'block';
    btn.querySelector('.icon-eye-off').style.display = isHidden ? 'block' : 'none';
    btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  });
});
</script>
<script src="../public/assets/js/app.js" defer></script>
<script src="../public/assets/js/theme.js"></script>
<script src="../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
