/**
 * Bootstrap admins: comma-separated ADMIN_EMAILS. A user with one of these
 * e-mails gets the persisted 'admin' role (user_roles) on the first
 * authenticated request after registering. More admins can be added as rows
 * in user_roles without touching env.
 */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
