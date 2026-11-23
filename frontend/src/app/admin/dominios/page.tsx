"use client";

import { useRef, useState, type FormEvent } from "react";
import { api, ApiError, mensagemDeErro } from "@/lib/api";
import { formatarDataHora } from "@/lib/format";
import type { Dominio } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { useTitulo } from "@/lib/useTitulo";
import { PageHeader } from "@/components/ui/PageHeader";
import { Secao } from "@/components/ui/Card";
import { Tabela, celula } from "@/components/ui/Tabela";
import styles from "./page.module.css";
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

      <div className={styles.pilha}>
        <Secao id="titulo-adicionar" titulo="Adicionar domínio" variante="form">
          <form onSubmit={adicionar} className={styles.form} noValidate>
            <div className={styles.campo}>
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
                  Só a parte depois do @, como <strong className={styles.escuro}>ifrs.edu.br</strong>. Subdomínios
                  contam à parte: <strong className={styles.escuro}>aluno.ifrs.edu.br</strong> precisa ser
                  adicionado separadamente.
                </>
              }
              obrigatorio
            />
            </div>
            <Button type="submit" carregando={adicionando} className={styles.enviar}>
              Adicionar domínio
            </Button>
          </form>
        </Secao>

        <Secao id="titulo-lista" titulo="Domínios aceitos" tituloRef={refTitulo}>
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
              <p className={styles.nota}>
                Só e-mails {dados.length === 1 ? "deste domínio podem" : `destes ${dados.length} domínios podem`} criar
                conta e entrar.
              </p>
              <Tabela legenda="Domínios aceitos">
                <thead>
                  <tr>
                    <th scope="col">Domínio</th>
                    <th scope="col">Adicionado em</th>
                    <th scope="col">
                      <span className="sr-only">Ação</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((d) => (
                    <tr key={d.id}>
                      <td data-rotulo="Domínio" className={`${celula.principal} ${celula.semRotulo} ${styles.dominio}`}>
                        {d.dominio}
                      </td>
                      <td data-rotulo="Adicionado em">{formatarDataHora(d.criadoEm)}</td>
                      <td className={`${celula.acoes} ${celula.semRotulo}`}>
                        <Button
                          variante="danger-secondary"
                          tamanho="sm"
                          onClick={() => {
                            setErroRemover(null);
                            setRemover(d);
                          }}
                        >
                          Remover<span className="sr-only"> o domínio {d.dominio}</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            </>
          )}
        </Secao>
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
          Contas com e-mail <strong className={styles.escuro}>@{remover?.dominio}</strong> deixam de entrar
          imediatamente, inclusive quem estiver usando o sistema agora. Elas voltam a entrar se você adicionar o domínio
          de novo.
        </p>
        {ultimo && (
          <p>
            Este é o último domínio da lista. Com a lista vazia, <strong className={styles.escuro}>qualquer domínio</strong>{" "}
            passa a ser aceito.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
