import Link from 'next/link';
import { getAuthCookie } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import ProfileMenu from '@/components/ProfileMenu';

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
            <ProfileMenu
              profileImageUrl={user.profile_image_url}
              username={user.username}
              email={user.email}
            />
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

