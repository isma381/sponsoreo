'use client';

import { useState } from 'react';
import Link from 'next/link';
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
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
          Por qué Sponsoreo?
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-muted border-border">
            <CardHeader>
              <Shield className="h-8 w-8 mb-2 text-foreground" />
              <CardTitle className="text-xl">Confianza</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-foreground/80">
                Registros históricos de transferencias que generan confianza en el mercado.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="bg-muted border-border">
            <CardHeader>
              <Eye className="h-8 w-8 mb-2 text-foreground" />
              <CardTitle className="text-xl">Transparencia</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-foreground/80">
                Si una transferencia puede ser pública, mostrala con una explicación clara.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="bg-muted border-border">
            <CardHeader>
              <TrendingUp className="h-8 w-8 mb-2 text-foreground" />
              <CardTitle className="text-xl">Facilitación</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-foreground/80">
                Facilitá acuerdos futuros mostrando tu historial de sponsoreo.
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
                Verificá tu wallet DEX en pocos pasos. Conectá tu wallet externa (Metamask, Uniswap, etc.) y empezá a mostrar tus transferencias.
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
              <CardTitle className="text-xl">Contribuciones de hinchas</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-foreground/80">
                Los hinchas pueden enviar transferencias a sus clubes y dejar un mensaje público. El mensaje es lo que se vende, la comunidad puede ver el apoyo.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Sponsoreo */}
          <Card className="bg-muted border-border md:col-span-1">
            <CardHeader>
              <Sparkles className="h-8 w-8 mb-2 text-foreground" />
              <CardTitle className="text-xl">Sponsoreo de empresas</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-foreground/80">
                Empresas y organizaciones hacen transferencias de inversión a clubes. Acciones de sponsoreo documentadas y públicas para generar confianza.
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
                Los hinchas pagan cuotas a cambio de beneficios del club. Sistema de membresía transparente y verificable.
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
          <div className="px-6 pb-6 space-y-4 mt-6">
            <ol className="space-y-4 list-decimal list-inside text-foreground">
              <li>Ingresar al exchange Ripio</li>
              <li>Cargar pesos argentinos</li>
              <li>Cambiarlos por el token wARS 1 a 1</li>
              <li>Descargar Uniswap (app de wallet DEX)</li>
              <li>Copiar tu address</li>
              <li>Enviar los wARS a tu address de Uniswap</li>
              <li>Verificar tu wallet en Sponsoreo haciendo una transferencia mínima de wARS 0.000001 (mínima cantidad de ERC-20)</li>
              <li>Listo, tu wallet ya está verificada y lista para usarse</li>
            </ol>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
