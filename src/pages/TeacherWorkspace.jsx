import { Route, Routes } from 'react-router-dom';
import TeacherLayout from '../components/TeacherLayout.jsx';
import TeacherDashboard from './TeacherDashboard.jsx';
import QuestionManager from './QuestionManager.jsx';
import GameManager from './GameManager.jsx';
import CurriculumManager from './CurriculumManager.jsx';
import AssessmentManager from './AssessmentManager.jsx';
import HomepageManager from './HomepageManager.jsx';

function NotFound() {
  return <section className="workspace-panel workspace-not-found"><h1>الصفحة غير موجودة</h1><p>اختاري أحد أقسام لوحة المعلمة من القائمة.</p></section>;
}

export default function TeacherWorkspace({ user, setUser }) {
  return (
    <Routes>
      <Route element={<TeacherLayout user={user} setUser={setUser} />}>
        <Route index element={<TeacherDashboard />} />
        <Route path="homepage" element={<HomepageManager />} />
        <Route path="questions" element={<QuestionManager />} />
        <Route path="games" element={<GameManager />} />
        <Route path="curriculum" element={<CurriculumManager />} />
        <Route path="assessments" element={<AssessmentManager />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
