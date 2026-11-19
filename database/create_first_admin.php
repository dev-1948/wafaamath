<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/response.php';

$name = trim((string) (getenv('WAFAA_ADMIN_NAME') ?: ''));
$email = strtolower(trim((string) (getenv('WAFAA_ADMIN_EMAIL') ?: '')));
$password = (string) (getenv('WAFAA_ADMIN_PASSWORD') ?: '');

if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
    fwrite(STDERR, "الاسم يجب أن يتراوح بين حرفين و100 حرف.\n");
    exit(2);
}
if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "أدخلي بريداً إلكترونياً صالحاً.\n");
    exit(2);
}
if (strlen($password) < 8 || strlen($password) > 72) {
    fwrite(STDERR, "كلمة المرور يجب أن تتراوح بين 8 و72 حرفاً.\n");
    exit(2);
}

$existingAdmin = db_fetch_one(
    'SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.name = ? LIMIT 1',
    ['admin']
);
if ($existingAdmin !== null) {
    fwrite(STDERR, "يوجد حساب مديرة بالفعل؛ لم يتم إنشاء حساب آخر.\n");
    exit(1);
}

$adminRole = db_fetch_one('SELECT id FROM roles WHERE name = ? LIMIT 1', ['admin']);
if ($adminRole === null) {
    fwrite(STDERR, "دور المديرة غير موجود. استوردي ملفات قاعدة البيانات أولاً.\n");
    exit(1);
}

$existingAccount = db_fetch_one('SELECT id FROM users WHERE email = ? LIMIT 1', [$email]);
if ($existingAccount !== null) {
    fwrite(STDERR, "هذا البريد مسجّل بالفعل. استخدمي ترقية الدور للحساب الموجود.\n");
    exit(1);
}

db_execute(
    'INSERT INTO users (role_id, name, email, password_hash) VALUES (?, ?, ?, ?)',
    [
        (int) $adminRole['id'],
        $name,
        $email,
        password_hash($password, PASSWORD_DEFAULT),
    ]
);

fwrite(STDOUT, "تم إنشاء حساب المديرة بنجاح. سجّلي الدخول بالبريد وكلمة المرور اللذين أدخلتهما.\n");
