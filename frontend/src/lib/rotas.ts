import type { Usuario } from "./types";

/** Para onde o usuário deve ir, dado o papel e o status da conta. */
export function rotaInicial(u: Usuario): string {
  switch (u.status) {
    case "PENDENTE_APROVACAO":
      return "/conta/pendente";
    case "REJEITADO":
      return "/conta/rejeitada";
    case "ATIVO":
      if (u.papel === "ADMIN") return "/admin";
      if (u.papel === "DOCENTE") return "/docente";
      return "/aluno";
  }
}
