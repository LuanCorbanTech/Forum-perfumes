import Link from "next/link";
import { ReportReviewActions } from "@/components/admin/ReportReviewActions";
import { REPORT_REASON_LABELS, type Report } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDenunciasPage() {
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("*, reporter:reporter_id(id, full_name), reported:reported_id(id, full_name)")
    .order("status", { ascending: true }) // pending primeiro (ordem alfabética coloca pending antes)
    .order("created_at", { ascending: false })
    .returns<Report[]>();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Denúncias</h1>

      {reports && reports.length > 0 ? (
        <ul className="space-y-4">
          {reports.map((report) => (
            <li key={report.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="text-gray-500">Denunciado: </span>
                  <Link href={`/perfil/${report.reported_id}`} className="font-medium text-brand-700 hover:underline">
                    {report.reported?.full_name}
                  </Link>
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="text-gray-500">Por: </span>
                  <span className="font-medium">{report.reporter?.full_name}</span>
                </div>
                <StatusPill status={report.status} />
              </div>
              <p className="mt-2 text-sm font-medium text-gray-700">{REPORT_REASON_LABELS[report.reason]}</p>
              <p className="mt-1 text-sm text-gray-600">{report.description}</p>
              {report.admin_notes && (
                <p className="mt-2 rounded bg-gray-50 p-2 text-xs text-gray-500">
                  Notas: {report.admin_notes}
                </p>
              )}

              {report.status === "pending" && <ReportReviewActions reportId={report.id} />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">Nenhuma denúncia registrada.</p>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    under_review: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-gray-100 text-gray-700",
  };
  const labels: Record<string, string> = {
    pending: "Pendente",
    under_review: "Em análise",
    approved: "Procedente",
    rejected: "Improcedente",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>{labels[status]}</span>;
}
