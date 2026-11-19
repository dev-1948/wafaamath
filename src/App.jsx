import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { initializeSession } from './lib/api.js';
import HomePage from './pages/HomePage.jsx';
import AuthPage from './pages/AuthPage.jsx';
const TeacherWorkspace = lazy(() => import('./pages/TeacherWorkspace.jsx'));
const StudentWorkspace = lazy(() => import('./pages/StudentWorkspace.jsx'));

function WorkspaceLoading() {
  return <main className="loading-screen" aria-label="جارٍ التحميل"><span className="loading-mark" /></main>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    initializeSession()
      .then(setUser)
      .catch((error) => setSessionError(error.message))
      .finally(() => setSessionReady(true));
  }, []);

  if (!sessionReady) {
    return <main className="loading-screen" aria-label="جارٍ التحميل"><span className="loading-mark" /></main>;
  }

  const homeForUser = user?.role === 'student' ? '/student' : '/teacher';

  return (
    <Routes>
      <Route path="/" element={<HomePage user={user} setUser={setUser} sessionError={sessionError} />} />
      <Route path="/login" element={user ? <Navigate to={homeForUser} replace /> : <AuthPage mode="login" setUser={setUser} />} />
      <Route path="/register" element={user ? <Navigate to={homeForUser} replace /> : <AuthPage mode="register" setUser={setUser} />} />
      <Route path="/teacher/*" element={user && ['teacher', 'admin'].includes(user.role) ? <Suspense fallback={<WorkspaceLoading />}><TeacherWorkspace user={user} setUser={setUser} /></Suspense> : <Navigate to={user ? '/student' : '/login'} replace />} />
      <Route path="/student/*" element={user?.role === 'student' ? <Suspense fallback={<WorkspaceLoading />}><StudentWorkspace user={user} setUser={setUser} /></Suspense> : <Navigate to={user ? '/teacher' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
