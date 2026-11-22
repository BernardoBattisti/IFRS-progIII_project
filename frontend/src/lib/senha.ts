import { SENHA_MAX_BYTES, SENHA_MIN } from "./types";

/** Tamanho em bytes UTF-8 (o BCrypt considera no máximo 72 bytes). */
export function bytesUtf8(texto: string) {
  return new TextEncoder().encode(texto).length;
}

/** Erros de nova senha + confirmação (cadastro, redefinição e troca de senha). */
export function validarNovaSenha(senha: string, confirmacao: string) {
  const c: { senha?: string; confirmacao?: string } = {};
  if (!senha) c.senha = "Crie uma senha.";
  else if ([...senha].length < SENHA_MIN) c.senha = `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`;
  else if (bytesUtf8(senha) > SENHA_MAX_BYTES) c.senha = `A senha pode ter no máximo ${SENHA_MAX_BYTES} caracteres.`;
  if (!confirmacao) c.confirmacao = "Repita a senha para confirmar.";
  else if (senha && confirmacao !== senha) c.confirmacao = "As senhas não são iguais. Digite a mesma senha nos dois campos.";
  return c;
}
