import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { signOut } from '../lib/api.js';
import BrandLogo from './BrandLogo.jsx';
import ThemeToggle from './ThemeToggle.jsx';

export default function SiteHeader({ user, setUser }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await signOut();
      setUser(null);
      navigate('/');
    } catch (error) {
      window.alert(error.message);
    }
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="منصة وفاء عمرو التعليمية - الرئيسية">
          <BrandLogo />
          <span className="brand-copy"><strong>وفاء عمرو</strong><small>منصة تعليمية تصنع الفرق</small></span>
        </Link>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="التنقل الرئيسي">
          <a href="#about" onClick={() => setMenuOpen(false)}>عن المنصة</a>
          <a href="#journey" onClick={() => setMenuOpen(false)}>رحلتك التعليمية</a>
          <ThemeToggle className="site-theme-toggle" />
          {user ? (
            <div className="user-actions">
              <span className="welcome-name">أهلاً، {user.name.split(' ')[0]}</span>
              <Link className="login-link" to={user.role === 'student' ? '/student' : '/teacher'} onClick={() => setMenuOpen(false)}>لوحة التحكم</Link>
              <button className="button button-outline button-small" onClick={handleSignOut}><LogOut size={15} /> تسجيل الخروج</button>
            </div>
          ) : (
            <div className="header-actions">
              <Link className="login-link" to="/login" onClick={() => setMenuOpen(false)}>تسجيل الدخول</Link>
              <Link className="button button-primary button-small" to="/register" onClick={() => setMenuOpen(false)}>ابدئي التعلّم</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
