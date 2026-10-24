<?php
/**
 * Authentication helpers — admins and students use separate session namespaces
 * so a browser could theoretically be logged into neither, either, or both.
 */

require_once __DIR__ . '/../config/config.php';

// ---------- ADMIN ----------

function adminLogin(string $email, string $password): bool
{
    $pdo = getDbConnection();
    $stmt = $pdo->prepare('SELECT * FROM admins WHERE email = ? AND is_active = 1 LIMIT 1');
    $stmt->execute([$email]);
    $admin = $stmt->fetch();

    if ($admin && password_verify($password, $admin['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['admin'] = [
            'id'    => $admin['admin_id'],
            'name'  => $admin['full_name'],
            'email' => $admin['email'],
            'role'  => $admin['role'],
        ];
        logActivity($admin['admin_id'], 'Logged in');
        return true;
    }
    return false;
}

function requireAdmin(): void
{
    if (!isset($_SESSION['admin'])) {
        header('Location: ' . BASE_URL . '/auth/login.php');
        exit;
    }
}

function requireSuperAdmin(): void
{
    requireAdmin();
    if ((currentAdmin()['role'] ?? '') !== 'super_admin') { http_response_code(403); exit('Access denied. Super admin permission required.'); }
}

function currentAdmin(): ?array
{
    return $_SESSION['admin'] ?? null;
}

// ---------- STUDENT ----------

function studentLogin(string $identifier, string $password): bool
{
    $pdo = getDbConnection();
    $stmt = $pdo->prepare('SELECT * FROM students WHERE (reg_no = ? OR email = ?) AND is_active = 1 LIMIT 1');
    $stmt->execute([$identifier, $identifier]);
    $student = $stmt->fetch();

    if ($student && password_verify($password, $student['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['student'] = [
            'id'             => $student['student_id'],
            'name'           => $student['full_name'],
            'reg_no'         => $student['reg_no'],
            'class_group_id' => $student['class_group_id'],
        ];
        return true;
    }
    return false;
}

function requireStudent(): void
{
    if (!isset($_SESSION['student'])) {
        header('Location: ' . BASE_URL . '/auth/login.php');
        exit;
    }
}

function currentStudent(): ?array
{
    return $_SESSION['student'] ?? null;
}

// ---------- SHARED ----------

function logout(string $type): void
{
    unset($_SESSION[$type]);
    session_regenerate_id(true);
}

function logActivity(?int $adminId, string $action): void
{
    // Activity logging is auxiliary — it must never be able to make a
    // genuinely successful operation (generate, regenerate, publish, etc.)
    // report as "failed" just because the log write itself hit an error.
    // The most common real-world case: the browser session still holds an
    // admin_id from before the database was last re-imported/reseeded, so
    // that id no longer exists in the admins table and the FK constraint
    // on activity_log rejects the insert.
    try {
        $pdo = getDbConnection();
        $stmt = $pdo->prepare('INSERT INTO activity_log (admin_id, action) VALUES (?, ?)');
        $stmt->execute([$adminId, $action]);
    } catch (Throwable $e) {
        error_log('logActivity failed (non-fatal): ' . $e->getMessage());
    }
}
