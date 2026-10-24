<?php
// Old standalone student login — kept as a redirect so existing links/bookmarks still work.
require_once __DIR__ . '/../config/config.php';
header('Location: ' . BASE_URL . '/auth/login.php');
exit;
