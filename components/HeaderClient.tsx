'use client';

import Link from 'next/link';
import ProfileMenu from '@/components/ProfileMenu';

interface User {
  id: string;
  email: string;
  username: string;
  profile_image_url: string | null;
}

interface HeaderClientProps {
  user: User | null;
}

export default function HeaderClient({ user }: HeaderClientProps) {
  return (
    <nav className="flex items-center gap-4">
      <Link
        href="/transfers"
        prefetch={true}
        className="text-sm hover:text-muted-foreground transition-colors"
      >
        Transferencias
      </Link>
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
  );
}

