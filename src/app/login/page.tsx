import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

// useSearchParams() (usado no LoginForm para ler ?next=) exige um limite
// de Suspense durante a geração estática do App Router.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
