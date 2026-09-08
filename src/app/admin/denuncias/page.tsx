import Link from "next/link";
import { ReportReviewActions } from "@/components/admin/ReportReviewActions";
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

export default async function AdminDenunciasPage() {
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("*, reporter:reporter_id(id, full_name), reported:reported_id(id, full_name)")
    .order("status", { ascending: true }) // pending primeiro (ordem alfabética coloca pending antes)
    .order("created_at", { ascending: false })
    .returns<Report[]>();

  const pendentes = reports?.filter((r) => r.status === "pending").length ?? 0;
  const emAnalise = reports?.filter((r) => r.status === "under_review").length ?? 0;
  const procedentes = reports?.filter((r) => r.status === "approved").length ?? 0;

  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
        Administração
      </p>
      <h1 className="mb-7 font-serif text-4xl font-medium leading-none text-obsidian-900">Denúncias</h1>

      <div className="mb-8 flex flex-wrap gap-8">
        <Counter value={pendentes} label="pendentes" />
        <Counter value={emAnalise} label="em análise" />
        <Counter value={procedentes} label="procedentes" tone="crimson" />
      </div>

      {reports && reports.length > 0 ? (
        <ul className="grid gap-4">
          {reports.map((report) => (
            <li key={report.id} className="rounded-card border border-sand-300 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-baseline gap-2 text-[13px] font-normal text-[#8A8F98]">
                  <span>Denunciado:</span>
                  <Link
                    href={`/perfil/${report.reported_id}`}
                    className="border-b border-dourado-tint-border text-[15.5px] font-semibold text-obsidian-900"
                  >
                    {report.reported?.full_name}
                  </Link>
                  <span className="text-sand-400">|</span>
                  <span>
                    por <span className="font-normal text-[#3C434C]">{report.reporter?.full_name}</span>
                  </span>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10.5px] font-medium ${STATUS_STYLE[report.status]}`}
                >
                  {STATUS_LABELS[report.status]}
                </span>
              </div>

              <p className="mt-3.5 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
                {REPORT_REASON_LABELS[report.reason]}
              </p>
              <p className="mt-2 max-w-[78ch] text-sm font-normal leading-relaxed text-[#3C434C]">
                {report.description}
              </p>
              {report.admin_notes && (
                <p className="mt-3.5 rounded-lg border border-sand-200 bg-sand p-3 text-[12.5px] font-normal leading-relaxed text-[#5B6470]">
                  <span className="font-medium text-obsidian-900">Notas: </span>
                  {report.admin_notes}
                </p>
              )}

              {report.status === "pending" && <ReportReviewActions reportId={report.id} />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[#8A8F98]">Nenhuma denúncia registrada.</p>
      )}
    </div>
  );
}

function Counter({ value, label, tone }: { value: number; label: string; tone?: "crimson" }) {
  return (
    <div>
      <p className={`text-[28px] font-semibold leading-none ${tone === "crimson" && value > 0 ? "text-crimson" : "text-obsidian-900"}`}>
        {value}
      </p>
      <p className="mt-1.5 text-[9.5px] font-medium uppercase tracking-[0.02em] text-[#8A8F98]">{label}</p>
    </div>
  );
}
