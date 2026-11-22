"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError, mensagemDeErro } from "@/lib/api";
import { validarNovaSenha } from "@/lib/senha";
import { SENHA_MIN } from "@/lib/types";
import { TelaPublica, classeLinkTexto, focarTituloTela } from "@/components/TelaPublica";
import { Alert } from "@/components/ui/Alert";
import { Button, LinkBotao } from "@/components/ui/Button";
import { SenhaField } from "@/components/ui/Field";

type Etapa = "formulario" | "sucesso" | "invalido";

export function RedefinirSenha() {
  const params = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const [etapa, setEtapa] = useState<Etapa>(token ? "formulario" : "invalido");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [campos, setCampos] = useState<{ senha?: string; confirmacao?: string }>({});
  const limpar = (c: "senha" | "confirmacao") => setCampos((x) => (x[c] ? { ...x, [c]: undefined } : x));
  const [erro, setErro] = useState<{ titulo: string; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const c = validarNovaSenha(senha, confirmacao);
    setCampos(c);
    if (c.senha) return document.getElementById("nova-senha")?.focus();
    if (c.confirmacao) return document.getElementById("confirmacao-senha")?.focus();
    setEnviando(true);
    try {
      await api("/auth/redefinir-senha", { method: "POST", body: { token, novaSenha: senha } });
      setEtapa("sucesso");
      focarTituloTela();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setEtapa("invalido");
        focarTituloTela();
      } else {
        if (err instanceof ApiError && err.campos?.novaSenha) setCampos({ senha: err.campos.novaSenha });
        setErro(
          err instanceof ApiError && err.status === 429
            ? { titulo: "Muitas tentativas seguidas", texto: err.message }
            : { titulo: "Não foi possível salvar a nova senha", texto: mensagemDeErro(err) },
        );
      }
    } finally {
      setEnviando(false);
    }
  }

  if (etapa === "sucesso") {
    return (
      <TelaPublica titulo="Senha alterada">
        <Alert tom="sucesso" titulo="Sua nova senha já está valendo" anunciar>
          <p>Entre com seu e-mail e a nova senha.</p>
        </Alert>
        <LinkBotao href="/login" className="w-full">
          Ir para o login
        </LinkBotao>
      </TelaPublica>
    );
  }

  if (etapa === "invalido") {
    return (
      <TelaPublica titulo="Link inválido ou expirado">
        <Alert tom="erro" titulo="Este link de redefinição não funciona mais" anunciar>
          <p>
            O link vale por 1 hora e só pode ser usado uma vez. Ele também deixa de valer quando você pede um link
            novo.
          </p>
        </Alert>
        <LinkBotao href="/esqueci-senha" className="w-full">
          Pedir um novo link
        </LinkBotao>
        <p className="text-center text-sm text-ink-muted">
          <Link href="/login" className={classeLinkTexto}>
            Voltar para o login
          </Link>
        </p>
      </TelaPublica>
    );
  }

  return (
    <TelaPublica
      titulo="Criar nova senha"
      descricao="Escolha uma senha nova para sua conta."
      rodape={
        <p>
          <Link href="/login" className={classeLinkTexto}>
            Voltar para o login
          </Link>
        </p>
      }
    >
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <SenhaField
          id="nova-senha"
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
          id="confirmacao-senha"
          rotulo="Confirme a nova senha"
          nomeAlternar="confirmação da nova senha"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => { setConfirmacao(e.target.value); limpar("confirmacao"); }}
          erro={campos.confirmacao}
          obrigatorio
        />
        {erro && (
          <Alert tom="erro" titulo={erro.titulo} anunciar>
            <p>{erro.texto}</p>
          </Alert>
        )}
        <Button type="submit" className="w-full" carregando={enviando}>
          Salvar nova senha
        </Button>
      </form>
    </TelaPublica>
  );
}
