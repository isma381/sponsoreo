import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import Header from "@/components/header";
import StickyHeader from "@/components/StickyHeader";

export const metadata: Metadata = {
  title: "Uni-On",
  description: "Registro histórico de transferencias verificables",
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
          <StickyHeader>
            <Header />
          </StickyHeader>
          <div className="px-4 lg:px-[12rem]">
            {children}
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

