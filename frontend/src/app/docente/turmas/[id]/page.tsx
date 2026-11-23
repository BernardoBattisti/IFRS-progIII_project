"use client";

import { useTitulo } from "@/lib/useTitulo";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api, mensagemDeErro } from "@/lib/api";
import type { AlunoTurma, Turma } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { plural } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Carregando } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErroCarregar } from "@/components/ErroCarregar";
import { Secao } from "@/components/ui/Card";
import { Tabela, celula } from "@/components/ui/Tabela";
import { Trilha } from "@/components/ui/Trilha";
import styles from "./page.module.css";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { TurmaForm } from "@/components/TurmaForm";
import { CodigoTurma } from "@/components/CodigoTurma";

export default function TurmaDocente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // Não há GET /turmas/{id} no contrato: buscamos a lista e filtramos.
  const turma = useDados(async () => {
    const lista = await api<Turma[]>("/turmas");
    const t = lista.find((x) => String(x.id) === id);
    if (!t) throw new Error("Turma não encontrada.");
    return t;
  }, [id]);
  const alunos = useDados(() => api<AlunoTurma[]>(`/turmas/${id}/alunos`), [id]);

  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<"codigo" | "excluir" | { remover: AlunoTurma } | null>(null);
  const [executando, setExecutando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const t = turma.dados;
  useTitulo(t?.nome ?? "Turma");

  async function rodar(fn: () => Promise<void>) {
    setExecutando(true);
    setErroAcao(null);
    try {
      await fn();
      setDialogo(null);
    } catch (e) {
      setErroAcao(mensagemDeErro(e));
    } finally {
      setExecutando(false);
    }
  }

  const voltar = <Trilha itens={[{ rotulo: "Turmas", href: "/docente/turmas" }, { rotulo: t?.nome ?? "Turma" }]} />;

  if (!t) {
    return (
      <>
        {voltar}
        {turma.carregando && <Carregando texto="Carregando turma…" />}
        {turma.erro && <ErroCarregar mensagem={turma.erro} />}
      </>
    );
  }

  const remover = dialogo && typeof dialogo === "object" ? dialogo.remover : null;

  return (
    <>
      <PageHeader
        antes={voltar}
        titulo={t.nome}
        descricao={t.descricao ?? undefined}
        acoes={
          !editando && (
            <Button variante="secondary" onClick={() => setEditando(true)}>
              Editar turma
            </Button>
          )
        }
      />
      <div className={styles.pilha}>
        {aviso && (
          <Alert tom="sucesso" anunciar>
            <p>{aviso}</p>
          </Alert>
        )}
        {editando && (
          <Secao id="titulo-editar" titulo="Editar turma" variante="form">
            <TurmaForm
              inicial={t}
              aoSalvar={(nova) => {
                turma.setDados(nova);
                setEditando(false);
                setAviso("Turma atualizada.");
              }}
              aoCancelar={() => setEditando(false)}
            />
          </Secao>
        )}

        <Secao
          id="titulo-codigo"
          titulo="Código de entrada"
          descricao="Os alunos entram na turma digitando este código em “Turmas”."
        >
          {t.codigo && <CodigoTurma codigo={t.codigo} nomeTurma={t.nome} />}
          <Button variante="secondary" tamanho="sm" onClick={() => { setErroAcao(null); setDialogo("codigo"); }}>
            Gerar novo código
          </Button>
        </Secao>

        <Secao
          id="titulo-alunos"
          titulo={
            <>
              Alunos {alunos.dados && <span className={styles.qtd}>({alunos.dados.length})</span>}
            </>
          }
        >
          {alunos.carregando && <Carregando texto="Carregando alunos…" />}
          {alunos.erro && <ErroCarregar mensagem={alunos.erro} aoTentar={alunos.recarregar} />}
          {alunos.dados && alunos.dados.length === 0 && (
            <EmptyState titulo="Nenhum aluno na turma">
              Compartilhe o código acima. Os alunos aparecem aqui assim que entrarem.
            </EmptyState>
          )}
          {alunos.dados && alunos.dados.length > 0 && (
            <Tabela legenda="Alunos da turma">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Matrícula</th>
                  <th scope="col">E-mail</th>
                  <th scope="col">
                    <span className="sr-only">Ação</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {alunos.dados.map((a) => (
                  <tr key={a.id}>
                    <td data-rotulo="Nome" className={`${celula.principal} ${celula.semRotulo}`}>
                      {a.nome}
                    </td>
                    <td data-rotulo="Matrícula">{a.matricula}</td>
                    <td data-rotulo="E-mail" className={styles.email}>
                      {a.email}
                    </td>
                    <td className={`${celula.acoes} ${celula.semRotulo}`}>
                      <Button
                        variante="danger-secondary"
                        tamanho="sm"
                        onClick={() => {
                          setErroAcao(null);
                          setDialogo({ remover: a });
                        }}
                      >
                        Remover<span className="sr-only"> {a.nome} da turma</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )}
        </Secao>

        <Secao
          id="titulo-excluir"
          titulo="Excluir turma"
          variante="perigo"
          descricao="Só é possível excluir turmas que não estão vinculadas a nenhuma votação."
        >
          <Button variante="danger" tamanho="sm" onClick={() => { setErroAcao(null); setDialogo("excluir"); }}>
            Excluir turma
          </Button>
        </Secao>
      </div>

      <ConfirmDialog
        aberto={dialogo === "codigo"}
        aoFechar={() => setDialogo(null)}
        carregando={executando}
        erro={erroAcao}
        titulo="Gerar um novo código?"
        rotuloConfirmar="Gerar novo código"
        rotuloCancelar="Manter código atual"
        aoConfirmar={() =>
          rodar(async () => {
            const nova = await api<Turma>(`/turmas/${t.id}/codigo`, { method: "POST" });
            turma.setDados(nova);
            setAviso(`Novo código gerado: ${nova.codigo ?? ""}. O código anterior não funciona mais.`);
          })
        }
      >
        <p>
          O código atual (<code className={styles.codigo}>{t.codigo}</code>) deixará de funcionar. Os
          alunos que já estão na turma continuam nela.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        aberto={dialogo === "excluir"}
        aoFechar={() => setDialogo(null)}
        carregando={executando}
        erro={erroAcao}
        variante="danger"
        titulo={`Excluir a turma “${t.nome}”?`}
        rotuloConfirmar="Excluir turma"
        rotuloCancelar="Manter turma"
        aoConfirmar={() =>
          rodar(async () => {
            await api(`/turmas/${t.id}`, { method: "DELETE" });
            router.replace("/docente/turmas");
          })
        }
      >
        <p>
          {plural(t.totalAlunos, "aluno sairá", "alunos sairão")} da turma. Não dá para desfazer.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        aberto={Boolean(remover)}
        aoFechar={() => setDialogo(null)}
        carregando={executando}
        erro={erroAcao}
        variante="danger"
        titulo={`Remover ${remover?.nome ?? "aluno"} da turma?`}
        rotuloConfirmar="Remover aluno"
        rotuloCancelar="Cancelar"
        aoConfirmar={() =>
          rodar(async () => {
            if (!remover) return;
            await api(`/turmas/${t.id}/alunos/${remover.id}`, { method: "DELETE" });
            alunos.setDados((l) => (l ?? []).filter((x) => x.id !== remover.id));
            turma.setDados({ ...t, totalAlunos: Math.max(0, t.totalAlunos - 1) });
            setAviso(`${remover.nome} não faz mais parte da turma.`);
          })
        }
      >
        <p>O aluno deixa de ver as votações desta turma. Ele pode voltar a entrar usando o código da turma.</p>
      </ConfirmDialog>
    </>
  );
}
