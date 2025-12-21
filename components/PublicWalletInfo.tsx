'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { X } from 'lucide-react';

export function PublicWalletInfo() {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setShowDetails(true)}
      >
        <Info className="h-4 w-4 text-foreground" />
      </Button>

      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent className="max-h-[90vh]" onClose={() => setShowDetails(false)}>
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Información</SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowDetails(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
          
          <div className="px-6 pb-6 space-y-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <p className="text-sm text-foreground">
                Si envías tokens a esta dirección con tu wallet verificada, podrás agregar un mensaje personalizado a la transferencia.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

