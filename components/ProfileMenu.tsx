'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProfileMenuProps {
  profileImageUrl?: string | null;
  username?: string | null;
  email?: string | null;
}

export default function ProfileMenu({ profileImageUrl, username, email }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 cursor-pointer"
      >
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={username || email || 'Perfil'}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {(username || email || 'U').charAt(0).toUpperCase()}
          </div>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 rounded-md border border-border bg-muted shadow-lg z-50">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-sm hover:bg-muted-foreground/20 rounded-md"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
