-- Troca do login Google por e-mail e senha (seção 2 da especificação).

-- (a) Senha com hash BCrypt. Contas antigas (vindas do Google) ficam sem senha: não conseguem
--     entrar até usar "esqueci minha senha".
ALTER TABLE usuario ADD COLUMN senha_hash VARCHAR(100);

-- (b) Colunas exclusivas do Google (a restrição UNIQUE de google_sub cai junto).
ALTER TABLE usuario DROP COLUMN google_sub;
ALTER TABLE usuario DROP COLUMN foto_url;

-- (c) O status CADASTRO_INCOMPLETO deixa de existir. Contas nesse status nunca tiveram papel nem
--     matrícula e não podiam criar nada; são removidas para que a pessoa possa se cadastrar de novo
--     com o mesmo e-mail. Por segurança, só remove as que não são referenciadas por nenhuma tabela;
--     as demais (não deveriam existir) ficam como REJEITADO.
DELETE FROM usuario u
 WHERE u.status = 'CADASTRO_INCOMPLETO'
   AND NOT EXISTS (SELECT 1 FROM turma t WHERE t.docente_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM turma_aluno ta WHERE ta.aluno_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM votacao v WHERE v.docente_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM participacao p WHERE p.aluno_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM voto vo WHERE vo.aluno_id = u.id);
UPDATE usuario SET status = 'REJEITADO' WHERE status = 'CADASTRO_INCOMPLETO';

ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_status_check;
ALTER TABLE usuario ADD CONSTRAINT usuario_status_check
    CHECK (status IN ('PENDENTE_APROVACAO', 'ATIVO', 'REJEITADO'));

-- (d) Domínios de e-mail aceitos, mantidos pelo admin. Lista vazia = qualquer domínio.
CREATE TABLE dominio_aceito (
    id         BIGSERIAL PRIMARY KEY,
    dominio    VARCHAR(253) NOT NULL UNIQUE,
    criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- (e) Tokens de redefinição de senha: só o hash SHA-256 (hex) do token é guardado.
CREATE TABLE token_redefinicao_senha (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expira_em   TIMESTAMPTZ NOT NULL,
    usado_em    TIMESTAMPTZ
);
CREATE INDEX idx_token_redefinicao_usuario ON token_redefinicao_senha (usuario_id);
