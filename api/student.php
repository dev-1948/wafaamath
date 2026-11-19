<?php
declare(strict_types=1);

function student_available_activities(int $studentId, string $kind): array
{
    if ($kind === 'games') {
        $rows = db_fetch_all(
            "SELECT g.id, g.grade_id, g.lesson_id, g.game_type, g.title, g.description, g.settings,
                    gr.name AS grade_name, l.title AS lesson_title,
                    (SELECT COUNT(*) FROM math_game_questions gq WHERE gq.game_id = g.id) AS question_count,
                    (SELECT COUNT(*) FROM math_attempts ga WHERE ga.game_id = g.id AND ga.student_id = ?) AS attempts_count
             FROM math_games g
             LEFT JOIN grades gr ON gr.id = g.grade_id
             LEFT JOIN math_lessons l ON l.id = g.lesson_id
             WHERE g.status = 'published'
               AND (g.grade_id IS NULL OR EXISTS (
                 SELECT 1 FROM class_students cs JOIN classes c ON c.id = cs.class_id
                 WHERE cs.student_id = ? AND c.grade_id = g.grade_id
               ))
             ORDER BY g.created_at DESC",
            [$studentId, $studentId]
        );
        foreach ($rows as &$row) {
            $row['settings'] = json_decode((string) $row['settings'], true) ?: [];
        }
        unset($row);
        return $rows;
    }

    return db_fetch_all(
        "SELECT a.id, a.grade_id, a.class_id, a.assessment_type, a.title, a.instructions, a.due_at,
                g.name AS grade_name, c.name AS class_name,
                (SELECT COUNT(*) FROM math_assessment_questions aq WHERE aq.assessment_id = a.id) AS question_count
         FROM math_assessments a
         JOIN grades g ON g.id = a.grade_id
         LEFT JOIN classes c ON c.id = a.class_id
         WHERE a.status = 'published'
           AND (
             (a.class_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM class_students cs WHERE cs.class_id = a.class_id AND cs.student_id = ?
             ))
             OR
             (a.class_id IS NULL AND EXISTS (
               SELECT 1 FROM class_students cs JOIN classes sc ON sc.id = cs.class_id
               WHERE cs.student_id = ? AND sc.grade_id = a.grade_id
             ))
           )
         ORDER BY a.due_at IS NULL, a.due_at, a.created_at DESC",
        [$studentId, $studentId]
    );
}

function student_dashboard(array $user): array
{
    $studentId = (int) $user['id'];
    $summary = db_fetch_one(
        "SELECT COALESCE(SUM(score), 0) AS points,
                ROUND(AVG(score / NULLIF(max_score, 0) * 100), 1) AS average_score,
                COUNT(*) AS completed_activities
         FROM math_attempts WHERE student_id = ? AND status = 'submitted'",
        [$studentId]
    );
    $points = (int) round((float) $summary['points']);
    $progress = db_fetch_all(
        "SELECT l.id AS lesson_id, l.title AS lesson_title, mu.title AS unit_title, u.name AS subject_name, g.name AS grade_name,
                COALESCE(p.questions_answered, 0) AS questions_answered,
                COALESCE(p.correct_answers, 0) AS correct_answers,
                COUNT(q.id) AS total_questions
         FROM math_lessons l
         JOIN math_units mu ON mu.id = l.unit_id
         JOIN math_subjects u ON u.id = mu.subject_id
         JOIN grades g ON g.id = u.grade_id
         LEFT JOIN math_questions q ON q.lesson_id = l.id AND q.is_active = 1
         LEFT JOIN student_math_progress p ON p.lesson_id = l.id AND p.student_id = ?
         WHERE EXISTS (
           SELECT 1 FROM class_students cs JOIN classes c ON c.id = cs.class_id
           WHERE cs.student_id = ? AND c.grade_id = g.id
         )
         GROUP BY l.id, l.title, mu.title, u.name, g.name, p.questions_answered, p.correct_answers
         HAVING COUNT(q.id) > 0
         ORDER BY g.name, mu.title, l.sort_order, l.title
         LIMIT 100",
        [$studentId, $studentId]
    );
    foreach ($progress as &$lesson) {
        $total = (int) $lesson['total_questions'];
        $answered = min($total, (int) $lesson['questions_answered']);
        $lesson['progress_percent'] = $total > 0 ? (int) round($answered / $total * 100) : 0;
        $lesson['accuracy_percent'] = $answered > 0 ? (int) round((int) $lesson['correct_answers'] / $answered * 100) : null;
    }
    unset($lesson);

    $mistakes = db_fetch_all(
        "SELECT q.id AS question_id, q.prompt, q.correct_answer, q.explanation, ans.answer_text,
                selected.option_text AS selected_option, COALESCE(g.title, activity.title) AS activity_title,
                ans.answered_at, q.image_path
         FROM math_answers ans
         JOIN math_questions q ON q.id = ans.question_id
         JOIN math_attempts a ON a.id = ans.attempt_id
         LEFT JOIN math_question_options selected ON selected.id = ans.selected_option_id
         LEFT JOIN math_games g ON g.id = a.game_id
         LEFT JOIN math_assessments activity ON activity.id = a.assessment_id
         WHERE ans.is_correct = 0 AND a.student_id = ?
         ORDER BY ans.answered_at DESC LIMIT 8",
        [$studentId]
    );
    $ranking = db_fetch_all(
        "SELECT u.id, u.name, COALESCE(SUM(a.score), 0) AS points
         FROM users u JOIN roles r ON r.id = u.role_id
         LEFT JOIN math_attempts a ON a.student_id = u.id AND a.status = 'submitted'
         WHERE r.name = 'student'
         GROUP BY u.id, u.name
         ORDER BY points DESC, u.name
         "
    );
    $rank = null;
    $leaders = [];
    foreach ($ranking as $index => $student) {
        $student['rank'] = $index + 1;
        if ((int) $student['id'] === $studentId) {
            $rank = $index + 1;
        }
        if (count($leaders) < 5) {
            $leaders[] = $student;
        }
    }
    $recentAttempts = db_fetch_all(
        "SELECT a.id, COALESCE(g.title, m.title) AS title, a.score, a.max_score, a.submitted_at,
                CASE WHEN a.game_id IS NULL THEN m.assessment_type ELSE 'game' END AS activity_type
         FROM math_attempts a
         LEFT JOIN math_games g ON g.id = a.game_id
         LEFT JOIN math_assessments m ON m.id = a.assessment_id
         WHERE a.student_id = ? AND a.status = 'submitted'
         ORDER BY a.submitted_at DESC LIMIT 6",
        [$studentId]
    );

    return [
        'summary' => [
            'points' => $points,
            'level' => intdiv($points, 100) + 1,
            'average_score' => $summary['average_score'] === null ? null : (float) $summary['average_score'],
            'completed_activities' => (int) $summary['completed_activities'],
            'rank' => $rank,
        ],
        'games' => student_available_activities($studentId, 'games'),
        'assessments' => student_available_activities($studentId, 'assessments'),
        'progress' => $progress,
        'mistakes' => $mistakes,
        'leaders' => $leaders,
        'recent_attempts' => $recentAttempts,
    ];
}

function student_fetch_activity_questions(int $gameId, int $assessmentId): array
{
    if ($gameId > 0) {
        return db_fetch_all(
            'SELECT q.id, q.question_type, q.difficulty, q.prompt, q.image_path, q.points,
                    q.time_limit_seconds, gq.points_override
             FROM math_game_questions gq JOIN math_questions q ON q.id = gq.question_id
             WHERE gq.game_id = ? AND q.is_active = 1 ORDER BY gq.sort_order',
            [$gameId]
        );
    }
    return db_fetch_all(
        'SELECT q.id, q.question_type, q.difficulty, q.prompt, q.image_path, q.points,
                q.time_limit_seconds, aq.points_override
         FROM math_assessment_questions aq JOIN math_questions q ON q.id = aq.question_id
         WHERE aq.assessment_id = ? AND q.is_active = 1 ORDER BY aq.sort_order',
        [$assessmentId]
    );
}

function student_safe_questions(array $questions): array
{
    if ($questions === []) {
        json_response(['message' => 'لا توجد أسئلة متاحة في هذا النشاط بعد.'], 422);
    }
    $ids = array_map(static fn(array $question): int => (int) $question['id'], $questions);
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $rows = db_fetch_all(
        "SELECT id, question_id, option_text AS text FROM math_question_options
         WHERE question_id IN ($marks) ORDER BY question_id, sort_order",
        $ids
    );
    $options = [];
    foreach ($rows as $row) {
        $options[(int) $row['question_id']][] = ['id' => (int) $row['id'], 'text' => $row['text']];
    }
    foreach ($questions as &$question) {
        $question['id'] = (int) $question['id'];
        $question['points'] = (int) ($question['points_override'] ?? $question['points']);
        $question['options'] = $options[$question['id']] ?? [];
        unset($question['points_override']);
        unset($question['correct_answer']);
        unset($question['explanation']);
    }
    unset($question);
    return $questions;
}

function student_start_attempt(array $input, array $user): array
{
    $gameId = max(0, (int) ($input['game_id'] ?? 0));
    $assessmentId = max(0, (int) ($input['assessment_id'] ?? 0));
    if (($gameId > 0) === ($assessmentId > 0)) {
        json_response(['message' => 'اختاري لعبة أو تكليفاً واحداً لبدء المحاولة.'], 422);
    }
    $studentId = (int) $user['id'];
    if ($gameId > 0) {
        $activity = db_fetch_one(
            "SELECT id, title, settings FROM math_games WHERE id = ? AND status = 'published'
             AND (grade_id IS NULL OR EXISTS (
               SELECT 1 FROM class_students cs JOIN classes c ON c.id = cs.class_id
               WHERE cs.student_id = ? AND c.grade_id = math_games.grade_id
             ))",
            [$gameId, $studentId]
        );
        if ($activity === null) {
            json_response(['message' => 'اللعبة غير متاحة لحسابك.'], 404);
        }
        $settings = json_decode((string) $activity['settings'], true) ?: [];
        if (empty($settings['allow_retry'])) {
            $previous = db_fetch_one(
                'SELECT COUNT(*) AS total FROM math_attempts WHERE student_id = ? AND game_id = ?',
                [$studentId, $gameId]
            );
            if ((int) $previous['total'] > 0) {
                json_response(['message' => 'هذه اللعبة متاحة لمحاولة واحدة فقط.'], 409);
            }
        }
    } else {
        $activity = db_fetch_one(
            "SELECT id, title FROM math_assessments a WHERE id = ? AND status = 'published'
             AND (
               (class_id IS NOT NULL AND EXISTS (SELECT 1 FROM class_students cs WHERE cs.class_id = a.class_id AND cs.student_id = ?))
               OR (class_id IS NULL AND EXISTS (
                 SELECT 1 FROM class_students cs JOIN classes c ON c.id = cs.class_id
                 WHERE cs.student_id = ? AND c.grade_id = a.grade_id
               ))
             )",
            [$assessmentId, $studentId, $studentId]
        );
        if ($activity === null) {
            json_response(['message' => 'الواجب أو الاختبار غير متاح لحسابك.'], 404);
        }
    }
    $questions = student_fetch_activity_questions($gameId, $assessmentId);
    if ($gameId > 0) {
        if (!empty($settings['randomize'])) {
            shuffle($questions);
        }
        $questionLimit = max(1, (int) ($settings['questions_per_game'] ?? count($questions)));
        $questions = array_slice($questions, 0, $questionLimit);
    }
    $maxScore = array_sum(array_map(
        static fn(array $question): int => (int) ($question['points_override'] ?? $question['points']),
        $questions
    ));
    if ($maxScore <= 0) {
        json_response(['message' => 'لم يتم إعداد أسئلة ودرجات صالحة لهذا النشاط.'], 422);
    }
    $timeLimit = $gameId > 0
        ? max(60, (int) ($settings['duration_minutes'] ?? 10) * 60)
        : min(65535, array_sum(array_map(static fn(array $question): int => (int) $question['time_limit_seconds'], $questions)));
    $db = database_connection();
    $db->begin_transaction();
    try {
        db_execute(
            'INSERT INTO math_attempts (student_id, game_id, assessment_id, max_score, time_limit_seconds) VALUES (?, ?, ?, ?, ?)',
            [$studentId, $gameId > 0 ? $gameId : null, $assessmentId > 0 ? $assessmentId : null, $maxScore, $timeLimit]
        );
        $attemptId = (int) $db->insert_id;
        foreach ($questions as $index => $question) {
            db_execute(
                'INSERT INTO math_attempt_questions (attempt_id, question_id, sort_order, points) VALUES (?, ?, ?, ?)',
                [$attemptId, (int) $question['id'], $index, (int) ($question['points_override'] ?? $question['points'])]
            );
        }
        $db->commit();
    } catch (Throwable $error) {
        $db->rollback();
        throw $error;
    }
    return [
        'attempt_id' => $attemptId,
        'title' => $activity['title'],
        'time_limit_seconds' => $timeLimit,
        'questions' => student_safe_questions($questions),
    ];
}

function student_fetch_attempt_questions(int $attemptId): array
{
    return db_fetch_all(
        "SELECT q.id, q.question_type, q.difficulty, q.prompt, q.image_path, q.points,
                aq.points AS points_override, q.time_limit_seconds,
                CASE WHEN q.question_type = 'multiple_choice'
                  THEN (SELECT option_text FROM math_question_options WHERE question_id = q.id AND is_correct = 1 LIMIT 1)
                  ELSE q.correct_answer END AS correct_answer,
                q.explanation
         FROM math_attempt_questions aq JOIN math_questions q ON q.id = aq.question_id
         WHERE aq.attempt_id = ? ORDER BY aq.sort_order",
        [$attemptId]
    );
}

function math_normalize_text(string $value): string
{
    $value = strtr(trim($value), [
        '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
        '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        '٫' => '.', '٬' => '',
    ]);
    $value = mb_strtolower($value);
    return preg_replace('/\s+/u', ' ', $value) ?? $value;
}

function math_answer_is_correct(array $question, array $answer): bool
{
    $type = $question['question_type'];
    if ($type === 'multiple_choice') {
        $optionId = (int) ($answer['option_id'] ?? 0);
        if ($optionId < 1) {
            return false;
        }
        $option = db_fetch_one(
            'SELECT is_correct FROM math_question_options WHERE id = ? AND question_id = ?',
            [$optionId, (int) $question['id']]
        );
        return $option !== null && (int) $option['is_correct'] === 1;
    }
    $value = (string) ($answer['answer_text'] ?? '');
    $expected = (string) ($question['correct_answer'] ?? '');
    if ($type === 'numeric') {
        $submitted = str_replace(',', '.', math_normalize_text($value));
        $correct = str_replace(',', '.', math_normalize_text($expected));
        return is_numeric($submitted) && is_numeric($correct) && abs((float) $submitted - (float) $correct) < 0.0000001;
    }
    if ($type === 'true_false') {
        $map = ['true' => 'true', '1' => 'true', 'صحيح' => 'true', 'false' => 'false', '0' => 'false', 'خطأ' => 'false'];
        return ($map[math_normalize_text($value)] ?? '') === ($map[math_normalize_text($expected)] ?? 'invalid');
    }
    if ($type === 'order_steps') {
        $expectedSteps = json_decode($expected, true);
        $submittedSteps = json_decode($value, true);
        if (!is_array($submittedSteps)) {
            $submittedSteps = preg_split('/\r\n|\r|\n/', trim($value)) ?: [];
        }
        if (!is_array($expectedSteps) || count($expectedSteps) !== count($submittedSteps)) {
            return false;
        }
        foreach (array_values($expectedSteps) as $index => $step) {
            if (math_normalize_text((string) $step) !== math_normalize_text((string) $submittedSteps[$index])) {
                return false;
            }
        }
        return true;
    }
    return math_normalize_text($value) !== '' && math_normalize_text($value) === math_normalize_text($expected);
}

function student_submit_attempt(int $attemptId, array $input, array $user): array
{
    $db = database_connection();
    $db->begin_transaction();
    try {
        $attempt = db_fetch_one(
            'SELECT id, student_id, game_id, assessment_id, status, started_at, time_limit_seconds FROM math_attempts WHERE id = ? FOR UPDATE',
            [$attemptId]
        );
        if ($attempt === null || (int) $attempt['student_id'] !== (int) $user['id']) {
            json_response(['message' => 'المحاولة غير موجودة.'], 404);
        }
        if ($attempt['status'] !== 'in_progress') {
            json_response(['message' => 'تم إرسال إجابات هذه المحاولة مسبقاً.'], 409);
        }
        $questions = student_fetch_attempt_questions($attemptId);
        $timedOut = (int) $attempt['time_limit_seconds'] > 0
            && time() >= strtotime((string) $attempt['started_at']) + (int) $attempt['time_limit_seconds'];
        $provided = $timedOut ? [] : ($input['answers'] ?? []);
        if (!is_array($provided)) {
            json_response(['message' => 'صيغة الإجابات غير صالحة.'], 422);
        }
        $answersById = [];
        foreach ($provided as $answer) {
            if (!is_array($answer) || !isset($answer['question_id'])) {
                json_response(['message' => 'إحدى الإجابات غير صالحة.'], 422);
            }
            $questionId = (int) $answer['question_id'];
            if (isset($answersById[$questionId])) {
                json_response(['message' => 'لا يمكن إرسال أكثر من إجابة للسؤال نفسه.'], 422);
            }
            $answersById[$questionId] = $answer;
        }
        $allowedIds = array_map(static fn(array $question): int => (int) $question['id'], $questions);
        if (array_diff(array_keys($answersById), $allowedIds) !== []) {
            json_response(['message' => 'تتضمن الإجابات سؤالاً لا ينتمي إلى هذه المحاولة.'], 422);
        }
        $score = 0;
        $results = [];
        $progressByLesson = [];
        foreach ($questions as $question) {
            $questionId = (int) $question['id'];
            $answer = $answersById[$questionId] ?? [];
            $selectedOptionId = isset($answer['option_id']) ? (int) $answer['option_id'] : null;
            $answerText = trim((string) ($answer['answer_text'] ?? ''));
            if ($question['question_type'] === 'multiple_choice' && $selectedOptionId !== null) {
                $selected = db_fetch_one(
                    'SELECT option_text FROM math_question_options WHERE id = ? AND question_id = ?',
                    [$selectedOptionId, $questionId]
                );
                if ($selected === null) {
                    $selectedOptionId = null;
                    $answerText = '';
                } else {
                    $answerText = (string) $selected['option_text'];
                }
            } else {
                $selectedOptionId = null;
            }
            if (mb_strlen($answerText) > 20000) {
                json_response(['message' => 'إحدى الإجابات أطول من الحد المسموح.'], 422);
            }
            $correct = math_answer_is_correct($question, $answer);
            $points = (int) ($question['points_override'] ?? $question['points']);
            $earned = $correct ? $points : 0;
            $score += $earned;
            db_execute(
                'INSERT INTO math_answers (attempt_id, question_id, selected_option_id, answer_text, is_correct, points_awarded)
                 VALUES (?, ?, ?, ?, ?, ?)',
                [$attemptId, $questionId, $selectedOptionId, $answerText, $correct ? 1 : 0, $earned]
            );
            $lesson = db_fetch_one('SELECT lesson_id FROM math_questions WHERE id = ?', [$questionId]);
            $lessonId = (int) $lesson['lesson_id'];
            $progressByLesson[$lessonId] ??= ['answered' => 0, 'correct' => 0, 'points' => 0];
            $progressByLesson[$lessonId]['answered']++;
            $progressByLesson[$lessonId]['correct'] += $correct ? 1 : 0;
            $progressByLesson[$lessonId]['points'] += $earned;
            $results[] = [
                'question_id' => $questionId,
                'is_correct' => $correct,
                'points_awarded' => $earned,
                'correct_answer' => $question['correct_answer'],
                'explanation' => $question['explanation'],
            ];
        }
        foreach ($progressByLesson as $lessonId => $lessonProgress) {
            db_execute(
                'INSERT INTO student_math_progress (student_id, lesson_id, questions_answered, correct_answers, points_earned)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   questions_answered = questions_answered + VALUES(questions_answered),
                   correct_answers = correct_answers + VALUES(correct_answers),
                   points_earned = points_earned + VALUES(points_earned)',
                [(int) $user['id'], (int) $lessonId, $lessonProgress['answered'], $lessonProgress['correct'], $lessonProgress['points']]
            );
        }
        db_execute(
            "UPDATE math_attempts SET status = 'submitted', score = ?, submitted_at = NOW() WHERE id = ?",
            [$score, $attemptId]
        );
        $db->commit();
        return ['score' => $score, 'max_score' => (int) (array_sum(array_map(
            static fn(array $question): int => (int) ($question['points_override'] ?? $question['points']),
            $questions
        ))), 'results' => $results, 'timed_out' => $timedOut];
    } catch (Throwable $error) {
        $db->rollback();
        throw $error;
    }
}

function student_handle_request(string $route, string $method, array $user): bool
{
    if ($route === 'student/dashboard' && $method === 'GET') {
        require_role(['student']);
        json_response(student_dashboard($user));
    }
    if ($route === 'student/attempts' && $method === 'POST') {
        require_role(['student']);
        require_csrf_token();
        json_response(student_start_attempt(request_data(), $user), 201);
    }
    if (preg_match('~^student/attempts/([1-9][0-9]*)/submit$~', $route, $matches) && $method === 'POST') {
        require_role(['student']);
        require_csrf_token();
        json_response(student_submit_attempt((int) $matches[1], request_data(), $user));
    }
    return false;
}
