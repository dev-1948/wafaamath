<?php
declare(strict_types=1);

function homepage_settings_fields(): array
{
    return [
        'hero_badge' => 'شارة الواجهة',
        'hero_title' => 'عنوان الواجهة',
        'hero_emphasis' => 'النص المميز في العنوان',
        'hero_description' => 'وصف الواجهة',
        'hero_cta' => 'زر الواجهة',
        'about_badge' => 'شارة قسم التعريف',
        'about_title' => 'عنوان قسم التعريف',
        'about_emphasis' => 'النص المميز في عنوان التعريف',
        'about_description' => 'وصف قسم التعريف',
        'feature_one_title' => 'عنوان البطاقة الأولى',
        'feature_one_description' => 'وصف البطاقة الأولى',
        'feature_two_title' => 'عنوان البطاقة الثانية',
        'feature_two_description' => 'وصف البطاقة الثانية',
        'feature_three_title' => 'عنوان البطاقة الثالثة',
        'feature_three_description' => 'وصف البطاقة الثالثة',
        'banner_badge' => 'شارة الدعوة',
        'banner_title' => 'عنوان الدعوة',
        'banner_emphasis' => 'النص المميز في عنوان الدعوة',
        'banner_description' => 'وصف الدعوة',
        'banner_cta' => 'زر الدعوة',
    ];
}

function homepage_settings_read(): array
{
    $settings = db_fetch_one(
        'SELECT hero_badge, hero_title, hero_emphasis, hero_description, hero_cta,
                about_badge, about_title, about_emphasis, about_description,
                feature_one_title, feature_one_description, feature_two_title, feature_two_description,
                feature_three_title, feature_three_description,
                banner_badge, banner_title, banner_emphasis, banner_description, banner_cta
         FROM homepage_settings WHERE id = 1'
    );
    if ($settings === null) {
        throw new RuntimeException('إعداد الصفحة الرئيسية غير موجود. شغّلي database/math_schema.sql أولاً.');
    }
    return $settings;
}

function homepage_public_payload(): array
{
    $items = db_fetch_all(
        "SELECT id, content_type, title, summary, body, destination_url, published_at
         FROM homepage_items
         WHERE status = 'published'
         ORDER BY published_at DESC, id DESC"
    );

    return [
        'settings' => homepage_settings_read(),
        'posts' => array_values(array_filter($items, static fn(array $item): bool => $item['content_type'] === 'post')),
        'projects' => array_values(array_filter($items, static fn(array $item): bool => $item['content_type'] === 'project')),
    ];
}

function homepage_validate_settings(array $input): array
{
    $settings = [];
    foreach (homepage_settings_fields() as $field => $label) {
        $value = trim((string) ($input[$field] ?? ''));
        $maxLength = str_ends_with($field, '_description')
            ? 2000
            : (str_contains($field, 'badge') ? 120 : (str_ends_with($field, '_cta') ? 100 : 180));
        if ($value === '') {
            json_response(['message' => "حقل {$label} مطلوب."], 422);
        }
        if (mb_strlen($value) > $maxLength) {
            json_response(['message' => "حقل {$label} أطول من المسموح."], 422);
        }
        $settings[$field] = $value;
    }
    return $settings;
}

function homepage_save_settings(array $input, array $user): array
{
    $settings = homepage_validate_settings($input);
    $fields = array_keys($settings);
    $assignments = implode(', ', array_map(static fn(string $field): string => "`{$field}` = ?", $fields));
    db_execute(
        "UPDATE homepage_settings SET {$assignments}, updated_by = ? WHERE id = 1",
        [...array_values($settings), (int) $user['id']]
    );
    return homepage_settings_read();
}

function homepage_validate_item(array $input): array
{
    $type = (string) ($input['content_type'] ?? '');
    $title = trim((string) ($input['title'] ?? ''));
    $summary = trim((string) ($input['summary'] ?? ''));
    $body = trim((string) ($input['body'] ?? ''));
    $destinationUrl = trim((string) ($input['destination_url'] ?? ''));
    $status = (string) ($input['status'] ?? 'draft');

    if (!in_array($type, ['post', 'project'], true)) {
        json_response(['message' => 'اختاري نوع المحتوى: منشور أو مشروع.'], 422);
    }
    if (mb_strlen($title) < 2 || mb_strlen($title) > 180) {
        json_response(['message' => 'العنوان يجب أن يتراوح بين حرفين و180 حرفاً.'], 422);
    }
    if ($summary === '' || mb_strlen($summary) > 500) {
        json_response(['message' => 'اكتبي ملخصاً لا يتجاوز 500 حرف.'], 422);
    }
    if (mb_strlen($body) > 20000) {
        json_response(['message' => 'تفاصيل المحتوى أطول من المسموح.'], 422);
    }
    if (!in_array($status, ['draft', 'published'], true)) {
        json_response(['message' => 'اختاري حالة نشر صحيحة.'], 422);
    }
    if ($destinationUrl !== '') {
        $parts = parse_url($destinationUrl);
        if (
            filter_var($destinationUrl, FILTER_VALIDATE_URL) === false
            || !isset($parts['scheme'])
            || !in_array(strtolower($parts['scheme']), ['http', 'https'], true)
        ) {
            json_response(['message' => 'أدخلي رابطاً صالحاً يبدأ بـ http أو https.'], 422);
        }
    }

    return [
        'content_type' => $type,
        'title' => $title,
        'summary' => $summary,
        'body' => $body === '' ? null : $body,
        'destination_url' => $destinationUrl === '' ? null : $destinationUrl,
        'status' => $status,
    ];
}

function homepage_item_list(array $user): array
{
    $scope = $user['role'] === 'admin' ? '' : ' WHERE created_by = ?';
    return db_fetch_all(
        'SELECT id, content_type, title, summary, body, destination_url, status, published_at, created_at, updated_at
         FROM homepage_items' . $scope . ' ORDER BY created_at DESC, id DESC',
        $user['role'] === 'admin' ? [] : [(int) $user['id']]
    );
}

function homepage_save_item(array $input, array $user, ?int $itemId = null): array
{
    $item = homepage_validate_item($input);
    $publishedAt = $item['status'] === 'published' ? date('Y-m-d H:i:s') : null;

    if ($itemId === null) {
        db_execute(
            'INSERT INTO homepage_items
             (created_by, content_type, title, summary, body, destination_url, status, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                (int) $user['id'],
                $item['content_type'],
                $item['title'],
                $item['summary'],
                $item['body'],
                $item['destination_url'],
                $item['status'],
                $publishedAt,
            ]
        );
        $itemId = (int) database_connection()->insert_id;
    } else {
        $existing = db_fetch_one('SELECT created_by, published_at FROM homepage_items WHERE id = ?', [$itemId]);
        if ($existing === null) {
            json_response(['message' => 'المحتوى المطلوب غير موجود.'], 404);
        }
        teacher_require_owner((int) $existing['created_by'], $user);
        if ($item['status'] === 'published' && $existing['published_at'] !== null) {
            $publishedAt = $existing['published_at'];
        }
        db_execute(
            'UPDATE homepage_items
             SET content_type = ?, title = ?, summary = ?, body = ?, destination_url = ?, status = ?, published_at = ?
             WHERE id = ?',
            [
                $item['content_type'],
                $item['title'],
                $item['summary'],
                $item['body'],
                $item['destination_url'],
                $item['status'],
                $publishedAt,
                $itemId,
            ]
        );
    }

    return ['id' => $itemId, ...$item, 'published_at' => $publishedAt];
}

function teacher_site_content_handle(string $route, string $method, array $user): bool
{
    if ($route === 'teacher/site-content' && $method === 'GET') {
        json_response([
            'settings' => homepage_settings_read(),
            'items' => homepage_item_list($user),
        ]);
    }

    if ($route === 'teacher/site-content/settings' && $method === 'PUT') {
        require_csrf_token();
        json_response([
            'settings' => homepage_save_settings(request_data(), $user),
            'message' => 'تم حفظ تعديلات الصفحة الرئيسية.',
        ]);
    }

    if ($route === 'teacher/site-content/items' && $method === 'POST') {
        require_csrf_token();
        $item = homepage_save_item(request_data(), $user);
        json_response(['item' => $item, 'message' => 'تم حفظ المحتوى.'], 201);
    }

    if (preg_match('~^teacher/site-content/items/([1-9][0-9]*)$~', $route, $matches)) {
        $itemId = (int) $matches[1];
        if ($method === 'PATCH') {
            require_csrf_token();
            $item = homepage_save_item(request_data(), $user, $itemId);
            json_response(['item' => $item, 'message' => 'تم تحديث المحتوى.']);
        }
        if ($method === 'DELETE') {
            require_csrf_token();
            $existing = db_fetch_one('SELECT created_by FROM homepage_items WHERE id = ?', [$itemId]);
            if ($existing === null) {
                json_response(['message' => 'المحتوى المطلوب غير موجود.'], 404);
            }
            teacher_require_owner((int) $existing['created_by'], $user);
            db_execute('DELETE FROM homepage_items WHERE id = ?', [$itemId]);
            json_response(['message' => 'تم حذف المحتوى.']);
        }
    }

    return false;
}
