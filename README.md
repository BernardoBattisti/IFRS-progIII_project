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
3. `APP_ADMIN_EMAILS`: o e-mail de quem será administrador.
4. Para testar sem configurar o Google, defina `SPRING_PROFILES_ACTIVE=dev` (veja o aviso abaixo).

```bash
docker compose up --build
```

Acesse <http://localhost:3000>.

### Login de desenvolvimento

Com `SPRING_PROFILES_ACTIVE=dev`, a tela de login mostra um formulário em que basta informar
e-mail e nome. Entre com o e-mail de `APP_ADMIN_EMAILS` para ser administrador; qualquer outro
e-mail passa pelo cadastro (aluno ou docente).

> **Atenção:** nesse modo qualquer pessoa entra com qualquer e-mail, inclusive o do administrador.
> Use apenas na sua máquina. Deixe a variável vazia em qualquer ambiente acessível por outras pessoas.

### Login com Google

1. No [Google Cloud Console](https://console.cloud.google.com), crie um **ID do cliente OAuth** do
   tipo "Aplicativo da Web".
2. Em "URIs de redirecionamento autorizados", adicione
   `http://localhost:3000/api/login/oauth2/code/google` (troque pelo endereço público, se houver).
3. Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`.
4. `APP_BASE_URL` precisa ser exatamente o endereço pelo qual as pessoas acessam o sistema.
5. Opcional: `APP_ALLOWED_DOMAINS=ifrs.edu.br,aluno.ifrs.edu.br` restringe os e-mails aceitos.

## Como usar

| Perfil | O que faz |
|--------|-----------|
| Administrador | Aprova ou rejeita pedidos de cadastro de docentes. |
| Docente | Cria turmas (cada uma com um código de entrada) e votações; acompanha os resultados; encerra ou prorroga. |
| Aluno | Entra em turmas pelo código, vota e vê os resultados quando o docente permite. |

No primeiro acesso, cada pessoa escolhe se é aluno ou docente e informa a matrícula. Alunos entram
direto; docentes aguardam a aprovação do administrador.

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

## Limitações conhecidas

- **Anonimato**: em votação anônima, ninguém vê pelo sistema quem votou em quê. Quem tem acesso
  direto ao banco de dados, porém, consegue relacionar votos e alunos por metadados do PostgreSQL.
- O logout apaga o cookie, mas a sessão só expira de fato em até 12 horas.
- Não há cota de armazenamento para as imagens enviadas pelos docentes.
