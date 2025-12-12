import Link from 'next/link';
import { getAuthCookie } from '@/lib/auth';
import { executeQuery } from '@/lib/db';

export default async function Header() {
  const userId = await getAuthCookie();
  let user = null;

  if (userId) {
    const users = await executeQuery(
      'SELECT id, email, username, profile_image_url FROM users WHERE id = $1',
      [userId]
    );
    if (users.length > 0) {
      user = users[0];
    }
  }

  return (
    <header className="border-b border-border bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          Sponsoreo
        </Link>
        <nav>
          {user ? (
            <Link href="/transfers" className="flex items-center gap-2">
              {user.profile_image_url ? (
                <img
                  src={user.profile_image_url}
                  alt={user.username || user.email}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {(user.username || user.email).charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-muted-foreground"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

