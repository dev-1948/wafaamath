import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import WorkspacePageHeader from '../components/WorkspacePageHeader.jsx';
import {
  deleteHomepageItem,
  getTeacherSiteContent,
  saveHomepageItem,
  saveHomepageSettings,
} from '../lib/api.js';

const emptyItem = () => ({
  content_type: 'post',
  title: '',
  summary: '',
  body: '',
  destination_url: '',
  status: 'draft',
});

const settingGroups = [
  {
    title: 'واجهة الموقع',
    fields: [
      ['hero_badge', 'العبارة الصغيرة أعلى العنوان'],
      ['hero_title', 'السطر الأول من العنوان'],
      ['hero_emphasis', 'السطر المميز من العنوان'],
      ['hero_description', 'وصف الواجهة', true],
      ['hero_cta', 'نص زر الواجهة'],
    ],
  },
  {
    title: 'قسم التعريف',
    fields: [
      ['about_badge', 'العبارة الصغيرة'],
      ['about_title', 'السطر الأول من العنوان'],
      ['about_emphasis', 'السطر المميز من العنوان'],
      ['about_description', 'وصف القسم', true],
      ['feature_one_title', 'عنوان البطاقة الأولى'],
      ['feature_one_description', 'وصف البطاقة الأولى', true],
      ['feature_two_title', 'عنوان البطاقة الثانية'],
      ['feature_two_description', 'وصف البطاقة الثانية', true],
      ['feature_three_title', 'عنوان البطاقة الثالثة'],
      ['feature_three_description', 'وصف البطاقة الثالثة', true],
    ],
  },
  {
    title: 'الدعوة للانضمام',
    fields: [
      ['banner_badge', 'العبارة الصغيرة'],
      ['banner_title', 'السطر الأول من العنوان'],
      ['banner_emphasis', 'السطر المميز من العنوان'],
      ['banner_description', 'الوصف', true],
      ['banner_cta', 'نص الزر'],
    ],
  },
];

export default function HomepageManager() {
  const [settings, setSettings] = useState(null);
  const [items, setItems] = useState([]);
  const [item, setItem] = useState(emptyItem);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setError('');
    try {
      const content = await getTeacherSiteContent();
      setSettings(content.settings);
      setItems(content.items);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSaveSettings(event) {
    event.preventDefault();
    setSavingSettings(true);
    setError('');
    setNotice('');
    try {
      const result = await saveHomepageSettings(settings);
      setSettings(result.settings);
      setNotice(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSaveItem(event) {
    event.preventDefault();
    setSavingItem(true);
    setError('');
    setNotice('');
    try {
      const result = await saveHomepageItem(item, editingId);
      setItems((current) => editingId
        ? current.map((entry) => Number(entry.id) === Number(editingId) ? { ...entry, ...result.item } : entry)
        : [result.item, ...current]);
      setItem(emptyItem());
      setEditingId(null);
      setNotice(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingItem(false);
    }
  }

  function editItem(entry) {
    setEditingId(Number(entry.id));
    setItem({
      content_type: entry.content_type,
      title: entry.title,
      summary: entry.summary,
      body: entry.body || '',
      destination_url: entry.destination_url || '',
      status: entry.status,
    });
    setNotice('');
    setError('');
  }

  async function removeItem(entry) {
    if (!window.confirm(`حذف «${entry.title}»؟`)) return;
    setError('');
    setNotice('');
    try {
      const result = await deleteHomepageItem(entry.id);
      setItems((current) => current.filter((itemToKeep) => Number(itemToKeep.id) !== Number(entry.id)));
      if (editingId === Number(entry.id)) {
        setEditingId(null);
        setItem(emptyItem());
      }
      setNotice(result.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="workspace-content">
      <WorkspacePageHeader
        eyebrow="إدارة الموقع"
        title="الصفحة الرئيسية"
        description="عدّلي نصوص الصفحة، وأضيفي المنشورات والمشاريع التي تظهر للزائرات."
      />
      {error && <p className="workspace-alert" role="alert">{error}</p>}
      {notice && <p className="workspace-success" role="status">{notice}</p>}

      {loading ? <section className="workspace-panel"><div className="empty-inline">جارٍ تحميل محتوى الموقع...</div></section> : settings && (
        <>
          <form onSubmit={handleSaveSettings} className="homepage-settings-form">
            {settingGroups.map((group) => (
              <section className="workspace-panel" key={group.title}>
                <div className="panel-heading"><div><h2>{group.title}</h2><p>تُعرض التعديلات مباشرةً على الصفحة الرئيسية بعد الحفظ.</p></div></div>
                <div className="form-grid form-grid-two">
                  {group.fields.map(([field, label, multiline]) => (
                    <label className="workspace-field" key={field}>
                      <span>{label}</span>
                      {multiline
                        ? <textarea required rows="3" maxLength="2000" value={settings[field] || ''} onChange={(event) => setSettings({ ...settings, [field]: event.target.value })} />
                        : <input required maxLength="180" value={settings[field] || ''} onChange={(event) => setSettings({ ...settings, [field]: event.target.value })} />}
                    </label>
                  ))}
                </div>
                {group === settingGroups[settingGroups.length - 1] && <div className="editor-actions"><button className="button button-primary" disabled={savingSettings}><Save size={16} />{savingSettings ? 'جارٍ الحفظ...' : 'حفظ تعديلات الصفحة'}</button></div>}
              </section>
            ))}
          </form>

          <section className="workspace-panel homepage-item-form-panel">
            <div className="panel-heading"><div><h2>{editingId ? 'تعديل المحتوى' : 'إضافة منشور أو مشروع'}</h2><p>اختاري «منشور» أو «مشروع»؛ المسودات لا تظهر للزائرات.</p></div><span className="panel-icon"><Plus size={18} /></span></div>
            <form className="editor-form" onSubmit={handleSaveItem}>
              <div className="form-grid form-grid-two">
                <label className="workspace-field"><span>نوع المحتوى</span><select value={item.content_type} onChange={(event) => setItem({ ...item, content_type: event.target.value })}><option value="post">منشور</option><option value="project">مشروع</option></select></label>
                <label className="workspace-field"><span>حالة النشر</span><select value={item.status} onChange={(event) => setItem({ ...item, status: event.target.value })}><option value="draft">مسودة</option><option value="published">منشور للزائرات</option></select></label>
                <label className="workspace-field"><span>العنوان</span><input required minLength="2" maxLength="180" value={item.title} onChange={(event) => setItem({ ...item, title: event.target.value })} /></label>
                <label className="workspace-field"><span>رابط خارجي (اختياري)</span><input type="url" maxLength="1000" dir="ltr" placeholder="https://" value={item.destination_url} onChange={(event) => setItem({ ...item, destination_url: event.target.value })} /></label>
                <label className="workspace-field"><span>ملخص يظهر على الصفحة</span><textarea required maxLength="500" rows="2" value={item.summary} onChange={(event) => setItem({ ...item, summary: event.target.value })} /></label>
                <label className="workspace-field"><span>التفاصيل (اختياري)</span><textarea maxLength="20000" rows="4" value={item.body} onChange={(event) => setItem({ ...item, body: event.target.value })} /></label>
              </div>
              <div className="editor-actions">
                <button className="button button-primary" disabled={savingItem}><Save size={16} />{savingItem ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة المحتوى'}</button>
                {editingId && <button className="button button-outline" type="button" disabled={savingItem} onClick={() => { setEditingId(null); setItem(emptyItem()); }}><X size={15} />إلغاء</button>}
              </div>
            </form>
          </section>

          <section className="workspace-panel">
            <div className="panel-heading"><div><h2>المنشورات والمشاريع</h2><p>{items.length.toLocaleString('ar')} عنصر في لوحة الإدارة</p></div><span className="panel-count">{items.length.toLocaleString('ar')}</span></div>
            {items.length ? <div className="homepage-item-list">{items.map((entry) => (
              <article className="homepage-content-item" key={entry.id}>
                <div className="homepage-item-icon"><Check size={16} /></div>
                <div className="homepage-item-copy">
                  <div className="homepage-item-heading"><b>{entry.title}</b><span>{entry.content_type === 'post' ? 'منشور' : 'مشروع'}</span><small className={entry.status === 'published' ? 'is-published' : ''}>{entry.status === 'published' ? 'منشور' : 'مسودة'}</small></div>
                  <p>{entry.summary}</p>
                </div>
                <div className="card-actions">
                  <button className="icon-button" aria-label={`تعديل ${entry.title}`} onClick={() => editItem(entry)}><Pencil size={15} /></button>
                  <button className="icon-button danger" aria-label={`حذف ${entry.title}`} onClick={() => removeItem(entry)}><Trash2 size={15} /></button>
                </div>
              </article>
            ))}</div> : <div className="empty-inline">لم تتم إضافة منشورات أو مشاريع بعد.</div>}
          </section>
        </>
      )}
    </div>
  );
}
