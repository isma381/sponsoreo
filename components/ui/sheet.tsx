'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn('fixed inset-0 z-50 bg-black/80', className)}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, children, ...props }, ref) => {
  const [y, setY] = React.useState(0);
  const startY = React.useRef(0);
  const dragging = React.useRef(false);
  const yRef = React.useRef(0);

  const start = React.useCallback((clientY: number) => {
    dragging.current = true;
    startY.current = clientY;
    yRef.current = 0;
    document.body.style.overflow = 'hidden';
  }, []);

  const move = React.useCallback((clientY: number) => {
    if (!dragging.current) return;
    const delta = clientY - startY.current;
    if (delta > 0) {
      yRef.current = delta;
      setY(delta);
    }
  }, []);

  const end = React.useCallback(() => {
    if (!dragging.current) return;
    const currentY = yRef.current;
    dragging.current = false;
    setY(0);
    yRef.current = 0;
    document.body.style.overflow = '';
    if (currentY > 100) {
      setTimeout(() => {
        const overlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
        overlay?.click();
      }, 0);
    }
  }, []);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => move(e.clientY);
    const onUp = () => end();
    const onTouchMove = (e: TouchEvent) => {
      if (dragging.current) {
        e.preventDefault();
        move(e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => end();

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [move, end]);

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-2xl border-t border-border bg-muted',
          !dragging.current && 'transition-transform duration-300',
          className
        )}
        style={{ transform: y > 0 ? `translateY(${y}px)` : undefined }}
        {...props}
      >
        <div
          className="mx-auto mt-2 mb-4 h-1 w-12 rounded-full bg-muted-foreground/30 cursor-grab active:cursor-grabbing select-none"
          onTouchStart={(e) => start(e.touches[0].clientY)}
          onMouseDown={(e) => start(e.clientY)}
        />
        {children}
      </DialogPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle };
