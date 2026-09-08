// Tipos alinhados ao schema em supabase/schema.sql.
// Para gerar tipos 100% automáticos a partir do banco real, use:
//   npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/lib/types.ts

export type TransactionStatus =
  | "pending"
  | "buyer_confirmed"
  | "seller_confirmed"
  | "completed"
  | "cancelled"
  | "disputed";

export type ReportStatus = "pending" | "under_review" | "approved" | "rejected";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ReportReason =
  | "golpe"
  | "produto_nao_enviado"
  | "produto_falsificado"
  | "produto_diferente_anunciado"
  | "nao_pagamento"
  | "assedio_ou_abuso"
  | "outro";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  brands: string[];
  item_types: string[];
  average_rating: number;
  reviews_count: number;
  completed_sales_count: number;
  completed_purchases_count: number;
  recommendations_count: number;
  trust_score: number;
  is_admin: boolean;
  is_banned: boolean;
  banned_reason: string | null;
  banned_at: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
  updated_at: string;
}

// Dados sensíveis de cadastro (migration_006/007) — vivem em
// "profile_kyc", tabela separada e SEM leitura pública (ao contrário de
// "profiles"). "cpf" só deve ser buscado no próprio /conta/verificacao
// (o dono vendo o que enviou) ou nunca exposto ao cliente em telas de
// terceiros — a tela de admin usa as fotos, não o CPF em si.
export interface ProfileKyc {
  profile_id: string;
  cpf: string | null;
  in_whatsapp_group: boolean;
  document_front_path: string | null;
  document_back_path: string | null;
  selfie_path: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  seller_id: string;
  buyer_id: string;
  item_description: string;
  price: number;
  status: TransactionStatus;
  buyer_confirmed_at: string | null;
  seller_confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  transaction_id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  comment: string | null;
  photo_url: string | null;
  created_at: string;
  reviewer?: Pick<Profile, "id" | "full_name" | "avatar_url">;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  transaction_id: string | null;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
  reporter?: Pick<Profile, "id" | "full_name">;
  reported?: Pick<Profile, "id" | "full_name">;
}

export interface Recommendation {
  id: string;
  recommender_id: string;
  recommended_id: string;
  created_at: string;
}

// Marcas usadas nas abas de filtro do feed e na seleção do perfil.
// É só uma lista de conveniência — o campo profiles.brands aceita texto livre.
export const BRAND_LIST = [
  "Amouage",
  "Creed",
  "Dior",
  "Maison Francis Kurkdjian",
  "Nishane",
  "Tom Ford",
  "Xerjoff",
] as const;

// Tipos de item que um vendedor costuma vender — mostrado no perfil e
// editável em "Editar perfil".
export const ITEM_TYPE_LIST = ["Frasco cheio", "Decant", "Parcial - tester"] as const;

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  golpe: "Golpe / fraude",
  produto_nao_enviado: "Produto não enviado",
  produto_falsificado: "Produto falsificado",
  produto_diferente_anunciado: "Produto diferente do anunciado",
  nao_pagamento: "Não pagamento",
  assedio_ou_abuso: "Assédio ou abuso",
  outro: "Outro",
};

// Placeholder mínimo para satisfazer @supabase/ssr<Database>.
// Substitua pelo tipo gerado via `supabase gen types` quando possível.
export type Database = any;
