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
Status da conta: `PENDENTE_APROVACAO`, `ATIVO`, `REJEITADO`.

### 2.1 Login com e-mail e senha

- Não há login externo (Google ou outro). Contas e senhas ficam no banco; senha guardada com
  hash **BCrypt**, nunca em texto.
- **Cadastro** (público): nome, e-mail, senha, matrícula e papel (**Aluno** ou **Docente**).
  - E-mail único (comparado em minúsculas); matrícula obrigatória e única.
  - Senha com **no mínimo 8 caracteres** (máximo 72, limite do BCrypt).
  - Aluno → `ATIVO` imediatamente e já entra logado.
  - Docente → `PENDENTE_APROVACAO` até um admin aprovar (`ATIVO`) ou rejeitar (`REJEITADO`). Entra
    logado, mas só vê a tela de espera.
- **Login**: e-mail + senha. Credenciais erradas → 401 com mensagem genérica
  ("E-mail ou senha incorretos."), sem revelar se o e-mail existe.
- **Trocar senha** (usuário logado): informa a senha atual e a nova. Não vale para o admin fixo.
- Sessão: JWT assinado (`APP_JWT_SECRET`) em cookie `HttpOnly`, `SameSite=Lax`, válido por 12 h.

### 2.2 Domínios de e-mail aceitos

- O admin mantém, pela página dele, a **lista de domínios aceitos** (ex.: `ifrs.edu.br`). Fica no
  banco, não em variável de ambiente.
- **Lista vazia = qualquer domínio** é aceito.
- A lista é conferida no **cadastro** e em **todo login**: se o domínio de uma conta for removido da
  lista, ela deixa de entrar (403 "O domínio de e-mail ... não é aceito por este sistema.") até o
  domínio voltar. Sessões já abertas dessa conta também passam a receber 403.
- Comparação exata do domínio, em minúsculas (`aluno.ifrs.edu.br` ≠ `ifrs.edu.br`).

### 2.3 Administrador

- Conta fixa **`adm@gmail.com`** / senha **`admin`**, criada automaticamente na inicialização se
  não existir. Não pode trocar a senha, não usa recuperação por e-mail e **não passa pela verificação
  de domínio**. Não pode ser excluída nem rebaixada. Existe só um admin.
- Admin: lista usuários, aprova e rejeita docentes, gerencia a lista de domínios. Não gerencia
  votações.

### 2.4 Recuperação de senha por e-mail

- "Esqueci minha senha": o usuário informa o e-mail. A resposta é **sempre** a mesma (204), exista ou
  não a conta, para não revelar quais e-mails estão cadastrados.
- Se a conta existir (e não for o admin), o sistema envia um e-mail com link
  `${APP_BASE_URL}/redefinir-senha?token=<token>`.
  - Token aleatório (≥ 32 bytes), guardado no banco **apenas como hash**; vale **1 hora** e **uma
    única vez**. Um novo pedido invalida os tokens anteriores do usuário.
  - Redefinir com token válido: define a nova senha (mesma regra de 8 caracteres).
  - Token inválido, expirado ou já usado → 422 "Este link de redefinição é inválido ou expirou."
- Envio por SMTP. No Docker Compose sobe o **Mailpit** (caixa de e-mail de teste em
  <http://localhost:8025>); para envio real basta apontar as variáveis `MAIL_*` para outro SMTP
  (ex.: Gmail com senha de app). Falha no envio é registrada em log e não muda a resposta (204).

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

Detalhes fixados na implementação:

- Criações (`POST`) respondem 200 com o objeto criado.
- 409 só para matrícula duplicada, "já é membro" e turma vinculada a votação; demais violações de
  estado ou regra → 422.
- Docente pedindo turma ou votação de outro docente → 404. Aluno pedindo rascunho → 404; aluno não
  elegível → 403.
- Requisições que alteram estado vindas de outra origem (`Origin` diferente de `APP_BASE_URL` ou
  `Sec-Fetch-Site` diferente de `same-origin`/`none`) → 403. O frontend sempre chama `/api/...` relativo.
- Limites: até 50 opções, 50 turmas e 50 itens por envio de votos; `quantidade` nunca maior que
  `votosPorAluno`.
- `imagemUrl` só aceita o valor devolvido por `POST /uploads`.

### 5.1 Autenticação

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| POST | `/auth/cadastro` | público | `{ nome, email, senha, matricula, papel: "ALUNO"\|"DOCENTE" }` → `Usuario` e já abre a sessão. 409 e-mail ou matrícula já cadastrados; 403 domínio não aceito |
| POST | `/auth/login` | público | `{ email, senha }` → `Usuario` e abre a sessão. 401 credenciais erradas; 403 domínio não aceito |
| GET | `/auth/me` | autenticado | `Usuario` |
| POST | `/auth/logout` | autenticado | 204 |
| PUT | `/auth/senha` | autenticado (exceto admin) | `{ senhaAtual, novaSenha }` → 204. 422 senha atual incorreta |
| POST | `/auth/esqueci-senha` | público | `{ email }` → sempre 204 |
| POST | `/auth/redefinir-senha` | público | `{ token, novaSenha }` → 204. 422 token inválido/expirado |

Limite de tentativas (acima disso → 429, `erro: "MUITAS_TENTATIVAS"`, "Muitas tentativas. Aguarde um
minuto.", cabeçalho `Retry-After: 60`):

| Rota | Limite |
|------|--------|
| `/auth/login` | 10 por minuto por e-mail |
| `/auth/esqueci-senha` | 5 por minuto por e-mail |
| `/auth/cadastro`, `/auth/redefinir-senha` | 30 por minuto por IP |

O limite é por e-mail porque numa escola todos saem pelo mesmo IP e porque o IP repassado pelo proxy
pode ser forjado; o limite por IP é só um freio contra abuso grosseiro.

Domínio de e-mail não aceito (cadastro, login ou sessão aberta) → 403 com
`erro: "DOMINIO_NAO_ACEITO"`. `POST /auth/logout` funciona mesmo sem sessão válida (sempre 204).

```ts
type Usuario = {
  id: number; nome: string; email: string; matricula: string | null;
  papel: "ALUNO" | "DOCENTE" | "ADMIN";
  status: "PENDENTE_APROVACAO" | "ATIVO" | "REJEITADO";
};
```

Todas as rotas abaixo exigem conta `ATIVO` com o papel indicado.

### 5.2 Admin

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/admin/usuarios?status=&papel=` | `Usuario[]` (filtros opcionais) |
| POST | `/admin/usuarios/{id}/aprovar` | docente `PENDENTE_APROVACAO` → `ATIVO` |
| POST | `/admin/usuarios/{id}/rejeitar` | docente `PENDENTE_APROVACAO` → `REJEITADO` |
| GET | `/admin/dominios` | `Dominio[]` em ordem alfabética |
| POST | `/admin/dominios` | `{ dominio }` → `Dominio`. Normaliza (minúsculas, sem espaços, sem `@` inicial); 400 formato inválido; 409 já existe |
| DELETE | `/admin/dominios/{id}` | 204 |

```ts
type Dominio = { id: number; dominio: string; criadoEm: string };
```

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
| `APP_BASE_URL` | URL pública do frontend (ex.: `http://localhost:3000`); base do link de redefinição de senha e da checagem de origem |
| `APP_JWT_SECRET` | segredo do JWT e do HMAC de anonimato (≥ 32 bytes) |
| `APP_UPLOAD_DIR` | pasta das imagens |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_STARTTLS` | servidor SMTP (padrão: Mailpit do Compose, `mailpit:1025`, sem autenticação) |
| `MAIL_FROM` | remetente dos e-mails (padrão `nao-responda@votacoes.local`) |
| `BACKEND_URL` | (frontend) destino do rewrite `/api/*`, ex.: `http://backend:8080` |

## 7. Testes

Testes automatizados no backend cobrindo as regras de negócio: limites de votos, repetição de opção,
envios parciais, janela de datas, elegibilidade por turma, anonimato, visibilidade de resultados,
ciclo de vida (publicar, despublicar, encerrar, prorrogar) e aprovação de docentes.
Também: cadastro e login com senha, verificação de domínio no cadastro, no login e em sessão já
aberta, admin fixo fora da verificação, troca de senha, recuperação de senha (token de uso único,
expiração, invalidação por novo pedido, resposta igual para e-mail inexistente).
