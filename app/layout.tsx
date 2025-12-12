import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Sponsoreo",
  description: "Aplicación para mostrar transferencias USDC entre wallets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Header />
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

