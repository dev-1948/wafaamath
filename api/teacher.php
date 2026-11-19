<?php
declare(strict_types=1);

function teacher_require_owner(int $ownerId, array $user): void
{
    if ($ownerId !== (int) $user['id'] && $user['role'] !== 'admin') {
        json_response(['message' => 'لا تملكين صلاحية إدارة هذا العنصر.'], 403);
    }
}

function teacher_resource_owner(string $kind, int $id): ?int
{
    $queries = [
        'grades' => 'SELECT teacher_id AS owner_id FROM grades WHERE id = ?',
        'classes' => 'SELECT teacher_id AS owner_id FROM classes WHERE id = ?',
        'subjects' => 'SELECT teacher_id AS owner_id FROM math_subjects WHERE id = ?',
        'units' => 'SELECT s.teacher_id AS owner_id FROM math_units u JOIN math_subjects s ON s.id = u.subject_id WHERE u.id = ?',
        'lessons' => 'SELECT s.teacher_id AS owner_id FROM math_lessons l JOIN math_units u ON u.id = l.unit_id JOIN math_subjects s ON s.id = u.subject_id WHERE l.id = ?',
        'skills' => 'SELECT s.teacher_id AS owner_id FROM math_skills k JOIN math_lessons l ON l.id = k.lesson_id JOIN math_units u ON u.id = l.unit_id JOIN math_subjects s ON s.id = u.subject_id WHERE k.id = ?',
    ];
    if (!isset($queries[$kind])) {
        return null;
    }
    $row = db_fetch_one($queries[$kind], [$id]);
    return $row === null ? null : (int) $row['owner_id'];
}

function teacher_parent_exists(string $kind, int $id, array $user): bool
{
    $queries = [
        'grades' => 'SELECT teacher_id AS owner_id FROM grades WHERE id = ?',
        'subjects' => 'SELECT teacher_id AS owner_id FROM math_subjects WHERE id = ?',
        'units' => 'SELECT s.teacher_id AS owner_id FROM math_units u JOIN math_subjects s ON s.id = u.subject_id WHERE u.id = ?',
        'lessons' => 'SELECT s.teacher_id AS owner_id FROM math_lessons l JOIN math_units u ON u.id = l.unit_id JOIN math_subjects s ON s.id = u.subject_id WHERE l.id = ?',
    ];
    $row = isset($queries[$kind]) ? db_fetch_one($queries[$kind], [$id]) : null;
    if ($row === null) {
        return false;
    }
    teacher_require_owner((int) $row['owner_id'], $user);
    return true;
}

function teacher_curriculum_list(array $user): array
{
    $filter = $user['role'] === 'admin' ? '' : ' WHERE teacher_id = ?';
    $parameters = $user['role'] === 'admin' ? [] : [(int) $user['id']];
    $joinFilter = $user['role'] === 'admin' ? '' : ' WHERE s.teacher_id = ?';
    $joinParameters = $parameters;

    return [
        'grades' => db_fetch_all('SELECT id, name, sort_order FROM grades' . $filter . ' ORDER BY sort_order, name', $parameters),
        'classes' => db_fetch_all(
            'SELECT c.id, c.grade_id, c.name, c.academic_year, g.name AS grade_name
             FROM classes c JOIN grades g ON g.id = c.grade_id' . ($user['role'] === 'admin' ? '' : ' WHERE c.teacher_id = ?') . ' ORDER BY c.name',
            $parameters
        ),
        'subjects' => db_fetch_all(
            'SELECT s.id, s.grade_id, s.name, g.name AS grade_name
             FROM math_subjects s JOIN grades g ON g.id = s.grade_id' . ($user['role'] === 'admin' ? '' : ' WHERE s.teacher_id = ?') . ' ORDER BY g.sort_order, s.name',
            $parameters
        ),
        'units' => db_fetch_all(
            'SELECT u.id, u.subject_id, u.title, u.description, u.sort_order, s.grade_id, s.name AS subject_name, g.name AS grade_name
             FROM math_units u JOIN math_subjects s ON s.id = u.subject_id JOIN grades g ON g.id = s.grade_id' . $joinFilter . ' ORDER BY u.sort_order, u.title',
            $joinParameters
        ),
        'lessons' => db_fetch_all(
            'SELECT l.id, l.unit_id, l.title, l.content, l.sort_order, u.subject_id, s.grade_id, g.name AS grade_name, s.name AS subject_name, u.title AS unit_title
             FROM math_lessons l JOIN math_units u ON u.id = l.unit_id JOIN math_subjects s ON s.id = u.subject_id JOIN grades g ON g.id = s.grade_id' . $joinFilter . ' ORDER BY l.sort_order, l.title',
            $joinParameters
        ),
        'skills' => db_fetch_all(
            'SELECT k.id, k.lesson_id, k.name, k.description, l.title AS lesson_title, u.title AS unit_title
             FROM math_skills k JOIN math_lessons l ON l.id = k.lesson_id JOIN math_units u ON u.id = l.unit_id JOIN math_subjects s ON s.id = u.subject_id' . $joinFilter . ' ORDER BY k.name',
            $joinParameters
        ),
    ];
}

function teacher_save_curriculum(string $kind, array $input, array $user): int
{
    $id = max(0, (int) ($input['id'] ?? 0));
    if ($id > 0) {
        $ownerId = teacher_resource_owner($kind, $id);
        if ($ownerId === null) {
            json_response(['message' => 'العنصر المطلوب غير موجود.'], 404);
        }
        teacher_require_owner($ownerId, $user);
    }

    $definitions = [
        'grades' => ['table' => 'grades', 'name' => 'name', 'parent' => null, 'extra' => ['sort_order']],
        'classes' => ['table' => 'classes', 'name' => 'name', 'parent' => 'grade_id', 'parent_kind' => 'grades', 'extra' => ['academic_year']],
        'subjects' => ['table' => 'math_subjects', 'name' => 'name', 'parent' => 'grade_id', 'parent_kind' => 'grades', 'extra' => []],
        'units' => ['table' => 'math_units', 'name' => 'title', 'parent' => 'subject_id', 'parent_kind' => 'subjects', 'extra' => ['description', 'sort_order']],
        'lessons' => ['table' => 'math_lessons', 'name' => 'title', 'parent' => 'unit_id', 'parent_kind' => 'units', 'extra' => ['content', 'sort_order']],
        'skills' => ['table' => 'math_skills', 'name' => 'name', 'parent' => 'lesson_id', 'parent_kind' => 'lessons', 'extra' => ['description']],
    ];
    if (!isset($definitions[$kind])) {
        json_response(['message' => 'نوع العنصر غير مدعوم.'], 404);
    }
    $definition = $definitions[$kind];
    $title = trim((string) ($input[$definition['name']] ?? ''));
    if ($title === '' || mb_strlen($title) > 180) {
        json_response(['message' => 'أدخلي اسماً صحيحاً لا يتجاوز 180 حرفاً.'], 422);
    }

    $fields = [$definition['name'] => $title];
    if ($definition['parent'] !== null) {
        $parentId = (int) ($input[$definition['parent']] ?? 0);
        if ($parentId <= 0 || !teacher_parent_exists($definition['parent_kind'], $parentId, $user)) {
            json_response(['message' => 'اختاري عنصراً أباً صالحاً من عناصر حسابك.'], 422);
        }
        $fields[$definition['parent']] = $parentId;
    }
    foreach ($definition['extra'] as $field) {
        if (in_array($field, ['sort_order'], true)) {
            $fields[$field] = max(0, min(65535, (int) ($input[$field] ?? 0)));
        } elseif ($field === 'academic_year') {
            $value = trim((string) ($input[$field] ?? ''));
            $fields[$field] = $value === '' ? null : mb_substr($value, 0, 20);
        } else {
            $limit = $field === 'description' ? 10000 : 50000;
            $fields[$field] = mb_substr(trim((string) ($input[$field] ?? '')), 0, $limit);
        }
    }

    if (in_array($kind, ['grades', 'classes', 'subjects'], true)) {
        $fields['teacher_id'] = (int) $user['id'];
    }
    $table = $definition['table'];
    if ($id > 0) {
        $sets = implode(', ', array_map(static fn(string $field): string => "$field = ?", array_keys($fields)));
        db_execute("UPDATE $table SET $sets WHERE id = ?", [...array_values($fields), $id]);
        return $id;
    }
    $columns = implode(', ', array_keys($fields));
    $placeholders = implode(', ', array_fill(0, count($fields), '?'));
    db_execute("INSERT INTO $table ($columns) VALUES ($placeholders)", array_values($fields));
    return (int) database_connection()->insert_id;
}

function teacher_question_rows(array $user): array
{
    $where = $user['role'] === 'admin' ? 'q.is_active = 1' : 'q.is_active = 1 AND q.teacher_id = ?';
    $parameters = $user['role'] === 'admin' ? [] : [(int) $user['id']];
    $questions = db_fetch_all(
        "SELECT q.id, q.teacher_id, q.grade_id, q.unit_id, q.lesson_id, q.skill_id, q.question_type, q.difficulty,
                q.prompt, q.image_path, q.correct_answer, q.explanation, q.points, q.time_limit_seconds,
                q.created_at, g.name AS grade_name, u.title AS unit_title, l.title AS lesson_title, k.name AS skill_name
         FROM math_questions q
         JOIN grades g ON g.id = q.grade_id
         JOIN math_units u ON u.id = q.unit_id
         JOIN math_lessons l ON l.id = q.lesson_id
         LEFT JOIN math_skills k ON k.id = q.skill_id
         WHERE $where ORDER BY q.created_at DESC LIMIT 250",
        $parameters
    );
    if ($questions === []) {
        return [];
    }
    $ids = array_map(static fn(array $question): int => (int) $question['id'], $questions);
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $options = db_fetch_all(
        "SELECT id, question_id, option_text AS text, is_correct, sort_order FROM math_question_options
         WHERE question_id IN ($marks) ORDER BY question_id, sort_order",
        $ids
    );
    $grouped = [];
    foreach ($options as $option) {
        $grouped[(int) $option['question_id']][] = $option;
    }
    foreach ($questions as &$question) {
        $question['options'] = $grouped[(int) $question['id']] ?? [];
    }
    unset($question);
    return $questions;
}

function teacher_validate_question_hierarchy(array $input, array $user): array
{
    $gradeId = (int) ($input['grade_id'] ?? 0);
    $unitId = (int) ($input['unit_id'] ?? 0);
    $lessonId = (int) ($input['lesson_id'] ?? 0);
    if ($gradeId < 1 || $unitId < 1 || $lessonId < 1) {
        json_response(['message' => 'حدّدي الصف والوحدة والدرس للسؤال.'], 422);
    }
    $sql = 'SELECT g.id FROM grades g
            JOIN math_subjects s ON s.grade_id = g.id
            JOIN math_units u ON u.subject_id = s.id
            JOIN math_lessons l ON l.unit_id = u.id
            WHERE g.id = ? AND u.id = ? AND l.id = ?';
    $parameters = [$gradeId, $unitId, $lessonId];
    if ($user['role'] !== 'admin') {
        $sql .= ' AND g.teacher_id = ?';
        $parameters[] = (int) $user['id'];
    }
    if (db_fetch_one($sql, $parameters) === null) {
        json_response(['message' => 'الصف والوحدة والدرس لا ينتمون إلى المسار نفسه أو لا تملكين صلاحية إدارتهم.'], 422);
    }
    $skillId = isset($input['skill_id']) && (int) $input['skill_id'] > 0 ? (int) $input['skill_id'] : null;
    if ($skillId !== null) {
        $skill = db_fetch_one('SELECT lesson_id FROM math_skills WHERE id = ?', [$skillId]);
        if ($skill === null || (int) $skill['lesson_id'] !== $lessonId) {
            json_response(['message' => 'المهارة المختارة لا تتبع الدرس المحدد.'], 422);
        }
    }
    return [$gradeId, $unitId, $lessonId, $skillId];
}

function teacher_normalize_options(array $input, string $type): array
{
    $options = $input['options'] ?? [];
    if ($type !== 'multiple_choice') {
        return [];
    }
    if (!is_array($options) || count($options) < 2 || count($options) > 8) {
        json_response(['message' => 'أضيفي خيارين على الأقل وثمانية خيارات كحد أقصى.'], 422);
    }
    $result = [];
    foreach (array_values($options) as $index => $option) {
        $text = trim((string) ($option['text'] ?? ''));
        if ($text === '' || mb_strlen($text) > 1000) {
            json_response(['message' => 'نص كل خيار مطلوب وألا يتجاوز 1000 حرف.'], 422);
        }
        $result[] = ['text' => $text, 'is_correct' => !empty($option['is_correct']) ? 1 : 0, 'sort_order' => $index];
    }
    if (array_sum(array_column($result, 'is_correct')) !== 1) {
        json_response(['message' => 'حدّدي إجابة صحيحة واحدة فقط.'], 422);
    }
    return $result;
}

function teacher_save_question(array $input, array $user): int
{
    $id = max(0, (int) ($input['id'] ?? 0));
    $types = ['multiple_choice', 'true_false', 'numeric', 'equation', 'order_steps', 'fill_blank'];
    $type = (string) ($input['question_type'] ?? '');
    $difficulty = (string) ($input['difficulty'] ?? 'medium');
    $prompt = trim((string) ($input['prompt'] ?? ''));
    if (!in_array($type, $types, true) || !in_array($difficulty, ['easy', 'medium', 'hard'], true)) {
        json_response(['message' => 'اختاري نوع السؤال ومستوى صعوبة صالحين.'], 422);
    }
    if ($prompt === '' || mb_strlen($prompt) > 10000) {
        json_response(['message' => 'نص السؤال مطلوب وألا يتجاوز 10000 حرف.'], 422);
    }
    $options = teacher_normalize_options($input, $type);
    $correctAnswer = trim((string) ($input['correct_answer'] ?? ''));
    if ($type === 'true_false' && !in_array($correctAnswer, ['true', 'false', 'صحيح', 'خطأ'], true)) {
        json_response(['message' => 'حدّدي الإجابة الصحيحة لسؤال الصح والخطأ.'], 422);
    }
    if ($type !== 'multiple_choice' && $correctAnswer === '') {
        json_response(['message' => 'الإجابة الصحيحة مطلوبة.'], 422);
    }
    if ($type === 'multiple_choice') {
        $correctAnswer = '';
    }
    if ($type === 'order_steps') {
        $steps = json_decode($correctAnswer, true);
        if (!is_array($steps)) {
            $steps = preg_split('/\r\n|\r|\n/', $correctAnswer) ?: [];
        }
        $steps = array_values(array_filter(array_map(static fn($step): string => trim((string) $step), $steps), static fn(string $step): bool => $step !== ''));
        if (count($steps) < 2) {
            json_response(['message' => 'أدخلي خطوتين على الأقل، كل خطوة في سطر مستقل.'], 422);
        }
        $correctAnswer = json_encode($steps, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    [$gradeId, $unitId, $lessonId, $skillId] = teacher_validate_question_hierarchy($input, $user);
    $points = max(1, min(10000, (int) ($input['points'] ?? 1)));
    $timeLimit = max(5, min(3600, (int) ($input['time_limit_seconds'] ?? 60)));
    $explanation = trim((string) ($input['explanation'] ?? ''));
    if (mb_strlen($explanation) > 20000) {
        json_response(['message' => 'شرح الحل طويل جداً.'], 422);
    }
    $db = database_connection();
    $db->begin_transaction();
    try {
        if ($id > 0) {
            $existing = db_fetch_one('SELECT teacher_id FROM math_questions WHERE id = ? AND is_active = 1', [$id]);
            if ($existing === null) {
                json_response(['message' => 'السؤال غير موجود.'], 404);
            }
            teacher_require_owner((int) $existing['teacher_id'], $user);
            $attemptCount = db_fetch_one(
                "SELECT
                   (SELECT COUNT(*) FROM math_answers WHERE question_id = ?) AS answered,
                   (SELECT COUNT(*) FROM math_attempt_questions aq JOIN math_attempts a ON a.id = aq.attempt_id
                    WHERE aq.question_id = ? AND a.status = 'in_progress') AS in_progress",
                [$id, $id]
            );
            if ((int) $attemptCount['answered'] > 0 || (int) $attemptCount['in_progress'] > 0) {
                json_response(['message' => 'لا يمكن تعديل سؤال أُجيب عنه سابقاً حفاظاً على سجل الدرجات.'], 409);
            }
            db_execute(
                'UPDATE math_questions SET grade_id=?, unit_id=?, lesson_id=?, skill_id=?, question_type=?, difficulty=?,
                 prompt=?, correct_answer=?, explanation=?, points=?, time_limit_seconds=? WHERE id=?',
                [$gradeId, $unitId, $lessonId, $skillId, $type, $difficulty, $prompt, $correctAnswer, $explanation, $points, $timeLimit, $id]
            );
            db_execute('DELETE FROM math_question_options WHERE question_id = ?', [$id]);
        } else {
            db_execute(
                'INSERT INTO math_questions
                 (teacher_id, grade_id, unit_id, lesson_id, skill_id, question_type, difficulty, prompt, correct_answer, explanation, points, time_limit_seconds)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [(int) $user['id'], $gradeId, $unitId, $lessonId, $skillId, $type, $difficulty, $prompt, $correctAnswer, $explanation, $points, $timeLimit]
            );
            $id = (int) $db->insert_id;
        }
        foreach ($options as $option) {
            db_execute(
                'INSERT INTO math_question_options (question_id, option_text, is_correct, sort_order) VALUES (?, ?, ?, ?)',
                [$id, $option['text'], $option['is_correct'], $option['sort_order']]
            );
        }
        $db->commit();
    } catch (Throwable $error) {
        $db->rollback();
        throw $error;
    }
    return $id;
}

function teacher_question_image(int $questionId, array $user): array
{
    $question = db_fetch_one('SELECT teacher_id FROM math_questions WHERE id = ? AND is_active = 1', [$questionId]);
    if ($question === null) {
        json_response(['message' => 'السؤال غير موجود.'], 404);
    }
    teacher_require_owner((int) $question['teacher_id'], $user);
    $file = $_FILES['image'] ?? null;
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        json_response(['message' => 'اختاري صورة صالحة لرفعها.'], 422);
    }
    if ((int) $file['size'] < 1 || (int) $file['size'] > 5 * 1024 * 1024) {
        json_response(['message' => 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت.'], 422);
    }
    $imageInfo = getimagesize($file['tmp_name']);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $mime = is_array($imageInfo) ? ($imageInfo['mime'] ?? '') : '';
    if (!isset($extensions[$mime])) {
        json_response(['message' => 'الصيغ المدعومة هي JPG وPNG وWEBP فقط.'], 422);
    }
    $directory = __DIR__ . '/uploads/questions';
    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
        throw new RuntimeException('تعذّر تجهيز مجلد الصور.');
    }
    $filename = bin2hex(random_bytes(20)) . '.' . $extensions[$mime];
    if (!move_uploaded_file($file['tmp_name'], $directory . DIRECTORY_SEPARATOR . $filename)) {
        throw new RuntimeException('تعذّر حفظ الصورة المرفوعة.');
    }
    db_execute('UPDATE math_questions SET image_path = ? WHERE id = ?', [$filename, $questionId]);
    return ['image_path' => $filename];
}

function teacher_class_students(int $classId, array $user): array
{
    $class = db_fetch_one('SELECT teacher_id FROM classes WHERE id = ?', [$classId]);
    if ($class === null) {
        json_response(['message' => 'المجموعة غير موجودة.'], 404);
    }
    teacher_require_owner((int) $class['teacher_id'], $user);
    return db_fetch_all(
        'SELECT u.id, u.name, u.email, cs.joined_at
         FROM class_students cs JOIN users u ON u.id = cs.student_id
         JOIN roles r ON r.id = u.role_id
         WHERE cs.class_id = ? AND r.name = ?
         ORDER BY u.name',
        [$classId, 'student']
    );
}

function teacher_update_student_account(int $studentId, array $input, array $user): array
{
    $student = db_fetch_one(
        'SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
         WHERE u.id = ? AND r.name = ?',
        [$studentId, 'student']
    );
    if ($student === null) {
        json_response(['message' => 'حساب الطالبة غير موجود.'], 404);
    }

    if ($user['role'] !== 'admin') {
        $membership = db_fetch_one(
            'SELECT 1 AS allowed FROM class_students cs
             JOIN classes c ON c.id = cs.class_id
             WHERE cs.student_id = ? AND c.teacher_id = ? LIMIT 1',
            [$studentId, (int) $user['id']]
        );
        if ($membership === null) {
            json_response(['message' => 'لا يمكن تعديل حساب طالبة خارج مجموعاتكِ.'], 404);
        }
    }

    $name = trim((string) ($input['name'] ?? ''));
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $password = (string) ($input['password'] ?? '');
    if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
        json_response(['message' => 'الاسم يجب أن يتراوح بين حرفين و100 حرف.'], 422);
    }
    if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['message' => 'أدخلي بريداً إلكترونياً صالحاً.'], 422);
    }
    if ($password !== '' && (strlen($password) < 8 || strlen($password) > 72)) {
        json_response(['message' => 'كلمة المرور الجديدة يجب أن تتراوح بين 8 و72 حرفاً.'], 422);
    }

    if ($password === '') {
        db_execute('UPDATE users SET name = ?, email = ? WHERE id = ?', [$name, $email, $studentId]);
    } else {
        db_execute(
            'UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?',
            [$name, $email, password_hash($password, PASSWORD_DEFAULT), $studentId]
        );
    }

    return ['id' => $studentId, 'name' => $name, 'email' => $email];
}

function teacher_student_accounts(array $user): array
{
    if ($user['role'] === 'admin') {
        return db_fetch_all(
            "SELECT u.id, u.name, u.email, COUNT(DISTINCT cs.class_id) AS group_count
             FROM users u
             JOIN roles r ON r.id = u.role_id
             LEFT JOIN class_students cs ON cs.student_id = u.id
             WHERE r.name = 'student'
             GROUP BY u.id, u.name, u.email
             ORDER BY u.name"
        );
    }

    return db_fetch_all(
        "SELECT u.id, u.name, u.email, COUNT(DISTINCT c.id) AS group_count
         FROM users u
         JOIN roles r ON r.id = u.role_id
         JOIN class_students cs ON cs.student_id = u.id
         JOIN classes c ON c.id = cs.class_id
         WHERE r.name = 'student' AND c.teacher_id = ?
         GROUP BY u.id, u.name, u.email
         ORDER BY u.name",
        [(int) $user['id']]
    );
}

function teacher_handle_student_account(string $route, string $method, array $user): bool
{
    if ($route === 'teacher/students' && $method === 'GET') {
        require_role(['teacher', 'admin']);
        json_response(['students' => teacher_student_accounts($user)]);
    }
    if (preg_match('~^teacher/students/([1-9][0-9]*)$~', $route, $matches) && $method === 'PATCH') {
        require_role(['teacher', 'admin']);
        require_csrf_token();
        $student = teacher_update_student_account((int) $matches[1], request_data(), $user);
        json_response(['student' => $student, 'message' => 'تم تحديث حساب الطالبة.']);
    }
    return false;
}

function teacher_handle_class_students(string $route, string $method, array $user): bool
{
    if (preg_match('~^teacher/classes/([1-9][0-9]*)/students$~', $route, $matches)) {
        require_role(['teacher', 'admin']);
        $classId = (int) $matches[1];
        if ($method === 'GET') {
            json_response(['students' => teacher_class_students($classId, $user)]);
        }
        if ($method === 'POST') {
            require_csrf_token();
            $class = db_fetch_one('SELECT teacher_id FROM classes WHERE id = ?', [$classId]);
            if ($class === null) {
                json_response(['message' => 'المجموعة غير موجودة.'], 404);
            }
            teacher_require_owner((int) $class['teacher_id'], $user);
            $email = strtolower(trim((string) (request_data()['email'] ?? '')));
            $student = db_fetch_one(
                'SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = ? AND r.name = ?',
                [$email, 'student']
            );
            if ($student === null) {
                json_response(['message' => 'لم يُعثر على حساب طالبة بهذا البريد الإلكتروني.'], 404);
            }
            db_execute(
                'INSERT INTO class_students (class_id, student_id, assigned_by) VALUES (?, ?, ?)',
                [$classId, (int) $student['id'], (int) $user['id']]
            );
            json_response(['message' => 'أُضيفت الطالبة إلى المجموعة.'], 201);
        }
        return false;
    }
    if (preg_match('~^teacher/classes/([1-9][0-9]*)/students/([1-9][0-9]*)$~', $route, $matches) && $method === 'DELETE') {
        require_role(['teacher', 'admin']);
        require_csrf_token();
        $classId = (int) $matches[1];
        $studentId = (int) $matches[2];
        $class = db_fetch_one('SELECT teacher_id FROM classes WHERE id = ?', [$classId]);
        if ($class === null) {
            json_response(['message' => 'المجموعة غير موجودة.'], 404);
        }
        teacher_require_owner((int) $class['teacher_id'], $user);
        $result = db_execute('DELETE FROM class_students WHERE class_id = ? AND student_id = ?', [$classId, $studentId]);
        if ($result->affected_rows === 0) {
            json_response(['message' => 'الطالبة غير مسجلة في هذه المجموعة.'], 404);
        }
        json_response(['message' => 'أُزيلت الطالبة من المجموعة.']);
    }
    return false;
}

function teacher_dashboard(array $user): array
{
    $teacherId = (int) $user['id'];
    $scopeParams = $user['role'] === 'admin' ? [] : [$teacherId];
    $studentCount = db_fetch_one(
        "SELECT COUNT(*) AS total FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'student'"
    );
    $questionCount = db_fetch_one(
        'SELECT COUNT(*) AS total FROM math_questions' . ($user['role'] === 'admin' ? ' WHERE is_active = 1' : ' WHERE teacher_id = ? AND is_active = 1'),
        $scopeParams
    );
    $gameCount = db_fetch_one(
        "SELECT COUNT(*) AS total FROM math_games" . ($user['role'] === 'admin' ? " WHERE status = 'published'" : " WHERE teacher_id = ? AND status = 'published'"),
        $scopeParams
    );
    $testCount = db_fetch_one(
        "SELECT COUNT(*) AS total FROM math_assessments" . ($user['role'] === 'admin' ? " WHERE assessment_type = 'test'" : " WHERE teacher_id = ? AND assessment_type = 'test'"),
        $scopeParams
    );
    $attemptScope = $user['role'] === 'admin'
        ? ''
        : ' AND ((a.game_id IS NOT NULL AND g.teacher_id = ?) OR (a.assessment_id IS NOT NULL AND m.teacher_id = ?))';
    $averageParams = $user['role'] === 'admin' ? [] : [$teacherId, $teacherId];
    $average = db_fetch_one(
        "SELECT ROUND(AVG(a.score / NULLIF(a.max_score, 0) * 100), 1) AS average_score
         FROM math_attempts a
         LEFT JOIN math_games g ON g.id = a.game_id
         LEFT JOIN math_assessments m ON m.id = a.assessment_id
         LEFT JOIN users u ON u.id = a.student_id
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE a.status = 'submitted' AND a.max_score > 0 AND r.name = 'student'$attemptScope",
        $averageParams
    );
    $studentAttemptJoin = $user['role'] === 'admin' ? '' :
        ' AND ((a.game_id IS NOT NULL AND g.teacher_id = ?) OR (a.assessment_id IS NOT NULL AND m.teacher_id = ?))';
    $topStudents = db_fetch_all(
        "SELECT u.id, u.name, COALESCE(SUM(a.score), 0) AS points,
                ROUND(AVG(a.score / NULLIF(a.max_score, 0) * 100), 1) AS average_score
         FROM users u JOIN roles r ON r.id = u.role_id
         LEFT JOIN math_attempts a ON a.student_id = u.id AND a.status = 'submitted'
         LEFT JOIN math_games g ON g.id = a.game_id
         LEFT JOIN math_assessments m ON m.id = a.assessment_id
         WHERE r.name = 'student'
         $studentAttemptJoin
         GROUP BY u.id, u.name
         HAVING COUNT(a.id) > 0
         ORDER BY points DESC, average_score DESC LIMIT 5",
        $user['role'] === 'admin' ? [] : [$teacherId, $teacherId]
    );
    $ownerJoin = $user['role'] === 'admin' ? '' : ' WHERE teacher_id = ?';
    $activityFilter = $user['role'] === 'admin'
        ? ''
        : ' AND ((a.game_id IS NOT NULL AND g.teacher_id = ?) OR (a.assessment_id IS NOT NULL AND m.teacher_id = ?))';
    $activities = db_fetch_all(
        "SELECT * FROM (
           SELECT 'attempt' AS activity_type, u.name AS student_name, COALESCE(g.title, m.title) AS title,
                  a.submitted_at AS occurred_at, a.score AS score
           FROM math_attempts a
           JOIN users u ON u.id = a.student_id
           LEFT JOIN math_games g ON g.id = a.game_id
           LEFT JOIN math_assessments m ON m.id = a.assessment_id
           WHERE a.status = 'submitted'$activityFilter
           UNION ALL
           SELECT 'question' AS activity_type, NULL AS student_name, prompt AS title, created_at AS occurred_at, NULL AS score
           FROM math_questions$ownerJoin
           UNION ALL
           SELECT 'game' AS activity_type, NULL AS student_name, title, created_at AS occurred_at, NULL AS score
           FROM math_games$ownerJoin
         ) activity
         ORDER BY occurred_at DESC LIMIT 8",
        [
            ...($user['role'] === 'admin' ? [] : [$teacherId, $teacherId]),
            ...$scopeParams,
            ...$scopeParams,
        ]
    );
    $progress = db_fetch_all(
        "SELECT DATE(a.submitted_at) AS date, COUNT(*) AS attempts,
                ROUND(AVG(a.score / NULLIF(a.max_score, 0) * 100), 1) AS average_score
         FROM math_attempts a
         LEFT JOIN math_games g ON g.id = a.game_id
         LEFT JOIN math_assessments m ON m.id = a.assessment_id
         WHERE a.status = 'submitted' AND a.submitted_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)"
         . ($user['role'] === 'admin' ? '' : ' AND ((a.game_id IS NOT NULL AND g.teacher_id = ?) OR (a.assessment_id IS NOT NULL AND m.teacher_id = ?))') .
         ' GROUP BY DATE(a.submitted_at) ORDER BY DATE(a.submitted_at)',
        $averageParams
    );

    return [
        'stats' => [
            'students' => (int) $studentCount['total'],
            'questions' => (int) $questionCount['total'],
            'games' => (int) $gameCount['total'],
            'tests' => (int) $testCount['total'],
            'average_score' => $average['average_score'] === null ? null : (float) $average['average_score'],
        ],
        'top_students' => $topStudents,
        'activities' => $activities,
        'progress' => $progress,
    ];
}

function teacher_handle_request(string $route, string $method, array $user): bool
{
    if (teacher_site_content_handle($route, $method, $user)) {
        return true;
    }
    if (teacher_handle_student_account($route, $method, $user)) {
        return true;
    }
    if (teacher_handle_class_students($route, $method, $user)) {
        return true;
    }
    if ($route === 'teacher/dashboard' && $method === 'GET') {
        require_role(['teacher', 'admin']);
        json_response(teacher_dashboard($user));
    }
    if ($route === 'teacher/curriculum' && $method === 'GET') {
        require_role(['teacher', 'admin']);
        json_response(teacher_curriculum_list($user));
    }
    if (preg_match('~^teacher/curriculum/(grades|classes|subjects|units|lessons|skills)$~', $route, $matches)) {
        require_role(['teacher', 'admin']);
        if ($method === 'POST') {
            require_csrf_token();
            $id = teacher_save_curriculum($matches[1], request_data(), $user);
            json_response(['id' => $id]);
        }
        return false;
    }
    if (preg_match('~^teacher/curriculum/(grades|classes|subjects|units|lessons|skills)/([1-9][0-9]*)$~', $route, $matches) && $method === 'DELETE') {
        require_role(['teacher', 'admin']);
        require_csrf_token();
        $kind = $matches[1];
        $id = (int) $matches[2];
        $ownerId = teacher_resource_owner($kind, $id);
        if ($ownerId === null) {
            json_response(['message' => 'العنصر المطلوب غير موجود.'], 404);
        }
        teacher_require_owner($ownerId, $user);
        $tables = [
            'grades' => 'grades',
            'classes' => 'classes',
            'subjects' => 'math_subjects',
            'units' => 'math_units',
            'lessons' => 'math_lessons',
            'skills' => 'math_skills',
        ];
        db_execute('DELETE FROM ' . $tables[$kind] . ' WHERE id = ?', [$id]);
        json_response(['message' => 'تم حذف العنصر.']);
    }
    if ($route === 'teacher/questions' && $method === 'GET') {
        require_role(['teacher', 'admin']);
        json_response(['questions' => teacher_question_rows($user)]);
    }
    if ($route === 'teacher/questions' && $method === 'POST') {
        require_role(['teacher', 'admin']);
        require_csrf_token();
        $id = teacher_save_question(request_data(), $user);
        json_response(['id' => $id], 201);
    }
    if (preg_match('~^teacher/questions/([1-9][0-9]*)$~', $route, $matches) && $method === 'DELETE') {
        require_role(['teacher', 'admin']);
        require_csrf_token();
        $id = (int) $matches[1];
        $question = db_fetch_one('SELECT teacher_id FROM math_questions WHERE id = ? AND is_active = 1', [$id]);
        if ($question === null) {
            json_response(['message' => 'السؤال غير موجود.'], 404);
        }
        teacher_require_owner((int) $question['teacher_id'], $user);
        $inProgress = db_fetch_one(
            "SELECT COUNT(*) AS total FROM math_attempt_questions aq
             JOIN math_attempts a ON a.id = aq.attempt_id
             WHERE aq.question_id = ? AND a.status = 'in_progress'",
            [$id]
        );
        if ((int) $inProgress['total'] > 0) {
            json_response(['message' => 'لا يمكن إخفاء سؤال ضمن محاولة جارية.'], 409);
        }
        db_execute('UPDATE math_questions SET is_active = 0 WHERE id = ?', [$id]);
        json_response(['message' => 'تم حذف السؤال من بنك الأسئلة.']);
    }
    if (preg_match('~^teacher/questions/([1-9][0-9]*)/image$~', $route, $matches) && $method === 'POST') {
        require_role(['teacher', 'admin']);
        require_csrf_token();
        json_response(teacher_question_image((int) $matches[1], $user));
    }

    return teacher_handle_collections($route, $method, $user);
}
