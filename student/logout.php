<?php
require_once __DIR__ . '/../includes/auth.php';
logout('student');
header('Location: ' . BASE_URL . '/auth/login.php');
exit;
