import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { TopBanner } from "@/components/TopBanner";
import { Footer } from "@/components/Footer";

// Redesign "handoff" (design_handoff_cheiro_novo): Cormorant Garamond no
// logotipo, h1 e notas de destaque grandes; Montserrat em todo o resto
// (corpo, UI, números). Substitui o par Montserrat/Inter do redesign
// anterior — troca de fonte é global, então isso também muda a fonte das
// telas que ainda não foram migradas pro novo visual (cores delas continuam
// as mesmas até chegarmos nelas).
const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  // "swap" garante que o navegador troque para a fonte real assim que ela
  // carregar, em vez de desistir e travar na fonte do sistema quando a
  // rede está lenta ou em modos que priorizam desempenho/economizam dados
  // (era isso que fazia os textos menores parecerem "fonte do computador").
  display: "swap",
});

const bodyFont = Montserrat({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cheiro Novo — Desapego com reputação, sem dor de cabeça",
  description:
    "Verifique a reputação, a nota e o histórico de qualquer vendedor antes de negociar perfumes usados nos grupos de desapego.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen bg-sand font-sans font-normal text-navy-600 antialiased">
        <TopBanner />
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-7">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
