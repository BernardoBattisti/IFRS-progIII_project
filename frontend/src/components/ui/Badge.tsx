import type { ReactNode } from "react";
import type { EstadoVotacao, StatusConta } from "@/lib/types";
import { cx } from "./cx";

type Tom = "neutro" | "info" | "sucesso" | "aviso" | "erro" | "escuro";

const estilos: Record<Tom, string> = {
  neutro: "bg-[#f2f4f7] text-[#344054] border-[#d0d5dd]",
  info: "bg-info-50 text-info-700 border-info-200",
  sucesso: "bg-brand-50 text-brand-800 border-brand-200",
  aviso: "bg-warning-50 text-warning-700 border-warning-200",
  erro: "bg-danger-50 text-danger-600 border-danger-200",
  escuro: "bg-ink text-white border-ink",
};

export function Badge({ tom = "neutro", children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        estilos[tom],
      )}
    >
      {children}
    </span>
  );
}

const ESTADOS: Record<EstadoVotacao, { rotulo: string; tom: Tom }> = {
  RASCUNHO: { rotulo: "Rascunho", tom: "neutro" },
  AGENDADA: { rotulo: "Agendada", tom: "info" },
  ABERTA: { rotulo: "Aberta", tom: "sucesso" },
  ENCERRADA: { rotulo: "Encerrada", tom: "escuro" },
};

export function EstadoBadge({ estado }: { estado: EstadoVotacao }) {
  const e = ESTADOS[estado];
  return (
    <Badge tom={e.tom}>
      {estado === "ABERTA" && <span className="size-2 rounded-full bg-brand-600" aria-hidden="true" />}
      {e.rotulo}
    </Badge>
  );
}

export const ROTULO_STATUS: Record<StatusConta, string> = {
  CADASTRO_INCOMPLETO: "Cadastro incompleto",
  PENDENTE_APROVACAO: "Aguardando aprovação",
  ATIVO: "Ativo",
  REJEITADO: "Rejeitado",
};

const TOM_STATUS: Record<StatusConta, Tom> = {
  CADASTRO_INCOMPLETO: "neutro",
  PENDENTE_APROVACAO: "aviso",
  ATIVO: "sucesso",
  REJEITADO: "erro",
};

export function StatusBadge({ status }: { status: StatusConta }) {
  return <Badge tom={TOM_STATUS[status]}>{ROTULO_STATUS[status]}</Badge>;
}
