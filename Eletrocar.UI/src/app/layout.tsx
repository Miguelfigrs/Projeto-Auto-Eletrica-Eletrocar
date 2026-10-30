import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "../index.css";
import { Providers } from "./providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Auto Elétrica Eletrocar • Sistema Operacional & Balcão PDV",
  description:
    "Sistema integrado de gestão operacional, balcão PDV e ordens de serviço da Auto Elétrica Eletrocar com Clean Architecture, DDD, Next.js 16 e leitura de código de barras USB/Bluetooth.",
  keywords: [
    "auto elétrica",
    "eletrocar",
    "balcão pdv",
    "ordens de serviço",
    "clean architecture",
    "leitor código de barras",
  ],
  authors: [{ name: "Auto Elétrica Eletrocar" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#070a12] text-slate-100 min-h-screen antialiased selection:bg-cyan-500 selection:text-slate-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
