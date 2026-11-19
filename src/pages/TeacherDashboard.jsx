import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowUpLeft, BookOpenCheck, Boxes, ClipboardList, RefreshCw, Users } from 'lucide-react';
import { getTeacherDashboard } from '../lib/api.js';
import WorkspacePageHeader from '../components/WorkspacePageHeader.jsx';

const metricCards = [
  { key: 'students', label: 'عدد الطالبات', icon: Users, tone: 'purple', suffix: '' },
  { key: 'questions', label: 'الأسئلة في البنك', icon: BookOpenCheck, tone: 'cyan', suffix: '' },
  { key: 'games', label: 'الألعاب المنشورة', icon: Boxes, tone: 'pink', suffix: '' },
  { key: 'tests', label: 'الاختبارات', icon: ClipboardList, tone: 'purple', suffix: '' },
];

function ProgressChart({ points }) {
  if (!points.length) {
    return <div className="empty-chart"><Activity size={25} /><p>لا توجد محاولات مكتملة لعرضها بعد.</p><span>سيظهر تقدم الطالبات هنا بعد حل أول نشاط.</span></div>;
  }
  const width = 720;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 34, left: 36 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const coords = points.map((point, index) => ({
    x: padding.left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth),
    y: padding.top + chartHeight - (Math.max(0, Math.min(100, Number(point.average_score) || 0)) / 100) * chartHeight,
    point,
  }));
  const path = coords.map(({ x, y }, index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ');

  return (
    <div className="chart-wrap" dir="ltr">
      <svg className="progress-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="متوسط درجات الطالبات خلال آخر أسبوعين">
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padding.top + chartHeight - (tick / 100) * chartHeight;
          return <g key={tick}><line x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="chart-grid" /><text x={padding.left - 10} y={y + 4} textAnchor="end" className="chart-axis-label">{tick}%</text></g>;
        })}
        <path d={path} className="chart-line" />
        {coords.map(({ x, y, point }) => <g key={point.date}><circle cx={x} cy={y} r="5" className="chart-point" /><text x={x} y={height - 10} textAnchor="middle" className="chart-axis-label">{String(point.date).slice(5)}</text></g>)}
      </svg>
    </div>
  );
}

function formatActivity(activity) {
  if (activity.activity_type === 'attempt') return `${activity.student_name} أكملت نشاط «${activity.title}»`;
  if (activity.activity_type === 'question') return 'أُضيف سؤال جديد إلى بنك الأسئلة';
  return `أُنشئت لعبة «${activity.title}»`;
}

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setError('');
    try {
      setData(await getTeacherDashboard());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  return (
    <div className="workspace-content">
      <WorkspacePageHeader
        eyebrow="مساحة المعلمة"
        title="صباح الرياضيات الجميل"
        description="إليكِ صورة واضحة عن رحلة طالباتكِ التعليمية."
        action={<button className="button button-outline" onClick={loadDashboard} disabled={loading}><RefreshCw size={15} /> تحديث البيانات</button>}
      />
      {error && <p className="workspace-alert" role="alert">{error}</p>}
      {loading && !data ? <div className="workspace-loading"><span className="loading-mark" />جارٍ تحميل الإحصاءات من قاعدة البيانات...</div> : data && (
        <>
          <div className="metric-grid">
            {metricCards.map(({ key, label, icon: Icon, tone }, index) => (
              <motion.article className="metric-card" key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
                <span className={`metric-icon ${tone}`}><Icon size={20} /></span>
                <span className="metric-label">{label}</span>
                <strong>{data.stats[key].toLocaleString('ar')}</strong>
                <small>بيانات فعلية من المنصة</small>
              </motion.article>
            ))}
            <motion.article className="metric-card average-metric" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <span className="metric-icon cyan"><Activity size={20} /></span>
              <span className="metric-label">متوسط درجات الطالبات</span>
              <strong>{data.stats.average_score === null ? '—' : `${Number(data.stats.average_score).toLocaleString('ar')}٪`}</strong>
              <small>{data.stats.average_score === null ? 'لا توجد محاولات مكتملة بعد' : 'من المحاولات المكتملة'}</small>
            </motion.article>
          </div>

          <div className="dashboard-grid">
            <section className="workspace-panel chart-panel">
              <div className="panel-heading"><div><h2>تقدم الطالبات</h2><p>متوسط النتيجة وعدد المحاولات خلال آخر 14 يوماً</p></div><span className="panel-badge">مباشر</span></div>
              <ProgressChart points={data.progress} />
            </section>
            <section className="workspace-panel">
              <div className="panel-heading"><div><h2>الأكثر تفوقاً</h2><p>حسب مجموع النقاط المسجلة</p></div><span className="panel-icon"><Users size={18} /></span></div>
              {data.top_students.length ? <ol className="leader-list">{data.top_students.map((student, index) => <li key={student.id}><span className={`leader-rank rank-${index + 1}`}>{index + 1}</span><span className="leader-name">{student.name}</span><span className="leader-points">{Number(student.points).toLocaleString('ar')} نقطة</span></li>)}</ol> : <div className="empty-inline">ستظهر الطالبات هنا بعد إكمال نشاط وتسجيل نقاط.</div>}
            </section>
            <section className="workspace-panel activity-panel">
              <div className="panel-heading"><div><h2>آخر النشاطات</h2><p>أحدث ما سُجّل في المنصة</p></div><ArrowUpLeft className="panel-heading-icon" size={18} /></div>
              {data.activities.length ? <ul className="activity-list">{data.activities.map((activity, index) => <li key={`${activity.activity_type}-${activity.occurred_at}-${index}`}><span className={`activity-dot ${activity.activity_type}`} /><span className="activity-copy"><b>{formatActivity(activity)}</b><small>{activity.occurred_at ? new Date(`${activity.occurred_at.replace(' ', 'T')}Z`).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</small></span>{activity.score !== null && <span className="activity-score">{Number(activity.score).toLocaleString('ar')} نقطة</span>}</li>)}</ul> : <div className="empty-inline">لا توجد نشاطات مسجلة بعد.</div>}
            </section>
            <aside className="teacher-motivation">
              <span className="motivation-shape shape-a">＋</span><span className="motivation-shape shape-b">π</span>
              <span className="motivation-sparkle">✳</span>
              <div className="motivation-content"><span>كل خطوة تصنع فرقاً</span><h2>الرياضيات متعة،<br />والنجاح رحلة.</h2><p>أضيفي سؤالاً أو أنشئي لعبة لتبدأ طالباتكِ رحلة تعلّم تفاعلية.</p></div>
              <BookOpenCheck className="motivation-icon" size={39} strokeWidth={1.3} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
