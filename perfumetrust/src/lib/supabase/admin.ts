import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

// Cliente Supabase com a service-role key — ignora RLS por completo.
// Só pode ser usado em código que roda no servidor (Server Actions, Route
// Handlers): NUNCA importe isto em um componente "use client" nem exponha
// o resultado ao navegador. Hoje usado só pra criar contas de admin direto
// via supabase.auth.admin.createUser() (ver src/app/admin/administradores).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltam as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no servidor."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
