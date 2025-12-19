'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import ImageCropper from '@/components/ImageCropper';
import MapModal from '@/components/map-modal';
import Link from 'next/link';
import { Settings, Wallet, MapPin, X } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<{
    username: string | null;
    profile_image_url: string | null;
    description: string | null;
    privacy_mode: 'auto' | 'approval';
    category: string | null;
    location: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [privacyMode, setPrivacyMode] = useState<'auto' | 'approval'>('auto');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [originalImageSrc, setOriginalImageSrc] = useState<string>('');
  const [showCropper, setShowCropper] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (!response.ok) throw new Error('Error al cargar perfil');
      const data = await response.json();
      setProfile(data.profile);
      setDescription(data.profile.description || '');
      setCategory(data.profile.category || '');
      setPrivacyMode(data.profile.privacy_mode || 'auto');
      setProfileImagePreview(data.profile.profile_image_url || '');
      setLocation(
        data.profile.location
          ? { lat: 0, lng: 0, address: data.profile.location }
          : null
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('La imagen no debe superar los 15MB');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageSrc = reader.result as string;
      setOriginalImageSrc(imageSrc);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedImage: string) => {
    fetch(croppedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'profile-image.jpg', { type: 'image/jpeg' });
        setProfileImage(file);
        setProfileImagePreview(croppedImage);
        setShowCropper(false);
      })
      .catch(err => {
        console.error('Error convirtiendo imagen:', err);
        setError('Error al procesar la imagen');
      });
  };

  const validateUrl = (text: string): boolean => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    if (!urls) return true;
    return urls.every(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });
  };

  const handleLocationSelect = (loc: { lat: number; lng: number; address: string }) => {
    setLocation(loc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    if (description && !validateUrl(description)) {
      setError('La descripción contiene URLs inválidas');
      setSaving(false);
      return;
    }

    try {
      const formData = new FormData();
      if (profileImage) {
        formData.append('image', profileImage);
      }
      formData.append('description', description);
      formData.append('category', category);
      formData.append('location', location?.address || '');
      formData.append('privacy_mode', privacyMode);

      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar');
      }

      await fetchProfile();
      setProfileImage(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 -mx-4 lg:mx-0">
        <main className="container mx-auto py-8">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Cargando...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 -mx-4 lg:mx-0">
      <main className="container mx-auto px-0 lg:px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración
            </CardTitle>
            <CardDescription>Gestiona tu perfil y preferencias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Sección Perfil */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Perfil</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Imagen de perfil
                  </label>
                  <div className="flex items-center gap-4">
                    {profileImagePreview && (
                      <div className="relative w-20 h-20 rounded-full overflow-hidden border border-border">
                        <img
                          src={profileImagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {profileImagePreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium mb-2">
                    Categoría
                  </label>
                  <Input
                    id="category"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Mejorá la busqueda describiendo tu actividad"
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium mb-2">
                    Ubicación
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="location"
                      type="text"
                      value={location?.address || ''}
                      readOnly
                      placeholder="Selecciona una ubicación en el mapa"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMapModal(true)}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Mapa
                    </Button>
                    {location && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-2">
                    Descripción
                  </label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe tu perfil (puedes incluir links)"
                    rows={4}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Puedes incluir URLs en tu descripción
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Privacidad de transferencias
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="privacy_mode"
                        value="auto"
                        checked={privacyMode === 'auto'}
                        onChange={(e) => setPrivacyMode(e.target.value as 'auto' | 'approval')}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">Automático</div>
                        <div className="text-xs text-muted-foreground">
                          Las transferencias se mostrarán automáticamente
                        </div>
                      </div>
                    </label>
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="privacy_mode"
                        value="approval"
                        checked={privacyMode === 'approval'}
                        onChange={(e) => setPrivacyMode(e.target.value as 'auto' | 'approval')}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">Requiere aprobación</div>
                        <div className="text-xs text-muted-foreground">
                          Necesitarás aprobar cada transferencia
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </form>
            </div>

            {/* Link a Wallets */}
            <div className="border-t border-border pt-4">
              <Link href="/dashboard/settings/wallets">
                <Button variant="outline" className="w-full justify-start">
                  <Wallet className="h-4 w-4 mr-2" />
                  Gestionar Wallets
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      <ImageCropper
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        onCropComplete={handleCropComplete}
        onImageChange={() => {
          setShowCropper(false);
          fileInputRef.current?.click();
        }}
        imageSrc={originalImageSrc}
      />

      <MapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={location ? { lat: location.lat, lng: location.lng } : undefined}
      />
    </div>
  );
}
