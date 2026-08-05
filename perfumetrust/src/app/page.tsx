import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { SellerCard } from "@/components/SellerCard";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: topSellers } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_banned", false)
    .gt("reviews_count", 0)
    .order("trust_score", { ascending: false })
    .limit(6)
    .returns<Profile[]>();

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-12 text-center text-white">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Negocie perfumes de desapego com confiança
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-brand-100">
          Consulte a reputação, nota e score de confiabilidade de qualquer vendedor
          antes de fechar negócio.
        </p>
        <div className="mt-6 flex justify-center">
          <SearchBar />
        </div>
        <div className="mt-4 text-sm">
          <Link href="/login" className="underline underline-offset-2 hover:text-white">
            Crie sua conta grátis
          </Link>{" "}
          para começar a vender e ser avaliado.
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Vendedores em destaque</h2>
          <Link href="/busca" className="text-sm text-brand-700 hover:underline">
            Ver todos
          </Link>
        </div>
        {topSellers && topSellers.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topSellers.map((profile) => (
              <SellerCard key={profile.id} profile={profile} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            Ainda não há vendedores avaliados. Seja o primeiro a construir sua reputação!
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <HowItWorks
          step="1"
          title="Verifique a reputação"
          text="Busque o vendedor pelo nome ou telefone e veja nota, score e histórico."
        />
        <HowItWorks
          step="2"
          title="Registre a transação"
          text="Após combinar a negociação, registre os detalhes na plataforma."
        />
        <HowItWorks
          step="3"
          title="Confirmação dupla"
          text="Comprador e vendedor confirmam o recebimento antes da avaliação ser liberada."
        />
      </section>
    </div>
  );
}

function HowItWorks({ step, title, text }: { step: string; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
        {step}
      </div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{text}</p>
    </div>
  );
}
