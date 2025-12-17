'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ImageCropper from '@/components/ImageCropper';
import MapModal from '@/components/map-modal';
import { Upload, MapPin, X } from 'lucide-react';
import Image from 'next/image';

interface EditTransferFormProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: {
    id: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5MB');
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

    setIsSaving(true);
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

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Transferencia</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {imagePreview ? 'Cambiar' : 'Subir'} imagen
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
