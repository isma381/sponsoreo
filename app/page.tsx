'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Shield, Eye, TrendingUp, MessageSquare, Sparkles, Users, Info, ArrowRight } from 'lucide-react';

// Importar Sheet dinámicamente sin SSR para evitar error de window durante build
const Sheet = dynamic(() => import('@/components/ui/sheet').then(mod => ({ default: mod.Sheet })), { ssr: false });
const SheetContent = dynamic(() => import('@/components/ui/sheet').then(mod => ({ default: mod.SheetContent })), { ssr: false });
const SheetHeader = dynamic(() => import('@/components/ui/sheet').then(mod => ({ default: mod.SheetHeader })), { ssr: false });
const SheetTitle = dynamic(() => import('@/components/ui/sheet').then(mod => ({ default: mod.SheetTitle })), { ssr: false });

export default function Home() {
  const [showSteps, setShowSteps] = useState(false);

  const scrollToHow = () => {
    document.getElementById('como')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center py-20 md:py-32 text-center">
        <h1 className="text-hero-mobile md:text-6xl font-bold mb-6 text-foreground">
          Facilitá el <b><em>sponsoreo</em></b> de tu club
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
        Por qué no sponsorear lo que no se puede ocultar?
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-primary text-primary-foreground">
            <Link href="/login">Crear cuenta</Link>
          </Button>
          <Button variant="outline" size="lg" onClick={scrollToHow}>
            Ver cómo funciona
          </Button>
        </div>
      </section>

      {/* Sección Por qué */}
      <section className="py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-foreground">
          Por qué Sponsoreo?
        </h2>
        <p className="text-lg md:text-xl text-center text-muted-foreground mb-12 max-w-3xl mx-auto px-4">
          Si una transferencia entre organizaciones puede ser pública,
          <br />
          ¿por qué no sponsorearla tambíén?
          <br />
          Convertí la transparencia en confianza y facilitá acuerdos futuros.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-muted border-border bg-gradient-to-b from-primary/10 to-primary/5r">
            <CardHeader className="!pb-2">
              <Shield className="h-8 w-8 mb-2 text-foreground" />
              <CardTitle className="text-xl">Confianza</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-s text-foreground/80">
                Las transferencias entre organizaciones pueden filtrarse o ser públicas. En lugar de ocultarlas, mostralas y generá confianza.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="bg-muted border-border bg-gradient-to-b from-primary/10 to-primary/5r">
            <CardHeader className="!pb-2">
              <Eye className="h-8 w-8 mb-2 text-foreground" />
              <CardTitle className="text-xl">Transparencia</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-s text-foreground/80">
                Si una transferencia puede ser pública, mostrala con una explicación clara del acuerdo. Transparencia que construye reputación.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="bg-muted border-border bg-gradient-to-b from-primary/10 to-primary/5r">
            <CardHeader className="!pb-2">
              <TrendingUp className="h-8 w-8 mb-2 text-foreground" />
              <CardTitle className="text-xl">Facilitación</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-s text-foreground/80">
                Registros históricos documentados facilitan acuerdos futuros. Tu historial de sponsoreo se convierte en tu mejor carta de presentación.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Sección Cómo */}
      <section id="como" className="py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
          Cómo funciona Sponsoreo?
        </h2>

        {/* Fila de iconos con flechas */}
        <div className="flex flex-row items-center justify-center gap-2 md:gap-6 mb-12 w-full">
          {/* Ripio */}
          <Link href="https://www.ripio.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center flex-1 max-w-[80px] md:max-w-[96px]">
            <div className="relative w-full aspect-square rounded-3xl bg-background overflow-hidden shadow-lg">
              <Image 
                src="/ripio-logo.png" 
                alt="Ripio" 
                fill
                className="object-cover"
              />
            </div>
            <p className="mt-2 text-xs md:text-base font-medium text-foreground">Ripio</p>
          </Link>

          {/* Flecha 1 */}
          <ArrowRight className="h-4 w-4 md:h-8 md:w-8 text-white flex-shrink-0" />

          {/* Uniswap */}
          <Link href="https://app.uniswap.org/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center flex-1 max-w-[80px] md:max-w-[96px]">
            <div className="relative w-full aspect-square rounded-3xl bg-background overflow-hidden shadow-lg">
              <Image 
                src="/uniswap-uni-logo-w-o.svg" 
                alt="Uniswap" 
                fill
                className="object-cover"
              />
            </div>
            <p className="mt-2 text-xs md:text-base font-medium text-foreground">Uniswap</p>
          </Link>

          {/* Flecha 2 */}
          <ArrowRight className="h-4 w-4 md:h-8 md:w-8 text-white flex-shrink-0" />

          {/* Sponsoreo */}
          <div className="flex flex-col items-center flex-1 max-w-[80px] md:max-w-[96px]">
            <div className="relative w-full aspect-square rounded-3xl border bg-background overflow-hidden shadow-lg">
              <Image 
                src="/sponsoreo-icon.svg" 
                alt="Sponsoreo" 
                fill
                className="object-cover"
              />
            </div>
            <p className="mt-2 text-xs md:text-base font-medium text-foreground">Sponsoreo</p>
          </div>
        </div>

        {/* Onboarding Card */}
        <div className="mb-12 max-w-2xl mx-auto">
          <Card className="bg-muted border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Info className="h-6 w-6 text-foreground" />
                <CardTitle className="text-xl">Empezá en minutos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-foreground/80 mb-4">
                Conectá tu wallet DEX en pocos pasos. Verificá tu wallet externa (Metamask, Uniswap, etc.) y empezá a mostrar tus transferencias.
              </CardDescription>
              <Button variant="outline" onClick={() => setShowSteps(true)}>
                Ver guía paso a paso
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 3 Cards de Transferencias */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Genéricas */}
          <Card className="bg-muted border-border md:col-span-1">
            <CardHeader>
              <MessageSquare className="h-8 w-8 mb-2 text-foreground" />
              <CardTitle className="text-xl">Contribuciones</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-foreground/80">
                Enviá una transferencia a tu club y deja un mensaje público.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Sponsoreo */}
          <Card className="bg-muted border-border md:col-span-1">
            <CardHeader>
              <Sparkles className="h-8 w-8 mb-2 text-foreground" />
              <CardTitle className="text-xl">Sponsoreo</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-foreground/80">
                Registro histórico de transferencias, con multimedia descripción úbicación y categoría
              </CardDescription>
            </CardContent>
          </Card>

          {/* Socios */}
          <Card className="bg-muted border-border md:col-span-1">
            <CardHeader>
              <Users className="h-8 w-8 mb-2 text-foreground" />
              <CardTitle className="text-xl">Cuotas de socios</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-foreground/80">
              Recibí y administrá transferencias privadas de tus socios.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer/CTA Final */}
      <section className="py-16 md:py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
          Listo para facilitar el sponsoreo de tu club?
        </h2>
        <Button asChild size="lg" className="bg-primary text-primary-foreground">
          <Link href="/dashboard">
            Empezar ahora
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>

      {/* Sheet Modal - Paso a Paso Argentino */}
      <Sheet open={showSteps} onOpenChange={setShowSteps}>
        <SheetContent onClose={() => setShowSteps(false)}>
          <SheetHeader>
            <SheetTitle>Cómo verificar tu wallet (Argentina)</SheetTitle>
          </SheetHeader>
          <div className="px-4 md:px-6 pb-6 space-y-6 mt-6">
            {/* Paso 1 - Ripio */}
            <div className="flex items-start gap-3 md:gap-4">
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <span className="text-xl md:text-2xl font-bold text-foreground">1.</span>
                <div className="relative w-10 h-10 md:w-12 md:h-12 aspect-square rounded-xl md:rounded-2xl bg-background overflow-hidden shadow-md">
                  <Image 
                    src="/ripio-logo.png" 
                    alt="Ripio" 
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <p className="text-sm md:text-base text-foreground pt-1">
                <strong>En Ripio:</strong> Ingresá pesos, cambiálos por wARS 1 a 1 y por ETH (necesario para el coste de las transferencias que mantiene a la red, ~$100 pesos por transferencia)
              </p>
            </div>

            {/* Paso 2 - Uniswap */}
            <div className="flex items-start gap-3 md:gap-4">
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <span className="text-xl md:text-2xl font-bold text-foreground">2.</span>
                <div className="relative w-10 h-10 md:w-12 md:h-12 aspect-square rounded-xl md:rounded-2xl bg-background overflow-hidden shadow-md">
                  <Image 
                    src="/uniswap-uni-logo-w-o.svg" 
                    alt="Uniswap" 
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <p className="text-sm md:text-base text-foreground pt-1">
                <strong>En Uniswap:</strong> Copiá tu address y enviá los ETH y wARS a tu wallet
              </p>
            </div>

            {/* Paso 3 - Sponsoreo */}
            <div className="flex items-start gap-3 md:gap-4">
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <span className="text-xl md:text-2xl font-bold text-foreground">3.</span>
                <div className="relative w-10 h-10 md:w-12 md:h-12 aspect-square rounded-xl md:rounded-2xl border bg-background overflow-hidden shadow-md">
                  <Image 
                    src="/sponsoreo-icon.svg" 
                    alt="Sponsoreo" 
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <p className="text-sm md:text-base text-foreground pt-1">
                <strong>En Sponsoreo:</strong> Verificá tu wallet haciendo una transferencia mínima desde Uniswap de wARS 0.000001
              </p>
            </div>

            {/* Paso 4 - Listo */}
            <div className="flex items-start gap-3 md:gap-4">
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <span className="text-xl md:text-2xl font-bold text-foreground">4.</span>
                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl bg-muted border border-border">
                  <ArrowRight className="h-5 w-5 md:h-6 md:w-6 text-foreground rotate-[-45deg]" />
                </div>
              </div>
              <p className="text-sm md:text-base text-foreground pt-1">
              Listo! Tu wallet ya está verificada y lista para utilizarse en Sponsoreo
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
