import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, ClipboardList, FileQuestion, Save, Trash2, X } from 'lucide-react';
import QuestionPicker from '../components/QuestionPicker.jsx';
import WorkspacePageHeader from '../components/WorkspacePageHeader.jsx';
import { deleteAssessment, getTeacherAssessments, getTeacherCurriculum, getTeacherQuestions, saveAssessment } from '../lib/api.js';

const emptyAssessment = () => ({ assessment_type: 'test', title: '', instructions: '', grade_id: '', class_id: '', due_at: '', status: 'draft' });
const assessmentNames = { test: 'اختبار', homework: 'واجب' };
const statusNames = { draft: 'مسودة', published: 'منشور', archived: 'مؤرشف' };

export default function AssessmentManager() {
  const [data, setData] = useState({ curriculum: null, assessments: [], questions: [] });
  const [form, setForm] = useState(emptyAssessment);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setError('');
    try {
      const [curriculum, assessments, questions] = await Promise.all([getTeacherCurriculum(), getTeacherAssessments(), getTeacherQuestions()]);
      setData({ curriculum, assessments, questions });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  const classes = useMemo(() => (data.curriculum?.classes || []).filter((item) => String(item.grade_id) === String(form.grade_id)), [data.curriculum, form.grade_id]);

  function reset() {
    setForm(emptyAssessment());
    setSelectedIds([]);
    setEditingId(null);
  }

  function edit(assessment) {
    setEditingId(Number(assessment.id));
    setForm({
      assessment_type: assessment.assessment_type,
      title: assessment.title,
      instructions: assessment.instructions || '',
      grade_id: String(assessment.grade_id),
      class_id: assessment.class_id ? String(assessment.class_id) : '',
      due_at: assessment.due_at ? assessment.due_at.replace(' ', 'T').slice(0, 16) : '',
      status: assessment.status,
    });
    setSelectedIds(assessment.question_ids.map(String));
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
      await saveAssessment({
        ...form,
        id: editingId,
        grade_id: Number(form.grade_id),
        class_id: form.class_id ? Number(form.class_id) : null,
        question_ids: selectedIds.map(Number),
      });
      setNotice(editingId ? 'تم حفظ تعديلات التكليف.' : 'تم إنشاء التكليف.');
      reset();
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(assessment) {
    if (!window.confirm(`حذف «${assessment.title}»؟ إذا بدأت الطالبات محاولاتهن، استخدمي الأرشفة بدلاً من الحذف.`)) return;
    setError('');
    try {
      await deleteAssessment(assessment.id);
      setNotice('تم حذف التكليف.');
      if (editingId === Number(assessment.id)) reset();
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="workspace-content">
      <WorkspacePageHeader eyebrow="التقييم والمتابعة" title="الواجبات والاختبارات" description="أنشئي تقييماً من أسئلتكِ المنشورة، وحدّدي الصف أو المجموعة وموعد التسليم." />
      {error && <p className="workspace-alert" role="alert">{error}</p>}
      {notice && <p className="workspace-success" role="status">{notice}</p>}
      <div className="assessment-layout">
        <section className="workspace-panel editor-panel">
          <div className="panel-heading"><div><h2>{editingId ? 'تعديل التكليف' : 'إنشاء واجب أو اختبار'}</h2><p>لا يظهر التكليف للطالبة إلا بعد نشره وتسجيلها في المجموعة.</p></div><span className="panel-icon"><ClipboardCheck size={18} /></span></div>
          <form className="editor-form" onSubmit={submit}>
            <label className="workspace-field"><span>نوع التقييم</span><select value={form.assessment_type} onChange={(event) => setForm({ ...form, assessment_type: event.target.value })}><option value="test">اختبار</option><option value="homework">واجب</option></select></label>
            <label className="workspace-field"><span>عنوان التقييم</span><input required maxLength="180" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="مثال: اختبار المعادلات الخطية" /></label>
            <label className="workspace-field"><span>التعليمات (اختياري)</span><textarea rows="2" maxLength="10000" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} /></label>
            <div className="form-grid form-grid-two">
              <label className="workspace-field"><span>الصف</span><select required value={form.grade_id} onChange={(event) => setForm({ ...form, grade_id: event.target.value, class_id: '' })}><option value="">اختاري الصف</option>{(data.curriculum?.grades || []).map((grade) => <option value={grade.id} key={grade.id}>{grade.name}</option>)}</select></label>
              <label className="workspace-field"><span>المجموعة (اختياري)</span><select value={form.class_id} onChange={(event) => setForm({ ...form, class_id: event.target.value })}><option value="">جميع مجموعات الصف</option>{classes.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>
            </div>
            <div className="form-grid form-grid-two">
              <label className="workspace-field"><span>آخر موعد للتسليم (اختياري)</span><input type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} /></label>
              <label className="workspace-field"><span>الحالة</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">مسودة</option><option value="published">منشور</option><option value="archived">مؤرشف</option></select></label>
            </div>
            <QuestionPicker questions={data.questions} selectedIds={selectedIds} onChange={setSelectedIds} gradeId={form.grade_id} />
            <div className="editor-actions"><button className="button button-primary" disabled={saving}><Save size={16} />{saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'إنشاء التكليف'}</button>{editingId && <button className="button button-outline" type="button" onClick={reset}><X size={15} />إلغاء</button>}</div>
          </form>
        </section>
        <section className="workspace-panel">
          <div className="panel-heading"><div><h2>التقييمات المحفوظة</h2><p>{data.assessments.length.toLocaleString('ar')} واجب واختبار</p></div><span className="panel-count">{data.assessments.length.toLocaleString('ar')}</span></div>
          {loading ? <div className="empty-inline">جارٍ تحميل التقييمات...</div> : data.assessments.length ? <div className="assessment-list">{data.assessments.map((assessment) => <article className="assessment-card" key={assessment.id}><span className={`assessment-icon ${assessment.assessment_type}`}><FileQuestion size={20} /></span><div className="assessment-copy"><div className="game-card-title"><b>{assessment.title}</b><span className={`status-pill status-${assessment.status}`}>{statusNames[assessment.status]}</span></div><p>{assessmentNames[assessment.assessment_type]} · {assessment.grade_name}{assessment.class_name ? ` · ${assessment.class_name}` : ''}</p><small>{Number(assessment.question_count).toLocaleString('ar')} سؤال{assessment.due_at ? ` · التسليم ${new Date(`${assessment.due_at.replace(' ', 'T')}Z`).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</small></div><div className="card-actions"><button className="icon-button" aria-label="تعديل التقييم" onClick={() => edit(assessment)}><Save size={15} /></button><button className="icon-button danger" aria-label="حذف التقييم" onClick={() => remove(assessment)}><Trash2 size={15} /></button></div></article>)}</div> : <div className="empty-state"><ClipboardList size={29} /><b>لا توجد تقييمات بعد</b><span>أنشئي واجباً أو اختباراً واربطِيه بأسئلتكِ.</span></div>}
        </section>
      </div>
    </div>
  );
}
