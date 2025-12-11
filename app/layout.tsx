import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

