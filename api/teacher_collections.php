<?php
declare(strict_types=1);

function teacher_collection_owner(string $kind, int $id): ?int
{
    $table = $kind === 'games' ? 'math_games' : 'math_assessments';
    $row = db_fetch_one("SELECT teacher_id FROM $table WHERE id = ?", [$id]);
    return $row === null ? null : (int) $row['teacher_id'];
}

function teacher_question_ids(array $input): array
{
    $ids = $input['question_ids'] ?? [];
    if (!is_array($ids) || count($ids) > 250) {
        json_response(['message' => 'اختاري 250 سؤالاً كحد أقصى.'], 422);
    }
    $normalized = [];
    foreach ($ids as $id) {
        $id = filter_var($id, FILTER_VALIDATE_INT);
        if ($id === false || $id < 1) {
            json_response(['message' => 'قائمة الأسئلة تحتوي على معرّف غير صالح.'], 422);
        }
        $normalized[] = (int) $id;
    }
    return array_values(array_unique($normalized));
}

function teacher_validate_question_ids(array $ids, ?int $gradeId, array $user): void
{
    if ($ids === []) {
        return;
    }
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $sql = "SELECT q.id, q.grade_id, q.teacher_id FROM math_questions q
            WHERE q.is_active = 1 AND q.id IN ($marks)";
    $questions = db_fetch_all($sql, $ids);
    if (count($questions) !== count($ids)) {
        json_response(['message' => 'تحتوي القائمة على أسئلة غير متاحة أو محذوفة.'], 422);
    }
    foreach ($questions as $question) {
        teacher_require_owner((int) $question['teacher_id'], $user);
        if ($gradeId !== null && (int) $question['grade_id'] !== $gradeId) {
            json_response(['message' => 'يجب أن تنتمي أسئلة النشاط إلى الصف المحدد.'], 422);
        }
    }
}

function teacher_replace_collection_questions(string $table, string $ownerColumn, int $ownerId, array $questionIds): void
{
    db_execute("DELETE FROM $table WHERE $ownerColumn = ?", [$ownerId]);
    foreach ($questionIds as $index => $questionId) {
        db_execute(
            "INSERT INTO $table ($ownerColumn, question_id, sort_order) VALUES (?, ?, ?)",
            [$ownerId, $questionId, $index]
        );
    }
}

function teacher_association_ids(string $table, string $ownerColumn, int $id): array
{
    $rows = db_fetch_all("SELECT question_id FROM $table WHERE $ownerColumn = ? ORDER BY sort_order", [$id]);
    return array_map(static fn(array $row): int => (int) $row['question_id'], $rows);
}

function teacher_validate_game_location(array $input, array $user): array
{
    $gradeId = isset($input['grade_id']) && (int) $input['grade_id'] > 0 ? (int) $input['grade_id'] : null;
    $lessonId = isset($input['lesson_id']) && (int) $input['lesson_id'] > 0 ? (int) $input['lesson_id'] : null;
    if ($gradeId !== null && !teacher_parent_exists('grades', $gradeId, $user)) {
        json_response(['message' => 'الصف المختار غير متاح.'], 422);
    }
    if ($lessonId !== null) {
        $lesson = db_fetch_one(
            'SELECT s.grade_id, s.teacher_id FROM math_lessons l
             JOIN math_units u ON u.id = l.unit_id JOIN math_subjects s ON s.id = u.subject_id
             WHERE l.id = ?',
            [$lessonId]
        );
        if ($lesson === null) {
            json_response(['message' => 'الدرس المختار غير موجود.'], 422);
        }
        teacher_require_owner((int) $lesson['teacher_id'], $user);
        if ($gradeId !== null && $gradeId !== (int) $lesson['grade_id']) {
            json_response(['message' => 'الدرس لا يتبع الصف المختار.'], 422);
        }
        $gradeId = (int) $lesson['grade_id'];
    }
    return [$gradeId, $lessonId];
}

function teacher_save_game(array $input, array $user): int
{
    $id = max(0, (int) ($input['id'] ?? 0));
    $types = [
        'arithmetic_challenge', 'equation_solver', 'math_race', 'answer_hunt', 'fractions_challenge',
        'math_memory', 'question_wheel', 'math_treasure', 'geometry_challenge', 'speed_test',
    ];
    $type = (string) ($input['game_type'] ?? '');
    $title = trim((string) ($input['title'] ?? ''));
    $description = trim((string) ($input['description'] ?? ''));
    $status = (string) ($input['status'] ?? 'draft');
    if (!in_array($type, $types, true) || !in_array($status, ['draft', 'published', 'archived'], true)) {
        json_response(['message' => 'اختاري قالب اللعبة وحالة صالحين.'], 422);
    }
    if ($title === '' || mb_strlen($title) > 180 || mb_strlen($description) > 10000) {
        json_response(['message' => 'عنوان اللعبة مطلوب والوصف يجب ألا يتجاوز 10000 حرف.'], 422);
    }
    $questionIds = teacher_question_ids($input);
    if ($status === 'published' && $questionIds === []) {
        json_response(['message' => 'أضيفي سؤالاً واحداً على الأقل قبل نشر اللعبة.'], 422);
    }
    [$gradeId, $lessonId] = teacher_validate_game_location($input, $user);
    teacher_validate_question_ids($questionIds, $gradeId, $user);
    $settings = [
        'duration_minutes' => max(1, min(180, (int) ($input['duration_minutes'] ?? 10))),
        'questions_per_game' => max(1, min(250, (int) ($input['questions_per_game'] ?? max(1, count($questionIds))))),
        'randomize' => !empty($input['randomize']),
        'allow_retry' => !empty($input['allow_retry']),
    ];
    $db = database_connection();
    $db->begin_transaction();
    try {
        if ($id > 0) {
            $existing = db_fetch_one('SELECT teacher_id FROM math_games WHERE id = ?', [$id]);
            if ($existing === null) {
                json_response(['message' => 'اللعبة غير موجودة.'], 404);
            }
            teacher_require_owner((int) $existing['teacher_id'], $user);
            $attempts = db_fetch_one('SELECT COUNT(*) AS total FROM math_attempts WHERE game_id = ?', [$id]);
            $currentIds = teacher_association_ids('math_game_questions', 'game_id', $id);
            if ((int) $attempts['total'] > 0 && $currentIds !== $questionIds) {
                json_response(['message' => 'لا يمكن تغيير أسئلة لعبة بدأها الطلاب؛ احفظي التغييرات الأخرى أو أنشئي لعبة جديدة.'], 409);
            }
            db_execute(
                'UPDATE math_games SET grade_id=?, lesson_id=?, game_type=?, title=?, description=?, settings=?, status=? WHERE id=?',
                [$gradeId, $lessonId, $type, $title, $description, json_encode($settings, JSON_UNESCAPED_UNICODE), $status, $id]
            );
            if ((int) $attempts['total'] === 0 && $currentIds !== $questionIds) {
                teacher_replace_collection_questions('math_game_questions', 'game_id', $id, $questionIds);
            }
        } else {
            db_execute(
                'INSERT INTO math_games (teacher_id, grade_id, lesson_id, game_type, title, description, settings, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [(int) $user['id'], $gradeId, $lessonId, $type, $title, $description, json_encode($settings, JSON_UNESCAPED_UNICODE), $status]
            );
            $id = (int) $db->insert_id;
            teacher_replace_collection_questions('math_game_questions', 'game_id', $id, $questionIds);
        }
        $db->commit();
    } catch (Throwable $error) {
        $db->rollback();
        throw $error;
    }
    return $id;
}

function teacher_save_assessment(array $input, array $user): int
{
    $id = max(0, (int) ($input['id'] ?? 0));
    $title = trim((string) ($input['title'] ?? ''));
    $instructions = trim((string) ($input['instructions'] ?? ''));
    $type = (string) ($input['assessment_type'] ?? '');
    $status = (string) ($input['status'] ?? 'draft');
    $gradeId = (int) ($input['grade_id'] ?? 0);
    $classId = isset($input['class_id']) && (int) $input['class_id'] > 0 ? (int) $input['class_id'] : null;
    if (!in_array($type, ['homework', 'test'], true) || !in_array($status, ['draft', 'published', 'archived'], true)) {
        json_response(['message' => 'اختاري نوع التكليف وحالة صالحين.'], 422);
    }
    if ($title === '' || mb_strlen($title) > 180 || mb_strlen($instructions) > 10000) {
        json_response(['message' => 'عنوان التكليف مطلوب والوصف يجب ألا يتجاوز 10000 حرف.'], 422);
    }
    if ($gradeId < 1 || !teacher_parent_exists('grades', $gradeId, $user)) {
        json_response(['message' => 'اختاري صفاً دراسياً صالحاً.'], 422);
    }
    if ($classId !== null) {
        $class = db_fetch_one('SELECT teacher_id, grade_id FROM classes WHERE id = ?', [$classId]);
        if ($class === null || (int) $class['grade_id'] !== $gradeId) {
            json_response(['message' => 'المجموعة المختارة لا تتبع الصف المحدد.'], 422);
        }
        teacher_require_owner((int) $class['teacher_id'], $user);
    }
    $dueAt = null;
    $dueValue = trim((string) ($input['due_at'] ?? ''));
    if ($dueValue !== '') {
        $timestamp = strtotime($dueValue);
        if ($timestamp === false) {
            json_response(['message' => 'تاريخ التسليم غير صالح.'], 422);
        }
        $dueAt = date('Y-m-d H:i:s', $timestamp);
    }
    $questionIds = teacher_question_ids($input);
    if ($status === 'published' && $questionIds === []) {
        json_response(['message' => 'أضيفي سؤالاً واحداً على الأقل قبل نشر التكليف.'], 422);
    }
    teacher_validate_question_ids($questionIds, $gradeId, $user);
    $db = database_connection();
    $db->begin_transaction();
    try {
        if ($id > 0) {
            $existing = db_fetch_one('SELECT teacher_id FROM math_assessments WHERE id = ?', [$id]);
            if ($existing === null) {
                json_response(['message' => 'التكليف غير موجود.'], 404);
            }
            teacher_require_owner((int) $existing['teacher_id'], $user);
            $attempts = db_fetch_one('SELECT COUNT(*) AS total FROM math_attempts WHERE assessment_id = ?', [$id]);
            $currentIds = teacher_association_ids('math_assessment_questions', 'assessment_id', $id);
            if ((int) $attempts['total'] > 0 && $currentIds !== $questionIds) {
                json_response(['message' => 'لا يمكن تغيير أسئلة تكليف بدأه الطلاب.'], 409);
            }
            db_execute(
                'UPDATE math_assessments SET grade_id=?, class_id=?, assessment_type=?, title=?, instructions=?, due_at=?, status=? WHERE id=?',
                [$gradeId, $classId, $type, $title, $instructions, $dueAt, $status, $id]
            );
            if ((int) $attempts['total'] === 0 && $currentIds !== $questionIds) {
                teacher_replace_collection_questions('math_assessment_questions', 'assessment_id', $id, $questionIds);
            }
        } else {
            db_execute(
                'INSERT INTO math_assessments (teacher_id, grade_id, class_id, assessment_type, title, instructions, due_at, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [(int) $user['id'], $gradeId, $classId, $type, $title, $instructions, $dueAt, $status]
            );
            $id = (int) $db->insert_id;
            teacher_replace_collection_questions('math_assessment_questions', 'assessment_id', $id, $questionIds);
        }
        $db->commit();
    } catch (Throwable $error) {
        $db->rollback();
        throw $error;
    }
    return $id;
}

function teacher_collection_list(string $kind, array $user): array
{
    $where = $user['role'] === 'admin' ? '' : ' WHERE teacher_id = ?';
    $parameters = $user['role'] === 'admin' ? [] : [(int) $user['id']];
    if ($kind === 'games') {
        $rows = db_fetch_all(
            'SELECT g.id, g.grade_id, g.lesson_id, g.game_type, g.title, g.description, g.settings, g.status, g.created_at,
                    gr.name AS grade_name, l.title AS lesson_title, COUNT(gq.question_id) AS question_count
             FROM math_games g LEFT JOIN grades gr ON gr.id = g.grade_id
             LEFT JOIN math_lessons l ON l.id = g.lesson_id
             LEFT JOIN math_game_questions gq ON gq.game_id = g.id' .
             ($user['role'] === 'admin' ? '' : ' WHERE g.teacher_id = ?') .
             ' GROUP BY g.id ORDER BY g.created_at DESC LIMIT 200',
            $parameters
        );
        foreach ($rows as &$row) {
            $row['settings'] = json_decode((string) $row['settings'], true) ?: [];
            $row['question_ids'] = array_map('intval', teacher_association_ids('math_game_questions', 'game_id', (int) $row['id']));
        }
        unset($row);
        return $rows;
    }
    $rows = db_fetch_all(
        'SELECT a.id, a.grade_id, a.class_id, a.assessment_type, a.title, a.instructions, a.due_at, a.status, a.created_at,
                g.name AS grade_name, c.name AS class_name, COUNT(aq.question_id) AS question_count
         FROM math_assessments a JOIN grades g ON g.id = a.grade_id
         LEFT JOIN classes c ON c.id = a.class_id
         LEFT JOIN math_assessment_questions aq ON aq.assessment_id = a.id' .
         ($user['role'] === 'admin' ? '' : ' WHERE a.teacher_id = ?') .
         ' GROUP BY a.id ORDER BY a.created_at DESC LIMIT 200',
        $parameters
    );
    foreach ($rows as &$row) {
        $row['question_ids'] = array_map('intval', teacher_association_ids('math_assessment_questions', 'assessment_id', (int) $row['id']));
    }
    unset($row);
    return $rows;
}

function teacher_handle_collections(string $route, string $method, array $user): bool
{
    if (preg_match('~^teacher/(games|assessments)$~', $route, $matches)) {
        require_role(['teacher', 'admin']);
        $kind = $matches[1];
        if ($method === 'GET') {
            json_response([$kind => teacher_collection_list($kind, $user)]);
        }
        if ($method === 'POST') {
            require_csrf_token();
            $input = request_data();
            $id = $kind === 'games'
                ? teacher_save_game($input, $user)
                : teacher_save_assessment($input, $user);
            json_response(['id' => $id]);
        }
        return false;
    }
    if (preg_match('~^teacher/(games|assessments)/([1-9][0-9]*)$~', $route, $matches) && $method === 'DELETE') {
        require_role(['teacher', 'admin']);
        require_csrf_token();
        $kind = $matches[1];
        $id = (int) $matches[2];
        $ownerId = teacher_collection_owner($kind, $id);
        if ($ownerId === null) {
            json_response(['message' => 'العنصر المطلوب غير موجود.'], 404);
        }
        teacher_require_owner($ownerId, $user);
        $column = $kind === 'games' ? 'game_id' : 'assessment_id';
        $attempts = db_fetch_one("SELECT COUNT(*) AS total FROM math_attempts WHERE $column = ?", [$id]);
        if ((int) $attempts['total'] > 0) {
            json_response(['message' => 'لهذا النشاط محاولات محفوظة؛ غيّري حالته إلى مؤرشف بدلاً من حذفه.'], 409);
        }
        $table = $kind === 'games' ? 'math_games' : 'math_assessments';
        db_execute("DELETE FROM $table WHERE id = ?", [$id]);
        json_response(['message' => 'تم حذف النشاط.']);
    }
    return false;
}
