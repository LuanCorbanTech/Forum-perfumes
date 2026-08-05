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
      <h1 className="font-serif text-2xl font-light text-ink-50">Denúncias</h1>

      {reports && reports.length > 0 ? (
        <ul className="space-y-4">
          {reports.map((report) => (
            <li key={report.id} className="rounded-lg border border-ink-700 bg-ink-800/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="text-ink-400">Denunciado: </span>
                  <Link href={`/perfil/${report.reported_id}`} className="font-medium text-gold-300 hover:underline">
                    {report.reported?.full_name}
                  </Link>
                  <span className="mx-2 text-ink-600">|</span>
                  <span className="text-ink-400">Por: </span>
                  <span className="font-medium text-ink-100">{report.reporter?.full_name}</span>
                </div>
                <StatusPill status={report.status} />
              </div>
              <p className="mt-2 text-sm font-medium text-ink-200">{REPORT_REASON_LABELS[report.reason]}</p>
              <p className="mt-1 text-sm text-ink-300">{report.description}</p>
              {report.admin_notes && (
                <p className="mt-2 rounded bg-ink-900/60 p-2 text-xs text-ink-400">
                  Notas: {report.admin_notes}
                </p>
              )}

              {report.status === "pending" && <ReportReviewActions reportId={report.id} />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-400">Nenhuma denúncia registrada.</p>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-400/10 text-yellow-300",
    under_review: "bg-blue-400/10 text-blue-300",
    approved: "bg-emerald-400/10 text-emerald-300",
    rejected: "bg-ink-600/40 text-ink-300",
  };
  const labels: Record<string, string> = {
    pending: "Pendente",
    under_review: "Em análise",
    approved: "Procedente",
    rejected: "Improcedente",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>{labels[status]}</span>;
}
