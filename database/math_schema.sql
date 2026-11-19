USE wafaa_db;

INSERT IGNORE INTO roles (name, label) VALUES ('teacher', 'معلمة');

CREATE TABLE IF NOT EXISTS grades (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_grades_teacher_name (teacher_id, name),
  KEY idx_grades_teacher_order (teacher_id, sort_order),
  CONSTRAINT fk_grades_teacher FOREIGN KEY (teacher_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  grade_id BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  academic_year VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_classes_teacher_grade_name (teacher_id, grade_id, name),
  KEY idx_classes_grade (grade_id),
  KEY idx_classes_teacher (teacher_id),
  CONSTRAINT fk_classes_grade FOREIGN KEY (grade_id) REFERENCES grades (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS math_subjects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  grade_id BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL DEFAULT 'الرياضيات',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_math_subjects_teacher_grade_name (teacher_id, grade_id, name),
  KEY idx_math_subjects_grade (grade_id),
  CONSTRAINT fk_math_subjects_grade FOREIGN KEY (grade_id) REFERENCES grades (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_math_subjects_teacher FOREIGN KEY (teacher_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS math_units (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_math_units_subject_title (subject_id, title),
  KEY idx_math_units_subject_order (subject_id, sort_order),
  CONSTRAINT fk_math_units_subject FOREIGN KEY (subject_id) REFERENCES math_subjects (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS math_lessons (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unit_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  content MEDIUMTEXT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_math_lessons_unit_title (unit_id, title),
  KEY idx_math_lessons_unit_order (unit_id, sort_order),
  CONSTRAINT fk_math_lessons_unit FOREIGN KEY (unit_id) REFERENCES math_units (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS math_skills (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lesson_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_math_skills_lesson_name (lesson_id, name),
  KEY idx_math_skills_lesson (lesson_id),
  CONSTRAINT fk_math_skills_lesson FOREIGN KEY (lesson_id) REFERENCES math_lessons (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_students (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NOT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_class_students_pair (class_id, student_id),
  KEY idx_class_students_student (student_id),
  CONSTRAINT fk_class_students_class FOREIGN KEY (class_id) REFERENCES classes (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_class_students_student FOREIGN KEY (student_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_class_students_assigned_by FOREIGN KEY (assigned_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS math_questions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id BIGINT UNSIGNED NOT NULL,
  grade_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  lesson_id BIGINT UNSIGNED NOT NULL,
  skill_id BIGINT UNSIGNED NULL,
  question_type ENUM('multiple_choice','true_false','numeric','equation','order_steps','fill_blank') NOT NULL,
  difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  prompt MEDIUMTEXT NOT NULL,
  image_path VARCHAR(255) NULL,
  correct_answer MEDIUMTEXT NULL,
  explanation MEDIUMTEXT NULL,
  points SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  time_limit_seconds SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_questions_teacher_active (teacher_id, is_active, created_at),
  KEY idx_questions_grade_unit_lesson (grade_id, unit_id, lesson_id),
  KEY idx_questions_type_difficulty (question_type, difficulty),
  CONSTRAINT fk_questions_teacher FOREIGN KEY (teacher_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_questions_grade FOREIGN KEY (grade_id) REFERENCES grades (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_questions_unit FOREIGN KEY (unit_id) REFERENCES math_units (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_questions_lesson FOREIGN KEY (lesson_id) REFERENCES math_lessons (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_questions_skill FOREIGN KEY (skill_id) REFERENCES math_skills (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS math_question_options (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id BIGINT UNSIGNED NOT NULL,
  option_text MEDIUMTEXT NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_question_options_question_order (question_id, sort_order),
  CONSTRAINT fk_question_options_question FOREIGN KEY (question_id) REFERENCES math_questions (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS math_games (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id BIGINT UNSIGNED NOT NULL,
  grade_id BIGINT UNSIGNED NULL,
  lesson_id BIGINT UNSIGNED NULL,
  game_type ENUM('arithmetic_challenge','equation_solver','math_race','answer_hunt','fractions_challenge','math_memory','question_wheel','math_treasure','geometry_challenge','speed_test') NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  settings JSON NOT NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_games_teacher_status (teacher_id, status),
  KEY idx_games_grade_status (grade_id, status),
  CONSTRAINT fk_games_teacher FOREIGN KEY (teacher_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_games_grade FOREIGN KEY (grade_id) REFERENCES grades (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_games_lesson FOREIGN KEY (lesson_id) REFERENCES math_lessons (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS math_game_questions (
  game_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  points_override SMALLINT UNSIGNED NULL,
  PRIMARY KEY (game_id, question_id),
  UNIQUE KEY uq_game_question_order (game_id, sort_order),
  KEY idx_game_questions_question (question_id),
  CONSTRAINT fk_game_questions_game FOREIGN KEY (game_id) REFERENCES math_games (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_game_questions_question FOREIGN KEY (question_id) REFERENCES math_questions (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS math_assessments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id BIGINT UNSIGNED NOT NULL,
  grade_id BIGINT UNSIGNED NOT NULL,
  class_id BIGINT UNSIGNED NULL,
  assessment_type ENUM('homework','test') NOT NULL,
  title VARCHAR(180) NOT NULL,
  instructions TEXT NULL,
  due_at DATETIME NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_assessments_teacher_status (teacher_id, status),
  KEY idx_assessments_class_type (class_id, assessment_type, status),
  CONSTRAINT fk_assessments_teacher FOREIGN KEY (teacher_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_assessments_grade FOREIGN KEY (grade_id) REFERENCES grades (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_assessments_class FOREIGN KEY (class_id) REFERENCES classes (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS math_assessment_questions (
  assessment_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  points_override SMALLINT UNSIGNED NULL,
  PRIMARY KEY (assessment_id, question_id),
  UNIQUE KEY uq_assessment_question_order (assessment_id, sort_order),
  KEY idx_assessment_questions_question (question_id),
  CONSTRAINT fk_assessment_questions_assessment FOREIGN KEY (assessment_id) REFERENCES math_assessments (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_assessment_questions_question FOREIGN KEY (question_id) REFERENCES math_questions (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS math_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  game_id BIGINT UNSIGNED NULL,
  assessment_id BIGINT UNSIGNED NULL,
  status ENUM('in_progress','submitted') NOT NULL DEFAULT 'in_progress',
  score DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_score DECIMAL(10,2) NOT NULL DEFAULT 0,
  time_limit_seconds SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_attempts_student_status_date (student_id, status, submitted_at),
  KEY idx_attempts_game (game_id, status),
  KEY idx_attempts_assessment (assessment_id, status),
  CONSTRAINT fk_attempts_student FOREIGN KEY (student_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attempts_game FOREIGN KEY (game_id) REFERENCES math_games (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attempts_assessment FOREIGN KEY (assessment_id) REFERENCES math_assessments (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE math_attempts
  ADD COLUMN IF NOT EXISTS time_limit_seconds SMALLINT UNSIGNED NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS math_attempt_questions (
  attempt_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  points SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (attempt_id, question_id),
  UNIQUE KEY uq_attempt_question_order (attempt_id, sort_order),
  KEY idx_attempt_questions_question (question_id),
  CONSTRAINT fk_attempt_questions_attempt FOREIGN KEY (attempt_id) REFERENCES math_attempts (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attempt_questions_question FOREIGN KEY (question_id) REFERENCES math_questions (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS math_answers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  selected_option_id BIGINT UNSIGNED NULL,
  answer_text MEDIUMTEXT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  points_awarded DECIMAL(10,2) NOT NULL DEFAULT 0,
  answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_math_answers_attempt_question (attempt_id, question_id),
  KEY idx_math_answers_question_correct (question_id, is_correct),
  CONSTRAINT fk_math_answers_attempt FOREIGN KEY (attempt_id) REFERENCES math_attempts (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_math_answers_question FOREIGN KEY (question_id) REFERENCES math_questions (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_math_answers_option FOREIGN KEY (selected_option_id) REFERENCES math_question_options (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_math_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  lesson_id BIGINT UNSIGNED NOT NULL,
  questions_answered INT UNSIGNED NOT NULL DEFAULT 0,
  correct_answers INT UNSIGNED NOT NULL DEFAULT 0,
  points_earned BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_math_progress_pair (student_id, lesson_id),
  KEY idx_student_progress_lesson (lesson_id),
  CONSTRAINT fk_student_progress_student FOREIGN KEY (student_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_student_progress_lesson FOREIGN KEY (lesson_id) REFERENCES math_lessons (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS homepage_settings (
  id TINYINT UNSIGNED NOT NULL,
  hero_badge VARCHAR(120) NOT NULL,
  hero_title VARCHAR(180) NOT NULL,
  hero_emphasis VARCHAR(180) NOT NULL,
  hero_description TEXT NOT NULL,
  hero_cta VARCHAR(100) NOT NULL,
  about_badge VARCHAR(120) NOT NULL,
  about_title VARCHAR(180) NOT NULL,
  about_emphasis VARCHAR(180) NOT NULL,
  about_description TEXT NOT NULL,
  feature_one_title VARCHAR(120) NOT NULL,
  feature_one_description TEXT NOT NULL,
  feature_two_title VARCHAR(120) NOT NULL,
  feature_two_description TEXT NOT NULL,
  feature_three_title VARCHAR(120) NOT NULL,
  feature_three_description TEXT NOT NULL,
  banner_badge VARCHAR(120) NOT NULL,
  banner_title VARCHAR(180) NOT NULL,
  banner_emphasis VARCHAR(180) NOT NULL,
  banner_description TEXT NOT NULL,
  banner_cta VARCHAR(100) NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_homepage_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO homepage_settings (
  id, hero_badge, hero_title, hero_emphasis, hero_description, hero_cta,
  about_badge, about_title, about_emphasis, about_description,
  feature_one_title, feature_one_description,
  feature_two_title, feature_two_description,
  feature_three_title, feature_three_description,
  banner_badge, banner_title, banner_emphasis, banner_description, banner_cta
) VALUES (
  1, 'بداية جديدة، وإنجاز أقرب', 'تعلّمي اليوم،', 'وتألّقي غداً.',
  'رحلتك التعليمية تبدأ بخطوة. اكتشفي تجربة تعلّم ملهمة تساعدك على بناء المعرفة وتحقيق طموحك، على طريقتك.',
  'ابدئي رحلتك الآن', 'لأن طموحك يستحق', 'تعلّم أجمل،', 'وإنجاز أكبر',
  'كل ما تحتاجينه لتبدئي بثقة وتواصلي التقدّم.',
  'تعلّم يناسبك', 'محتوى تعليمي واضح، صُمّم ليقربك من أهدافك خطوة بخطوة.',
  'مسار مرتب', 'ابدأ من الأساسيات، وتقدّم بثقة ضمن رحلة تعليمية منظمة.',
  'دعم مستمر', 'مساحة مشجعة تحترم وقتك وتحتفي بكل إنجاز تحققه.',
  'مستعدة للخطوة الأولى؟', 'مستقبلك يبدأ', 'من هنا.',
  'انضمي إلينا وابدئي ببناء رحلة تعليمية تشبه طموحك.',
  'أنشئي حسابك مجاناً'
);

CREATE TABLE IF NOT EXISTS homepage_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  created_by BIGINT UNSIGNED NOT NULL,
  content_type ENUM('post', 'project') NOT NULL,
  title VARCHAR(180) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  body MEDIUMTEXT NULL,
  destination_url VARCHAR(1000) NULL,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_homepage_items_public (status, content_type, published_at),
  KEY idx_homepage_items_creator (created_by, status, created_at),
  CONSTRAINT fk_homepage_items_creator FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
