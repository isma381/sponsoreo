'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ImageCropper from '@/components/ImageCropper';
import MapModal from '@/components/map-modal';
import { Upload, MapPin, X } from 'lucide-react';
import Image from 'next/image';
import * as nsfwjs from 'nsfwjs';

interface EditTransferFormProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: {
    id: string;
    transfer_type?: string;
    image_url?: string | null;
    category?: string | null;
    location?: string | null;
    description?: string | null;
  };
  onSave: (data: {
    image?: File;
    category?: string;
    location?: string;
    description?: string;
  }) => Promise<void>;
}

export default function EditTransferForm({ isOpen, onClose, transfer, onSave }: EditTransferFormProps) {
  const transferType = transfer.transfer_type || 'generic';
  
  // Solo permitir edición si es tipo 'sponsoreo'
  if (transferType !== 'sponsoreo') {
    return null;
  }

  const [category, setCategory] = useState(transfer.category || '');
  const [description, setDescription] = useState(transfer.description || '');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(
    transfer.location ? { lat: 0, lng: 0, address: transfer.location } : null
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(transfer.image_url || null);
  const [showCropper, setShowCropper] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string>('');
  const [showMapModal, setShowMapModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [nsfwModel, setNsfwModel] = useState<any>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadModel = async () => {
      setIsModelLoading(true);
      try {
        const model = await nsfwjs.load();
        setNsfwModel(model);
        console.log('Modelo NSFW cargado correctamente');
      } catch (err) {
        console.error('Error cargando modelo NSFW:', err);
      } finally {
        setIsModelLoading(false);
      }
    };
    if (isOpen && !nsfwModel && !isModelLoading) {
      loadModel();
    }
  }, [isOpen, nsfwModel, isModelLoading]);

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

  const analyzeImage = async (imageSrc: string): Promise<boolean> => {
    if (!nsfwModel) {
      console.warn('Modelo NSFW no disponible, bloqueando por seguridad');
      return false; // Bloquear si el modelo no está disponible (más seguro)
    }

    try {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        // Timeout de seguridad
        setTimeout(() => reject(new Error('Timeout cargando imagen')), 10000);
      });
      
      const predictions = await nsfwModel.classify(img);
      const pornScore = predictions.find((p: any) => p.className === 'Porn')?.probability || 0;
      const hentaiScore = predictions.find((p: any) => p.className === 'Hentai')?.probability || 0;
      const sexyScore = predictions.find((p: any) => p.className === 'Sexy')?.probability || 0;
      
      console.log('NSFW Scores:', { porn: pornScore, hentai: hentaiScore, sexy: sexyScore });
      
      // Bloquear si porn o hentai > 0.2, o sexy > 0.5 (umbrales más estrictos)
      if (pornScore > 0.2 || hentaiScore > 0.2 || sexyScore > 0.5) {
        console.log('Imagen bloqueada por contenido NSFW');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error analizando imagen:', err);
      return false; // Bloquear en caso de error (más seguro)
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5MB');
      return;
    }

    setError('');
    setIsAnalyzing(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageSrc = reader.result as string;
      
      // Esperar a que el modelo esté cargado si aún no lo está
      if (!nsfwModel && isModelLoading) {
        // Esperar máximo 10 segundos
        let attempts = 0;
        while (!nsfwModel && isModelLoading && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
      }
      
      // Analizar imagen con NSFWJS solo si el modelo está disponible
      if (nsfwModel) {
        const isSafe = await analyzeImage(imageSrc);
        
        if (!isSafe) {
          setError('La imagen contiene contenido inapropiado y no puede ser subida');
          setIsAnalyzing(false);
          setImageFile(null);
          setImagePreview(null);
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
    fetch(croppedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'transfer-image.jpg', { type: 'image/jpeg' });
        setImageFile(file);
        setImagePreview(croppedImage);
        setShowCropper(false);
      })
      .catch(err => {
        console.error('Error convirtiendo imagen:', err);
        setError('Error al procesar la imagen');
      });
  };

  const handleLocationSelect = (loc: { lat: number; lng: number; address: string }) => {
    setLocation(loc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (description && !validateUrl(description)) {
      setError('La descripción contiene URLs inválidas');
      return;
    }

    // Validar imagen NSFW antes de enviar
    if (imageFile) {
      setIsSaving(true);
      
      try {
        const imageSrc = URL.createObjectURL(imageFile);
        const isSafe = await analyzeImage(imageSrc);
        URL.revokeObjectURL(imageSrc);
        
        if (!isSafe) {
          setError('La imagen contiene contenido inapropiado y no puede ser subida');
          setIsSaving(false);
          setImageFile(null);
          setImagePreview(null);
          return;
        }
      } catch (err) {
        console.error('Error validando imagen:', err);
        setError('Error al validar la imagen. Por favor, intenta nuevamente.');
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(true);
    setError('');
    try {
      await onSave({
        image: imageFile || undefined,
        category: category.trim() || undefined,
        location: location?.address || undefined,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen && !showCropper} onOpenChange={showCropper ? undefined : onClose}>
        <SheetContent onClose={showCropper ? undefined : onClose} className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Transferencia</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
            {/* Imagen */}
            <div>
              <label className="block text-sm font-medium mb-2">Imagen</label>
              <div className="flex items-center gap-4">
                {imagePreview && (
                  <div className="relative w-32 rounded-lg overflow-hidden border" style={{ aspectRatio: '9/16' }}>
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isAnalyzing ? 'Analizando...' : imagePreview ? 'Cambiar' : 'Subir'} imagen
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Categoría */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-2">
                Categoría
              </label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej: Futsal, Fútbol, etc."
              />
            </div>

            {/* Ubicación */}
            <div>
              <label className="block text-sm font-medium mb-2">Ubicación</label>
              <div className="flex items-center gap-2">
                <Input
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

            {/* Descripción */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Descripción
              </label>
              <p className="text-xs text-muted-foreground mb-2">
              Podes agregar links usando "https://" (ej: https://instagram.com/mi_perfil)
              </p>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción con links opcionales..."
                rows={4}
              />
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="flex-1">
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {showCropper && (
        <ImageCropper
          isOpen={showCropper}
          onClose={() => setShowCropper(false)}
          onCropComplete={handleCropComplete}
          onImageChange={() => {
            setShowCropper(false);
            fileInputRef.current?.click();
          }}
          imageSrc={originalImageSrc}
          aspect={9/16}
          cropShape="rect"
          title="Ajustar Imagen de Transferencia"
        />
      )}

      <MapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={location ? { lat: location.lat, lng: location.lng } : undefined}
      />
    </>
  );
}
