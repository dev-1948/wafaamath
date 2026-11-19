<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/teacher.php';
require_once __DIR__ . '/teacher_collections.php';
require_once __DIR__ . '/site_content.php';
require_once __DIR__ . '/student.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

session_set_cookie_params([
    'httponly' => true,
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Lax',
]);
session_start();

$route = trim((string) ($_GET['route'] ?? ''), '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($route === 'auth/session' && $method === 'GET') {
        $_SESSION['csrf_token'] ??= bin2hex(random_bytes(32));
        json_response(['user' => current_user(), 'csrfToken' => $_SESSION['csrf_token']]);
    }

    if ($route === 'site/homepage' && $method === 'GET') {
        json_response(homepage_public_payload());
    }

    if ($route === 'auth/register' && $method === 'POST') {
        require_csrf_token();
        $input = request_data();
        $name = trim((string) ($input['name'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
            json_response(['message' => 'الاسم يجب أن يتراوح بين حرفين و100 حرف.'], 422);
        }
        if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_response(['message' => 'أدخلي بريداً إلكترونياً صالحاً.'], 422);
        }
        if (strlen($password) < 8 || strlen($password) > 72) {
            json_response(['message' => 'كلمة المرور يجب أن تتراوح بين 8 و72 حرفاً.'], 422);
        }
        $role = db_fetch_one('SELECT id FROM roles WHERE name = ?', ['student']);
        if ($role === null) {
            throw new RuntimeException('قاعدة البيانات غير مهيأة. شغّلي ملفات database/*.sql أولاً.');
        }
        db_execute(
            'INSERT INTO users (role_id, name, email, password_hash) VALUES (?, ?, ?, ?)',
            [(int) $role['id'], $name, $email, password_hash($password, PASSWORD_DEFAULT)]
        );
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) database_connection()->insert_id;
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        json_response(['user' => current_user(), 'csrfToken' => $_SESSION['csrf_token']], 201);
    }

    if ($route === 'auth/login' && $method === 'POST') {
        require_csrf_token();
        $input = request_data();
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        if ($email === '' || $password === '') {
            json_response(['message' => 'أدخلي البريد الإلكتروني وكلمة المرور.'], 422);
        }
        $account = db_fetch_one(
            'SELECT id, password_hash FROM users WHERE email = ? LIMIT 1',
            [$email]
        );
        if ($account === null || !password_verify($password, $account['password_hash'])) {
            json_response(['message' => 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'], 401);
        }
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $account['id'];
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        json_response(['user' => current_user(), 'csrfToken' => $_SESSION['csrf_token']]);
    }

    if ($route === 'auth/logout' && $method === 'POST') {
        require_csrf_token();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $cookie = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 42000,
                'path' => $cookie['path'],
                'domain' => $cookie['domain'],
                'secure' => $cookie['secure'],
                'httponly' => $cookie['httponly'],
                'samesite' => 'Lax',
            ]);
        }
        session_destroy();
        json_response(['message' => 'تم تسجيل الخروج بنجاح.']);
    }

    if (str_starts_with($route, 'teacher/')) {
        $user = require_role(['teacher', 'admin']);
        if (!teacher_handle_request($route, $method, $user)) {
            json_response(['message' => 'المسار المطلوب غير موجود.'], 404);
        }
    }
    if (str_starts_with($route, 'student/')) {
        $user = require_role(['student']);
        if (!student_handle_request($route, $method, $user)) {
            json_response(['message' => 'المسار المطلوب غير موجود.'], 404);
        }
    }
    json_response(['message' => 'المسار المطلوب غير موجود.'], 404);
} catch (mysqli_sql_exception $error) {
    error_log((string) $error);
    if ((int) $error->getCode() === 1062) {
        json_response(['message' => 'يوجد عنصر بهذا الاسم أو البريد الإلكتروني بالفعل.'], 409);
    }
    if ((int) $error->getCode() === 1451) {
        json_response(['message' => 'لا يمكن حذف هذا العنصر لأنه مرتبط ببيانات محفوظة.'], 409);
    }
    if ((int) $error->getCode() === 1452) {
        json_response(['message' => 'العنصر المرتبط غير موجود أو لا يمكن الوصول إليه.'], 422);
    }
    json_response(['message' => 'حدث خطأ في قاعدة البيانات. راجعي سجلات PHP.'], 500);
} catch (Throwable $error) {
    error_log((string) $error);
    json_response(['message' => 'حدث خطأ في الخادم. تحققي من إعداد قاعدة البيانات وسجلات PHP.'], 500);
}
