import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { full_name: string; is_admin: boolean } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, is_admin")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand-700">
          PerfumeTrust
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/busca" className="text-gray-600 hover:text-brand-700">
            Buscar vendedor
          </Link>
          {user ? (
            <>
              <Link href="/transacoes/nova" className="text-gray-600 hover:text-brand-700">
                Nova transação
              </Link>
              <Link href={`/perfil/${user.id}`} className="text-gray-600 hover:text-brand-700">
                Meu perfil
              </Link>
              {profile?.is_admin && (
                <Link href="/admin" className="text-brand-700 font-medium hover:text-brand-800">
                  Admin
                </Link>
              )}
              <form action="/auth/sair" method="post">
                <button className="text-gray-500 hover:text-red-600">Sair</button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-brand-600 px-4 py-1.5 font-medium text-white hover:bg-brand-700"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
