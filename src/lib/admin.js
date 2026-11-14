// Owner accounts are always admins (must match isOwner() in firestore.rules).
export const OWNER_EMAILS = ['naftieshmandal02@gmail.com'];

export const isAdminUser = (user, profile) =>
  !!user && (profile?.role === 'admin' || OWNER_EMAILS.includes((user.email || '').toLowerCase()));
