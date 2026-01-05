'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ImageCropper from '@/components/ImageCropper';
import * as nsfwjs from 'nsfwjs';

export default function CompleteProfilePage() {
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [originalImageSrc, setOriginalImageSrc] = useState<string>('');
  const [showCropper, setShowCropper] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const [privacyMode, setPrivacyMode] = useState<'auto' | 'approval'>('auto');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [nsfwModel, setNsfwModel] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cargar modelo NSFW inmediatamente al montar (en paralelo con otras operaciones)
  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('[Onboarding] Cargando modelo NSFW...');
        const model = await nsfwjs.load();
        setNsfwModel(model);
        console.log('[Onboarding] Modelo NSFW cargado correctamente');
      } catch (err) {
        console.error('[Onboarding] Error cargando modelo NSFW:', err);
      }
    };
    loadModel();
  }, []);

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

  const analyzeImage = async (imageSrc: string): Promise<boolean> => {
    if (!nsfwModel) {
      console.warn('Modelo NSFW no disponible, bloqueando por seguridad');
      return false;
    }

    try {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(() => reject(new Error('Timeout cargando imagen')), 10000);
      });
      
      const predictions = await nsfwModel.classify(img);
      const pornScore = predictions.find((p: any) => p.className === 'Porn')?.probability || 0;
      const hentaiScore = predictions.find((p: any) => p.className === 'Hentai')?.probability || 0;
      const sexyScore = predictions.find((p: any) => p.className === 'Sexy')?.probability || 0;
      
      console.log('NSFW Scores:', { porn: pornScore, hentai: hentaiScore, sexy: sexyScore });
      
      if (pornScore > 0.2 || hentaiScore > 0.2 || sexyScore > 0.5) {
        console.log('Imagen bloqueada por contenido NSFW');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error analizando imagen:', err);
      return false;
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

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

    setError('');
    setIsAnalyzing(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageSrc = reader.result as string;
      
      // Esperar a que el modelo esté cargado si aún no lo está
      if (!nsfwModel) {
        let attempts = 0;
        while (!nsfwModel && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
      }
      
      // Analizar imagen con NSFWJS
      if (nsfwModel) {
        const isSafe = await analyzeImage(imageSrc);
        
        if (!isSafe) {
          setError('La imagen contiene contenido inapropiado y no puede ser subida');
          setIsAnalyzing(false);
          setProfileImage(null);
          setProfileImagePreview('');
          return;
        }
      }

      setIsAnalyzing(false);
      setOriginalImageSrc(imageSrc);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedImage: string) => {
    // Convertir base64 a File
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

  const handleImageChangeClick = () => {
    setShowCropper(false);
    fileInputRef.current?.click();
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

      // Validar imagen NSFW antes de enviar
      if (profileImage) {
        try {
          const imageSrc = URL.createObjectURL(profileImage);
          const isSafe = await analyzeImage(imageSrc);
          URL.revokeObjectURL(imageSrc);
          
          if (!isSafe) {
            setError('La imagen contiene contenido inapropiado y no puede ser subida');
            setLoading(false);
            setProfileImage(null);
            setProfileImagePreview('');
            return;
          }
        } catch (err) {
          console.error('Error validando imagen:', err);
          setError('Error al validar la imagen. Por favor, intenta nuevamente.');
          setLoading(false);
          return;
        }
      }

      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('privacy_mode', privacyMode);
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
        <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-muted p-8">
          <p className="text-center text-muted-foreground">Verificando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-muted p-8">
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
                disabled={isAnalyzing}
                className="rounded-md border px-4 py-2 hover:bg-gray-700 disabled:opacity-50"
              >
                {isAnalyzing ? 'Analizando...' : profileImagePreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
              </button>
              {profileImage && (
                <p className="text-xs text-gray-500">
                  {profileImage.name} ({(profileImage.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
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

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-muted-foreground disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </form>
      </div>

      {/* Image Cropper Modal */}
      <ImageCropper
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        onCropComplete={handleCropComplete}
        onImageChange={handleImageChangeClick}
        imageSrc={originalImageSrc}
      />
    </div>
  );
}
