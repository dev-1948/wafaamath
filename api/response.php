<?php
declare(strict_types=1);

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function request_data(): array
{
    $decoded = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($decoded)) {
        json_response(['message' => 'صيغة الطلب غير صالحة.'], 400);
    }
    return $decoded;
}

function db_execute(string $query, array $parameters = []): mysqli_stmt
{
    $statement = database_connection()->prepare($query);
    $statement->execute($parameters);
    return $statement;
}

function db_fetch_one(string $query, array $parameters = []): ?array
{
    $result = db_execute($query, $parameters)->get_result();
    $row = $result->fetch_assoc();
    return $row === null ? null : $row;
}

function db_fetch_all(string $query, array $parameters = []): array
{
    return db_execute($query, $parameters)->get_result()->fetch_all(MYSQLI_ASSOC);
}

function require_csrf_token(): void
{
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expected = $_SESSION['csrf_token'] ?? '';
    if (!is_string($provided) || !is_string($expected) || $expected === '' || !hash_equals($expected, $provided)) {
        json_response(['message' => 'انتهت صلاحية الجلسة. حدّثي الصفحة وحاولي مرة أخرى.'], 419);
    }
}

function current_user(): ?array
{
    if (!isset($_SESSION['user_id'])) {
        return null;
    }

    $user = db_fetch_one(
        'SELECT users.id, users.name, users.email, roles.name AS role
         FROM users INNER JOIN roles ON roles.id = users.role_id WHERE users.id = ? LIMIT 1',
        [(int) $_SESSION['user_id']]
    );
    if (!$user) {
        unset($_SESSION['user_id']);
        return null;
    }

    return $user;
}

function require_role(array $allowedRoles): array
{
    $user = current_user();
    if ($user === null) {
        json_response(['message' => 'سجّلي الدخول للمتابعة.'], 401);
    }
    if (!in_array($user['role'], $allowedRoles, true)) {
        json_response(['message' => 'ليست لديك صلاحية الوصول إلى هذا المورد.'], 403);
    }
    return $user;
}
