// Datas: a API usa ISO-8601 UTC; a interface mostra e recebe horário local.

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return fmtDataHora.format(d).replace(",", " às");
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO UTC -> valor de <input type="datetime-local"> no fuso do navegador. */
export function isoParaLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Valor de <input type="datetime-local"> (horário local) -> ISO UTC. */
export function localParaIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function plural(n: number, singular: string, pluralForma: string) {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}

export function formatarPercentual(p: number) {
  return `${p.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
