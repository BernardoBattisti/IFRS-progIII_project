"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiError, mensagemDeErro } from "@/lib/api";
import { TelaPublica, classeLinkTexto, focarTituloTela } from "@/components/TelaPublica";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import styles from "@/components/FormPublico.module.css";

export function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [erroCampo, setErroCampo] = useState<string | undefined>();
  const [erro, setErro] = useState<{ titulo: string; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);
  const refEmail = useRef<HTMLInputElement>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const valor = email.trim();
    if (!valor) {
      setErroCampo("Informe o e-mail da sua conta.");
      return refEmail.current?.focus();
    }
    setErroCampo(undefined);
    setEnviando(true);
    try {
      await api("/auth/esqueci-senha", { method: "POST", body: { email: valor } });
      setEnviadoPara(valor);
      focarTituloTela();
    } catch (err) {
      setErro(
        err instanceof ApiError && err.status === 429
          ? { titulo: "Muitas tentativas seguidas", texto: err.message }
          : { titulo: "Não foi possível enviar o pedido", texto: mensagemDeErro(err) },
      );
    } finally {
      setEnviando(false);
    }
  }

  const rodape = (
    <p>
      Lembrou a senha?{" "}
      <Link href="/login" className={classeLinkTexto}>
        Voltar para o login
      </Link>
    </p>
  );

  if (enviadoPara) {
    // Mensagem sempre igual, exista ou não a conta (seção 2.4).
    return (
      <TelaPublica titulo="Confira seu e-mail" rodape={rodape}>
        <Alert tom="sucesso" titulo="Pedido recebido" anunciar>
          <p>
            Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha. O link vale por 1 hora e
            só pode ser usado uma vez.
          </p>
        </Alert>
        <p className={styles.texto}>
          Não chegou em alguns minutos? Confira a caixa de spam ou peça um novo link. Cada novo pedido cancela os links
          anteriores.
        </p>
        <Button
          variante="secondary"
          bloco
          onClick={() => {
            setEnviadoPara(null);
            requestAnimationFrame(() => refEmail.current?.focus());
          }}
        >
          Pedir outro link
        </Button>
      </TelaPublica>
    );
  }

  return (
    <TelaPublica
      titulo="Recuperar senha"
      descricao="Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha."
      rodape={rodape}
    >
      <form onSubmit={enviar} className={styles.form} noValidate>
        <InputField
          ref={refEmail}
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          erro={erroCampo}
          obrigatorio
        />
        {erro && (
          <Alert tom="erro" titulo={erro.titulo} anunciar>
            <p>{erro.texto}</p>
          </Alert>
        )}
        <Button type="submit" bloco carregando={enviando}>
          Enviar link
        </Button>
      </form>
    </TelaPublica>
  );
}
