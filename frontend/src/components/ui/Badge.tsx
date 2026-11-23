import type { ReactNode } from "react";
import type { EstadoVotacao, StatusConta } from "@/lib/types";
import { cx } from "./cx";
import styles from "./Badge.module.css";

type Tom = "neutro" | "info" | "sucesso" | "aviso" | "erro" | "rascunho";

export function Badge({ tom = "neutro", children }: { tom?: Tom; children: ReactNode }) {
  return <span className={cx(styles.rotulo, styles[tom])}>{children}</span>;
}

const ESTADOS: Record<EstadoVotacao, { rotulo: string; tom: Tom }> = {
  RASCUNHO: { rotulo: "Rascunho", tom: "rascunho" },
  AGENDADA: { rotulo: "Agendada", tom: "info" },
  ABERTA: { rotulo: "Aberta", tom: "sucesso" },
  ENCERRADA: { rotulo: "Encerrada", tom: "neutro" },
};

export function EstadoBadge({ estado }: { estado: EstadoVotacao }) {
  const e = ESTADOS[estado];
  return <Badge tom={e.tom}>{e.rotulo}</Badge>;
}

export const ROTULO_STATUS: Record<StatusConta, string> = {
  PENDENTE_APROVACAO: "Aguardando aprovação",
  ATIVO: "Ativo",
  REJEITADO: "Rejeitado",
};

const TOM_STATUS: Record<StatusConta, Tom> = {
  PENDENTE_APROVACAO: "aviso",
  ATIVO: "sucesso",
  REJEITADO: "erro",
};

export function StatusBadge({ status }: { status: StatusConta }) {
  return <Badge tom={TOM_STATUS[status]}>{ROTULO_STATUS[status]}</Badge>;
}
