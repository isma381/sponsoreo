import Link from 'next/link';
import { getAuthCookie } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import HeaderClient from '@/components/HeaderClient';

interface User {
  id: string;
  email: string;
  username: string;
  profile_image_url: string | null;
}

export default async function Header() {
  const userId = await getAuthCookie();
  let user: User | null = null;

  if (userId) {
    const users = await executeQuery(
      'SELECT id, email, username, profile_image_url FROM users WHERE id = $1',
      [userId]
    );
    user = users.length > 0 ? users[0] : null;
  }

  return (
    <header className="border-b border-border bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
        <b><em>Uni-On</em></b>
        </Link>
        <HeaderClient user={user} />
      </div>
    </header>
  );
}

