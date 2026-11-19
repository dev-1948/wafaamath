import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpenCheck, Check, ImagePlus, Plus, Save, Trash2, X } from 'lucide-react';
import MathExpression from '../components/MathExpression.jsx';
import WorkspacePageHeader from '../components/WorkspacePageHeader.jsx';
import {
  deleteQuestion,
  getTeacherCurriculum,
  getTeacherQuestions,
  saveQuestion,
  uploadQuestionImage,
} from '../lib/api.js';

const questionTypes = [
  ['multiple_choice', 'اختيار من متعدد'],
  ['true_false', 'صح أو خطأ'],
  ['numeric', 'إجابة رقمية'],
  ['equation', 'حل معادلة'],
  ['order_steps', 'ترتيب خطوات الحل'],
  ['fill_blank', 'إكمال الفراغ'],
];
const difficultyNames = { easy: 'سهل', medium: 'متوسط', hard: 'متقدم' };
const emptyQuestion = () => ({
  grade_id: '',
  unit_id: '',
  lesson_id: '',
  skill_id: '',
  question_type: 'multiple_choice',
  difficulty: 'medium',
  prompt: '',
  correct_answer: '',
  explanation: '',
  points: 1,
  time_limit_seconds: 60,
  options: [{ text: '', is_correct: true }, { text: '', is_correct: false }],
});

function OptionEditor({ options, onChange }) {
  function updateOption(index, patch) {
    onChange(options.map((option, optionIndex) => ({
      ...option,
      ...(optionIndex === index ? patch : {}),
      ...(patch.is_correct && optionIndex !== index ? { is_correct: false } : {}),
    })));
  }

  return (
    <div className="question-options-editor">
      {options.map((option, index) => (
        <div className="question-option-row" key={index}>
          <label className="correct-radio" title="تحديد الإجابة الصحيحة">
            <input type="radio" name="correct-option" checked={Boolean(option.is_correct)} onChange={() => updateOption(index, { is_correct: true })} />
            <span />
          </label>
          <input value={option.text} onChange={(event) => updateOption(index, { text: event.target.value })} placeholder={`الخيار ${index + 1}`} maxLength={1000} required />
          {options.length > 2 && <button className="icon-button danger" type="button" onClick={() => onChange(options.filter((_, optionIndex) => optionIndex !== index))} aria-label={`حذف الخيار ${index + 1}`}><X size={15} /></button>}
        </div>
      ))}
      {options.length < 8 && <button className="add-option-button" type="button" onClick={() => onChange([...options, { text: '', is_correct: false }])}><Plus size={15} /> إضافة خيار</button>}
      <small className="field-hint">اختاري الدائرة بجانب الخيار الصحيح.</small>
    </div>
  );
}

export default function QuestionManager() {
  const [curriculum, setCurriculum] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyQuestion);
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setError('');
    try {
      const [curriculumResult, questionResult] = await Promise.all([getTeacherCurriculum(), getTeacherQuestions()]);
      setCurriculum(curriculumResult);
      setQuestions(questionResult);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const units = useMemo(() => (curriculum?.units || []).filter((item) => String(item.grade_id) === String(form.grade_id)), [curriculum, form.grade_id]);
  const lessons = useMemo(() => (curriculum?.lessons || []).filter((item) => String(item.unit_id) === String(form.unit_id)), [curriculum, form.unit_id]);
  const skills = useMemo(() => (curriculum?.skills || []).filter((item) => String(item.lesson_id) === String(form.lesson_id)), [curriculum, form.lesson_id]);

  function resetForm() {
    setForm(emptyQuestion());
    setImageFile(null);
    setEditingId(null);
  }

  function editQuestion(question) {
    setEditingId(Number(question.id));
    setImageFile(null);
    setForm({
      grade_id: String(question.grade_id),
      unit_id: String(question.unit_id),
      lesson_id: String(question.lesson_id),
      skill_id: question.skill_id ? String(question.skill_id) : '',
      question_type: question.question_type,
      difficulty: question.difficulty,
      prompt: question.prompt,
      correct_answer: question.correct_answer || '',
      explanation: question.explanation || '',
      points: question.points,
      time_limit_seconds: question.time_limit_seconds,
      options: question.options.map((option) => ({ text: option.text, is_correct: Number(option.is_correct) === 1 })),
    });
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const saved = await saveQuestion({
        ...form,
        id: editingId,
        grade_id: Number(form.grade_id),
        unit_id: Number(form.unit_id),
        lesson_id: Number(form.lesson_id),
        skill_id: form.skill_id ? Number(form.skill_id) : null,
        points: Number(form.points),
        time_limit_seconds: Number(form.time_limit_seconds),
      });
      if (imageFile) {
        await uploadQuestionImage(saved.id, imageFile);
      }
      setNotice(editingId ? 'حُدّث السؤال بنجاح.' : 'أُضيف السؤال إلى بنك الأسئلة.');
      resetForm();
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(question) {
    if (!window.confirm('سيُخفى السؤال من بنك الأسئلة مع الاحتفاظ بنتائجه السابقة. متابعة؟')) return;
    setError('');
    setNotice('');
    try {
      await deleteQuestion(question.id);
      setNotice('حُذف السؤال من البنك مع الاحتفاظ بالسجل التاريخي.');
      if (editingId === Number(question.id)) resetForm();
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="workspace-content">
      <WorkspacePageHeader eyebrow="إدارة المحتوى" title="بنك الأسئلة الرياضية" description="أنشئي أسئلة مرتبطة بصفوفكِ ودروسكِ، مع إجابة وشرح وحساب تلقائي للدرجات." />
      {error && <p className="workspace-alert" role="alert">{error}</p>}
      {notice && <p className="workspace-success" role="status">{notice}</p>}
      {!curriculum?.grades?.length && !loading && <p className="workspace-alert">أضيفي صفاً ووحدة ودرساً أولاً من صفحة الصفوف والدروس قبل إنشاء الأسئلة.</p>}

      <section className="workspace-panel editor-panel">
        <div className="panel-heading"><div><h2>{editingId ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</h2><p>يمكنكِ استخدام LaTeX بكتابة الصيغة بين <code>$...$</code> أو <code>$$...$$</code>.</p></div><span className="panel-icon"><BookOpenCheck size={18} /></span></div>
        <form className="editor-form" onSubmit={handleSubmit}>
          <div className="form-grid form-grid-three">
            <label className="workspace-field"><span>الصف الدراسي</span><select required value={form.grade_id} onChange={(event) => setForm({ ...form, grade_id: event.target.value, unit_id: '', lesson_id: '', skill_id: '' })}><option value="">اختاري الصف</option>{(curriculum?.grades || []).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label className="workspace-field"><span>الوحدة</span><select required value={form.unit_id} onChange={(event) => setForm({ ...form, unit_id: event.target.value, lesson_id: '', skill_id: '' })}><option value="">اختاري الوحدة</option>{units.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
            <label className="workspace-field"><span>الدرس</span><select required value={form.lesson_id} onChange={(event) => setForm({ ...form, lesson_id: event.target.value, skill_id: '' })}><option value="">اختاري الدرس</option>{lessons.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
          </div>
          <div className="form-grid form-grid-three">
            <label className="workspace-field"><span>المهارة الرياضية</span><select value={form.skill_id} onChange={(event) => setForm({ ...form, skill_id: event.target.value })}><option value="">بدون تحديد مهارة</option>{skills.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label className="workspace-field"><span>نوع السؤال</span><select value={form.question_type} onChange={(event) => setForm({ ...form, question_type: event.target.value })}>{questionTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="workspace-field"><span>مستوى الصعوبة</span><select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })}><option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">متقدم</option></select></label>
          </div>
          <label className="workspace-field"><span>نص السؤال</span><textarea rows="3" maxLength="10000" required value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} placeholder="اكتبي السؤال، واستخدمي مثلاً: $$2x + 5 = 15$$" /></label>
          {form.prompt && <div className="math-preview"><small>معاينة السؤال</small><MathExpression value={form.prompt} /></div>}

          {form.question_type === 'multiple_choice' ? (
            <fieldset className="workspace-fieldset"><legend>خيارات الإجابة</legend><OptionEditor options={form.options} onChange={(options) => setForm({ ...form, options })} /></fieldset>
          ) : form.question_type === 'true_false' ? (
            <label className="workspace-field"><span>الإجابة الصحيحة</span><select required value={form.correct_answer} onChange={(event) => setForm({ ...form, correct_answer: event.target.value })}><option value="">حدّدي الإجابة</option><option value="true">صحيح</option><option value="false">خطأ</option></select></label>
          ) : (
            <label className="workspace-field"><span>{form.question_type === 'order_steps' ? 'خطوات الحل بالترتيب (كل خطوة في سطر)' : 'الإجابة الصحيحة'}</span><textarea rows={form.question_type === 'order_steps' ? 4 : 2} required value={form.correct_answer} onChange={(event) => setForm({ ...form, correct_answer: event.target.value })} placeholder={form.question_type === 'order_steps' ? 'الخطوة الأولى\nالخطوة الثانية' : 'اكتبي الإجابة التي سيقارن بها الخادم'} /></label>
          )}
          <label className="workspace-field"><span>شرح الحل</span><textarea rows="2" maxLength="20000" value={form.explanation} onChange={(event) => setForm({ ...form, explanation: event.target.value })} placeholder="شرح اختياري يظهر للطالبة بعد التسليم" /></label>
          <div className="form-grid form-grid-three">
            <label className="workspace-field"><span>النقاط</span><input type="number" min="1" max="10000" value={form.points} onChange={(event) => setForm({ ...form, points: event.target.value })} required /></label>
            <label className="workspace-field"><span>الوقت (ثانية)</span><input type="number" min="5" max="3600" value={form.time_limit_seconds} onChange={(event) => setForm({ ...form, time_limit_seconds: event.target.value })} required /></label>
            <label className="workspace-field"><span>صورة توضيحية (اختيارية)</span><span className="file-input-shell"><ImagePlus size={17} /><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />{imageFile?.name || 'PNG أو JPG أو WEBP، حتى 5 MB'}</span></label>
          </div>
          {editingId && questions.find((question) => Number(question.id) === editingId)?.image_path && <div className="current-image"><img src={`/media/questions/${encodeURIComponent(questions.find((question) => Number(question.id) === editingId).image_path)}`} alt="الصورة التوضيحية الحالية" /><span>الصورة الحالية — اختاري صورة أخرى لاستبدالها.</span></div>}
          <div className="editor-actions"><button className="button button-primary" type="submit" disabled={saving || !curriculum?.grades?.length}><Save size={16} />{saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة السؤال'}</button>{editingId && <button className="button button-outline" type="button" onClick={resetForm}><X size={16} />إلغاء التعديل</button>}</div>
        </form>
      </section>

      <section className="workspace-panel question-bank-panel">
        <div className="panel-heading"><div><h2>الأسئلة المحفوظة</h2><p>{questions.length.toLocaleString('ar')} سؤال في بنككِ</p></div><span className="panel-count">{questions.length.toLocaleString('ar')}</span></div>
        {loading ? <div className="empty-inline">جارٍ تحميل الأسئلة...</div> : questions.length === 0 ? <div className="empty-state"><BookOpenCheck size={30} /><b>البنك جاهز لسؤالك الأول</b><span>ستظهر الأسئلة التي تضيفينها هنا.</span></div> : (
          <div className="question-list">{questions.map((question) => (
            <motion.article className="question-card" key={question.id} layout>
              <div className="question-card-top"><div className="question-tags"><span className="tag tag-purple">{questionTypes.find(([value]) => value === question.question_type)?.[1]}</span><span className={`tag tag-${question.difficulty}`}>{difficultyNames[question.difficulty]}</span><span className="tag tag-neutral">{question.grade_name} · {question.unit_title} · {question.lesson_title}</span></div><div className="card-actions"><button className="icon-button" onClick={() => editQuestion(question)} aria-label="تعديل السؤال"><Save size={16} /></button><button className="icon-button danger" onClick={() => handleDelete(question)} aria-label="حذف السؤال"><Trash2 size={16} /></button></div></div>
              <div className="question-prompt"><MathExpression value={question.prompt} /></div>
              {question.image_path && <img className="question-image" src={`/media/questions/${encodeURIComponent(question.image_path)}`} alt="رسم توضيحي للسؤال" />}
              {question.question_type === 'multiple_choice' && <ul className="question-option-preview">{question.options.map((option) => <li key={option.id} className={Number(option.is_correct) === 1 ? 'option-correct' : ''}>{Number(option.is_correct) === 1 && <Check size={14} />}<MathExpression value={option.text} /></li>)}</ul>}
              <div className="question-card-footer"><span>{Number(question.points).toLocaleString('ar')} نقطة</span><span>{Number(question.time_limit_seconds).toLocaleString('ar')} ثانية</span>{question.skill_name && <span>{question.skill_name}</span>}</div>
            </motion.article>
          ))}</div>
        )}
      </section>
    </div>
  );
}
