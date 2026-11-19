import { useEffect, useMemo, useState } from 'react';
import { BookOpen, GraduationCap, Pencil, Plus, Save, Trash2, Users, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import WorkspacePageHeader from '../components/WorkspacePageHeader.jsx';
import {
  addClassStudent,
  deleteCurriculum,
  getClassStudents,
  getTeacherCurriculum,
  getTeacherStudents,
  removeClassStudent,
  saveCurriculum,
  updateStudentAccount,
} from '../lib/api.js';

const sections = [
  { key: 'grades', title: 'الصفوف الدراسية', singular: 'صف دراسي', nameKey: 'name', icon: GraduationCap },
  { key: 'classes', title: 'الفصول والمجموعات', singular: 'مجموعة', nameKey: 'name', parent: 'grade_id', parentKind: 'grades', parentLabel: 'الصف', icon: Users },
  { key: 'subjects', title: 'المواد', singular: 'مادة', nameKey: 'name', parent: 'grade_id', parentKind: 'grades', parentLabel: 'الصف', icon: BookOpen },
  { key: 'units', title: 'الوحدات', singular: 'وحدة', nameKey: 'title', parent: 'subject_id', parentKind: 'subjects', parentLabel: 'المادة', icon: BookOpen },
  { key: 'lessons', title: 'الدروس', singular: 'درس', nameKey: 'title', parent: 'unit_id', parentKind: 'units', parentLabel: 'الوحدة', icon: BookOpen },
  { key: 'skills', title: 'المهارات الرياضية', singular: 'مهارة', nameKey: 'name', parent: 'lesson_id', parentKind: 'lessons', parentLabel: 'الدرس', icon: BookOpen },
];

function blankRecord(section) {
  return {
    name: '',
    title: '',
    sort_order: 0,
    description: '',
    content: '',
    academic_year: '',
    [section.parent || '']: '',
  };
}

function parentName(kind, item) {
  if (kind === 'grades') return item.name;
  if (kind === 'subjects') return `${item.grade_name} · ${item.name}`;
  if (kind === 'units') return `${item.grade_name} · ${item.title}`;
  if (kind === 'lessons') return `${item.unit_title} · ${item.title}`;
  return item.name;
}

export default function CurriculumManager() {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [activeKind, setActiveKind] = useState(() => location.hash === '#student-roster' ? 'classes' : 'grades');
  const [record, setRecord] = useState(blankRecord(sections[0]));
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [studentAccounts, setStudentAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [studentEmail, setStudentEmail] = useState('');
  const [rosterLoading, setRosterLoading] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '' });
  const [studentSaving, setStudentSaving] = useState(false);

  async function load() {
    try {
      setError('');
      setData(await getTeacherCurriculum());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentAccounts() {
    try {
      setStudentAccounts(await getTeacherStudents());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAccountsLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadStudentAccounts();
  }, []);
  useEffect(() => {
    if (location.hash !== '#student-roster') return undefined;
    if (data) setActiveKind(data.grades.length ? 'classes' : 'grades');
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('student-roster')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, data]);
  const section = sections.find((item) => item.key === activeKind);
  const parentItems = section?.parentKind ? data?.[section.parentKind] || [] : [];
  const items = data?.[activeKind] || [];
  const rosterClass = useMemo(() => (data?.classes || []).find((item) => String(item.id) === String(classId)), [data, classId]);

  async function loadRoster(id) {
    setEditingStudent(null);
    setStudentForm({ name: '', email: '', password: '' });
    if (!id) {
      setStudents([]);
      return;
    }
    setRosterLoading(true);
    setError('');
    try {
      setStudents(await getClassStudents(id));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRosterLoading(false);
    }
  }

  function chooseSection(nextSection) {
    setActiveKind(nextSection.key);
    setRecord(blankRecord(nextSection));
    setEditingId(null);
    setNotice('');
    setError('');
  }

  function editItem(item) {
    setEditingId(Number(item.id));
    setRecord({
      ...blankRecord(section),
      ...item,
      [section.parent || '']: section.parent ? String(item[section.parent]) : '',
      sort_order: item.sort_order ?? 0,
    });
    setNotice('');
    setError('');
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await saveCurriculum(activeKind, {
        ...record,
        id: editingId,
        [section.parent || '']: section.parent ? Number(record[section.parent]) : undefined,
        sort_order: Number(record.sort_order || 0),
      });
      setNotice(editingId ? 'تم حفظ التعديلات.' : 'تمت الإضافة إلى المنهج.');
      setRecord(blankRecord(section));
      setEditingId(null);
      await load();
      if (activeKind === 'classes' && saved.id) {
        setClassId(String(saved.id));
        await loadRoster(String(saved.id));
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const name = item[section.nameKey];
    if (!window.confirm(`هل تريدين حذف «${name}»؟ سيمنع النظام الحذف إذا كان العنصر مرتبطاً ببيانات محفوظة.`)) return;
    setError('');
    setNotice('');
    try {
      await deleteCurriculum(activeKind, item.id);
      setNotice('تم حذف العنصر.');
      if (editingId === Number(item.id)) {
        setEditingId(null);
        setRecord(blankRecord(section));
      }
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleAddStudent(event) {
    event.preventDefault();
    if (!classId) return;
    setError('');
    setNotice('');
    try {
      const result = await addClassStudent(classId, studentEmail.trim());
      setNotice(result.message);
      setStudentEmail('');
      await loadRoster(classId);
      await loadStudentAccounts();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleRemoveStudent(student) {
    if (!window.confirm(`إزالة ${student.name} من المجموعة؟`)) return;
    setError('');
    try {
      await removeClassStudent(classId, student.id);
      setStudents((current) => current.filter((item) => Number(item.id) !== Number(student.id)));
      await loadStudentAccounts();
      if (editingStudent === Number(student.id)) {
        setEditingStudent(null);
        setStudentForm({ name: '', email: '', password: '' });
      }
      setNotice('تمت إزالة الطالبة من المجموعة.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function editStudent(student) {
    setEditingStudent(Number(student.id));
    setStudentForm({ name: student.name, email: student.email, password: '' });
    setError('');
    setNotice('');
    window.requestAnimationFrame(() => {
      document.getElementById('student-account-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  async function handleSaveStudent(event) {
    event.preventDefault();
    if (!editingStudent) return;
    setStudentSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await updateStudentAccount(editingStudent, {
        name: studentForm.name.trim(),
        email: studentForm.email.trim(),
        ...(studentForm.password ? { password: studentForm.password } : {}),
      });
      setStudents((current) => current.map((student) => (
        Number(student.id) === Number(result.student.id) ? { ...student, ...result.student } : student
      )));
      setStudentAccounts((current) => current.map((student) => (
        Number(student.id) === Number(result.student.id) ? { ...student, ...result.student } : student
      )));
      setEditingStudent(null);
      setStudentForm({ name: '', email: '', password: '' });
      setNotice(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setStudentSaving(false);
    }
  }

  function focusCurriculumSection(nextSection) {
    chooseSection(nextSection);
    window.requestAnimationFrame(() => {
      document.querySelector('.curriculum-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const fieldLabel = section.nameKey === 'title' ? 'اسم العنصر' : 'الاسم';
  const isStudentManagement = location.hash === '#student-roster';
  const hasGrades = (data?.grades || []).length > 0;
  const hasClasses = (data?.classes || []).length > 0;

  return (
    <div className="workspace-content">
      <WorkspacePageHeader
        eyebrow={isStudentManagement ? 'إدارة الحسابات' : 'إدارة المنهج'}
        title={isStudentManagement ? 'إدارة الطالبات' : 'الصفوف والوحدات والدروس'}
        description={isStudentManagement ? 'اختاري مجموعة لعرض طالباتها وتعديل بيانات حساباتهن.' : 'ابني هيكل منهج الرياضيات بنفسكِ. كل عنصر مرتبط بالذي يسبقه لحماية تنظيم المحتوى.'}
      />
      {error && <p className="workspace-alert" role="alert">{error}</p>}
      {notice && <p className="workspace-success" role="status">{notice}</p>}
      <div className="curriculum-tabs" role="tablist" aria-label="أقسام المنهج">
        {sections.map(({ key, title, icon: Icon }) => <button type="button" role="tab" aria-selected={activeKind === key} className={activeKind === key ? 'is-selected' : ''} key={key} onClick={() => chooseSection(sections.find((item) => item.key === key))}><Icon size={16} /><span>{title}</span><b>{(data?.[key] || []).length.toLocaleString('ar')}</b></button>)}
      </div>
      <div className="curriculum-layout">
        <section className="workspace-panel editor-panel curriculum-editor">
          <div className="panel-heading"><div><h2>{editingId ? `تعديل ${section.singular}` : `إضافة ${section.singular}`}</h2><p>البيانات تُحفظ مباشرة في قاعدة المنصة.</p></div><span className="panel-icon"><section.icon size={18} /></span></div>
          <form className="editor-form" onSubmit={handleSave}>
            {section.parent && <label className="workspace-field"><span>{section.parentLabel}</span><select required value={record[section.parent] || ''} onChange={(event) => setRecord({ ...record, [section.parent]: event.target.value })}><option value="">اختاري {section.parentLabel}</option>{parentItems.map((item) => <option value={item.id} key={item.id}>{parentName(section.parentKind, item)}</option>)}</select></label>}
            <label className="workspace-field"><span>{fieldLabel}</span><input maxLength="180" required value={record[section.nameKey] || ''} onChange={(event) => setRecord({ ...record, [section.nameKey]: event.target.value })} placeholder={`مثال: ${section.singular}`} /></label>
            {activeKind === 'classes' && <label className="workspace-field"><span>العام الدراسي (اختياري)</span><input maxLength="20" value={record.academic_year || ''} onChange={(event) => setRecord({ ...record, academic_year: event.target.value })} placeholder="مثال: 2026-2027" /></label>}
            {['grades', 'units', 'lessons'].includes(activeKind) && <label className="workspace-field"><span>ترتيب العرض</span><input type="number" min="0" max="65535" value={record.sort_order ?? 0} onChange={(event) => setRecord({ ...record, sort_order: event.target.value })} /></label>}
            {['units', 'skills'].includes(activeKind) && <label className="workspace-field"><span>وصف مختصر (اختياري)</span><textarea rows="3" maxLength="10000" value={record.description || ''} onChange={(event) => setRecord({ ...record, description: event.target.value })} /></label>}
            {activeKind === 'lessons' && <label className="workspace-field"><span>محتوى الدرس (اختياري)</span><textarea rows="4" maxLength="50000" value={record.content || ''} onChange={(event) => setRecord({ ...record, content: event.target.value })} /></label>}
            <div className="editor-actions"><button className="button button-primary" disabled={saving || Boolean(section.parent && parentItems.length === 0)}><Save size={16} />{saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديل' : 'إضافة'}</button>{editingId && <button className="button button-outline" type="button" onClick={() => { setEditingId(null); setRecord(blankRecord(section)); }}><X size={15} />إلغاء</button>}</div>
          </form>
        </section>
        <section className="workspace-panel curriculum-list-panel">
          <div className="panel-heading"><div><h2>{section.title}</h2><p>{items.length.toLocaleString('ar')} عنصر</p></div><span className="panel-count">{items.length.toLocaleString('ar')}</span></div>
          {loading ? <div className="empty-inline">جارٍ تحميل المنهج...</div> : items.length === 0 ? <div className="empty-state"><BookOpen size={29} /><b>لا توجد عناصر في هذا القسم بعد</b><span>أضيفي أول {section.singular} من النموذج.</span></div> : (
            <div className="resource-list">{items.map((item, index) => <article className="resource-row" key={item.id}><span className="resource-order">{(index + 1).toLocaleString('ar')}</span><span className="resource-info"><b>{item[section.nameKey]}</b><small>{section.parent ? parentName(section.parentKind, parentItems.find((parent) => Number(parent.id) === Number(item[section.parent])) || item) : activeKind === 'grades' ? 'صف دراسي' : ''}{activeKind === 'classes' && item.academic_year ? ` · ${item.academic_year}` : ''}</small></span><div className="card-actions">{activeKind === 'classes' && <button className="icon-button" title="إدارة الطالبات" onClick={() => { setClassId(String(item.id)); loadRoster(String(item.id)); }}><Users size={16} /></button>}<button className="icon-button" aria-label={`تعديل ${item[section.nameKey]}`} onClick={() => editItem(item)}><Save size={15} /></button><button className="icon-button danger" aria-label={`حذف ${item[section.nameKey]}`} onClick={() => handleDelete(item)}><Trash2 size={15} /></button></div></article>)}</div>
          )}
        </section>
      </div>

      <section className="workspace-panel roster-panel" id="class-roster">
        <div className="panel-heading"><div><h2>عضوية الطالبات في المجموعات</h2><p>أضيفي حساب الطالبة إلى مجموعتها لإتاحة ألعاب الصف وواجباته واختباراته.</p></div><span className="panel-icon"><Users size={18} /></span></div>
        <div className="roster-toolbar">
          <label className="workspace-field"><span>اختاري المجموعة</span><select value={classId} onChange={(event) => { setClassId(event.target.value); loadRoster(event.target.value); }}><option value="">اختاري مجموعة</option>{(data?.classes || []).map((item) => <option key={item.id} value={item.id}>{item.grade_name} · {item.name}</option>)}</select></label>
          {rosterClass && <form className="roster-add-form" onSubmit={handleAddStudent}><label className="workspace-field"><span>بريد حساب الطالبة</span><input type="email" required value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} placeholder="student@example.com" /></label><button className="button button-primary" type="submit"><Plus size={15} />إضافة للمجموعة</button></form>}
        </div>
        {data && !hasGrades && <div className="roster-guidance"><div><b>ابدئي بإعداد الصف الدراسي</b><p>بعد إضافة الصف، أنشئي مجموعة له. ثم اطلبي من الطالبة إنشاء حسابها وأضيفي بريدها إلى المجموعة.</p></div><button className="button button-outline" type="button" onClick={() => focusCurriculumSection(sections[0])}>إضافة صف دراسي</button></div>}
        {data && hasGrades && !hasClasses && <div className="roster-guidance"><div><b>لا توجد مجموعات بعد</b><p>أنشئي مجموعة مرتبطة بصف دراسي، ثم اطلبي من الطالبة إنشاء حسابها وأضيفي بريدها إليها.</p></div><button className="button button-outline" type="button" onClick={() => focusCurriculumSection(sections[1])}>إنشاء مجموعة</button></div>}
        {classId && (rosterLoading ? <div className="empty-inline">جارٍ تحميل الطالبات...</div> : students.length ? <div className="roster-list">{students.map((student) => <div className="roster-row" key={student.id}><span className="profile-avatar">{student.name.charAt(0)}</span><span><b>{student.name}</b><small>{student.email}</small></span><button className="icon-button" onClick={() => editStudent(student)} aria-label={`تعديل حساب ${student.name}`} title="تعديل الحساب وكلمة المرور"><Pencil size={15} /></button><button className="icon-button danger" onClick={() => handleRemoveStudent(student)} aria-label={`إزالة ${student.name}`}><Trash2 size={15} /></button></div>)}</div> : <div className="empty-inline">لا توجد طالبات في هذه المجموعة بعد. اطلبي من الطالبة إنشاء حساب في المنصة، ثم أضيفي بريدها إلى المجموعة.</div>)}
        {data && !classId && hasClasses && <div className="empty-inline">اختاري مجموعة لعرض طالباتها وإدارة حساباتهن.</div>}
      </section>
      <section className="workspace-panel roster-panel" id="student-roster" tabIndex="-1">
        <div className="panel-heading"><div><h2>حسابات الطالبات المسجلة</h2><p>تظهر للمديرة جميع الحسابات، وللمعلمة طالبات مجموعاتها فقط.</p></div><span className="panel-count">{studentAccounts.length.toLocaleString('ar')}</span></div>
        {accountsLoading ? <div className="empty-inline">جارٍ تحميل حسابات الطالبات...</div> : studentAccounts.length ? <div className="roster-list">{studentAccounts.map((student) => <div className="roster-row" key={student.id}><span className="profile-avatar">{student.name.charAt(0)}</span><span><b>{student.name}</b><small>{student.email}</small><small>{Number(student.group_count) ? `مضافة إلى ${Number(student.group_count).toLocaleString('ar')} مجموعة` : 'غير مضافة إلى مجموعة'}</small></span><button className="icon-button" onClick={() => editStudent(student)} aria-label={`تعديل حساب ${student.name}`} title="تعديل الاسم والبريد وكلمة المرور"><Pencil size={15} /></button></div>)}</div> : <div className="empty-inline">لا توجد حسابات طالبات مسجلة.</div>}
        {editingStudent && <form className="student-account-editor" id="student-account-editor" onSubmit={handleSaveStudent}>
          <div className="panel-heading"><div><h3>تعديل حساب الطالبة</h3><p>التغييرات تُطبّق على الحساب في جميع مجموعاته.</p></div></div>
          <div className="form-grid form-grid-three">
            <label className="workspace-field"><span>اسم الطالبة</span><input required maxLength="100" value={studentForm.name} onChange={(event) => setStudentForm({ ...studentForm, name: event.target.value })} /></label>
            <label className="workspace-field"><span>البريد الإلكتروني</span><input type="email" required maxLength="254" dir="ltr" value={studentForm.email} onChange={(event) => setStudentForm({ ...studentForm, email: event.target.value })} /></label>
            <label className="workspace-field"><span>كلمة مرور جديدة (اختياري)</span><input type="password" autoComplete="new-password" minLength="8" value={studentForm.password} onChange={(event) => setStudentForm({ ...studentForm, password: event.target.value })} placeholder="اتركيه فارغاً دون تغييرها" /></label>
          </div>
          <div className="editor-actions"><button className="button button-primary" disabled={studentSaving}><Save size={16} />{studentSaving ? 'جارٍ الحفظ...' : 'حفظ بيانات الحساب'}</button><button className="button button-outline" type="button" disabled={studentSaving} onClick={() => { setEditingStudent(null); setStudentForm({ name: '', email: '', password: '' }); }}><X size={15} />إلغاء</button></div>
        </form>}
      </section>
    </div>
  );
}
