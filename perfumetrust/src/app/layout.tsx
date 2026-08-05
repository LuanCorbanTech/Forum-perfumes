import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "PerfumeTrust — Reputação para grupos de desapego de perfumes",
  description:
    "Verifique a reputação de vendedores antes de negociar em grupos de desapego de perfumes usados.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-gray-400">
          PerfumeTrust — MVP. Negocie com responsabilidade.
        </footer>
      </body>
    </html>
  );
}
