"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError, mensagemDeErro } from "@/lib/api";
import { validarNovaSenha } from "@/lib/senha";
import { SENHA_MIN, type Papel } from "@/lib/types";
import { useTitulo } from "@/lib/useTitulo";
import { useSessao } from "./Sessao";
import { PageHeader } from "./ui/PageHeader";
import { Card } from "./ui/Card";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { SenhaField } from "./ui/Field";

const ROTULO_PAPEL: Record<Papel, string> = { ALUNO: "Aluno", DOCENTE: "Docente", ADMIN: "Administrador" };

type Campos = { senhaAtual?: string; senha?: string; confirmacao?: string };

/** "Minha conta": dados do usuário e troca de senha (aluno e docente). */
export function MinhaConta() {
  useTitulo("Minha conta");
  const { usuario } = useSessao();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [campos, setCampos] = useState<Campos>({});
  const limpar = (c: keyof Campos) => setCampos((x) => (x[c] ? { ...x, [c]: undefined } : x));
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function trocar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);
    const c: Campos = {};
    if (!senhaAtual) c.senhaAtual = "Informe sua senha atual.";
    Object.assign(c, validarNovaSenha(senha, confirmacao));
    if (!c.senha && senha && senha === senhaAtual) c.senha = "A nova senha precisa ser diferente da atual.";
    setCampos(c);
    const primeiro = (["senhaAtual", "senha", "confirmacao"] as const).find((k) => c[k]);
    if (primeiro) return document.getElementById(`conta-${primeiro}`)?.focus();

    setEnviando(true);
    try {
      await api("/auth/senha", { method: "PUT", body: { senhaAtual, novaSenha: senha } });
      setSenhaAtual("");
      setSenha("");
      setConfirmacao("");
      setSucesso(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setCampos({ senhaAtual: err.message });
        document.getElementById("conta-senhaAtual")?.focus();
      } else {
        if (err instanceof ApiError && err.campos) {
          setCampos({ senhaAtual: err.campos.senhaAtual, senha: err.campos.novaSenha });
        }
        setErro(mensagemDeErro(err));
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader titulo="Minha conta" descricao="Seus dados de acesso ao sistema." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-lg font-bold">Seus dados</h2>
          <dl className="space-y-3">
            {[
              ["Nome", usuario.nome, "break-words"],
              ["E-mail", usuario.email, "break-all"],
              ["Matrícula", usuario.matricula ?? "—", ""],
              ["Perfil", ROTULO_PAPEL[usuario.papel], ""],
            ].map(([rotulo, valor, quebra]) => (
              <div key={rotulo}>
                <dt className="text-sm font-semibold text-ink-muted">{rotulo}</dt>
                <dd className={`text-ink ${quebra}`}>{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-ink-muted">
            Para corrigir nome, e-mail ou matrícula, procure a coordenação do sistema no seu campus.
          </p>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-bold">Trocar senha</h2>
          <form onSubmit={trocar} className="space-y-4" noValidate>
            {/* Ajuda gerenciadores de senha a associar a nova senha à conta. */}
            <input type="text" name="username" autoComplete="username" value={usuario.email} readOnly hidden />
            <SenhaField
              id="conta-senhaAtual"
              rotulo="Senha atual"
              nomeAlternar="senha atual"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(e) => { setSenhaAtual(e.target.value); limpar("senhaAtual"); }}
              erro={campos.senhaAtual}
              obrigatorio
            />
            <SenhaField
              id="conta-senha"
              rotulo="Nova senha"
              nomeAlternar="nova senha"
              autoComplete="new-password"
              minimo={SENHA_MIN}
              value={senha}
              onChange={(e) => { setSenha(e.target.value); limpar("senha"); }}
              erro={campos.senha}
              obrigatorio
            />
            <SenhaField
              id="conta-confirmacao"
              rotulo="Confirme a nova senha"
              nomeAlternar="confirmação da nova senha"
              autoComplete="new-password"
              value={confirmacao}
              onChange={(e) => { setConfirmacao(e.target.value); limpar("confirmacao"); }}
              erro={campos.confirmacao}
              obrigatorio
            />
            {erro && (
              <Alert tom="erro" titulo="Não foi possível trocar a senha" anunciar>
                <p>{erro}</p>
              </Alert>
            )}
            {sucesso && (
              <Alert tom="sucesso" titulo="Senha alterada" anunciar>
                <p>Use a nova senha da próxima vez que entrar.</p>
              </Alert>
            )}
            <Button type="submit" carregando={enviando} className="w-full sm:w-auto">
              Salvar nova senha
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
