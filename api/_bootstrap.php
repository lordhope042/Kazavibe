<?php
/**
 * Shared bootstrap for every API endpoint.
 * Ensures: JSON response headers, admin session required, POST-only by default.
 */

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/functions/timetable_functions.php';

header('Content-Type: application/json');

function apiRespond(bool $success, $data = null, ?string $message = null, int $httpCode = 200): void
{
    http_response_code($httpCode);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data'    => $data,
    ]);
    exit;
}

function apiRequireAdmin(): array
{
    if (!isset($_SESSION['admin'])) {
        apiRespond(false, null, 'Not authenticated.', 401);
    }
    return currentAdmin();
}

function apiRequirePost(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        apiRespond(false, null, 'Method not allowed. Use POST.', 405);
    }
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? null);
    if (!verifyCsrfToken($token)) {
        apiRespond(false, null, 'Security token expired. Refresh the page and try again.', 419);
    }
}

function apiBody(): array
{
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $_POST;
}
