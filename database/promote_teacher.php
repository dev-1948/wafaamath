<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

if (
    ($argc !== 2 && $argc !== 3)
    || !filter_var($argv[1] ?? '', FILTER_VALIDATE_EMAIL)
    || !in_array($argv[2] ?? 'teacher', ['teacher', 'admin'], true)
) {
    fwrite(STDERR, "الاستخدام: php database/promote_teacher.php user@example.com [teacher|admin]\n");
    exit(2);
}

require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/response.php';

$email = strtolower(trim($argv[1]));
$roleName = $argv[2] ?? 'teacher';
$account = db_fetch_one('SELECT id FROM users WHERE email = ? LIMIT 1', [$email]);
$role = db_fetch_one('SELECT id FROM roles WHERE name = ? LIMIT 1', [$roleName]);
if ($account === null || $role === null) {
    fwrite(STDERR, "لم يتم العثور على الحساب أو الدور. تأكدي من تسجيل الحساب وتشغيل الترحيل.\n");
    exit(1);
}

db_execute('UPDATE users SET role_id = ? WHERE id = ?', [(int) $role['id'], (int) $account['id']]);
$roleLabel = $roleName === 'admin' ? 'المديرة' : 'المعلمة';
fwrite(STDOUT, "تم منح دور {$roleLabel} للحساب المحدد.\n");
