export type StoredUser = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  department?: string | null;
};

const TOKEN_KEY = 'hodory_teacher_token';
const USER_KEY = 'hodory_teacher_user';

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function readStoredAuth(): { token: string | null; user: StoredUser | null } {
  if (!isBrowser()) return { token: null, user: null };
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  const user = rawUser ? (JSON.parse(rawUser) as StoredUser) : null;
  return { token, user };
}

export function writeStoredAuth(next: { token: string; user: StoredUser }) {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_KEY, next.token);
  localStorage.setItem(USER_KEY, JSON.stringify(next.user));
}

export function clearStoredAuth() {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

