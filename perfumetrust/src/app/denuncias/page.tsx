import { redirect } from "next/navigation";
import Link from "next/link";
import { REPORT_REASON_LABELS, type Report } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-dourado-tint border-dourado-tint-border text-dourado-dark",
  under_review: "bg-white border-sand-400 text-[#5B6470]",
  approved: "bg-verde-tint border-verde-tint-border text-verde",
  rejected: "bg-sand border-sand-300 text-[#8A8F98]",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  under_review: "Em análise",
  approved: "Procedente",
  rejected: "Improcedente",
};

export default async function MinhasDenunciasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/denuncias");

  const { data: reports } = await supabase
    .from("reports")
    .select("*, reported:reported_id(id, full_name)")
    .eq("reporter_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Report[]>();

  return (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
          suas denúncias
        </p>
        <h1 className="font-serif text-[32px] font-medium leading-none text-obsidian-900">Minhas denúncias</h1>
      </div>

      {reports && reports.length > 0 ? (
        <ul className="grid gap-4">
          {reports.map((report) => (
            <li key={report.id} className="rounded-card border border-sand-300 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <Link
                  href={`/perfil/${report.reported_id}`}
                  className="border-b border-dourado-tint-border text-[15.5px] font-semibold text-obsidian-900"
                >
                  {report.reported?.full_name ?? "Usuário"}
                </Link>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10.5px] font-medium ${STATUS_STYLE[report.status]}`}
                >
                  {STATUS_LABELS[report.status]}
                </span>
              </div>
              <p className="mt-3.5 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
                {REPORT_REASON_LABELS[report.reason]}
              </p>
              <p className="mt-2 text-sm font-normal leading-relaxed text-[#3C434C]">{report.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[#8A8F98]">Você ainda não enviou nenhuma denúncia.</p>
      )}
    </div>
  );
}
