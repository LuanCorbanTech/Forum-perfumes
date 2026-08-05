import { redirect } from "next/navigation";
import Link from "next/link";
import { REPORT_REASON_LABELS, type Report } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
  under_review: { label: "Em análise", className: "bg-blue-100 text-blue-800" },
  approved: { label: "Procedente", className: "bg-green-100 text-green-800" },
  rejected: { label: "Improcedente", className: "bg-gray-100 text-gray-700" },
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Minhas denúncias</h1>

      {reports && reports.length > 0 ? (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <Link href={`/perfil/${report.reported_id}`} className="font-medium text-brand-700 hover:underline">
                  {report.reported?.full_name ?? "Usuário"}
                </Link>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[report.status].className}`}>
                  {STATUS_LABELS[report.status].label}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{REPORT_REASON_LABELS[report.reason]}</p>
              <p className="mt-1 text-sm text-gray-700">{report.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">Você ainda não enviou nenhuma denúncia.</p>
      )}
    </div>
  );
}
