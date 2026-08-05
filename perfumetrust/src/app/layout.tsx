import type { Metadata } from "next";
import { Cormorant_Garamond, Jost, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { TopBanner } from "@/components/TopBanner";
import { PerfumeMarquee } from "@/components/PerfumeMarquee";
import { Footer } from "@/components/Footer";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "500", "600"],
  style: ["normal", "italic"],
  // "swap" garante que o navegador troque para a fonte real assim que ela
  // carregar, em vez de desistir e travar na fonte do sistema quando a
  // rede está lenta ou em modos que priorizam desempenho/economizam dados
  // (era isso que fazia os textos menores parecerem "fonte do computador").
  display: "swap",
});

const bodyFont = Jost({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500"],
  display: "swap",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cheiro Novo — Desapego com reputação, sem dor de cabeça",
  description:
    "Verifique a reputação, a nota e o histórico de qualquer vendedor antes de negociar perfumes usados nos grupos de desapego.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <body className="min-h-screen bg-ink-900 font-sans font-light text-ink-100 antialiased">
        <TopBanner />
        <PerfumeMarquee />
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-7">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
