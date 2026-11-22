"use client";

import { useRef, useState, type FormEvent } from "react";
import { api, ApiError, mensagemDeErro } from "@/lib/api";
import { formatarDataHora } from "@/lib/format";
import type { Dominio } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { useTitulo } from "@/lib/useTitulo";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Carregando } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErroCarregar } from "@/components/ErroCarregar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/Dialog";

const ordenar = (l: Dominio[]) => [...l].sort((a, b) => a.dominio.localeCompare(b.dominio));

export default function Dominios() {
  useTitulo("Domínios de e-mail");
  const { dados, setDados, erro, carregando, recarregar } = useDados(() => api<Dominio[]>("/admin/dominios"), []);
  const [novo, setNovo] = useState("");
  const [erroCampo, setErroCampo] = useState<string | undefined>();
  const [adicionando, setAdicionando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [remover, setRemover] = useState<Dominio | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [erroRemover, setErroRemover] = useState<string | null>(null);
  const refCampo = useRef<HTMLInputElement>(null);
  const refTitulo = useRef<HTMLHeadingElement>(null);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    setAviso(null);
    if (!novo.trim()) {
      setErroCampo("Informe o domínio, por exemplo ifrs.edu.br.");
      return refCampo.current?.focus();
    }
    setErroCampo(undefined);
    setAdicionando(true);
    try {
      // O backend normaliza (minúsculas, sem espaços, sem "@" inicial) e valida o formato.
      const d = await api<Dominio>("/admin/dominios", { method: "POST", body: { dominio: novo.trim() } });
      setDados((l) => ordenar([...(l ?? []), d]));
      setNovo("");
      setAviso(`Domínio ${d.dominio} adicionado. E-mails @${d.dominio} já podem criar conta e entrar.`);
    } catch (err) {
      setErroCampo(err instanceof ApiError ? (err.campos?.dominio ?? err.message) : mensagemDeErro(err));
      refCampo.current?.focus();
    } finally {
      setAdicionando(false);
    }
  }

  async function confirmarRemocao() {
    if (!remover) return;
    setRemovendo(true);
    setErroRemover(null);
    try {
      await api(`/admin/dominios/${remover.id}`, { method: "DELETE" });
      const restantes = (dados ?? []).filter((x) => x.id !== remover.id);
      setDados(restantes);
      setAviso(
        restantes.length === 0
          ? `Domínio ${remover.dominio} removido. A lista ficou vazia: agora qualquer domínio de e-mail é aceito.`
          : `Domínio ${remover.dominio} removido. Contas @${remover.dominio} não conseguem mais entrar.`,
      );
      setRemover(null);
      refTitulo.current?.focus();
    } catch (err) {
      setErroRemover(mensagemDeErro(err));
    } finally {
      setRemovendo(false);
    }
  }

  const ultimo = (dados?.length ?? 0) === 1;

  return (
    <>
      <PageHeader
        titulo="Domínios de e-mail"
        descricao="Defina quais e-mails podem criar conta e entrar no sistema. A conta do administrador não passa por esta verificação."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start">
        <Card className="space-y-4">
          <h2 className="text-lg font-bold">Adicionar domínio</h2>
          <form onSubmit={adicionar} className="space-y-4" noValidate>
            <InputField
              ref={refCampo}
              rotulo="Domínio"
              placeholder="ifrs.edu.br"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              erro={erroCampo}
              ajuda={
                <>
                  Só a parte depois do @, como <span className="font-semibold text-ink">ifrs.edu.br</span>. Subdomínios
                  contam à parte: <span className="font-semibold text-ink">aluno.ifrs.edu.br</span> precisa ser
                  adicionado separadamente.
                </>
              }
              obrigatorio
            />
            <Button type="submit" carregando={adicionando} className="w-full sm:w-auto">
              Adicionar domínio
            </Button>
          </form>
        </Card>

        <section aria-labelledby="titulo-lista" className="space-y-3">
          <h2 id="titulo-lista" ref={refTitulo} tabIndex={-1} className="text-lg font-bold">
            Domínios aceitos
          </h2>
          {aviso && (
            <Alert tom="sucesso" anunciar>
              <p>{aviso}</p>
            </Alert>
          )}
          {carregando && <Carregando texto="Carregando domínios…" />}
          {erro && <ErroCarregar mensagem={erro} aoTentar={recarregar} />}
          {dados && dados.length === 0 && (
            <EmptyState titulo="Nenhum domínio na lista: qualquer e-mail é aceito">
              Enquanto a lista estiver vazia, pessoas com e-mail de qualquer domínio podem criar conta e entrar.
              Adicione um domínio para restringir o acesso.
            </EmptyState>
          )}
          {dados && dados.length > 0 && (
            <>
              <p className="text-sm text-ink-muted">
                Só e-mails {dados.length === 1 ? "deste domínio podem" : `destes ${dados.length} domínios podem`} criar
                conta e entrar.
              </p>
              <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
                {dados.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="break-all font-semibold">{d.dominio}</p>
                      <p className="text-sm text-ink-muted">Adicionado em {formatarDataHora(d.criadoEm)}</p>
                    </div>
                    <Button
                      variante="secondary"
                      tamanho="sm"
                      onClick={() => {
                        setErroRemover(null);
                        setRemover(d);
                      }}
                    >
                      Remover<span className="sr-only"> o domínio {d.dominio}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        aberto={remover !== null}
        aoFechar={() => setRemover(null)}
        aoConfirmar={confirmarRemocao}
        carregando={removendo}
        erro={erroRemover}
        variante="danger"
        titulo={`Remover o domínio ${remover?.dominio ?? ""}?`}
        rotuloConfirmar="Remover domínio"
        rotuloCancelar="Manter domínio"
      >
        <p>
          Contas com e-mail <span className="font-semibold text-ink">@{remover?.dominio}</span> deixam de entrar
          imediatamente, inclusive quem estiver usando o sistema agora. Elas voltam a entrar se você adicionar o domínio
          de novo.
        </p>
        {ultimo && (
          <p>
            Este é o último domínio da lista. Com a lista vazia, <strong className="text-ink">qualquer domínio</strong>{" "}
            passa a ser aceito.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
