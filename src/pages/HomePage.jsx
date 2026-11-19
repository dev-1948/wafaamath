import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpLeft, BookOpenCheck, ExternalLink, GraduationCap, Heart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo.jsx';
import SiteHeader from '../components/SiteHeader.jsx';
import { getHomepageContent } from '../lib/api.js';

const defaultSettings = {
  hero_badge: 'بداية جديدة، وإنجاز أقرب',
  hero_title: 'تعلّمي اليوم،',
  hero_emphasis: 'وتألّقي غداً.',
  hero_description: 'رحلتك التعليمية تبدأ بخطوة. اكتشفي تجربة تعلّم ملهمة تساعدك على بناء المعرفة وتحقيق طموحك، على طريقتك.',
  hero_cta: 'ابدئي رحلتك الآن',
  about_badge: 'لأن طموحك يستحق',
  about_title: 'تعلّم أجمل،',
  about_emphasis: 'وإنجاز أكبر',
  about_description: 'كل ما تحتاجينه لتبدئي بثقة وتواصلي التقدّم.',
  feature_one_title: 'تعلّم يناسبك',
  feature_one_description: 'محتوى تعليمي واضح، صُمّم ليقربك من أهدافك خطوة بخطوة.',
  feature_two_title: 'مسار مرتب',
  feature_two_description: 'ابدأ من الأساسيات، وتقدّم بثقة ضمن رحلة تعليمية منظمة.',
  feature_three_title: 'دعم مستمر',
  feature_three_description: 'مساحة مشجعة تحترم وقتك وتحتفي بكل إنجاز تحققه.',
  banner_badge: 'مستعدة للخطوة الأولى؟',
  banner_title: 'مستقبلك يبدأ',
  banner_emphasis: 'من هنا.',
  banner_description: 'انضمي إلينا وابدئي ببناء رحلة تعليمية تشبه طموحك.',
  banner_cta: 'أنشئي حسابك مجاناً',
};

export default function HomePage({ user, setUser, sessionError }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [posts, setPosts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [contentError, setContentError] = useState('');

  useEffect(() => {
    getHomepageContent()
      .then((content) => {
        setSettings(content.settings);
        setPosts(content.posts);
        setProjects(content.projects);
      })
      .catch((error) => setContentError(error.message));
  }, []);

  const highlights = [
    { icon: GraduationCap, title: settings.feature_one_title, text: settings.feature_one_description, color: 'lilac' },
    { icon: BookOpenCheck, title: settings.feature_two_title, text: settings.feature_two_description, color: 'sky' },
    { icon: Heart, title: settings.feature_three_title, text: settings.feature_three_description, color: 'pink' },
  ];

  return (
    <div className="page-shell">
      <SiteHeader user={user} setUser={setUser} />
      <main>
        {sessionError && <p className="session-notice" role="status">{sessionError}</p>}
        {contentError && <p className="session-notice" role="status">تعذّر تحميل بعض محتوى الصفحة الرئيسية: {contentError}</p>}
        <section className="hero-section">
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="hero-inner">
            <motion.div className="hero-copy" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <span className="eyebrow"><Sparkles size={15} /> {settings.hero_badge}</span>
              <h1>{settings.hero_title}<br /><span>{settings.hero_emphasis}</span></h1>
              <p className="hero-description">{settings.hero_description}</p>
              <div className="hero-buttons">
                <Link to={user ? '#journey' : '/register'} className="button button-primary button-large">{settings.hero_cta} <ArrowLeft size={18} /></Link>
                <a className="text-link" href="#about">اكتشفي المنصة <ArrowUpLeft size={16} /></a>
              </div>
              <div className="hero-note"><span className="note-avatars"><i>و</i><i>ع</i><i>م</i></span><span>خطوة صغيرة اليوم، تصنع فرقاً كبيراً غداً</span></div>
            </motion.div>
            <motion.div className="hero-art" initial={{ opacity: 0, scale: 0.94, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.8, delay: 0.15 }}>
              <div className="art-glow" />
              <div className="art-card art-card-main">
                <div className="art-topline"><span className="art-dot" /><span className="art-dot" /><span className="art-dot" /><span className="art-caption">مساحتك للتعلّم</span></div>
                <div className="art-book"><div className="book-sun" /><BookOpenCheck size={68} strokeWidth={1.3} /><span className="book-script">معاً نحو<br />المستقبل</span></div>
                <div className="art-progress"><span className="progress-icon"><GraduationCap size={19} /></span><span className="progress-lines"><b>كل إنجاز يبدأ بخطوة</b><i><em /></i></span><span className="progress-check">✓</span></div>
              </div>
              <div className="floating-chip chip-one"><span className="chip-star">✦</span><span><b>تعلّم بثقة</b><small>أنتِ قادرة على الإنجاز</small></span></div>
              <div className="floating-chip chip-two"><span className="chip-heart">♡</span><span><b>رحلتك، بأسلوبك</b></span></div>
              <span className="art-sparkle sparkle-one">✳</span><span className="art-sparkle sparkle-two">✦</span>
            </motion.div>
          </div>
          <div className="hero-bottom-note"><span /> تعلّم يلهمك <span /></div>
        </section>

        <section className="highlights-section" id="about">
          <div className="section-heading">
            <span className="eyebrow"><Sparkles size={14} /> {settings.about_badge}</span>
            <h2>{settings.about_title} <span>{settings.about_emphasis}</span></h2>
            <p>{settings.about_description}</p>
          </div>
          <div className="highlight-grid">
            {highlights.map(({ icon: Icon, title, text, color }, index) => (
              <motion.article className="highlight-card" key={title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.42, delay: index * 0.1 }}>
                <span className={`highlight-icon ${color}`}><Icon size={23} /></span>
                <h3>{title}</h3><p>{text}</p>
              </motion.article>
            ))}
          </div>
        </section>
        {posts.length > 0 && <section className="public-content-section">
          <div className="section-heading"><span className="eyebrow"><Sparkles size={14} /> جديد المنصة</span><h2>منشورات <span>تعليمية</span></h2><p>أخبار وأفكار تشاركها المعلمة معكن.</p></div>
          <div className="public-content-grid">{posts.map((post) => <article className="public-content-card" key={post.id}>
            <span className="public-content-kind">منشور</span><h3>{post.title}</h3><p>{post.summary}</p>
            {post.body && <details><summary>اقرئي التفاصيل</summary><p>{post.body}</p></details>}
            {post.destination_url && <a href={post.destination_url} target="_blank" rel="noopener noreferrer" className="public-content-link">رابط المنشور <ExternalLink size={14} /></a>}
          </article>)}</div>
        </section>}
        {projects.length > 0 && <section className="public-content-section projects-section">
          <div className="section-heading"><span className="eyebrow"><Sparkles size={14} /> إنجازاتنا</span><h2>مشاريع <span>المنصة</span></h2><p>مشاريع وأعمال تعليمية تضيف قيمة إلى رحلة التعلّم.</p></div>
          <div className="public-content-grid">{projects.map((project) => <article className="public-content-card" key={project.id}>
            <span className="public-content-kind">مشروع</span><h3>{project.title}</h3><p>{project.summary}</p>
            {project.body && <details><summary>تفاصيل المشروع</summary><p>{project.body}</p></details>}
            {project.destination_url && <a href={project.destination_url} target="_blank" rel="noopener noreferrer" className="public-content-link">استعرضي المشروع <ExternalLink size={14} /></a>}
          </article>)}</div>
        </section>}
        <section className="journey-banner" id="journey">
          <div><span className="eyebrow"><Sparkles size={14} /> {settings.banner_badge}</span><h2>{settings.banner_title} <span>{settings.banner_emphasis}</span></h2><p>{settings.banner_description}</p></div>
          <Link to={user ? '/' : '/register'} className="button button-white button-large">{settings.banner_cta} <ArrowLeft size={18} /></Link>
          <div className="banner-sparkle">✳</div>
        </section>
      </main>
      <footer className="site-footer"><Link className="brand footer-brand" to="/"><BrandLogo /><span className="brand-copy"><strong>وفاء عمرو</strong><small>منصة تعليمية تصنع الفرق</small></span></Link><span>© {new Date().getFullYear()} منصة وفاء عمرو التعليمية. جميع الحقوق محفوظة.</span></footer>
    </div>
  );
}
