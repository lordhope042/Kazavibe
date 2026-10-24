<?php
/**
 * Global app configuration
 */

session_start();

define('APP_NAME', 'Computer Science Timetable Management System');
define('APP_SHORT_NAME', 'HAFED POLY CS Timetable');
define('BASE_URL', 'http://localhost/timetable-generator');

// Brand colors (HAFED POLY identity)
define('COLOR_PRIMARY_RED',   '#A62639');
define('COLOR_PRIMARY_GREEN', '#0B6E4F');
define('COLOR_ACCENT_GOLD',    '#C99A2E');
define('COLOR_WHITE',         '#FFFFFF');

// Timetable structure defaults
define('BREAK_START_TIME', '13:00:00');
define('BREAK_END_TIME',   '14:00:00');
define('DAYS_OF_WEEK', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

// Session type -> legend color, matches mockup dots
define('SESSION_TYPE_COLORS', [
    'lecture'   => '#2ecc71', // green
    'practical' => '#3498db', // blue
    'tutorial'  => '#f39c12', // orange
    'elective'  => '#e91e63', // pink
]);


/** Shared CSRF helpers for state-changing requests. */
function csrfToken(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken(?string $token): bool
{
    return is_string($token) && $token !== '' && hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

// All normal form POSTs must carry the same session-bound token. API requests
// use the X-CSRF-Token header and are verified by api/_bootstrap.php so they
// can return JSON errors instead of HTML.
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !str_contains($_SERVER['REQUEST_URI'] ?? '', '/api/')) {
    $token = $_POST['csrf_token'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
    if (!verifyCsrfToken($token)) {
        http_response_code(419);
        exit('Security token expired. Refresh the page and try again.');
    }
}

require_once __DIR__ . '/database.php';
