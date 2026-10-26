# IFRS-progIII_project
Projeto de conclusão Prog 3 IFRS

## Estrutura

```
.
├── backend/            # API em Java 21 + Spring Boot (Maven)
├── frontend/           # Aplicação Angular (servida por nginx no Docker)
├── docker-compose.yml  # Orquestra banco, backend e frontend
└── .env.example        # Variáveis de ambiente (opcional)
```

| Serviço  | Tecnologia             | Porta padrão |
|----------|------------------------|--------------|
| db       | PostgreSQL 17          | 5432         |
| backend  | Spring Boot 4 / Java 21| 8080         |
| frontend | Angular + nginx        | 4200         |

## Pré-requisitos

- **Linux:** Docker Engine + plugin Docker Compose
- **Windows:** Docker Desktop (com WSL 2)

Não é necessário ter Java, Maven ou Node instalados para rodar via Docker.

## Como rodar

Os comandos são os mesmos no Linux (terminal) e no Windows (PowerShell ou CMD):

```bash
docker compose up -d --build
```

Para parar:

```bash
docker compose down        # mantém os dados do banco
docker compose down -v     # apaga também os dados do banco
```

### Configuração (opcional)

O projeto funciona sem nenhuma configuração. Para mudar usuário/senha do banco ou portas,
copie `.env.example` para `.env` e edite:

```bash
cp .env.example .env       # Linux
copy .env.example .env     # Windows (CMD/PowerShell)
```

## Verificando

- Backend: <http://localhost:8080/health>
- Frontend: <http://localhost:4200> (mostra o status do backend e do banco)
- Backend via frontend: <http://localhost:4200/api/health>

Resposta esperada do `/health`:

```json
{"status":"UP","database":"UP"}
```

Se o banco estiver indisponível, o endpoint responde `503` com `"DOWN"`.

## Desenvolvimento local (sem Docker para backend/frontend)

Suba apenas o banco:

```bash
docker compose up -d db
```

Backend (requer Java 21):

```bash
cd backend
./mvnw spring-boot:run     # Linux
mvnw.cmd spring-boot:run   # Windows
```

Frontend (requer Node 22.22.3+ ou 24.15+):

```bash
cd frontend
npm install
npm start                  # http://localhost:4200, com proxy /api -> localhost:8080
```

Testes:

```bash
cd backend && ./mvnw test          # (Windows: mvnw.cmd test)
cd frontend && npm test -- --watch=false
```

## Observações para Windows

O arquivo `.gitattributes` força finais de linha LF no repositório (exceto `.cmd`/`.bat`),
evitando erros de scripts dentro dos containers ao clonar o projeto no Windows.
