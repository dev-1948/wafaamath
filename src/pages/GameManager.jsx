import { useEffect, useMemo, useState } from 'react';
import { Boxes, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import QuestionPicker from '../components/QuestionPicker.jsx';
import WorkspacePageHeader from '../components/WorkspacePageHeader.jsx';
import { deleteGame, getTeacherCurriculum, getTeacherGames, getTeacherQuestions, saveGame } from '../lib/api.js';

const gameTypes = [
  ['arithmetic_challenge', 'تحدي العمليات الحسابية', '➗'],
  ['equation_solver', 'حل المعادلات', '𝑥'],
  ['math_race', 'سباق الرياضيات', '🏁'],
  ['answer_hunt', 'صيد الإجابة الصحيحة', '🎯'],
  ['fractions_challenge', 'تحدي الكسور', '½'],
  ['math_memory', 'لعبة الذاكرة الرياضية', '◈'],
  ['question_wheel', 'عجلة الأسئلة', '◉'],
  ['math_treasure', 'كنز الرياضيات', '◇'],
  ['geometry_challenge', 'تحدي الهندسة', '△'],
  ['speed_test', 'اختبار السرعة', '⏱'],
];
const statusNames = { draft: 'مسودة', published: 'منشورة', archived: 'مؤرشفة' };
const emptyGame = () => ({ title: '', description: '', game_type: gameTypes[0][0], grade_id: '', lesson_id: '', status: 'draft', duration_minutes: 10, questions_per_game: 10, randomize: true, allow_retry: true });

export default function GameManager() {
  const [data, setData] = useState({ curriculum: null, games: [], questions: [] });
  const [form, setForm] = useState(emptyGame);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setError('');
    try {
      const [curriculum, games, questions] = await Promise.all([getTeacherCurriculum(), getTeacherGames(), getTeacherQuestions()]);
      setData({ curriculum, games, questions });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  const lessons = useMemo(() => (data.curriculum?.lessons || []).filter((lesson) => String(lesson.grade_id) === String(form.grade_id)), [data.curriculum, form.grade_id]);
  const chosenGame = gameTypes.find(([value]) => value === form.game_type);

  function reset() {
    setForm(emptyGame());
    setSelectedIds([]);
    setEditingId(null);
  }

  function edit(game) {
    setEditingId(Number(game.id));
    setForm({
      title: game.title,
      description: game.description || '',
      game_type: game.game_type,
      grade_id: game.grade_id ? String(game.grade_id) : '',
      lesson_id: game.lesson_id ? String(game.lesson_id) : '',
      status: game.status,
      duration_minutes: game.settings.duration_minutes ?? 10,
      questions_per_game: game.settings.questions_per_game ?? Number(game.question_count),
      randomize: Boolean(game.settings.randomize),
      allow_retry: Boolean(game.settings.allow_retry),
    });
    setSelectedIds(game.question_ids.map(String));
    setError('');
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      await saveGame({
        ...form,
        id: editingId,
        grade_id: form.grade_id ? Number(form.grade_id) : null,
        lesson_id: form.lesson_id ? Number(form.lesson_id) : null,
        duration_minutes: Number(form.duration_minutes),
        questions_per_game: Number(form.questions_per_game),
        randomize: form.randomize,
        allow_retry: form.allow_retry,
        question_ids: selectedIds.map(Number),
      });
      setNotice(editingId ? 'تم حفظ إعدادات اللعبة.' : 'تم إنشاء اللعبة.');
      reset();
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(game) {
    if (!window.confirm(`حذف لعبة «${game.title}»؟ إذا كانت لها محاولات سابقة، ستحتاجين إلى أرشفتها بدلاً من ذلك.`)) return;
    setError('');
    try {
      await deleteGame(game.id);
      setNotice('تم حذف اللعبة.');
      if (editingId === Number(game.id)) reset();
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="workspace-content">
      <WorkspacePageHeader eyebrow="Game Builder" title="منشئ الألعاب الرياضية" description="حوّلي أسئلتكِ إلى ألعاب تفاعلية جاهزة من دون كتابة أي كود." />
      {error && <p className="workspace-alert" role="alert">{error}</p>}
      {notice && <p className="workspace-success" role="status">{notice}</p>}
      <div className="game-builder-layout">
        <section className="workspace-panel editor-panel">
          <div className="panel-heading"><div><h2>{editingId ? 'تخصيص اللعبة' : 'إنشاء لعبة جديدة'}</h2><p>اختاري قالب اللعبة والأسئلة والوقت المناسب لطالباتكِ.</p></div><span className="panel-icon"><Boxes size={18} /></span></div>
          <form className="editor-form" onSubmit={submit}>
            <label className="workspace-field"><span>اسم اللعبة</span><input required maxLength="180" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="مثال: رحلة الأبطال في المعادلات" /></label>
            <div className="game-type-grid">{gameTypes.map(([value, label, icon]) => <button key={value} type="button" className={`game-type-option ${form.game_type === value ? 'selected' : ''}`} onClick={() => setForm({ ...form, game_type: value })}><span>{icon}</span><b>{label}</b></button>)}</div>
            <label className="workspace-field"><span>وصف وتعليمات اللعب</span><textarea rows="2" maxLength="10000" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="اكتبي تعليمات اللعبة لطالباتكِ" /></label>
            <div className="form-grid form-grid-two">
              <label className="workspace-field"><span>الصف المستهدف (اختياري)</span><select value={form.grade_id} onChange={(event) => setForm({ ...form, grade_id: event.target.value, lesson_id: '' })}><option value="">كل الصفوف المسجلة</option>{(data.curriculum?.grades || []).map((grade) => <option value={grade.id} key={grade.id}>{grade.name}</option>)}</select></label>
              <label className="workspace-field"><span>درس محدد (اختياري)</span><select value={form.lesson_id} onChange={(event) => setForm({ ...form, lesson_id: event.target.value })}><option value="">بدون تحديد درس</option>{lessons.map((lesson) => <option value={lesson.id} key={lesson.id}>{lesson.title}</option>)}</select></label>
            </div>
            <QuestionPicker questions={data.questions} selectedIds={selectedIds} onChange={setSelectedIds} gradeId={form.grade_id} />
            <div className="form-grid form-grid-three">
              <label className="workspace-field"><span>مدة اللعبة (دقيقة)</span><input type="number" min="1" max="180" value={form.duration_minutes} onChange={(event) => setForm({ ...form, duration_minutes: event.target.value })} /></label>
              <label className="workspace-field"><span>عدد الأسئلة في اللعبة</span><input type="number" min="1" max="250" value={form.questions_per_game} onChange={(event) => setForm({ ...form, questions_per_game: event.target.value })} /></label>
              <label className="workspace-field"><span>حالة اللعبة</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">مسودة</option><option value="published">منشورة</option><option value="archived">مؤرشفة</option></select></label>
            </div>
            <div className="game-settings">
              <label><input type="checkbox" checked={form.randomize} onChange={(event) => setForm({ ...form, randomize: event.target.checked })} /><span>ترتيب الأسئلة عشوائياً</span></label>
              <label><input type="checkbox" checked={form.allow_retry} onChange={(event) => setForm({ ...form, allow_retry: event.target.checked })} /><span>السماح بمحاولة جديدة</span></label>
            </div>
            <div className="game-selected-summary"><span className="game-selected-icon"><Sparkles size={16} /></span><span>{chosenGame?.[1]} · {selectedIds.length.toLocaleString('ar')} سؤال · {Number(form.duration_minutes).toLocaleString('ar')} دقيقة</span></div>
            <div className="editor-actions"><button className="button button-primary" disabled={saving}><Save size={16} />{saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التخصيص' : 'إنشاء اللعبة'}</button>{editingId && <button className="button button-outline" type="button" onClick={reset}><X size={15} />إلغاء</button>}</div>
          </form>
        </section>
        <section className="workspace-panel games-list-panel">
          <div className="panel-heading"><div><h2>ألعابكِ</h2><p>{data.games.length.toLocaleString('ar')} لعبة محفوظة</p></div><span className="panel-count">{data.games.length.toLocaleString('ar')}</span></div>
          {loading ? <div className="empty-inline">جارٍ تحميل الألعاب...</div> : data.games.length ? <div className="game-card-list">{data.games.map((game) => {
            const type = gameTypes.find(([value]) => value === game.game_type);
            return <article className="game-card" key={game.id}><div className="game-card-icon">{type?.[2]}</div><div className="game-card-copy"><div className="game-card-title"><b>{game.title}</b><span className={`status-pill status-${game.status}`}>{statusNames[game.status]}</span></div><p>{type?.[1]}{game.grade_name ? ` · ${game.grade_name}` : ''}</p><small>{Number(game.question_count).toLocaleString('ar')} سؤال · {Number(game.settings.duration_minutes || 0).toLocaleString('ar')} دقيقة</small></div><div className="card-actions"><button className="icon-button" aria-label="تعديل اللعبة" onClick={() => edit(game)}><Save size={15} /></button><button className="icon-button danger" aria-label="حذف اللعبة" onClick={() => remove(game)}><Trash2 size={15} /></button></div></article>;
          })}</div> : <div className="empty-state"><Boxes size={30} /><b>مساحة الألعاب جاهزة</b><span>اختاري قالباً وأضيفي أسئلتكِ لإنشاء أول لعبة.</span></div>}
        </section>
      </div>
    </div>
  );
}
