'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al enviar código');
      }

      const data = await response.json();
      setStep('code');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Código inválido');
      }

      const data = await response.json();
      router.push(data.redirect || '/transfers');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-muted p-8">
        <h1 className="text-2xl font-bold">
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h1>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="tu@email.com"
              />
            </div>
            {mode === 'login' && (
              <p className="text-sm text-gray-500">
                Enviaremos un código a tu mail para que inicies sesión
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-muted-foreground disabled:opacity-50"
            >
              {loading ? 'Enviando...' : mode === 'login' ? 'Enviar' : 'Registrarse'}
            </button>
            <p className="text-center text-sm text-gray-500">
              {mode === 'login' ? (
                <>
                  ¿No tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError('');
                    }}
                    className="text-primary hover:underline"
                  >
                    Regístrate
                  </button>
                </>
              ) : (
                <>
                  ¿Ya tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className="text-primary hover:underline"
                  >
                    Iniciar sesión
                  </button>
                </>
              )}
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium">
                Código de verificación
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="mt-1 w-full rounded-md border px-3 py-2 text-center text-2xl tracking-widest"
                placeholder="000000"
              />
              <p className="mt-1 text-xs text-gray-500">
                Ingresa el código de 6 dígitos enviado a {email}
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError('');
                }}
                className="rounded-md border px-4 py-2 hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-muted-foreground disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

