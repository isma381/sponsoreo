'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { X } from 'lucide-react';

interface GenericMessageFormProps {
  isOpen: boolean;
  onClose: () => void;
  transferId: string;
  currentMessage?: string | null;
  onSave: (message: string) => Promise<void>;
}

// Función para validar que no haya links
function hasLinks(text: string): boolean {
  const urlRegex = /(https?:\/\/|www\.|[\w-]+\.(com|org|net|io|co|edu|gov|mil|int|ar|es|mx|br|cl|pe|uy|py|bo|ec|ve|cr|pa|do|gt|hn|ni|sv|cu|pr|jm|tt|bb|gd|lc|vc|ag|dm|kn|bs|bz|gy|sr|gf|fk|ai|vg|ms|tc|ky|bm|fk|gs|sh|pn|io|ac|cc|tv|ws|tk|ml|ga|cf|cd|cm|cg|ci|bj|bf|td|ne|mr|sn|gm|gw|gn|sl|lr|tg|gh|ng|st|gq|ga|ao|zm|zw|mw|mz|mg|mu|sc|km|yt|re|bi|rw|ug|ke|tz|et|so|dj|er|sd|ss|ly|tn|dz|ma|eh|es|pt|ad|mc|sm|va|it|mt|gr|al|me|ba|rs|mk|bg|ro|md|ua|by|lt|lv|ee|fi|se|no|dk|is|ie|gb|nl|be|lu|ch|li|at|cz|sk|hu|si|hr|pl|de|fr|ru|tr|ge|am|az|kz|uz|tm|kg|tj|af|pk|in|bd|lk|mv|np|bt|mm|th|la|kh|vn|ph|my|sg|bn|id|tl|au|nz|pg|sb|vu|nc|pf|ws|to|fj|ki|nr|pw|fm|mh|as|gu|mp|vi|pr|do|ht|jm|tt|bb|gd|lc|vc|ag|dm|kn|bs|bz|gy|sr|gf|fk|ai|vg|ms|tc|ky|bm|fk|gs|sh|pn|io|ac|cc|tv|ws|tk|ml|ga|cf|cd|cm|cg|ci|bj|bf|td|ne|mr|sn|gm|gw|gn|sl|lr|tg|gh|ng|st|gq|ga|ao|zm|zw|mw|mz|mg|mu|sc|km|yt|re|bi|rw|ug|ke|tz|et|so|dj|er|sd|ss|ly|tn|dz|ma|eh|es|pt|ad|mc|sm|va|it|mt|gr|al|me|ba|rs|mk|bg|ro|md|ua|by|lt|lv|ee|fi|se|no|dk|is|ie|gb|nl|be|lu|ch|li|at|cz|sk|hu|si|hr|pl|de|fr|ru|tr|ge|am|az|kz|uz|tm|kg|tj|af|pk|in|bd|lk|mv|np|bt|mm|th|la|kh|vn|ph|my|sg|bn|id|tl|au|nz|pg|sb|vu|nc|pf|ws|to|fj|ki|nr|pw|fm|mh|as|gu|mp|vi))/i;
  return urlRegex.test(text);
}

// Función para contar palabras
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

export default function GenericMessageForm({ isOpen, onClose, transferId, currentMessage, onSave }: GenericMessageFormProps) {
  const [message, setMessage] = useState(currentMessage || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');

  // Actualizar mensaje cuando cambia currentMessage (para edición)
  useEffect(() => {
    if (isOpen) {
      setMessage(currentMessage || '');
      setError('');
    }
  }, [currentMessage, isOpen]);

  const wordCount = countWords(message);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedMessage = message.trim();

    // Validar max 100 palabras
    if (wordCount > 100) {
      setError('El mensaje no puede tener más de 100 palabras');
      return;
    }

    // Validar sin links
    if (hasLinks(trimmedMessage)) {
      setError('El mensaje no puede contener links');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedMessage);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar mensaje');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent onClose={onClose} className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{currentMessage ? 'Editar Mensaje' : 'Agregar Mensaje'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">
              Mensaje
            </label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              rows={6}
              className="bg-input border-border text-foreground"
            />
            <div className="mt-2 text-xs text-muted-foreground">
              {wordCount} / 100 palabras
            </div>
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
            <Button type="submit" disabled={isSaving || wordCount === 0} className="flex-1 bg-primary text-primary-foreground">
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

