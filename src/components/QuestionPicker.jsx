import { CheckSquare, ListChecks } from 'lucide-react';
import MathExpression from './MathExpression.jsx';

const typeNames = {
  multiple_choice: 'اختيار من متعدد',
  true_false: 'صح أو خطأ',
  numeric: 'إجابة رقمية',
  equation: 'معادلة',
  order_steps: 'خطوات',
  fill_blank: 'إكمال الفراغ',
};

export default function QuestionPicker({ questions, selectedIds, onChange, gradeId }) {
  const visible = questions.filter((question) => !gradeId || String(question.grade_id) === String(gradeId));

  function toggle(id) {
    const key = String(id);
    onChange(selectedIds.includes(key) ? selectedIds.filter((item) => item !== key) : [...selectedIds, key]);
  }

  return (
    <fieldset className="workspace-fieldset question-picker">
      <legend><ListChecks size={15} /> اختاري أسئلة النشاط</legend>
      {visible.length ? <div className="question-picker-list">{visible.map((question) => (
        <label className="question-pick-row" key={question.id}>
          <input type="checkbox" checked={selectedIds.includes(String(question.id))} onChange={() => toggle(question.id)} />
          <span className="pick-check"><CheckSquare size={15} /></span>
          <span className="pick-question"><b><MathExpression value={question.prompt} /></b><small>{question.grade_name} · {typeNames[question.question_type] || question.question_type} · {Number(question.points).toLocaleString('ar')} نقطة</small></span>
        </label>
      ))}</div> : <div className="empty-inline">{gradeId ? 'لا توجد أسئلة لهذا الصف بعد. أضيفي أسئلة من بنك الأسئلة.' : 'أضيفي سؤالاً واحداً على الأقل من بنك الأسئلة أولاً.'}</div>}
      <small className="field-hint">المحدد: {selectedIds.length.toLocaleString('ar')} سؤال</small>
    </fieldset>
  );
}
