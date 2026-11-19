import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn, signUp } from '../lib/api.js';
import BrandLogo from '../components/BrandLogo.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

export default function AuthPage({ mode, setUser }) {
  const isRegister = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const user = isRegister
        ? await signUp(name.trim(), email.trim(), password)
        : await signIn(email.trim(), password);
      setUser(user);
      navigate(user.role === 'student' ? '/student' : '/teacher', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-decoration decoration-top" /><div className="auth-decoration decoration-bottom" />
      <Link className="auth-back" to="/"><ArrowRight size={17} /> العودة إلى الرئيسية</Link>
      <ThemeToggle className="auth-theme-toggle" />
      <motion.section className="auth-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <Link className="auth-brand" to="/"><BrandLogo /> <span>منصة وفاء عمرو التعليمية</span></Link>
        <span className="auth-welcome"><Sparkles size={15} /> {isRegister ? 'خطوتك الأولى نحو التميّز' : 'سعداء بعودتك إلينا'}</span>
        <h1>{isRegister ? 'أنشئي حسابك' : 'أهلاً بعودتك'}<span>.</span></h1>
        <p className="auth-subtitle">{isRegister ? 'ابدئي رحلتك التعليمية اليوم، فمستقبلك يستحق.' : 'سجّلي الدخول وتابعي رحلتك التعليمية.'}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && <label className="form-field"><span>الاسم الكامل</span><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: وفاء أحمد" minLength={2} maxLength={100} required /></label>}
          <label className="form-field"><span>البريد الإلكتروني</span><input type="email" autoComplete="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" maxLength={254} required /></label>
          <label className="form-field"><span>كلمة المرور</span><span className="password-control"><input type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} dir="ltr" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? 'ثمانية أحرف على الأقل' : 'أدخلي كلمة المرور'} minLength={isRegister ? 8 : undefined} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="button button-primary auth-submit" disabled={isSubmitting}>{isSubmitting ? 'جارٍ المتابعة...' : isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'} <ArrowRight size={17} /></button>
        </form>
        <p className="auth-switch">{isRegister ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب بعد؟'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'سجّلي الدخول' : 'أنشئي حساباً'}</Link></p>
        <p className="auth-privacy">بمتابعتك، فإنك توافقين على شروط الاستخدام وسياسة الخصوصية.</p>
      </motion.section>
      <p className="auth-footer">رحلتك نحو المعرفة تبدأ بخطوة صغيرة.</p>
    </main>
  );
}
