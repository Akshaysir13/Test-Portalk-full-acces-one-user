const API_BASE = '/api';

function getDeviceToken(): string {
  let token = localStorage.getItem('device_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('device_token', token);
  }
  return token;
}

export interface User {
  id: number;
  email: string;
  role: string;
  approved: boolean;
}

export interface LoginResult {
  success: boolean;
  message: string;
  user?: User;
  isAdmin?: boolean;
}

export interface Violation {
  id: number;
  user_id: number;
  email: string;
  violation_type: string;
  old_device_token: string;
  new_device_token: string;
  user_agent: string;
  created_at: string;
}

export interface TestAttempt {
  id: number;
  user_id: number;
  student_email: string;
  test_name: string;
  test_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unattempted: number;
  time_taken: number;
  violations: string;
  submitted_at: string;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      deviceToken: getDeviceToken(),
      userAgent: navigator.userAgent,
    }),
  });
  return response.json();
}

export async function verifySession(userId: number): Promise<{ valid: boolean; message?: string }> {
  const response = await fetch(`${API_BASE}/verify-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      deviceToken: getDeviceToken(),
    }),
  });
  return response.json();
}

export async function logout(userId: number): Promise<void> {
  await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      deviceToken: getDeviceToken(),
    }),
  });
}

export async function signup(email: string, password: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}

export async function getUsers(): Promise<User[]> {
  try {
    const response = await fetch(`${API_BASE}/users`);
    if (!response.ok) return [];
    const text = await response.text();
    return text ? JSON.parse(text) : [];
  } catch {
    return [];
  }
}

export async function addUser(email: string, password: string, autoApprove: boolean): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/users/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, autoApprove }),
  });
  return response.json();
}

export async function approveUser(email: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/users/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return response.json();
}

export async function rejectUser(email: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/users/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return response.json();
}

export async function deleteUser(email: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/users/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
  return response.json();
}

export async function getViolations(): Promise<Violation[]> {
  try {
    const response = await fetch(`${API_BASE}/violations`);
    if (!response.ok) return [];
    const text = await response.text();
    return text ? JSON.parse(text) : [];
  } catch {
    return [];
  }
}

export async function getAttempts(): Promise<TestAttempt[]> {
  try {
    const response = await fetch(`${API_BASE}/attempts`);
    if (!response.ok) return [];
    const text = await response.text();
    return text ? JSON.parse(text) : [];
  } catch {
    return [];
  }
}

export async function saveAttempt(data: {
  userId: number;
  studentEmail: string;
  testName: string;
  testId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  timeTaken: number;
  violations: string[];
}): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export { getDeviceToken };
