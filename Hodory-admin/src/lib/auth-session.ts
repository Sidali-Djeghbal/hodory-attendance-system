export const SESSION_COOKIE = 'hodory_session';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: 'admin';
};

export type Session = {
  user: SessionUser;
};

export function encodeSession(session: Session): string {
  return Buffer.from(JSON.stringify(session), 'utf8').toString('base64');
}

export function decodeSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(json) as Session;
  } catch {
    return null;
  }
}

