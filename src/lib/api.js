const API_URL = '/api/index.php';
let csrfToken = '';
let sessionPromise = null;

async function request(route, options = {}) {
  const method = options.method || 'GET';
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    Accept: 'application/json',
    ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(!['GET', 'HEAD'].includes(method) && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    ...options.headers,
  };
  const response = await fetch(`${API_URL}?route=${encodeURIComponent(route)}`, {
    credentials: 'include',
    ...options,
    headers,
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'تعذّر إكمال الطلب. حاولي مرة أخرى.');
  }
  return result;
}

export async function initializeSession() {
  if (!sessionPromise) {
    sessionPromise = request('auth/session')
      .then((result) => {
        csrfToken = result.csrfToken;
        return result.user;
      })
      .finally(() => {
        sessionPromise = null;
      });
  }
  return sessionPromise;
}

export async function signIn(email, password) {
  const result = await request('auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  csrfToken = result.csrfToken;
  return result.user;
}

export async function signUp(name, email, password) {
  const result = await request('auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  csrfToken = result.csrfToken;
  return result.user;
}

export async function signOut() {
  await request('auth/logout', { method: 'POST', body: JSON.stringify({}) });
  csrfToken = '';
  await initializeSession();
}

export async function getTeacherDashboard() {
  return request('teacher/dashboard');
}

export async function getHomepageContent() {
  return request('site/homepage');
}

export async function getTeacherSiteContent() {
  return request('teacher/site-content');
}

export async function saveHomepageSettings(values) {
  return request('teacher/site-content/settings', { method: 'PUT', body: JSON.stringify(values) });
}

export async function saveHomepageItem(values, itemId = null) {
  return request(itemId ? `teacher/site-content/items/${itemId}` : 'teacher/site-content/items', {
    method: itemId ? 'PATCH' : 'POST',
    body: JSON.stringify(values),
  });
}

export async function deleteHomepageItem(itemId) {
  return request(`teacher/site-content/items/${itemId}`, { method: 'DELETE' });
}

export async function getTeacherCurriculum() {
  return request('teacher/curriculum');
}

export async function saveCurriculum(kind, values) {
  return request(`teacher/curriculum/${kind}`, { method: 'POST', body: JSON.stringify(values) });
}

export async function deleteCurriculum(kind, id) {
  return request(`teacher/curriculum/${kind}/${id}`, { method: 'DELETE' });
}

export async function getTeacherQuestions() {
  const result = await request('teacher/questions');
  return result.questions;
}

export async function saveQuestion(values) {
  return request('teacher/questions', { method: 'POST', body: JSON.stringify(values) });
}

export async function uploadQuestionImage(id, image) {
  const form = new FormData();
  form.append('image', image);
  return request(`teacher/questions/${id}/image`, { method: 'POST', body: form });
}

export async function deleteQuestion(id) {
  return request(`teacher/questions/${id}`, { method: 'DELETE' });
}

export async function getTeacherGames() {
  const result = await request('teacher/games');
  return result.games;
}

export async function saveGame(values) {
  return request('teacher/games', { method: 'POST', body: JSON.stringify(values) });
}

export async function deleteGame(id) {
  return request(`teacher/games/${id}`, { method: 'DELETE' });
}

export async function getTeacherAssessments() {
  const result = await request('teacher/assessments');
  return result.assessments;
}

export async function saveAssessment(values) {
  return request('teacher/assessments', { method: 'POST', body: JSON.stringify(values) });
}

export async function deleteAssessment(id) {
  return request(`teacher/assessments/${id}`, { method: 'DELETE' });
}

export async function getClassStudents(classId) {
  const result = await request(`teacher/classes/${classId}/students`);
  return result.students;
}

export async function getTeacherStudents() {
  const result = await request('teacher/students');
  return result.students;
}

export async function addClassStudent(classId, email) {
  return request(`teacher/classes/${classId}/students`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function removeClassStudent(classId, studentId) {
  return request(`teacher/classes/${classId}/students/${studentId}`, { method: 'DELETE' });
}

export async function updateStudentAccount(studentId, values) {
  return request(`teacher/students/${studentId}`, { method: 'PATCH', body: JSON.stringify(values) });
}

export async function getStudentDashboard() {
  return request('student/dashboard');
}

export async function startActivity(activity) {
  return request('student/attempts', { method: 'POST', body: JSON.stringify(activity) });
}

export async function submitAttempt(attemptId, answers) {
  return request(`student/attempts/${attemptId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}
