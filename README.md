# Votações IFRS

Projeto de conclusão de Programação III (IFRS): sistema de gerenciamento de votações escolares.
Docentes criam votações e definem as regras (quantos votos por aluno, se pode repetir opção, voto
anônimo, turmas que participam, datas, visibilidade do resultado); estudantes votam; um
administrador aprova os docentes.

- **Backend**: Java 21, Spring Boot 3 — [`backend/`](backend)
- **Frontend**: Next.js, TypeScript, Tailwind — [`frontend/`](frontend)
- **Banco**: PostgreSQL 16
- **Regras de negócio e API**: [`docs/ESPECIFICACAO.md`](docs/ESPECIFICACAO.md)

## Como rodar (Docker Compose)

Requisito: Docker com Docker Compose.

```bash
cp .env.example .env
```

Edite o `.env`:

1. `POSTGRES_PASSWORD`: escolha uma senha.
2. `APP_JWT_SECRET`: um segredo com pelo menos 32 caracteres (`openssl rand -base64 48`).

```bash
docker compose up --build
```

| Endereço | O que é |
|----------|---------|
| <http://localhost:3000> | o sistema |
| <http://localhost:8025> | caixa de e-mail de teste (Mailpit): os e-mails de recuperação de senha aparecem aqui |

### Login

- **Administrador**: `adm@gmail.com`, senha `admin` (conta fixa, criada automaticamente).
- **Alunos e docentes**: clicam em "Criar conta" e informam nome, e-mail, senha (mínimo de
  8 caracteres), matrícula e se são aluno ou docente. Alunos entram direto; docentes aguardam a
  aprovação do administrador.
- **Domínios aceitos**: na página do administrador, em "Domínios de e-mail". Com a lista vazia,
  qualquer e-mail é aceito. Ao remover um domínio, as contas dele deixam de entrar na hora.
- **Esqueci minha senha**: o sistema envia um link válido por 1 hora. Por padrão o e-mail vai para o
  Mailpit; para enviar de verdade, preencha as variáveis `MAIL_*` do `.env` (há um exemplo com
  Gmail no `.env.example`).

> **Atenção:** a senha do administrador é fixa e pública neste README. Serve para demonstração;
> não use o sistema assim num ambiente acessível pela internet.

## Como usar

| Perfil | O que faz |
|--------|-----------|
| Administrador | Aprova ou rejeita docentes e define os domínios de e-mail aceitos. |
| Docente | Cria turmas (cada uma com um código de entrada) e votações; acompanha os resultados; encerra ou prorroga. |
| Aluno | Entra em turmas pelo código, vota e vê os resultados quando o docente permite. |

## Desenvolvimento

Backend (precisa de um PostgreSQL acessível; variáveis em `backend/src/main/resources/application.yml`):

```bash
cd backend
mvn test
```

```bash
mvn spring-boot:run
```

Os testes sobem um PostgreSQL embutido, sem Docker.

Frontend:

```bash
cd frontend
npm ci
```

```bash
BACKEND_URL=http://localhost:8080 npm run dev
```

Para mexer só nas telas, sem o backend, há um servidor de mentira: `node mock/server.mjs`.

Se você já tinha rodado a versão com login Google, as contas antigas não têm senha: use
"Esqueci minha senha" ou apague os dados com `docker compose down -v`.

## Limitações conhecidas

- **Anonimato**: em votação anônima, ninguém vê pelo sistema quem votou em quê. Quem tem acesso
  direto ao banco de dados, porém, consegue relacionar votos e alunos por metadados do PostgreSQL.
- O logout apaga o cookie, mas a sessão só expira de fato em até 12 horas.
- Não há cota de armazenamento para as imagens enviadas pelos docentes.
