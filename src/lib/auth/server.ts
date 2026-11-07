import 'server-only';

import { redirect } from 'next/navigation';
import { getCurrentUser, type CurrentUser } from './get-current-user';

export { getCurrentUser, type CurrentUser };

export function loginPath(returnTo: string) {
  return `/prijava?redirect=${encodeURIComponent(returnTo)}`;
}

/** Customer pages: redirects to login and back afterwards. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath(returnTo));
  return user;
}

/** Admin pages: not logged in → login, logged in but not admin → home. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath('/admin'));
  if (!user.isAdmin) redirect('/');
  return user;
}

export class ForbiddenError extends Error {
  constructor() {
    super('Nemate pristup.');
  }
}

/** Admin server actions and route handlers: throws instead of redirecting. */
export async function assertAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new ForbiddenError();
  return user;
}
