'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
        <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-muted shadow-lg z-50">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-muted-foreground/20 rounded-t-md"
          >
            Inicio
          </Link>
          <Link
            href="/transfers"
            onClick={() => setIsOpen(false)}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-muted-foreground/20"
          >
            Transferencias
          </Link>
          <div className="border-t border-border my-1"></div>
          {username && (
            <Link
              href={`/u/${username}`}
              onClick={() => setIsOpen(false)}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-muted-foreground/20"
            >
              Mi perfil
            </Link>
          )}
          <Link
            href="/dashboard"
            onClick={() => {
              setIsOpen(false);
              console.log('[Dashboard Navigation] Evento disparado desde ProfileMenu');
              window.dispatchEvent(new CustomEvent('dashboard-navigation'));
            }}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-muted-foreground/20"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/settings"
            onClick={() => setIsOpen(false)}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-muted-foreground/20"
          >
            Ajustes
          </Link>
          <Link
            href="/dashboard/settings/wallets"
            onClick={() => setIsOpen(false)}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-muted-foreground/20"
          >
            Mis Wallets
          </Link>
          <div className="border-t border-border my-1"></div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-sm hover:bg-muted-foreground/20 rounded-b-md"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
