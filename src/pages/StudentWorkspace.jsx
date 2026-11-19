import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ArrowLeft, Award, BookOpenCheck, Check, Clock3, Crown, Gamepad2, GraduationCap, LogOut, RotateCw, Sparkles, Target, Trophy, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo.jsx';
import MathExpression from '../components/MathExpression.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { getStudentDashboard, signOut, startActivity, submitAttempt } from '../lib/api.js';
import WorkspacePageHeader from '../components/WorkspacePageHeader.jsx';

const gameNames = {
  arithmetic_challenge: 'تحدي العمليات الحسابية',
  equation_solver: 'حل المعادلات',
  math_race: 'سباق الرياضيات',
  answer_hunt: 'صيد الإجابة الصحيحة',
  fractions_challenge: 'تحدي الكسور',
  math_memory: 'الذاكرة الرياضية',
  question_wheel: 'عجلة الأسئلة',
  math_treasure: 'كنز الرياضيات',
  geometry_challenge: 'تحدي الهندسة',
  speed_test: 'اختبار السرعة',
};
const activityNames = { test: 'اختبار', homework: 'واجب', game: 'لعبة' };

function StudentHeader({ user, setUser }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  async function logout() {
    try {
      await signOut();
      setUser(null);
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  return (
    <header className="student-header">
      <Link to="/" className="workspace-brand"><BrandLogo /><span><b>وفاء عمرو</b><small>مساحة الطالبة</small></span></Link>
      <div className="student-header-right"><span className="student-greeting">مرحباً، {user.name}</span><Link className="student-home-link" to="/">الرئيسية</Link><ThemeToggle className="student-theme-toggle" /><button className="student-logout" onClick={logout}><LogOut size={15} /> خروج</button></div>
      {error && <span className="student-header-error" role="alert">{error}</span>}
    </header>
  );
}

function AttemptRunner({ activity, onClose, onFinished }) {
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const finishRef = useRef(null);
  const timeoutSubmitted = useRef(false);

  useEffect(() => {
    startActivity(activity.payload)
      .then((response) => {
        setAttempt(response);
        setSeconds(response.time_limit_seconds);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [activity.payload]);

  useEffect(() => {
    if (!attempt || result || seconds <= 0) return undefined;
    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [attempt, result, seconds > 0]);

  useEffect(() => {
    if (!attempt || result || seconds !== 0 || timeoutSubmitted.current) return;
    timeoutSubmitted.current = true;
    finishRef.current?.([]);
  }, [attempt, result, seconds]);

  const finish = useCallback(async (submittedAnswers) => {
    if (!attempt || submitting || result) return;
    setError('');
    setSubmitting(true);
    try {
      setResult(await submitAttempt(attempt.attempt_id, submittedAnswers));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }, [attempt, result, submitting]);

  finishRef.current = finish;

  function setAnswer(questionId, value) {
    setAnswers((current) => ({ ...current, [questionId]: { question_id: questionId, ...value } }));
  }

  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secondsPart = (seconds % 60).toString().padStart(2, '0');
  const resultById = new Map((result?.results || []).map((item) => [Number(item.question_id), item]));

  return (
    <AnimatePresence>
      <motion.div className="attempt-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.section className="attempt-panel" initial={{ y: 22, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 18, opacity: 0 }} role="dialog" aria-modal="true" aria-label="نشاط رياضي">
          <div className="attempt-heading"><div><span className="workspace-eyebrow">{activity.kind === 'game' ? gameNames[activity.name] : activityNames[activity.name]}</span><h2>{attempt?.title || activity.title}</h2></div><div className="attempt-controls">{!result && attempt && <span className={`attempt-timer ${seconds < 60 ? 'timer-warning' : ''}`}><Clock3 size={15} />{minutes}:{secondsPart}</span>}<button className="icon-button" onClick={() => attempt && !result ? finish(Object.values(answers)) : onClose()} aria-label={attempt && !result ? 'تسليم الإجابات والخروج' : 'إغلاق النشاط'}><X size={19} /></button></div></div>
          {error && <p className="workspace-alert" role="alert">{error}</p>}
          {loading && <div className="workspace-loading"><span className="loading-mark" />جارٍ تجهيز النشاط...</div>}
          {!loading && attempt && !result && <div className="attempt-questions">
            {attempt.questions.map((question, index) => (
              <article className="attempt-question" key={question.id}>
                <div className="attempt-question-meta"><span>السؤال {(index + 1).toLocaleString('ar')} / {attempt.questions.length.toLocaleString('ar')}</span><span>{Number(question.points).toLocaleString('ar')} نقطة</span></div>
                <div className="attempt-question-prompt"><MathExpression value={question.prompt} /></div>
                {question.image_path && <img className="question-image" src={`/media/questions/${encodeURIComponent(question.image_path)}`} alt="رسم توضيحي للسؤال" />}
                {question.question_type === 'multiple_choice' ? <div className="student-choice-list">{question.options.map((option) => <label className={`student-choice ${String(answers[question.id]?.option_id) === String(option.id) ? 'choice-selected' : ''}`} key={option.id}><input type="radio" name={`question-${question.id}`} checked={Number(answers[question.id]?.option_id) === Number(option.id)} onChange={() => setAnswer(question.id, { option_id: Number(option.id) })} /><span className="choice-radio" /><MathExpression value={option.text} /></label>)}</div>
                  : question.question_type === 'true_false' ? <div className="true-false-choices"><button type="button" className={answers[question.id]?.answer_text === 'true' ? 'choice-selected' : ''} onClick={() => setAnswer(question.id, { answer_text: 'true' })}>صحيح</button><button type="button" className={answers[question.id]?.answer_text === 'false' ? 'choice-selected' : ''} onClick={() => setAnswer(question.id, { answer_text: 'false' })}>خطأ</button></div>
                    : question.question_type === 'order_steps' ? <label className="workspace-field"><span>رتّبي خطوات الحل، كل خطوة في سطر</span><textarea rows="4" value={answers[question.id]?.answer_text || ''} onChange={(event) => setAnswer(question.id, { answer_text: event.target.value })} /></label>
                      : <label className="workspace-field"><span>{question.question_type === 'numeric' ? 'الإجابة الرقمية' : 'إجابتكِ'}</span><input value={answers[question.id]?.answer_text || ''} onChange={(event) => setAnswer(question.id, { answer_text: event.target.value })} placeholder="اكتبي إجابتكِ هنا" /></label>}
              </article>
            ))}
            <div className="attempt-submit-row"><span>تأكدي من إجاباتكِ قبل التسليم. عند انتهاء الوقت ستُصحح الإجابات غير المرسلة كإجابات خاطئة.</span><button className="button button-primary" disabled={submitting} onClick={() => finish(Object.values(answers))}>{submitting ? 'جارٍ التصحيح...' : 'تسليم الإجابات'} <ArrowLeft size={16} /></button></div>
          </div>}
          {result && <div className="attempt-result"><span className={`result-medal ${result.score === result.max_score ? 'perfect-score' : ''}`}>{result.score === result.max_score ? <Trophy size={30} /> : <Target size={29} />}</span><h3>{result.timed_out ? 'انتهى الوقت' : result.score === result.max_score ? 'أحسنتِ! إجابات رائعة' : 'أحسنتِ على المحاولة'}</h3><div className="result-score">{Number(result.score).toLocaleString('ar')} <small>/ {Number(result.max_score).toLocaleString('ar')} نقطة</small></div><div className="result-review">{attempt.questions.map((question) => { const item = resultById.get(Number(question.id)); return <article className={`result-review-item ${item?.is_correct ? 'answer-correct' : 'answer-wrong'}`} key={question.id}><span className="review-state">{item?.is_correct ? <Check size={17} /> : <X size={17} />}</span><div><b><MathExpression value={question.prompt} /></b>{!item?.is_correct && item?.correct_answer && <small>الإجابة الصحيحة: <MathExpression value={item.correct_answer} /></small>}{item?.explanation && <p><MathExpression value={item.explanation} /></p>}</div></article>; })}</div><div className="attempt-submit-row"><span>حُفظت درجتكِ وتقدمكِ تلقائياً.</span><button className="button button-primary" onClick={onFinished}>العودة إلى مساحتي <ArrowLeft size={16} /></button></div></div>}
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}

function ActivityCard({ item, kind, onStart }) {
  const title = kind === 'game' ? gameNames[item.game_type] : activityNames[item.assessment_type];
  const disabled = Number(item.question_count) < 1 || (kind === 'game' && !item.settings.allow_retry && Number(item.attempts_count) > 0);
  const due = item.due_at ? new Date(`${item.due_at.replace(' ', 'T')}Z`).toLocaleDateString('ar', { dateStyle: 'medium' }) : null;
  return (
    <motion.article className="student-activity-card" whileHover={{ y: -3 }}>
      <span className={`student-activity-icon ${kind}`}><span>{kind === 'game' ? '✳' : item.assessment_type === 'test' ? '✓' : '✎'}</span></span>
      <span className="student-activity-type">{title}{item.grade_name ? ` · ${item.grade_name}` : ''}</span>
      <h3>{item.title}</h3>
      {item.description && <p>{item.description}</p>}
      {item.instructions && <p>{item.instructions}</p>}
      <div className="activity-card-meta"><span><BookOpenCheck size={14} />{Number(item.question_count).toLocaleString('ar')} سؤال</span>{due && <span><Clock3 size={14} />{due}</span>}</div>
      {kind === 'game' && item.settings.duration_minutes && <div className="activity-card-meta"><span><Clock3 size={14} />{Number(item.settings.duration_minutes).toLocaleString('ar')} دقيقة</span></div>}
      {kind === 'game' && Number(item.attempts_count) > 0 && <span className="attempts-note">{Number(item.attempts_count).toLocaleString('ar')} محاولة سابقة</span>}
      <button className="button button-primary student-start-button" disabled={disabled} onClick={() => onStart(kind, item)}>{disabled ? (item.question_count ? 'اكتملت المحاولة' : 'لا توجد أسئلة متاحة') : kind === 'game' ? 'ابدئي اللعب' : 'ابدئي الحل'} <ArrowLeft size={15} /></button>
    </motion.article>
  );
}

export default function StudentWorkspace({ user, setUser }) {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('games');
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setError('');
    try {
      setData(await getStudentDashboard());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function begin(kind, item) {
    setError('');
    setActivity({
      kind,
      title: item.title,
      name: kind === 'game' ? item.game_type : item.assessment_type,
      payload: kind === 'game' ? { game_id: Number(item.id) } : { assessment_id: Number(item.id) },
    });
  }

  const completed = useCallback(async () => {
    setActivity(null);
    await load();
  }, []);

  const rank = data?.summary.rank;

  return (
    <div className="student-workspace">
      <StudentHeader user={user} setUser={setUser} />
      <main className="student-main">
        <div className="student-welcome-banner"><div className="welcome-math math-one">π</div><div className="welcome-math math-two">√</div><div className="welcome-math math-three">x²</div><div><span className="student-welcome-eyebrow"><Sparkles size={14} /> رحلتكِ في عالم الرياضيات</span><h1>أهلاً بكِ، {user.name.split(' ')[0]}!</h1><p>كل مسألة تحلينها تقرّبكِ من هدفكِ. تابعي التقدم وابدئي نشاطاً جديداً.</p></div><span className="welcome-badge"><GraduationCap size={31} /></span></div>
        <WorkspacePageHeader eyebrow="ملخص تعلمكِ" title="مساحتي التعليمية" description="نتائجكِ وتقدمكِ تظهر هنا من أنشطتكِ المسجلة." action={<button className="button button-outline" onClick={load} disabled={loading}><RotateCw size={15} /> تحديث</button>} />
        {error && <p className="workspace-alert" role="alert">{error}</p>}
        {loading && !data ? <div className="workspace-loading"><span className="loading-mark" />جارٍ تحميل مساحتكِ التعليمية...</div> : data && <>
          <div className="student-metric-grid">
            <article className="student-metric"><span className="student-metric-icon purple"><Award size={20} /></span><span>نقاطي</span><b>{Number(data.summary.points).toLocaleString('ar')}</b><small>نقاط من أنشطتكِ المكتملة</small></article>
            <article className="student-metric"><span className="student-metric-icon cyan"><Sparkles size={20} /></span><span>مستواي</span><b>{Number(data.summary.level).toLocaleString('ar')}</b><small>يزداد مع النقاط المكتسبة</small></article>
            <article className="student-metric"><span className="student-metric-icon pink"><Activity size={20} /></span><span>متوسط أدائي</span><b>{data.summary.average_score === null ? '—' : `${Number(data.summary.average_score).toLocaleString('ar')}٪`}</b><small>{data.summary.average_score === null ? 'ابدئي أول نشاط لتسجيل نتيجتكِ' : 'من محاولاتكِ المكتملة'}</small></article>
            <article className="student-metric"><span className="student-metric-icon gold"><Crown size={20} /></span><span>ترتيبي</span><b>{rank ? `#${Number(rank).toLocaleString('ar')}` : '—'}</b><small>بين حسابات الطالبات المسجلة</small></article>
          </div>

          <section className="student-section">
            <div className="student-tabs" role="tablist" aria-label="أنشطتي"><button className={activeTab === 'games' ? 'active' : ''} onClick={() => setActiveTab('games')}><Gamepad2 size={16} />ألعابي <b>{data.games.length.toLocaleString('ar')}</b></button><button className={activeTab === 'homework' ? 'active' : ''} onClick={() => setActiveTab('homework')}><BookOpenCheck size={16} />واجباتي <b>{data.assessments.filter((item) => item.assessment_type === 'homework').length.toLocaleString('ar')}</b></button><button className={activeTab === 'tests' ? 'active' : ''} onClick={() => setActiveTab('tests')}><Target size={16} />اختباراتي <b>{data.assessments.filter((item) => item.assessment_type === 'test').length.toLocaleString('ar')}</b></button></div>
            <div className="student-activity-grid">
              {(activeTab === 'games' ? data.games : data.assessments.filter((item) => item.assessment_type === (activeTab === 'tests' ? 'test' : 'homework'))).map((item) => <ActivityCard key={`${activeTab}-${item.id}`} item={item} kind={activeTab === 'games' ? 'game' : 'assessment'} onStart={begin} />)}
              {(activeTab === 'games' ? data.games : data.assessments.filter((item) => item.assessment_type === (activeTab === 'tests' ? 'test' : 'homework'))).length === 0 && <div className="student-empty"><span className="student-empty-icon"><BookOpenCheck size={25} /></span><b>لا توجد أنشطة متاحة هنا الآن</b><p>عندما تضيف المعلمة أنشطة إلى مجموعتكِ ستظهر هنا تلقائياً.</p></div>}
            </div>
          </section>

          <div className="student-details-grid">
            <section className="workspace-panel student-progress-panel"><div className="panel-heading"><div><h2>تقدمي في الدروس</h2><p>نسبة الأسئلة التي أجبتِ عنها من أسئلة الدرس المتاحة</p></div><span className="panel-icon"><Activity size={18} /></span></div>{data.progress.length ? <div className="lesson-progress-list">{data.progress.map((lesson) => <article key={lesson.lesson_id}><div className="lesson-progress-info"><span><b>{lesson.lesson_title}</b><small>{lesson.grade_name} · {lesson.unit_title}</small></span><b>{Number(lesson.progress_percent).toLocaleString('ar')}٪</b></div><div className="lesson-progress-track"><span style={{ width: `${lesson.progress_percent}%` }} /></div><small className="lesson-accuracy">{Number(lesson.questions_answered).toLocaleString('ar')} من {Number(lesson.total_questions).toLocaleString('ar')} سؤال · {lesson.accuracy_percent === null ? 'لم تسجّل إجابات بعد' : `دقة ${Number(lesson.accuracy_percent).toLocaleString('ar')}٪`}</small></article>)}</div> : <div className="empty-inline">ستظهر الدروس بعد تسجيلكِ في مجموعة صفية وإضافة المعلمة أسئلة لهذا المنهج.</div>}</section>
            <section className="workspace-panel student-leader-panel"><div className="panel-heading"><div><h2>لوحة الشرف</h2><p>الترتيب حسب النقاط الفعلية</p></div><span className="panel-icon"><Trophy size={18} /></span></div>{data.leaders.length ? <ol className="leader-list">{data.leaders.map((student) => <li key={student.id} className={Number(student.id) === Number(user.id) ? 'current-student' : ''}><span className={`leader-rank rank-${student.rank}`}>{Number(student.rank).toLocaleString('ar')}</span><span className="leader-name">{student.name}{Number(student.id) === Number(user.id) && <small>أنتِ</small>}</span><span className="leader-points">{Number(student.points).toLocaleString('ar')} نقطة</span></li>)}</ol> : <div className="empty-inline">ستظهر لوحة الشرف بعد تسجيل طالبات في المنصة.</div>}</section>
          </div>

          <div className="student-details-grid">
            <section className="workspace-panel"><div className="panel-heading"><div><h2>آخر النتائج</h2><p>محاولاتكِ المكتملة</p></div><span className="panel-icon"><Target size={18} /></span></div>{data.recent_attempts.length ? <div className="recent-results">{data.recent_attempts.map((item) => <article key={item.id}><span className="result-type-icon"><Check size={16} /></span><span><b>{item.title}</b><small>{activityNames[item.activity_type] || item.activity_type} · {item.submitted_at ? new Date(`${item.submitted_at.replace(' ', 'T')}Z`).toLocaleDateString('ar') : ''}</small></span><strong>{Number(item.score).toLocaleString('ar')} / {Number(item.max_score).toLocaleString('ar')}</strong></article>)}</div> : <div className="empty-inline">لم تكملي أي نشاط بعد. ابدئي بأول لعبة لتحفظ درجتكِ هنا.</div>}</section>
            <section className="workspace-panel"><div className="panel-heading"><div><h2>أسئلة أراجعها</h2><p>إجابات خاطئة سابقة مع الحل والشرح</p></div><span className="panel-icon"><RotateCw size={17} /></span></div>{data.mistakes.length ? <div className="mistake-list">{data.mistakes.map((item, index) => <article key={`${item.question_id}-${item.answered_at}-${index}`}><span><MathExpression value={item.prompt} /></span><small>{item.activity_title ? `من: ${item.activity_title}` : ''}{item.selected_option ? ` · إجابتكِ: ${item.selected_option}` : item.answer_text ? ` · إجابتكِ: ${item.answer_text}` : ''}</small><b>الإجابة الصحيحة: <MathExpression value={item.correct_answer || ''} /></b>{item.explanation && <p><MathExpression value={item.explanation} /></p>}</article>)}</div> : <div className="empty-inline">لا توجد إجابات خاطئة محفوظة. أحسنتِ!</div>}</section>
          </div>
        </>}
        <footer className="student-footer">منصة وفاء عمرو التعليمية · خطوة جديدة نحو التميز في الرياضيات</footer>
      </main>
      {activity && <AttemptRunner activity={activity} onClose={() => setActivity(null)} onFinished={completed} />}
    </div>
  );
}
