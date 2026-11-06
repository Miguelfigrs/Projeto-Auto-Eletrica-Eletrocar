import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "../index.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Eletrocar • Auto Elétrica",
  description:
    "Sistema integrado de gestão operacional, balcão PDV e ordens de serviço da Auto Elétrica Eletrocar.",
  keywords: ["auto elétrica", "eletrocar", "balcão pdv", "ordens de serviço"],
  authors: [{ name: "Auto Elétrica Eletrocar" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#111113",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-canvas text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
