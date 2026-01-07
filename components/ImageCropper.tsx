'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, RotateCw, Check, Upload } from 'lucide-react';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImage: string) => void;
  onImageChange: () => void;
  imageSrc: string;
  aspect?: number; // Aspect ratio (width/height), default 1 (square)
  cropShape?: 'rect' | 'round'; // Shape of crop, default 'round'
  title?: string; // Title for the cropper, default 'Ajustar Imagen de Perfil'
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageCropper({ 
  isOpen, 
  onClose, 
  onCropComplete, 
  onImageChange, 
  imageSrc,
  aspect = 1,
  cropShape = 'round',
  title = 'Ajustar Imagen de Perfil'
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onRotationChange = useCallback((rotation: number) => {
    setRotation(rotation);
  }, []);

  const onCropAreaChange = useCallback((croppedArea: any, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: CropArea,
    rotation = 0
  ): Promise<string> => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    
    return new Promise((resolve) => {
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve('');
          return;
        }

        // Mantener dimensiones originales de la imagen recortada (máxima calidad)
        // Usar las dimensiones del crop directamente sin redimensionar
        const targetWidth = Math.round(pixelCrop.width);
        const targetHeight = Math.round(pixelCrop.height);
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        if (rotation !== 0) {
          ctx.translate(targetWidth / 2, targetHeight / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.translate(-targetWidth / 2, -targetHeight / 2);
        }

        // Dibujar la imagen recortada a tamaño completo (sin escalado)
        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          targetWidth,
          targetHeight
        );

        // Solo aplicar máscara circular si cropShape es 'round'
        if (cropShape === 'round') {
          ctx.globalCompositeOperation = 'destination-in';
          ctx.beginPath();
          ctx.arc(targetWidth / 2, targetHeight / 2, Math.min(targetWidth, targetHeight) / 2, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Usar PNG para máxima calidad sin pérdida (sin compresión)
        resolve(canvas.toDataURL('image/png'));
      };
      
      image.src = imageSrc;
    });
  };

  const handleCropComplete = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    
    setIsProcessing(true);
    
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onCropComplete(croppedImage);
      onClose();
      setIsProcessing(false);
    } catch (error) {
      console.error('Error cropping image:', error);
      setIsProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels, rotation, onCropComplete, onClose]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const cropperContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div 
        className="relative w-full max-w-md mx-4 border rounded-lg bg-background"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Cropper Container */}
        <div className="relative w-full h-80 bg-background">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            // rotation={rotation}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            // onRotationChange={onRotationChange}
            onCropAreaChange={onCropAreaChange}
            cropShape={cropShape}
            showGrid={false}
            aspect={aspect}
            restrictPosition={true}
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
                backgroundColor: '#000000',
              },
            }}
          />
        </div>

        {/* Controls */}
        <div className="hidden md:block p-4 space-y-4">
          {/* Zoom Control */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <ZoomIn className="h-4 w-4" />
              Zoom
            </label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1x</span>
              <span>3x</span>
            </div>
          </div>

          {/* Rotation Control */}
          {/*
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <RotateCw className="h-4 w-4" />
              Rotación
            </label>
            <input
              type="range"
              value={rotation}
              min={0}
              max={360}
              step={1}
              onChange={(e) => onRotationChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0°</span>
              <span>360°</span>
            </div>
          </div>
          */}
        </div>

        {/* Action Buttons */}
        <div className="p-4">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-md border px-4 py-2 hover:bg-muted disabled:opacity-50"
              disabled={isProcessing}
            >
              Cancelar
            </button>
            <button
              onClick={handleCropComplete}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-muted-foreground disabled:opacity-50"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Check className="h-4 w-4 mr-2" />
                  Aceptar
                </span>
              )}
            </button>
          </div>
          
          {/* Cambiar imagen button */}
          <button
            onClick={onImageChange}
            className="w-full mt-2 rounded-md border px-4 py-2 hover:bg-muted disabled:opacity-50"
            disabled={isProcessing}
          >
            <span className="flex items-center justify-center">
              <Upload className="h-4 w-4 mr-2" />
              Cambiar imagen
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(cropperContent, document.body);
}
