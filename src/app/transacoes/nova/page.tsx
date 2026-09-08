import { Suspense } from "react";
import { NovaTransacaoForm } from "./NovaTransacaoForm";

// useSearchParams() (usado para pré-selecionar ?vendedor=) exige um
// limite de Suspense durante a geração estática do App Router.
export default function NovaTransacaoPage() {
  return (
    <Suspense fallback={null}>
      <NovaTransacaoForm />
    </Suspense>
  );
}
