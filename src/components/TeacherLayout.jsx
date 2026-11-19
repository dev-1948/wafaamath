import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, BookOpen, BookOpenCheck, Boxes, ClipboardList, Home, LogOut, Menu, Users, X } from 'lucide-react';
import { signOut } from '../lib/api.js';
import BrandLogo from './BrandLogo.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const navigation = [
  { to: '/teacher', end: true, label: 'نظرة عامة', icon: Activity },
  { to: '/teacher/homepage', label: 'الصفحة الرئيسية', icon: Home },
  { to: '/teacher/questions', label: 'بنك الأسئلة', icon: BookOpenCheck },
  { to: '/teacher/games', label: 'منشئ الألعاب', icon: Boxes },
  { to: '/teacher/curriculum', label: 'الصفوف والدروس', icon: BookOpen },
  { to: '/teacher/curriculum#student-roster', label: 'إدارة الطالبات', icon: Users },
  { to: '/teacher/assessments', label: 'الواجبات والاختبارات', icon: ClipboardList },
];

export default function TeacherLayout({ user, setUser }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await signOut();
      setUser(null);
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="workspace-shell">
      <button className="workspace-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}>
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <aside className={`workspace-sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <Link className="workspace-brand" to="/">
          <BrandLogo />
          <span><b>وفاء عمرو</b><small>استوديو تعليم الرياضيات</small></span>
        </Link>
        <div className="sidebar-profile">
          <span className="profile-avatar">{user.name.trim().charAt(0)}</span>
          <span><b>{user.name}</b><small>{user.role === 'admin' ? 'مديرة المنصة' : 'المعلمة'}</small></span>
        </div>
        <p className="sidebar-label">مساحة المعلمة</p>
        <nav className="workspace-nav">
          {navigation.map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)}>
              <Icon size={18} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link className="sidebar-home-link" to="/" onClick={() => setMenuOpen(false)}>العودة إلى الموقع الرئيسي</Link>
          <ThemeToggle className="sidebar-theme-toggle" />
          {error && <p className="inline-error" role="alert">{error}</p>}
          <button className="sidebar-logout" onClick={handleSignOut}><LogOut size={16} /> تسجيل الخروج</button>
          <small>منصة وفاء عمرو التعليمية</small>
        </div>
      </aside>
      <main className="workspace-main">
        <Outlet />
      </main>
    </div>
  );
}
