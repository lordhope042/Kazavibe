<?php
require_once __DIR__ . '/../includes/auth.php';

$pdo = getDbConnection();
$errors = [];
$intakeLevels = require __DIR__ . '/../config/intake_levels.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? null)) {
        http_response_code(419);
        $errors[] = 'Your session expired. Refresh the page and try again.';
    }
    $fullName   = trim($_POST['full_name'] ?? '');
    $regNo      = trim($_POST['reg_no'] ?? '');
    $email      = trim($_POST['email'] ?? '');
    $classGroup = $_POST['class_group_id'] ?? '';
    $password   = $_POST['password'] ?? '';
    $confirm    = $_POST['confirm_password'] ?? '';

    if ($fullName === '' || $regNo === '' || $email === '' || !$classGroup) {
        $errors[] = 'All fields are required. Your level must auto-detect from a valid registration number before you can submit.';
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { $errors[] = 'Enter a valid email address.'; }
    if (!preg_match('/^[A-Za-z0-9\/-]{4,40}$/', $regNo)) { $errors[] = 'Enter a valid registration number.'; }
    if (strlen($password) < 8) {
        $errors[] = 'Password must be at least 8 characters.';
    }
    if ($password !== $confirm) {
        $errors[] = 'Passwords do not match.';
    }

    if (empty($errors)) {
        // Never trust the hidden class_group_id submitted by the browser.
        $validGroup = $pdo->prepare('SELECT class_group_id FROM class_groups WHERE class_group_id = ? LIMIT 1');
        $validGroup->execute([(int) $classGroup]);
        if (!$validGroup->fetchColumn()) { $errors[] = 'The detected class is invalid. Re-enter your registration number.'; }
    }

    if (empty($errors)) {
        try {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $pdo->prepare(
                'INSERT INTO students (reg_no, full_name, email, password_hash, class_group_id) VALUES (?,?,?,?,?)'
            )->execute([$regNo, $fullName, $email, $hash, $classGroup]);

            // Log straight in after registering
            studentLogin($regNo, $password);
            header('Location: ' . BASE_URL . '/student/index.php');
            exit;
        } catch (PDOException $e) {
            $errors[] = str_contains($e->getMessage(), 'Duplicate')
                ? 'That registration number or email is already registered.'
                : 'Could not create account. Please check your details and try again.';
        }
    }
}

$classGroups = $pdo->query('SELECT * FROM class_groups ORDER BY program, level')->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Create Account | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="assets/css/auth.css">
</head>
<body class="auth-page">
<div class="auth-shell register-shell">
  <section class="auth-showcase">
    <div class="showcase-glow glow-one"></div><div class="showcase-glow glow-two"></div>
    <div class="brand-mark"><span class="seal"><img src="../public/assets/img/logo.png" alt="HAFED POLY logo" onerror="this.style.display='none'"></span><div><strong>HAFED POLY</strong><small>Computer Science Department</small></div></div>
    <div class="showcase-copy"><span class="eyebrow">STUDENT REGISTRATION</span><h1>Start with the right<br><em>class schedule.</em></h1><p>Create your student account and let the system identify your academic class from your registration number.</p></div>
    <div class="benefit-list"><div><b>01</b><span><strong>Automatic level detection</strong><small>Your registration number helps identify ND, HND, NCC or SWD class groups.</small></span></div><div><b>02</b><span><strong>One place for your academics</strong><small>Access timetable, courses, lecturers, exams and announcements.</small></span></div><div><b>03</b><span><strong>Simple student access</strong><small>Register once, then sign in whenever you need your schedule.</small></span></div></div>
    <div class="showcase-footer"><span>Hussaini Adamu Federal Polytechnic, Kazaure</span><span>Student Portal</span></div>
  </section>

  <section class="auth-form-side">
    <div class="auth-card register-card">
      <div class="mobile-brand brand-mark"><span class="seal"><img src="../public/assets/img/logo.png" alt="logo" onerror="this.style.display='none'"></span><div><strong>HAFED POLY</strong><small>Computer Science Department</small></div></div>
      <div class="form-heading"><span class="eyebrow">NEW STUDENT</span><h2>Create your account</h2><p>Only students register here. Your level will be detected automatically.</p></div>
      <?php foreach ($errors as $e): ?><div class="alert-box alert-error"><?= htmlspecialchars($e) ?></div><?php endforeach; ?>
      <form method="post" id="registerForm" class="register-form">
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken()) ?>">
        <div class="form-two-col">
          <div><label>Full Name</label><input type="text" name="full_name" value="<?= htmlspecialchars($_POST['full_name'] ?? '') ?>" required></div>
          <div><label>Email</label><input type="email" name="email" value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" required></div>
        </div>
        <label>Registration Number</label>
        <input type="text" name="reg_no" id="regNo" placeholder="e.g. ND/CS/25/039" value="<?= htmlspecialchars($_POST['reg_no'] ?? '') ?>" required autocomplete="off">
        <label>Detected Class</label>
        <div class="level-display" id="levelDisplay">Enter your registration number above</div>
        <input type="hidden" name="class_group_id" id="classGroupId" value="<?= htmlspecialchars($_POST['class_group_id'] ?? '') ?>">
        <div class="form-two-col">
          <div><label>Password</label><div class="password-field"><input type="password" name="password" id="password" minlength="8" required><button type="button" class="toggle-password" data-target="password" aria-label="Show password"><svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg><svg class="icon-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button></div></div>
          <div><label>Confirm Password</label><div class="password-field"><input type="password" name="confirm_password" id="confirmPassword" minlength="8" required><button type="button" class="toggle-password" data-target="confirmPassword" aria-label="Show password"><svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg><svg class="icon-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button></div></div>
        </div>
        <button type="submit" class="btn-submit" id="submitBtn" disabled>Create Account <span>→</span></button>
      </form>
      <div class="auth-footer">Already have an account? <a href="login.php">Log in</a></div>
    </div>
  </section>
</div>
<script>
const CLASS_GROUPS = <?= json_encode($classGroups) ?>;
const INTAKE_LEVELS = <?= json_encode($intakeLevels) ?>;
const PRESET_CLASS_GROUP = <?= json_encode($_POST['class_group_id'] ?? '') ?>;

function parseRegNo(regNo) {
  const upper = regNo.toUpperCase().trim();
  let match;
  if ((match = upper.match(/^ND\/CS\/(\d{2})\//))) {
    return { program: 'ND', specialization: null, year: match[1] };
  }
  if ((match = upper.match(/^HND\/(SWD|NCC)\/(\d{2})\//))) {
    return { program: 'HND', specialization: match[1], year: match[2] };
  }
  return null;
}

function resolveLevel(parsed) {
  if (!parsed) return { status: 'unrecognized' };

  const programTable = parsed.program === 'ND'
    ? INTAKE_LEVELS.ND
    : INTAKE_LEVELS.HND[parsed.specialization];

  const yearEntry = programTable.years
    ? programTable.years[parsed.year]
    : (programTable[parsed.year] || null);

  if (yearEntry) {
    return {
      status: 'ok',
      level: yearEntry.level,
      notice: yearEntry.notice,
      program: parsed.program,
      specialization: parsed.specialization,
    };
  }

  // Year not configured — never block registration, just fall back to the
  // program's default level and flag it for a human to confirm later.
  const fallbackTable = parsed.program === 'ND' ? INTAKE_LEVELS.ND : INTAKE_LEVELS.HND;
  return {
    status: 'ok',
    level: fallbackTable.default_level,
    notice: 'unconfirmed',
    program: parsed.program,
    specialization: parsed.specialization,
  };
}

function refreshLevel() {
  const regNo = document.getElementById('regNo').value.trim();
  const display = document.getElementById('levelDisplay');
  const hiddenInput = document.getElementById('classGroupId');
  const submitBtn = document.getElementById('submitBtn');

  hiddenInput.value = '';
  submitBtn.disabled = true;
  display.className = 'level-display';

  if (!regNo) {
    display.textContent = 'Enter your registration number above';
    return;
  }

  const resolved = resolveLevel(parseRegNo(regNo));

  if (resolved.status === 'unrecognized') {
    display.textContent = 'Registration number format not recognized — use ND/CS/.., HND/SWD/.., or HND/NCC/..';
    display.classList.add('blocked');
    return;
  }

  const group = CLASS_GROUPS.find(g =>
    g.program === resolved.program &&
    g.level === resolved.level &&
    (resolved.specialization === null ? !g.specialization : g.specialization === resolved.specialization)
  );

  if (!group) {
    display.textContent = 'Could not match this level to a class group — contact the admin.';
    display.classList.add('blocked');
    return;
  }

  const levelLabel = `Level ${resolved.level}${resolved.specialization ? ' — ' + resolved.specialization : ''}`;

  if (resolved.notice === 'finished') {
    display.textContent = `${levelLabel}. Note: this entry year has already completed ${resolved.program} and would normally have moved on to HND — you can still register below.`;
    display.classList.add('notice');
  } else if (resolved.notice === 'unconfirmed') {
    display.textContent = `${levelLabel} (best guess — this entry year isn't confirmed yet, check with admin if this looks wrong).`;
    display.classList.add('notice');
  } else {
    display.textContent = levelLabel;
    display.classList.add('matched');
  }

  hiddenInput.value = group.class_group_id;
  submitBtn.disabled = false;
}

document.getElementById('regNo').addEventListener('input', refreshLevel);
refreshLevel();
if (PRESET_CLASS_GROUP) refreshLevel();

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
