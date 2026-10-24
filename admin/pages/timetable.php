<?php
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/functions/timetable_functions.php';
requireAdmin();

$pdo = getDbConnection();

$semester = $_GET['semester'] ?? 'first';
$semester = in_array($semester, ['first', 'second'], true) ? $semester : 'first';

$departments = $pdo->query('SELECT * FROM departments ORDER BY name')->fetchAll();
if (empty($departments)) {
    header('Location: departments.php');
    exit;
}
$departmentId = (int) ($_GET['department_id'] ?? $departments[0]['department_id']);
if (!in_array($departmentId, array_column($departments, 'department_id'), true)) {
    $departmentId = (int) $departments[0]['department_id'];
}

// Class groups belonging to the selected department — "0" means show
// every level together; picking one shows that level's timetable alone,
// per the spec's "View timetable by class group" requirement.
$levelOptions = $pdo->prepare('SELECT class_group_id, name FROM class_groups WHERE department_id = ? ORDER BY program, level, specialization');
$levelOptions->execute([$departmentId]);
$levelOptions = $levelOptions->fetchAll();

$classGroupId = (int) ($_GET['class_group_id'] ?? 0);
if ($classGroupId && !in_array($classGroupId, array_column($levelOptions, 'class_group_id'), true)) {
    $classGroupId = 0; // selected level doesn't belong to this department (e.g. after switching department) — fall back to "all"
}

$params = [$semester, $departmentId];
$levelFilterSql = '';
if ($classGroupId > 0) {
    $levelFilterSql = ' AND EXISTS (SELECT 1 FROM session_class_groups sgf WHERE sgf.session_id = ts.session_id AND sgf.class_group_id = ?)';
    $params[] = $classGroupId;
}

$sessions = $pdo->prepare(
    "SELECT ts.session_id, ts.is_locked, ts.is_combined, ts.status,
            tsl.day_of_week, tsl.start_time, tsl.end_time,
            c.course_code, c.course_title, c.session_type,
            r.name AS room_name,
            l.full_name AS lecturer_name,
            cg2.class_group_id AS home_class_group_id,
            cg2.name AS home_class_group_name,
            cg2.program, cg2.level, cg2.specialization,
            GROUP_CONCAT(DISTINCT cg.name ORDER BY cg.name SEPARATOR ', ') AS class_group_names
     FROM timetable_sessions ts
     JOIN courses c ON c.course_id = ts.course_id
     JOIN class_groups cg2 ON cg2.class_group_id = c.class_group_id
     JOIN time_slots tsl ON tsl.time_slot_id = ts.time_slot_id
     JOIN rooms r ON r.room_id = ts.room_id
     LEFT JOIN lecturers l ON l.lecturer_id = ts.lecturer_id
     JOIN session_class_groups sg ON sg.session_id = ts.session_id
     JOIN class_groups cg ON cg.class_group_id = sg.class_group_id
     WHERE c.semester = ? AND cg2.department_id = ?{$levelFilterSql}
     GROUP BY ts.session_id
     ORDER BY cg2.program, cg2.level, cg2.specialization,
              FIELD(tsl.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday'), tsl.start_time"
);
$sessions->execute($params);
$sessions = $sessions->fetchAll();

// Group sessions by their home level for the "All Levels" view, so each
// level visually stands as its own distinct section rather than every
// level's rows interleaved together by time.
$sessionsByLevel = [];
foreach ($sessions as $s) {
    $sessionsByLevel[$s['home_class_group_id']]['name'] = $s['home_class_group_name'];
    $sessionsByLevel[$s['home_class_group_id']]['rows'][] = $s;
}

$draftCount = count(array_filter($sessions, fn($s) => $s['status'] === 'draft'));
$publishedCount = count(array_filter($sessions, fn($s) => $s['status'] === 'published'));

$currentLevelName = $classGroupId
    ? (array_column($levelOptions, 'name', 'class_group_id')[$classGroupId] ?? '')
    : 'All Levels';

$suggestions = detectPossibleCombinations($pdo, $semester, $departmentId);

$lecturerNames = $pdo->query('SELECT lecturer_id, full_name FROM lecturers')->fetchAll(PDO::FETCH_KEY_PAIR);
$classGroupNames = $pdo->query('SELECT class_group_id, name FROM class_groups')->fetchAll(PDO::FETCH_KEY_PAIR);
$departmentNames = array_column($departments, 'name', 'department_id');
$currentDepartmentName = $departmentNames[$departmentId] ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Timetable | <?= APP_SHORT_NAME ?></title>
<link rel="stylesheet" href="../assets/css/admin.css">
</head>
<body>
<?php include __DIR__ . '/_sidebar.php'; ?>

<main class="content">
  <header class="topbar">
    <h1>Timetable</h1>
    <form method="get" class="filter-bar">
      <div class="field"><label for="departmentFilter">Department</label><select id="departmentFilter" name="department_id" onchange="this.form.submit()">
        <?php foreach ($departments as $d): ?>
          <option value="<?= $d['department_id'] ?>" <?= $departmentId === (int) $d['department_id'] ? 'selected' : '' ?>><?= htmlspecialchars($d['name']) ?></option>
        <?php endforeach; ?>
      </select></div>
      <div class="field"><label for="levelFilter">Level</label><select id="levelFilter" name="class_group_id" onchange="this.form.submit()">
        <option value="0" <?= $classGroupId === 0 ? 'selected' : '' ?>>All Levels</option>
        <?php foreach ($levelOptions as $lv): ?>
          <option value="<?= $lv['class_group_id'] ?>" <?= $classGroupId === (int) $lv['class_group_id'] ? 'selected' : '' ?>><?= htmlspecialchars($lv['name']) ?></option>
        <?php endforeach; ?>
      </select></div>
      <div class="field"><label for="semesterFilter">Semester</label><select id="semesterFilter" name="semester" onchange="this.form.submit()">
        <option value="first" <?= $semester === 'first' ? 'selected' : '' ?>>First Semester</option>
        <option value="second" <?= $semester === 'second' ? 'selected' : '' ?>>Second Semester</option>
      </select></div>
    </form>
  </header>

  <div id="toast" class="alert-box" hidden></div>

  <?php if (!empty($suggestions)): ?>
    <section class="panel">
      <div class="panel-header"><h2>Suggested Combinations (<?= count($suggestions) ?>)</h2></div>
      <p class="admin-note mb-12">
        These sessions share the same course code and lecturer across different class groups — they may be combinable into one lecture.
      </p>
      <table>
        <thead><tr><th>Course</th><th>Lecturer</th><th>Class Groups</th><th></th></tr></thead>
        <tbody>
          <?php foreach ($suggestions as $sug): ?>
            <tr>
              <td><?= htmlspecialchars($sug['course_code']) ?> — <?= htmlspecialchars($sug['course_title']) ?></td>
              <td><?= htmlspecialchars($lecturerNames[$sug['lecturer_id']] ?? '—') ?></td>
              <td><?php
                $allGroups = [];
                foreach ($sug['sessions'] as $s) {
                    foreach ($s['class_group_ids'] as $cgId) {
                        $allGroups[] = $classGroupNames[$cgId] ?? $cgId;
                    }
                }
                echo htmlspecialchars(implode(', ', array_unique($allGroups)));
              ?></td>
              <td>
                <button class="btn btn-primary" onclick='callApi("combine.php", {session_ids: <?= json_encode(array_column($sug['sessions'], 'session_id')) ?>})'>
                  Combine These
                </button>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </section>
  <?php endif; ?>

  <section class="panel">
    <div class="panel-header">
      <h2><?= htmlspecialchars($currentDepartmentName) ?> — <?= htmlspecialchars($currentLevelName) ?> — <?= ucfirst($semester) ?> Semester — <?= $draftCount ?> draft / <?= $publishedCount ?> published</h2>
      <div class="actions">
        <button class="btn btn-outline" onclick="runScheduleAction('regenerate.php', 'Regenerate this timetable? Existing draft sessions in this scope will be replaced; locked/published sessions are preserved.', this)">Regenerate<?= $classGroupId ? ' (' . htmlspecialchars($currentLevelName) . ' only)' : '' ?></button>
        <button class="btn btn-outline" onclick="runScheduleAction('generate.php', 'Generate a new draft timetable for this scope? Existing draft sessions in this scope will be replaced.', this)">Generate<?= $classGroupId ? ' (' . htmlspecialchars($currentLevelName) . ' only)' : '' ?></button>
        <button class="btn btn-primary" onclick="runScheduleAction('publish.php', 'Publish this timetable? Students will see the published sessions.', this)">Publish<?= $classGroupId ? ' (' . htmlspecialchars($currentLevelName) . ' only)' : '' ?></button>
      </div>
    </div>

    <?php if ($classGroupId > 0 && !empty($sessions)): ?>
      <?php
      $board = [];
      foreach ($sessions as $session) {
          $timeKey = substr($session['start_time'], 0, 5) . '–' . substr($session['end_time'], 0, 5);
          $board[$timeKey][$session['day_of_week']][] = $session;
      }
      ?>
      <div class="table-wrap timetable-board-wrap">
        <table class="timetable-grid">
          <thead><tr><th>Time</th><?php foreach (DAYS_OF_WEEK as $day): ?><th><?= $day ?></th><?php endforeach; ?></tr></thead>
          <tbody>
          <?php foreach ($board as $timeKey => $days): ?>
            <tr>
              <td><?= htmlspecialchars($timeKey) ?></td>
              <?php foreach (DAYS_OF_WEEK as $day): ?>
                <td>
                  <?php foreach (($days[$day] ?? []) as $session): ?>
                    <span class="session session-<?= htmlspecialchars($session['session_type']) ?>">
                      <strong><?= htmlspecialchars($session['course_code']) ?></strong><br>
                      <small><?= htmlspecialchars($session['course_title']) ?></small><br>
                      <small><?= htmlspecialchars($session['room_name']) ?></small>
                    </span>
                  <?php endforeach; ?>
                </td>
              <?php endforeach; ?>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <div class="admin-note board-note">Visual view for the selected level. Use the list below for locks, alternatives, combining and swapping.</div>
    <?php endif; ?>

    <?php foreach ($sessionsByLevel as $levelGroup): ?>
      <?php if ($classGroupId === 0): ?>
        <h3 class="section-heading">
          <?= htmlspecialchars($levelGroup['name']) ?>
          <span>(<?= count($levelGroup['rows']) ?> sessions)</span>
        </h3>
      <?php endif; ?>
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" class="selectAllInGroup"></th>
            <th>Day</th><th>Time</th><th>Course</th><th>Class Group(s)</th><th>Lecturer</th><th>Room</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($levelGroup['rows'] as $s): ?>
            <tr data-session-id="<?= $s['session_id'] ?>">
              <td><input type="checkbox" class="row-select" value="<?= $s['session_id'] ?>"></td>
              <td><?= $s['day_of_week'] ?></td>
              <td><?= substr($s['start_time'], 0, 5) ?>–<?= substr($s['end_time'], 0, 5) ?></td>
              <td>
                <span class="session session-<?= $s['session_type'] ?>"><?= htmlspecialchars($s['course_code']) ?></span>
                <br><small class="course-title"><?= htmlspecialchars($s['course_title']) ?></small>
                <?php if ($s['is_combined']): ?><span class="badge badge-published">Combined</span><?php endif; ?>
              </td>
              <td><?= htmlspecialchars($s['class_group_names']) ?></td>
              <td><?= htmlspecialchars($s['lecturer_name'] ?? '—') ?></td>
              <td><?= htmlspecialchars($s['room_name']) ?></td>
              <td><span class="badge badge-<?= $s['status'] ?>"><?= ucfirst($s['status']) ?></span></td>
              <td class="actions">
                <button class="btn btn-outline" onclick="toggleLock(<?= $s['session_id'] ?>, <?= $s['is_locked'] ? 'false' : 'true' ?>)">
                  <?= $s['is_locked'] ? 'Unlock' : 'Lock' ?>
                </button>
                <button class="btn btn-outline" onclick="findAlternative(<?= $s['session_id'] ?>)">Alt</button>
              </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
      </table>
    <?php endforeach; ?>
    <?php if (empty($sessions)): ?>
      <p class="empty-state">No sessions yet — click Generate to build a draft timetable.</p>
    <?php endif; ?>

    <?php if (!empty($sessions)): ?>
      <div class="actions table-actions">
        <button class="btn btn-primary" onclick="combineSelected()">Combine Selected</button>
        <button class="btn btn-outline" onclick="swapSelected()">Swap Selected (pick exactly 2)</button>
      </div>
    <?php endif; ?>
  </section>
</main>

<script>
const SEMESTER = <?= json_encode($semester) ?>;
const DEPARTMENT_ID = <?= json_encode($departmentId) ?>;
const CLASS_GROUP_ID = <?= json_encode($classGroupId) ?>;
const CSRF_TOKEN = <?= json_encode(csrfToken()) ?>;

function toast(message, isError = false) {
  const box = document.getElementById('toast');
  box.textContent = message;
  box.className = 'alert-box ' + (isError ? 'alert-error' : 'alert-success');
  box.hidden = false;
  window.scrollTo({top: 0, behavior: 'smooth'});
}

async function callApi(endpoint, body, options = {}) {
  const source = options.button;
  if (source) source.disabled = true;
  try {
    const res = await fetch('../../api/' + endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-CSRF-Token': CSRF_TOKEN},
      body: JSON.stringify(body),
    });
    const json = await res.json();
    toast(json.message || (json.success ? 'Done.' : 'Something went wrong.'), !json.success);
    if (json.success) setTimeout(() => location.reload(), 700);
    return json;
  } catch (e) {
    toast('Request failed. Please try again.', true);
  } finally {
    if (source) source.disabled = false;
  }
}

function confirmAction(message, button) {
  return window.confirm(message);
}

function toggleLock(sessionId, lock) {
  callApi('lock.php', {session_id: sessionId, locked: lock});
}

async function findAlternative(sessionId) {
  const res = await fetch('../../api/alternative.php', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-CSRF-Token': CSRF_TOKEN},
    body: JSON.stringify({session_id: sessionId, limit: 5}),
  });
  const json = await res.json();
  if (!json.success || !json.data || json.data.length === 0) {
    toast((json && json.message) || 'No alternatives found.', true);
    return;
  }
  const opt = json.data[0];
  const label = `${opt.day_of_week} ${opt.start_time.slice(0,5)}-${opt.end_time.slice(0,5)} in ${opt.room_name}`;
  if (confirm(`Move to: ${label}?`)) {
    await callApi('move.php', {session_id: sessionId, room_id: opt.room_id, time_slot_id: opt.time_slot_id});
  }
}

function runScheduleAction(endpoint, message, button) {
  if (!confirmAction(message, button)) return;
  callApi(endpoint, {semester: SEMESTER, department_id: DEPARTMENT_ID, class_group_id: CLASS_GROUP_ID}, {button});
}

function getSelected() {
  return Array.from(document.querySelectorAll('.row-select:checked')).map(cb => parseInt(cb.value, 10));
}

function combineSelected() {
  const ids = getSelected();
  if (ids.length < 2) { toast('Select at least two sessions to combine.', true); return; }
  if (confirmAction('Combine the selected sessions into one shared session?', null)) callApi('combine.php', {session_ids: ids});
}

function swapSelected() {
  const ids = getSelected();
  if (ids.length !== 2) { toast('Select exactly two sessions to swap.', true); return; }
  if (confirmAction('Swap the time and room assignments of these two sessions?', null)) callApi('swap.php', {session_id_a: ids[0], session_id_b: ids[1]});
}

document.querySelectorAll('.selectAllInGroup').forEach(selectAllCb => {
  selectAllCb.addEventListener('change', (e) => {
    const table = e.target.closest('table');
    table.querySelectorAll('.row-select').forEach(cb => cb.checked = e.target.checked);
  });
});
</script>
<script src="../../public/assets/js/theme.js"></script>
<script src="../../public/assets/js/confirm-dialog.js"></script>
</body>
</html>
