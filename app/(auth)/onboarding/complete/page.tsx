'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function CompleteProfilePage() {
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    checkVerification();
  }, []);

  const checkVerification = async () => {
    try {
      const response = await fetch('/api/wallet/status');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Error al verificar estado');
      }

      const data = await response.json();
      if (!data.wallet || data.wallet.status !== 'verified') {
        router.push('/onboarding');
        return;
      }

      setChecking(false);
    } catch (err: any) {
      console.error('Error verificando estado:', err);
      router.push('/onboarding');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }

    // Validar tamaño (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setError('La imagen no debe superar los 15MB');
      return;
    }

    setProfileImage(file);
    setError('');

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!username.trim()) {
        throw new Error('El username es requerido');
      }

      // Validar formato de username (solo letras, números, guiones y guiones bajos)
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        throw new Error('El username solo puede contener letras, números, guiones y guiones bajos');
      }

      const formData = new FormData();
      formData.append('username', username.trim());
      if (profileImage) {
        formData.append('image', profileImage);
      }

      const response = await fetch('/api/profile/complete', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar perfil');
      }

      router.push('/transfers');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-8">
          <p className="text-center text-muted-foreground">Verificando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-8">
        <h1 className="text-2xl font-bold">Completar Perfil</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              required
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="tu_username"
              pattern="[a-zA-Z0-9_-]+"
            />
            <p className="mt-1 text-xs text-gray-500">
              Solo letras, números, guiones y guiones bajos. No podrás cambiarlo después.
            </p>
          </div>

          <div>
            <label htmlFor="image" className="block text-sm font-medium mb-2">
              Imagen de perfil (opcional)
            </label>
            <div className="space-y-2">
              {profileImagePreview && (
                <div className="relative w-24 h-24 rounded-full overflow-hidden border border-gray-600">
                  <img
                    src={profileImagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <input
                ref={fileInputRef}
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border px-4 py-2 hover:bg-gray-700"
              >
                {profileImagePreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
              </button>
              {profileImage && (
                <p className="text-xs text-gray-500">
                  {profileImage.name} ({(profileImage.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
