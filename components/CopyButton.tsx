'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md hover:bg-muted-foreground/10"
    >
      {copied ? (
        <Check className="h-4 w-4 text-foreground" />
      ) : (
        <Copy className="h-4 w-4 text-foreground" />
      )}
    </button>
  );
}

