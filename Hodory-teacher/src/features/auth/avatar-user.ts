import type { StoredUser } from './auth-storage';

export function toAvatarUser(user: StoredUser | null) {
  if (!user) return null;
  return {
    imageUrl: '',
    fullName: user.full_name,
    emailAddresses: [{ emailAddress: user.email }]
  };
}

