# Sistema de Votações Escolares — Especificação

Projeto de conclusão de Programação III (IFRS). Este documento é o contrato entre backend e frontend.

## 1. Visão geral

Docentes criam votações e definem suas regras; estudantes votam; um administrador aprova os docentes.

| Camada   | Tecnologia |
|----------|------------|
| Banco    | PostgreSQL 16 |
| Backend  | Java 21, Spring Boot 3, Spring Security, Spring Data JPA, Flyway (`/backend`) |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS (`/frontend`) |
| Execução | Docker Compose (postgres + backend + frontend) |

Idioma da interface e das mensagens de erro: **português do Brasil**.

```
Navegador ──> Next.js :3000 ──(rewrite /api/*)──> Spring Boot :8080 ──> PostgreSQL
                                                        └──> volume de uploads (imagens)
```

O navegador fala apenas com o Next.js. Tudo em `/api/*` é repassado ao backend (rewrite), de modo que
o cookie de sessão é de mesma origem e não há CORS.

## 2. Perfis e contas

Papéis: `ALUNO`, `DOCENTE`, `ADMIN`.
Status da conta: `CADASTRO_INCOMPLETO`, `PENDENTE_APROVACAO`, `ATIVO`, `REJEITADO`.

- Login **somente via Google OAuth**. Domínios de e-mail aceitos vêm de `APP_ALLOWED_DOMAINS`
  (lista separada por vírgula; vazia = qualquer conta Google). Domínio não aceito → login negado.
- Primeiro acesso: conta criada como `CADASTRO_INCOMPLETO` (sem papel). O usuário escolhe
  **Aluno** ou **Docente** e informa a **matrícula** (obrigatória para ambos, única no sistema).
  - Aluno → `ATIVO` imediatamente.
  - Docente → `PENDENTE_APROVACAO` até um admin aprovar (`ATIVO`) ou rejeitar (`REJEITADO`).
- E-mails listados em `APP_ADMIN_EMAILS` viram `ADMIN` + `ATIVO` ao logar (sem matrícula).
- Admin: lista usuários, aprova e rejeita docentes. Não gerencia votações.
- **Login de desenvolvimento**: apenas com o perfil Spring `dev` ativo, `POST /api/dev/login`
  permite entrar informando e-mail e nome, sem Google. Nunca disponível fora do perfil `dev`.
- Sessão: JWT assinado (`APP_JWT_SECRET`) em cookie `HttpOnly`, `SameSite=Lax`.

## 3. Turmas

- Docente cria turmas (nome, descrição). Cada turma tem um **código de entrada** gerado
  automaticamente (8 caracteres, sem caracteres ambíguos), que o docente pode regenerar.
- Aluno entra em uma turma informando o código. Pode estar em várias turmas.
- Docente vê os alunos da turma e pode remover um aluno.
- Turma vinculada a alguma votação não pode ser excluída (409).

## 4. Votações

### 4.1 Campos configuráveis pelo docente

| Campo | Regra |
|-------|-------|
| `titulo`, `descricao` | título obrigatório |
| `inicio`, `fim` | data/hora (ISO-8601 UTC); `fim > inicio` |
| `votosPorAluno` (N) | inteiro ≥ 1 |
| `permiteRepetirOpcao` | `false`: no máximo 1 voto do aluno por opção; `true`: pode concentrar votos na mesma opção |
| `anonima` | `true`: ninguém vê quem votou em quê |
| `visibilidadeResultado` | `SEMPRE`, `APOS_ENCERRAR`, `NUNCA` (para alunos) |
| `turmaIds` | turmas do próprio docente; **vazio = todos os alunos ativos** |
| `opcoes` | mínimo 2; cada uma com `titulo`, `descricao` opcional, `imagemUrl` opcional |

Se `permiteRepetirOpcao = false`, `votosPorAluno` não pode exceder o número de opções.

### 4.2 Ciclo de vida

Estado derivado (`estado`): `RASCUNHO` → `AGENDADA` → `ABERTA` → `ENCERRADA`.

- `RASCUNHO`: editável e excluível livremente; invisível para alunos.
- **Publicar**: valida tudo (inclusive `fim` no futuro). Vira `AGENDADA` se `agora < inicio`, senão `ABERTA`.
- `AGENDADA`: pode ser **despublicada** (volta a rascunho). Visível aos alunos elegíveis, sem votar.
- `ABERTA` (`inicio ≤ agora < fim`): regras e opções **travadas**. O docente pode apenas
  **encerrar antecipadamente** (fim = agora) ou **prorrogar** (novo `fim` > `fim` atual).
- `ENCERRADA`: imutável.

### 4.3 Votar

- Só aluno `ATIVO` e elegível (sem turmas na votação, ou membro de ao menos uma delas), com a votação `ABERTA`.
- O aluno gasta seus N votos **aos poucos**: pode enviar vários envios enquanto a votação estiver
  aberta, até somar N. **Todo voto enviado é final** (sem alterar nem retirar).
- Cada envio: lista de `{opcaoId, quantidade ≥ 1}`. Rejeitado por inteiro (422) se exceder os votos
  restantes ou violar `permiteRepetirOpcao` (considerando também votos anteriores).
- Envios concorrentes do mesmo aluno não podem ultrapassar N (lock na linha de participação).

### 4.4 Anonimato

Em votação anônima o voto é gravado **sem** referência ao aluno e **sem** data/hora. Guarda-se à parte
apenas a participação (aluno, votação, votos usados). Para impor "1 voto por opção" sem identificar o
aluno, grava-se um HMAC-SHA256 (`APP_JWT_SECRET`) de `votacao:aluno:opcao` numa tabela de guarda.
Em votação anônima, nem o docente nem o próprio aluno conseguem ver em quais opções o aluno votou —
apenas quantos votos já usou.

### 4.5 Resultados

- **Docente criador**: sempre vê os totais em tempo real (a partir da publicação).
- **Aluno elegível**: conforme `visibilidadeResultado` — `SEMPRE` (a partir da abertura),
  `APOS_ENCERRAR`, `NUNCA`.
- Votação **não anônima**: quem pode ver o resultado vê também **quem votou em quê**
  (nome, matrícula, quantidade). Votação anônima: só totais.
- O frontend atualiza resultados por polling (5 s) enquanto a votação está aberta.

### 4.6 Imagens

Upload pelo docente: JPEG, PNG ou WebP, até 5 MB. Arquivo salvo em `APP_UPLOAD_DIR` (volume Docker)
com nome UUID; tipo validado pelo conteúdo. Leitura pública em `/api/arquivos/{nome}`.

## 5. API REST

Base: `/api`. JSON. Datas em ISO-8601 UTC (`2026-11-20T13:00:00Z`).

Erros:
```json
{ "status": 422, "erro": "REGRA_NEGOCIO", "mensagem": "Você só tem 1 voto restante.", "campos": { "titulo": "obrigatório" } }
```
`campos` só aparece em erro de validação (400). Códigos: 400 validação, 401 não autenticado,
403 sem permissão, 404 não encontrado, 409 conflito, 422 regra de negócio.

### 5.1 Autenticação

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/auth/config` | público | `{ "devLogin": bool, "googleHabilitado": bool }` |
| GET | `/oauth2/authorization/google` | público | inicia o OAuth (redirect). Callback: `/api/login/oauth2/code/google`; ao final redireciona para `/` |
| GET | `/auth/me` | autenticado | `Usuario` |
| POST | `/auth/cadastro` | `CADASTRO_INCOMPLETO` | `{ "papel": "ALUNO"\|"DOCENTE", "matricula": "..." }` → `Usuario` |
| POST | `/auth/logout` | autenticado | 204 |
| POST | `/dev/login` | perfil `dev` | `{ "email", "nome" }` → `Usuario` |

```ts
type Usuario = {
  id: number; nome: string; email: string; fotoUrl: string | null; matricula: string | null;
  papel: "ALUNO" | "DOCENTE" | "ADMIN" | null;
  status: "CADASTRO_INCOMPLETO" | "PENDENTE_APROVACAO" | "ATIVO" | "REJEITADO";
};
```

Todas as rotas abaixo exigem conta `ATIVO` com o papel indicado.

### 5.2 Admin

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/admin/usuarios?status=&papel=` | `Usuario[]` (filtros opcionais) |
| POST | `/admin/usuarios/{id}/aprovar` | docente `PENDENTE_APROVACAO` → `ATIVO` |
| POST | `/admin/usuarios/{id}/rejeitar` | docente `PENDENTE_APROVACAO` → `REJEITADO` |

### 5.3 Turmas

| Método | Rota | Papel | Descrição |
|--------|------|-------|-----------|
| GET | `/turmas` | docente: as que criou; aluno: as que participa | `Turma[]` |
| POST | `/turmas` | docente | `{ nome, descricao }` → `Turma` |
| PUT | `/turmas/{id}` | docente dono | `{ nome, descricao }` → `Turma` |
| DELETE | `/turmas/{id}` | docente dono | 204; 409 se vinculada a votação |
| POST | `/turmas/{id}/codigo` | docente dono | regenera o código → `Turma` |
| GET | `/turmas/{id}/alunos` | docente dono | `[{ id, nome, matricula, email }]` |
| DELETE | `/turmas/{id}/alunos/{alunoId}` | docente dono | 204 |
| POST | `/turmas/entrar` | aluno | `{ codigo }` → `Turma`; 404 código inválido; 409 já é membro |

```ts
type Turma = { id: number; nome: string; descricao: string | null;
  codigo: string | null; // null para aluno
  docenteNome: string; totalAlunos: number };
```

### 5.4 Votações

| Método | Rota | Papel | Descrição |
|--------|------|-------|-----------|
| GET | `/votacoes` | docente: as suas; aluno: publicadas em que é elegível | `Votacao[]` |
| GET | `/votacoes/{id}` | dono ou aluno elegível (não rascunho) | `Votacao` |
| POST | `/votacoes` | docente | `VotacaoInput` → `Votacao` (rascunho) |
| PUT | `/votacoes/{id}` | dono, `RASCUNHO` | `VotacaoInput` → `Votacao` |
| DELETE | `/votacoes/{id}` | dono, `RASCUNHO` | 204 |
| POST | `/votacoes/{id}/publicar` | dono, `RASCUNHO` | → `Votacao` |
| POST | `/votacoes/{id}/despublicar` | dono, `AGENDADA` | → `Votacao` |
| POST | `/votacoes/{id}/encerrar` | dono, `ABERTA` | → `Votacao` |
| POST | `/votacoes/{id}/prorrogar` | dono, `ABERTA` | `{ "fim": "..." }` → `Votacao` |
| POST | `/votacoes/{id}/votos` | aluno elegível, `ABERTA` | `{ "votos": [{ "opcaoId": 1, "quantidade": 1 }] }` → `Votacao` |
| GET | `/votacoes/{id}/resultados` | conforme 4.5 (403 se não pode ver) | `Resultado` |

```ts
type VotacaoInput = {
  titulo: string; descricao?: string; inicio: string; fim: string;
  votosPorAluno: number; permiteRepetirOpcao: boolean; anonima: boolean;
  visibilidadeResultado: "SEMPRE" | "APOS_ENCERRAR" | "NUNCA";
  turmaIds: number[];
  opcoes: { titulo: string; descricao?: string; imagemUrl?: string }[];
};

type Votacao = {
  id: number; titulo: string; descricao: string | null; inicio: string; fim: string;
  votosPorAluno: number; permiteRepetirOpcao: boolean; anonima: boolean;
  visibilidadeResultado: "SEMPRE" | "APOS_ENCERRAR" | "NUNCA";
  estado: "RASCUNHO" | "AGENDADA" | "ABERTA" | "ENCERRADA";
  docente: { id: number; nome: string };
  turmas: { id: number; nome: string }[];
  opcoes: { id: number; titulo: string; descricao: string | null; imagemUrl: string | null; ordem: number }[];
  podeVerResultado: boolean;         // para o usuário atual, agora
  // apenas quando o usuário atual é aluno (null para docente):
  votosUsados: number | null;
  votosRestantes: number | null;
  meusVotos: { opcaoId: number; quantidade: number }[] | null; // null se anônima
};

type Resultado = {
  totalVotos: number; totalParticipantes: number;
  opcoes: { opcaoId: number; titulo: string; votos: number; percentual: number; // 0–100
            votantes: { nome: string; matricula: string; quantidade: number }[] | null }[]; // null se anônima
};
```

Em rascunho, `VotacaoInput` aceita dados incompletos apenas no que a publicação valida depois
(ex.: menos de 2 opções, `fim` no passado); `titulo` é sempre obrigatório.

### 5.5 Arquivos

| Método | Rota | Papel | Descrição |
|--------|------|-------|-----------|
| POST | `/uploads` | docente | multipart, campo `arquivo` → `{ "url": "/api/arquivos/<uuid>.<ext>" }` |
| GET | `/arquivos/{nome}` | público | conteúdo da imagem |

## 6. Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | banco |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth Google (vazio = Google desabilitado) |
| `APP_BASE_URL` | URL pública do frontend (ex.: `http://localhost:3000`); base do redirect OAuth |
| `APP_ALLOWED_DOMAINS` | domínios de e-mail aceitos |
| `APP_ADMIN_EMAILS` | e-mails que viram administradores |
| `APP_JWT_SECRET` | segredo do JWT e do HMAC de anonimato (≥ 32 bytes) |
| `APP_UPLOAD_DIR` | pasta das imagens |
| `SPRING_PROFILES_ACTIVE` | `dev` habilita o login de desenvolvimento |
| `BACKEND_URL` | (frontend) destino do rewrite `/api/*`, ex.: `http://backend:8080` |

## 7. Testes

Testes automatizados no backend cobrindo as regras de negócio: limites de votos, repetição de opção,
envios parciais, janela de datas, elegibilidade por turma, anonimato, visibilidade de resultados,
ciclo de vida (publicar, despublicar, encerrar, prorrogar) e aprovação de docentes.
