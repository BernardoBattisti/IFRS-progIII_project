"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { api, ApiError, mensagemDeErro } from "@/lib/api";
import { isoParaLocal, localParaIso } from "@/lib/format";
import type { Turma, Visibilidade, Votacao, VotacaoInput } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { Alert } from "./ui/Alert";
import { Button, classeBotao } from "./ui/Button";
import { Card } from "./ui/Card";
import { InputField, SelectField, TextareaField } from "./ui/Field";
import { Spinner } from "./ui/Spinner";
import { cx } from "./ui/cx";
import { ROTULO_VISIBILIDADE } from "./RegrasVotacao";

type OpcaoForm = {
  chave: string;
  titulo: string;
  descricao: string;
  imagemUrl: string;
  enviando: boolean;
  erroImagem: string | null;
};

const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGEM = 5 * 1024 * 1024;
const MAX_OPCOES = 50;

let contador = 0;
const novaChave = () => `op-${++contador}-${Date.now()}`;
const opcaoVazia = (): OpcaoForm => ({
  chave: novaChave(),
  titulo: "",
  descricao: "",
  imagemUrl: "",
  enviando: false,
  erroImagem: null,
});

function proximaHoraCheia(deslocDias = 0) {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  d.setDate(d.getDate() + deslocDias);
  return isoParaLocal(d.toISOString());
}

/** Normaliza chaves de erro do backend: "opcoes.0.titulo" → "opcoes[0].titulo". */
function normalizarCampos(c: Record<string, string>) {
  const r: Record<string, string> = {};
  for (const [k, val] of Object.entries(c)) r[k.replace(/\.(\d+)(?=\.|$)/g, "[$1]")] = val;
  return r;
}

const ROTULO_CAMPO: Record<string, string> = {
  titulo: "Título",
  descricao: "Descrição",
  inicio: "Início",
  fim: "Fim",
  votosPorAluno: "Votos por aluno",
  permiteRepetirOpcao: "Repetir opção",
  anonima: "Tipo de votação",
  visibilidadeResultado: "Resultado para alunos",
  turmaIds: "Turmas",
  opcoes: "Opções",
};

function rotuloDoCampo(k: string) {
  const m = k.match(/^opcoes\[(\d+)\]\.?(\w+)?/);
  if (m) {
    const sub = m[2] === "titulo" ? "título" : m[2] === "descricao" ? "descrição" : m[2] === "imagemUrl" ? "imagem" : "";
    return `Opção ${Number(m[1]) + 1}${sub ? ` (${sub})` : ""}`;
  }
  return ROTULO_CAMPO[k] ?? k;
}

function idDoCampo(k: string) {
  return "campo-" + k.replace(/[^\w]+/g, "-");
}

export function VotacaoForm({ inicial }: { inicial?: Votacao }) {
  const router = useRouter();
  const editando = Boolean(inicial);
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [inicio, setInicio] = useState(inicial ? isoParaLocal(inicial.inicio) : proximaHoraCheia());
  const [fim, setFim] = useState(inicial ? isoParaLocal(inicial.fim) : proximaHoraCheia(7));
  const [votosPorAluno, setVotosPorAluno] = useState(String(inicial?.votosPorAluno ?? 1));
  const [permiteRepetir, setPermiteRepetir] = useState(inicial?.permiteRepetirOpcao ?? false);
  const [anonima, setAnonima] = useState(inicial?.anonima ?? true);
  const [visibilidade, setVisibilidade] = useState<Visibilidade>(inicial?.visibilidadeResultado ?? "APOS_ENCERRAR");
  const [turmaIds, setTurmaIds] = useState<Set<number>>(new Set(inicial?.turmas.map((t) => t.id) ?? []));
  const [opcoes, setOpcoes] = useState<OpcaoForm[]>(() =>
    inicial && inicial.opcoes.length
      ? [...inicial.opcoes]
          .sort((a, b) => a.ordem - b.ordem)
          .map((o) => ({
            chave: novaChave(),
            titulo: o.titulo,
            descricao: o.descricao ?? "",
            imagemUrl: o.imagemUrl ?? "",
            enviando: false,
            erroImagem: null,
          }))
      : [opcaoVazia(), opcaoVazia()],
  );
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const resumoRef = useRef<HTMLDivElement>(null);

  const turmas = useDados(() => api<Turma[]>("/turmas"), []);

  useEffect(() => {
    if (erro || Object.keys(campos).length) resumoRef.current?.focus();
  }, [erro, campos]);

  const nVotos = Number(votosPorAluno);
  const opcoesPreenchidas = opcoes.filter((o) => o.titulo.trim()).length;
  const avisoExcesso =
    !permiteRepetir && Number.isFinite(nVotos) && nVotos > opcoesPreenchidas && opcoesPreenchidas > 0;

  function atualizarOpcao(chave: string, mudanca: Partial<OpcaoForm>) {
    setOpcoes((lista) => lista.map((o) => (o.chave === chave ? { ...o, ...mudanca } : o)));
  }

  function mover(indice: number, delta: number) {
    setOpcoes((lista) => {
      const nova = [...lista];
      const [item] = nova.splice(indice, 1);
      nova.splice(indice + delta, 0, item);
      return nova;
    });
  }

  async function enviarImagem(chave: string, arquivo: File) {
    if (!TIPOS_IMAGEM.includes(arquivo.type)) {
      atualizarOpcao(chave, { erroImagem: "Use uma imagem JPEG, PNG ou WebP." });
      return;
    }
    if (arquivo.size > MAX_IMAGEM) {
      atualizarOpcao(chave, { erroImagem: "A imagem tem mais de 5 MB. Escolha um arquivo menor." });
      return;
    }
    atualizarOpcao(chave, { enviando: true, erroImagem: null });
    try {
      const fd = new FormData();
      fd.append("arquivo", arquivo);
      const r = await api<{ url: string }>("/uploads", { method: "POST", body: fd });
      atualizarOpcao(chave, { imagemUrl: r.url, enviando: false });
    } catch (e) {
      const msg = e instanceof ApiError && e.campos?.arquivo ? e.campos.arquivo : mensagemDeErro(e);
      atualizarOpcao(chave, { enviando: false, erroImagem: msg });
    }
  }

  function validarLocal(): Record<string, string> {
    const c: Record<string, string> = {};
    if (!titulo.trim()) c.titulo = "Informe um título.";
    if (!inicio) c.inicio = "Informe a data e a hora de início.";
    if (!fim) c.fim = "Informe a data e a hora de fim.";
    if (inicio && fim && new Date(fim) <= new Date(inicio)) c.fim = "O fim precisa ser depois do início.";
    if (!Number.isInteger(nVotos) || nVotos < 1) c.votosPorAluno = "Informe um número inteiro a partir de 1.";
    return c;
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const locais = validarLocal();
    if (Object.keys(locais).length) {
      setCampos(locais);
      return;
    }
    if (opcoes.some((o) => o.enviando)) {
      setCampos({});
      setErro("Aguarde o envio das imagens terminar antes de salvar.");
      return;
    }
    setCampos({});
    // Opções totalmente vazias são descartadas; o rascunho aceita menos de 2 (a publicação valida).
    const opcoesValidas = opcoes.filter((o) => o.titulo.trim() || o.descricao.trim() || o.imagemUrl);
    const corpo: VotacaoInput = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      inicio: localParaIso(inicio)!,
      fim: localParaIso(fim)!,
      votosPorAluno: nVotos,
      permiteRepetirOpcao: permiteRepetir,
      anonima,
      visibilidadeResultado: visibilidade,
      turmaIds: [...turmaIds],
      opcoes: opcoesValidas.map((o) => ({
        titulo: o.titulo.trim(),
        descricao: o.descricao.trim() || undefined,
        imagemUrl: o.imagemUrl || undefined,
      })),
    };
    setSalvando(true);
    try {
      const v = await api<Votacao>(editando ? `/votacoes/${inicial!.id}` : "/votacoes", {
        method: editando ? "PUT" : "POST",
        body: corpo,
      });
      router.push(`/docente/votacoes/${v.id}?salvo=1`);
    } catch (err) {
      setSalvando(false);
      if (err instanceof ApiError && err.campos) {
        setCampos(normalizarCampos(err.campos));
        setErro(err.message);
      } else setErro(mensagemDeErro(err));
    }
  }

  const listaErros = Object.entries(campos);

  return (
    <form onSubmit={salvar} noValidate className="space-y-6">
      <div ref={resumoRef} tabIndex={-1} className="space-y-2 focus:outline-none">
        {(erro || listaErros.length > 0) && (
          <Alert tom="erro" titulo={erro ?? "Revise os campos abaixo"} anunciar>
            {listaErros.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-5">
                {listaErros.map(([k, msg]) => (
                  <li key={k}>
                    <a href={`#${idDoCampo(k)}`}>
                      {rotuloDoCampo(k)}: {msg}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Alert>
        )}
      </div>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold">Informações</h2>
        <InputField
          id={idDoCampo("titulo")}
          rotulo="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          erro={campos.titulo}
          maxLength={200}
          obrigatorio
        />
        <TextareaField
          id={idDoCampo("descricao")}
          rotulo="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          erro={campos.descricao}
          ajuda="Explique o que está sendo decidido. Opcional."
          rows={4}
        />
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">Período</h2>
          <p className="text-sm text-ink-muted">Datas e horários no fuso do seu dispositivo.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id={idDoCampo("inicio")}
            rotulo="Início"
            type="datetime-local"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            erro={campos.inicio}
            obrigatorio
          />
          <InputField
            id={idDoCampo("fim")}
            rotulo="Fim"
            type="datetime-local"
            value={fim}
            min={inicio || undefined}
            onChange={(e) => setFim(e.target.value)}
            erro={campos.fim}
            obrigatorio
          />
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-lg font-bold">Regras</h2>
        <div className="sm:w-48">
          <InputField
            id={idDoCampo("votosPorAluno")}
            rotulo="Votos por aluno"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={votosPorAluno}
            onChange={(e) => setVotosPorAluno(e.target.value)}
            erro={campos.votosPorAluno}
            obrigatorio
          />
        </div>

        <Escolha
          id={idDoCampo("permiteRepetirOpcao")}
          legenda="Cada aluno pode votar mais de uma vez na mesma opção?"
          valor={permiteRepetir ? "s" : "n"}
          aoMudar={(x) => setPermiteRepetir(x === "s")}
          erro={campos.permiteRepetirOpcao}
          opcoes={[
            { valor: "n", rotulo: "Não", ajuda: "No máximo 1 voto por opção." },
            { valor: "s", rotulo: "Sim", ajuda: "O aluno pode concentrar votos na mesma opção." },
          ]}
        />
        {avisoExcesso && (
          <Alert tom="aviso">
            <p>
              Sem repetir opção, cada aluno só consegue usar até {opcoesPreenchidas}{" "}
              {opcoesPreenchidas === 1 ? "voto" : "votos"} (uma por opção). Reduza os votos por aluno ou adicione
              opções antes de publicar.
            </p>
          </Alert>
        )}

        <Escolha
          id={idDoCampo("anonima")}
          legenda="Tipo de votação"
          valor={anonima ? "s" : "n"}
          aoMudar={(x) => setAnonima(x === "s")}
          erro={campos.anonima}
          opcoes={[
            { valor: "s", rotulo: "Anônima", ajuda: "Ninguém, nem você, vê quem votou em quê. Só os totais." },
            {
              valor: "n",
              rotulo: "Identificada",
              ajuda: "Quem vê o resultado vê também nome, matrícula e votos de cada aluno.",
            },
          ]}
        />

        <SelectField
          id={idDoCampo("visibilidadeResultado")}
          rotulo="Quando os alunos veem o resultado"
          value={visibilidade}
          onChange={(e) => setVisibilidade(e.target.value as Visibilidade)}
          erro={campos.visibilidadeResultado}
          ajuda="Você sempre vê o resultado em tempo real."
        >
          {(Object.keys(ROTULO_VISIBILIDADE) as Visibilidade[]).map((k) => (
            <option key={k} value={k}>
              {ROTULO_VISIBILIDADE[k]}
            </option>
          ))}
        </SelectField>
      </Card>

      <Card className="space-y-3">
        <fieldset
          id={idDoCampo("turmaIds")}
          tabIndex={-1}
          aria-describedby="ajuda-turmas"
          className="space-y-3"
        >
          <legend className="text-lg font-bold">Quem pode votar</legend>
          <p id="ajuda-turmas" className="text-sm text-ink-muted">
            Marque as turmas participantes. <strong className="text-ink">Sem nenhuma turma marcada, todos os alunos
            ativos do sistema podem votar.</strong>
          </p>
          {turmas.carregando && (
            <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
              <Spinner className="size-4" /> Carregando suas turmas…
            </p>
          )}
          {turmas.erro && <Alert tom="erro">{turmas.erro}</Alert>}
          {turmas.dados && turmas.dados.length === 0 && (
            <p className="text-sm text-ink-muted">
              Você ainda não criou turmas.{" "}
              <Link href="/docente/turmas" className="font-semibold text-brand-700 underline">
                Criar uma turma
              </Link>
            </p>
          )}
          {turmas.dados && turmas.dados.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {turmas.dados.map((t) => (
                <li key={t.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border border-line-strong px-3 py-2 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                    <input
                      type="checkbox"
                      className="size-5 shrink-0 accent-brand-600"
                      checked={turmaIds.has(t.id)}
                      onChange={(e) =>
                        setTurmaIds((s) => {
                          const n = new Set(s);
                          if (e.target.checked) n.add(t.id);
                          else n.delete(t.id);
                          return n;
                        })
                      }
                    />
                    <span className="min-w-0 break-words">
                      {t.nome}{" "}
                      <span className="text-sm text-ink-muted">
                        ({t.totalAlunos} {t.totalAlunos === 1 ? "aluno" : "alunos"})
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {campos.turmaIds && <p className="text-sm font-medium text-danger-600"><span aria-hidden="true">✕ </span>{campos.turmaIds}</p>}
        </fieldset>
      </Card>

      <Card className="space-y-4">
        <div id={idDoCampo("opcoes")} tabIndex={-1}>
          <h2 className="text-lg font-bold">Opções</h2>
          <p className="text-sm text-ink-muted">Para publicar, são necessárias pelo menos 2 opções (máximo de 50).</p>
          {campos.opcoes && <p className="mt-1 text-sm font-medium text-danger-600"><span aria-hidden="true">✕ </span>{campos.opcoes}</p>}
        </div>
        <ol className="space-y-4">
          {opcoes.map((o, i) => (
            <OpcaoEditor
              key={o.chave}
              o={o}
              indice={i}
              total={opcoes.length}
              campos={campos}
              aoMudar={(m) => atualizarOpcao(o.chave, m)}
              aoRemover={() => setOpcoes((l) => l.filter((x) => x.chave !== o.chave))}
              aoMover={(d) => mover(i, d)}
              aoEnviarImagem={(f) => enviarImagem(o.chave, f)}
            />
          ))}
        </ol>
        {opcoes.length < MAX_OPCOES ? (
          <Button variante="secondary" onClick={() => setOpcoes((l) => [...l, opcaoVazia()])}>
            + Adicionar opção
          </Button>
        ) : (
          <p className="text-sm text-ink-muted">Você chegou ao limite de {MAX_OPCOES} opções por votação.</p>
        )}
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href={editando ? `/docente/votacoes/${inicial!.id}` : "/docente"}
          className={classeBotao("secondary")}
        >
          Cancelar
        </Link>
        <Button type="submit" carregando={salvando}>
          {editando ? "Salvar alterações" : "Salvar rascunho"}
        </Button>
      </div>
      <p className="text-right text-sm text-ink-muted">
        A votação fica como rascunho, invisível para os alunos, até você publicar.
      </p>
    </form>
  );
}

function Escolha({
  id,
  legenda,
  valor,
  aoMudar,
  opcoes,
  erro,
}: {
  id: string;
  legenda: string;
  valor: string;
  aoMudar: (v: string) => void;
  opcoes: { valor: string; rotulo: string; ajuda: string }[];
  erro?: string;
}) {
  const nome = useId();
  return (
    <fieldset id={id} tabIndex={-1} className="space-y-2">
      <legend className="mb-2 text-sm font-semibold">{legenda}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {opcoes.map((o) => (
          <label
            key={o.valor}
            className={cx(
              "flex cursor-pointer gap-3 rounded-[var(--radius-control)] border p-3",
              valor === o.valor ? "border-2 border-brand-600 bg-brand-50" : "border-line-strong",
            )}
          >
            <input
              type="radio"
              name={nome}
              value={o.valor}
              checked={valor === o.valor}
              onChange={() => aoMudar(o.valor)}
              className="mt-0.5 size-5 shrink-0 accent-brand-600"
            />
            <span>
              <span className="block font-semibold">{o.rotulo}</span>
              <span className="block text-sm text-ink-muted">{o.ajuda}</span>
            </span>
          </label>
        ))}
      </div>
      {erro && <p className="text-sm font-medium text-danger-600"><span aria-hidden="true">✕ </span>{erro}</p>}
    </fieldset>
  );
}

function OpcaoEditor({
  o,
  indice,
  total,
  campos,
  aoMudar,
  aoRemover,
  aoMover,
  aoEnviarImagem,
}: {
  o: OpcaoForm;
  indice: number;
  total: number;
  campos: Record<string, string>;
  aoMudar: (m: Partial<OpcaoForm>) => void;
  aoRemover: () => void;
  aoMover: (delta: number) => void;
  aoEnviarImagem: (f: File) => void;
}) {
  const n = indice + 1;
  const arquivoRef = useRef<HTMLInputElement>(null);
  const idArquivo = useId();
  const erroImagem = o.erroImagem ?? campos[`opcoes[${indice}].imagemUrl`];
  return (
    <li className="space-y-3 rounded-[var(--radius-control)] border border-line bg-canvas p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Opção {n}</h3>
        <div className="flex gap-1">
          <Button
            variante="ghost"
            tamanho="sm"
            onClick={() => aoMover(-1)}
            disabled={indice === 0}
            aria-label={`Mover opção ${n} para cima`}
          >
            ↑
          </Button>
          <Button
            variante="ghost"
            tamanho="sm"
            onClick={() => aoMover(1)}
            disabled={indice === total - 1}
            aria-label={`Mover opção ${n} para baixo`}
          >
            ↓
          </Button>
          <Button variante="ghost" tamanho="sm" onClick={aoRemover} className="text-danger-600 hover:bg-danger-50">
            Remover<span className="sr-only"> opção {n}</span>
          </Button>
        </div>
      </div>
      <InputField
        id={idDoCampo(`opcoes[${indice}].titulo`)}
        rotulo={`Título da opção ${n}`}
        value={o.titulo}
        onChange={(e) => aoMudar({ titulo: e.target.value })}
        erro={campos[`opcoes[${indice}].titulo`]}
        maxLength={200}
        obrigatorio
      />
      <TextareaField
        id={idDoCampo(`opcoes[${indice}].descricao`)}
        rotulo={`Descrição da opção ${n}`}
        value={o.descricao}
        onChange={(e) => aoMudar({ descricao: e.target.value })}
        erro={campos[`opcoes[${indice}].descricao`]}
        rows={2}
        ajuda="Opcional."
      />
      <div id={idDoCampo(`opcoes[${indice}].imagemUrl`)} tabIndex={-1} className="space-y-2">
        <p className="text-sm font-semibold">Imagem da opção {n} <span className="font-normal text-ink-muted">(opcional)</span></p>
        {o.imagemUrl && (
          <img
            src={o.imagemUrl}
            alt={`Prévia da imagem da opção ${n}`}
            className="aspect-video w-full max-w-xs rounded-[var(--radius-control)] border border-line bg-track object-cover"
          />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={arquivoRef}
            id={idArquivo}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            tabIndex={-1}
            aria-label={`Arquivo de imagem da opção ${n}`}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) aoEnviarImagem(f);
              e.target.value = "";
            }}
          />
          <Button
            variante="secondary"
            tamanho="sm"
            carregando={o.enviando}
            onClick={() => arquivoRef.current?.click()}
          >
            {o.enviando ? "Enviando imagem…" : o.imagemUrl ? "Trocar imagem" : "Escolher imagem"}
            <span className="sr-only"> da opção {n}</span>
          </Button>
          {o.imagemUrl && !o.enviando && (
            <Button variante="ghost" tamanho="sm" onClick={() => aoMudar({ imagemUrl: "", erroImagem: null })}>
              Remover imagem<span className="sr-only"> da opção {n}</span>
            </Button>
          )}
        </div>
        <p className="text-sm text-ink-muted">
          JPEG, PNG ou WebP, até 5 MB.
        </p>
        {erroImagem && (
          <p role="alert" className="text-sm font-medium text-danger-600">
            <span aria-hidden="true">✕ </span>{erroImagem}
          </p>
        )}
      </div>
    </li>
  );
}
