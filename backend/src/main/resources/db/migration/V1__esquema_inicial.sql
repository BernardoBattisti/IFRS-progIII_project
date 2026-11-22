-- Esquema inicial do Sistema de Votações Escolares (PostgreSQL 16).

CREATE TABLE usuario (
    id          BIGSERIAL PRIMARY KEY,
    email       VARCHAR(320) NOT NULL UNIQUE,
    nome        VARCHAR(200) NOT NULL,
    foto_url    VARCHAR(1000),
    google_sub  VARCHAR(255) UNIQUE,
    matricula   VARCHAR(30) UNIQUE,
    papel       VARCHAR(20) CHECK (papel IN ('ALUNO', 'DOCENTE', 'ADMIN')),
    status      VARCHAR(30) NOT NULL
                CHECK (status IN ('CADASTRO_INCOMPLETO', 'PENDENTE_APROVACAO', 'ATIVO', 'REJEITADO')),
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE turma (
    id          BIGSERIAL PRIMARY KEY,
    nome        VARCHAR(150) NOT NULL,
    descricao   VARCHAR(1000),
    codigo      VARCHAR(8) NOT NULL UNIQUE,
    docente_id  BIGINT NOT NULL REFERENCES usuario (id),
    criada_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_turma_docente ON turma (docente_id);

CREATE TABLE turma_aluno (
    turma_id    BIGINT NOT NULL REFERENCES turma (id) ON DELETE CASCADE,
    aluno_id    BIGINT NOT NULL REFERENCES usuario (id),
    PRIMARY KEY (turma_id, aluno_id)
);
CREATE INDEX idx_turma_aluno_aluno ON turma_aluno (aluno_id);

CREATE TABLE votacao (
    id                      BIGSERIAL PRIMARY KEY,
    docente_id              BIGINT NOT NULL REFERENCES usuario (id),
    titulo                  VARCHAR(200) NOT NULL,
    descricao               VARCHAR(4000),
    inicio                  TIMESTAMPTZ NOT NULL,
    fim                     TIMESTAMPTZ NOT NULL,
    votos_por_aluno         INTEGER NOT NULL CHECK (votos_por_aluno >= 1),
    permite_repetir_opcao   BOOLEAN NOT NULL,
    anonima                 BOOLEAN NOT NULL,
    visibilidade_resultado  VARCHAR(20) NOT NULL
                            CHECK (visibilidade_resultado IN ('SEMPRE', 'APOS_ENCERRAR', 'NUNCA')),
    publicada               BOOLEAN NOT NULL DEFAULT FALSE,
    criada_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- ">=" (e não ">") porque "encerrar antecipadamente" grava fim = agora, que pode coincidir com o início.
    CONSTRAINT ck_votacao_datas CHECK (fim >= inicio)
);
CREATE INDEX idx_votacao_docente ON votacao (docente_id);

-- Turmas não podem ser excluídas enquanto vinculadas (RESTRICT): a regra é verificada no serviço (409)
-- e garantida aqui.
CREATE TABLE votacao_turma (
    votacao_id  BIGINT NOT NULL REFERENCES votacao (id) ON DELETE CASCADE,
    turma_id    BIGINT NOT NULL REFERENCES turma (id) ON DELETE RESTRICT,
    PRIMARY KEY (votacao_id, turma_id)
);
CREATE INDEX idx_votacao_turma_turma ON votacao_turma (turma_id);

CREATE TABLE opcao (
    id          BIGSERIAL PRIMARY KEY,
    votacao_id  BIGINT NOT NULL REFERENCES votacao (id) ON DELETE CASCADE,
    titulo      VARCHAR(200) NOT NULL,
    descricao   VARCHAR(2000),
    imagem_url  VARCHAR(300),
    ordem       INTEGER NOT NULL
);
CREATE INDEX idx_opcao_votacao ON opcao (votacao_id);

-- Participação: única ligação entre aluno e votação. Serve de linha de lock (SELECT ... FOR UPDATE)
-- para serializar envios concorrentes do mesmo aluno. Não guarda data/hora.
CREATE TABLE participacao (
    votacao_id   BIGINT NOT NULL REFERENCES votacao (id) ON DELETE CASCADE,
    aluno_id     BIGINT NOT NULL REFERENCES usuario (id),
    votos_usados INTEGER NOT NULL DEFAULT 0 CHECK (votos_usados >= 0),
    PRIMARY KEY (votacao_id, aluno_id)
);
CREATE INDEX idx_participacao_aluno ON participacao (aluno_id);

-- Voto. Em votação anônima, aluno_id e registrado_em ficam NULL e o id é um UUID aleatório
-- (sem sequência que permita correlacionar a ordem dos votos com a ordem das participações).
CREATE TABLE voto (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    votacao_id    BIGINT NOT NULL REFERENCES votacao (id) ON DELETE CASCADE,
    opcao_id      BIGINT NOT NULL REFERENCES opcao (id) ON DELETE CASCADE,
    aluno_id      BIGINT REFERENCES usuario (id),
    quantidade    INTEGER NOT NULL CHECK (quantidade >= 1),
    registrado_em TIMESTAMPTZ,
    CONSTRAINT ck_voto_identificacao CHECK ((aluno_id IS NULL) = (registrado_em IS NULL))
);
CREATE INDEX idx_voto_votacao ON voto (votacao_id);
CREATE INDEX idx_voto_aluno ON voto (votacao_id, aluno_id);

-- Guarda de anonimato: HMAC-SHA256(APP_JWT_SECRET, "votacao:aluno:opcao") em hexadecimal.
-- Permite impor "no máximo 1 voto por opção" em votação anônima sem registrar quem votou em quê.
CREATE TABLE guarda_anonima (
    hash        VARCHAR(64) PRIMARY KEY,
    votacao_id  BIGINT NOT NULL REFERENCES votacao (id) ON DELETE CASCADE
);
