import Link from "next/link";
import { CreateAdminForm } from "@/components/admin/CreateAdminForm";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// O middleware (src/middleware.ts) já garante que só admins chegam aqui.
export default async function AdminAdministradoresPage() {
  const supabase = await createClient();

  const { data: admins } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_admin", true)
    .order("created_at", { ascending: true })
    .returns<Profile[]>();

  return (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
          administração
        </p>
        <h1 className="font-serif text-[32px] font-medium leading-none text-obsidian-900">
          Administradores
        </h1>
        <p className="mt-2 max-w-[62ch] text-[14.5px] font-normal leading-relaxed text-[#5B6470]">
          Crie contas de admin direto por aqui — elas não passam pelo cadastro público nem pela
          aprovação de identidade, já entram liberadas.
        </p>
      </div>

      <CreateAdminForm />

      <div className="overflow-x-auto rounded-card border border-sand-300 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-sand-300 bg-sand text-left text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Desde</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {(admins ?? []).map((admin) => (
              <tr key={admin.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/perfil/${admin.id}`}
                    className="border-b border-dourado-tint-border font-medium text-dourado-dark"
                  >
                    {admin.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#8A8F98]">{admin.email ?? "—"}</td>
                <td className="px-4 py-3 text-[#8A8F98]">{admin.username ?? "—"}</td>
                <td className="px-4 py-3 text-[#3C434C]">
                  {new Date(admin.created_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
