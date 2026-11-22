// Servidor MOCK do backend, só para desenvolvimento/testes manuais do frontend.
// Implementa o contrato de docs/ESPECIFICACAO.md em memória (sem dependências).
// NÃO faz parte do bundle de produção.
//
// Uso:  node mock/server.mjs        (porta 8080, ou MOCK_PORT)
//       BACKEND_URL=http://localhost:8080 npm run dev
//
// Variáveis: MOCK_PORT, MOCK_BASE_URL (base do link de redefinição; padrão
// http://localhost:3000), MOCK_RATE_LIMIT (tentativas/min por IP nas rotas
// públicas; padrão 10), MOCK_LOG=1 (loga cada requisição).
//
// Contas de exemplo (senha "senha123", exceto o admin):
//   adm@gmail.com / admin  → ADMIN fixo (fora da verificação de domínio)
//   ana@ifrs.edu.br        → DOCENTE ativo
//   carlos@ifrs.edu.br     → DOCENTE pendente de aprovação
//   rita@ifrs.edu.br       → DOCENTE rejeitado
//   joao@aluno.ifrs.edu.br, maria@aluno.ifrs.edu.br, pedro@aluno.ifrs.edu.br → ALUNOS
// Domínios aceitos iniciais: ifrs.edu.br e aluno.ifrs.edu.br.
// "Esqueci minha senha" não envia e-mail: o link é impresso no console.

import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.MOCK_PORT || 8080);
const BASE_URL = (process.env.MOCK_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const RATE_LIMIT = Number(process.env.MOCK_RATE_LIMIT || 10);
const ADMIN_EMAIL = "adm@gmail.com";
const COOKIE = "MOCK_SESSAO";
const H = 3600_000;
const agora = () => Date.now();
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

// ---------------------------------------------------------------- dados
let seq = 100;
const id = () => ++seq;

// senha fica em texto só neste mock (o backend real guarda hash BCrypt).
const usuarios = [
  { id: 1, nome: "Administrador", email: ADMIN_EMAIL, senha: "admin", matricula: null, papel: "ADMIN", status: "ATIVO" },
  { id: 2, nome: "Ana Souza", email: "ana@ifrs.edu.br", senha: "senha123", matricula: "D1001", papel: "DOCENTE", status: "ATIVO" },
  { id: 3, nome: "Carlos Lima", email: "carlos@ifrs.edu.br", senha: "senha123", matricula: "D1002", papel: "DOCENTE", status: "PENDENTE_APROVACAO" },
  { id: 4, nome: "Rita Mendes", email: "rita@ifrs.edu.br", senha: "senha123", matricula: "D1003", papel: "DOCENTE", status: "REJEITADO" },
  { id: 5, nome: "João Pereira", email: "joao@aluno.ifrs.edu.br", senha: "senha123", matricula: "2023001", papel: "ALUNO", status: "ATIVO" },
  { id: 6, nome: "Maria Oliveira", email: "maria@aluno.ifrs.edu.br", senha: "senha123", matricula: "2023002", papel: "ALUNO", status: "ATIVO" },
  { id: 7, nome: "Pedro Santos", email: "pedro@aluno.ifrs.edu.br", senha: "senha123", matricula: "2023003", papel: "ALUNO", status: "ATIVO" },
  { id: 8, nome: "Beatriz Costa", email: "bia@ifrs.edu.br", senha: "senha123", matricula: "D1004", papel: "DOCENTE", status: "PENDENTE_APROVACAO" },
];
const dtoUsuario = ({ senha: _s, ...resto }) => resto;

const dominios = [
  { id: 1, dominio: "aluno.ifrs.edu.br", criadoEm: iso(agora() - 720 * H) },
  { id: 2, dominio: "ifrs.edu.br", criadoEm: iso(agora() - 720 * H) },
];
const dominioDe = (email) => email.slice(email.lastIndexOf("@") + 1).toLowerCase();
const dominioAceito = (email) => dominios.length === 0 || dominios.some((d) => d.dominio === dominioDe(email));
const erroDominio = (email) => new Erro(403, `O domínio de e-mail ${dominioDe(email)} não é aceito por este sistema.`, undefined, "DOMINIO_NAO_ACEITO");

// Tokens de redefinição: sha256(token) -> { usuarioId, expira, usado }
const tokens = new Map();
const sha256 = (t) => crypto.createHash("sha256").update(t).digest("hex");

// Limite de tentativas nas rotas públicas: ip -> [timestamps]
const tentativas = new Map();
function limitar(req) {
  const ip = req.socket.remoteAddress || "?";
  const t = agora();
  const l = (tentativas.get(ip) || []).filter((x) => t - x < 60_000);
  l.push(t);
  tentativas.set(ip, l);
  if (l.length > RATE_LIMIT) throw new Erro(429, "Muitas tentativas. Aguarde um minuto.");
}

const turmas = [
  { id: 10, nome: "Informática 2º ano", descricao: "Turma integrada, turno da manhã.", codigo: "K7PX4QMZ", docenteId: 2, alunos: new Set([5, 6]) },
  { id: 11, nome: "Grêmio Estudantil", descricao: null, codigo: "R9HT2WNC", docenteId: 2, alunos: new Set([5, 6, 7]) },
];

function img(nome, cor, texto) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="${cor}"/><text x="320" y="200" font-family="sans-serif" font-size="48" fill="#fff" text-anchor="middle">${texto}</text></svg>`;
  arquivos.set(nome, { tipo: "image/svg+xml", dados: Buffer.from(svg) });
  return `/api/arquivos/${nome}`;
}
const arquivos = new Map();

const votacoes = [];
function novaVotacao(dados) {
  const v = {
    id: id(),
    descricao: null,
    votosPorAluno: 1,
    permiteRepetirOpcao: false,
    anonima: true,
    visibilidadeResultado: "SEMPRE",
    turmaIds: [],
    publicada: false,
    docenteId: 2,
    ...dados,
    opcoes: (dados.opcoes || []).map((o, i) => ({ id: id(), titulo: o.titulo, descricao: o.descricao ?? null, imagemUrl: o.imagemUrl ?? null, ordem: i + 1 })),
  };
  votacoes.push(v);
  return v;
}

novaVotacao({
  titulo: "Tema da Semana Acadêmica",
  descricao: "Escolha os dois temas que você mais gostaria de ver nas palestras deste ano.",
  inicio: iso(agora() - 2 * H), fim: iso(agora() + 48 * H), votosPorAluno: 2, permiteRepetirOpcao: false,
  anonima: true, visibilidadeResultado: "SEMPRE", turmaIds: [10], publicada: true,
  opcoes: [
    { titulo: "Inteligência artificial", descricao: "Aplicações e ética.", imagemUrl: img("ia.svg", "#237a32", "IA") },
    { titulo: "Robótica", imagemUrl: img("robotica.svg", "#175cd3", "Robótica") },
    { titulo: "Sustentabilidade", descricao: "Energia e meio ambiente." },
    { titulo: "Jogos digitais" },
  ],
});
novaVotacao({
  titulo: "Destino da viagem de estudos",
  descricao: "Distribua seus 3 votos entre os destinos. Pode concentrar no mesmo.",
  inicio: iso(agora() - 24 * H), fim: iso(agora() + 6 * H), votosPorAluno: 3, permiteRepetirOpcao: true,
  anonima: false, visibilidadeResultado: "SEMPRE", turmaIds: [], publicada: true,
  opcoes: [{ titulo: "Gramado" }, { titulo: "Porto Alegre — museus" }, { titulo: "Bento Gonçalves" }],
});
novaVotacao({
  titulo: "Representante de turma 2026",
  inicio: iso(agora() + 72 * H), fim: iso(agora() + 96 * H), votosPorAluno: 1, anonima: true,
  visibilidadeResultado: "APOS_ENCERRAR", turmaIds: [10], publicada: true,
  opcoes: [{ titulo: "Lucas" }, { titulo: "Fernanda" }],
});
const encerrada = novaVotacao({
  titulo: "Horário do intervalo",
  inicio: iso(agora() - 240 * H), fim: iso(agora() - 200 * H), votosPorAluno: 1, anonima: false,
  visibilidadeResultado: "APOS_ENCERRAR", turmaIds: [11], publicada: true,
  opcoes: [{ titulo: "10h00" }, { titulo: "10h15" }],
});
novaVotacao({
  titulo: "Cardápio da festa junina",
  inicio: iso(agora() + 200 * H), fim: iso(agora() + 300 * H), votosPorAluno: 1, publicada: false,
  opcoes: [{ titulo: "Pinhão" }],
});
novaVotacao({
  titulo: "Nome do laboratório",
  inicio: iso(agora() - 50 * H), fim: iso(agora() + 50 * H), votosPorAluno: 1, publicada: true,
  visibilidadeResultado: "NUNCA", anonima: true, opcoes: [{ titulo: "Lab. Ada Lovelace" }, { titulo: "Lab. Alan Turing" }],
});

// votos: { votacaoId, alunoId|null, opcaoId, quantidade }; participacoes: "vid:aid" -> usados
const votos = [];
const participacoes = new Map();
const guarda = new Set();
function registrar(v, alunoId, itens) {
  for (const it of itens) {
    votos.push({ votacaoId: v.id, alunoId: v.anonima ? null : alunoId, opcaoId: it.opcaoId, quantidade: it.quantidade });
    if (v.anonima) guarda.add(`${v.id}:${alunoId}:${it.opcaoId}`);
  }
  const k = `${v.id}:${alunoId}`;
  participacoes.set(k, (participacoes.get(k) || 0) + itens.reduce((a, b) => a + b.quantidade, 0));
}
registrar(votacoes[0], 6, [{ opcaoId: votacoes[0].opcoes[0].id, quantidade: 1 }, { opcaoId: votacoes[0].opcoes[2].id, quantidade: 1 }]);
registrar(votacoes[1], 6, [{ opcaoId: votacoes[1].opcoes[0].id, quantidade: 2 }]);
registrar(votacoes[1], 7, [{ opcaoId: votacoes[1].opcoes[2].id, quantidade: 3 }]);
registrar(encerrada, 5, [{ opcaoId: encerrada.opcoes[1].id, quantidade: 1 }]);
registrar(encerrada, 6, [{ opcaoId: encerrada.opcoes[1].id, quantidade: 1 }]);
registrar(encerrada, 7, [{ opcaoId: encerrada.opcoes[0].id, quantidade: 1 }]);

// ---------------------------------------------------------------- regras
function estado(v) {
  if (!v.publicada) return "RASCUNHO";
  const t = agora();
  if (t < Date.parse(v.inicio)) return "AGENDADA";
  if (t < Date.parse(v.fim)) return "ABERTA";
  return "ENCERRADA";
}
const elegivel = (v, u) => v.turmaIds.length === 0 || v.turmaIds.some((tid) => turmas.find((t) => t.id === tid)?.alunos.has(u.id));
function podeVer(v, u) {
  const e = estado(v);
  if (u.papel === "DOCENTE") return e !== "RASCUNHO";
  if (v.visibilidadeResultado === "SEMPRE") return e === "ABERTA" || e === "ENCERRADA";
  if (v.visibilidadeResultado === "APOS_ENCERRAR") return e === "ENCERRADA";
  return false;
}
function dtoVotacao(v, u) {
  const aluno = u.papel === "ALUNO";
  const usados = aluno ? participacoes.get(`${v.id}:${u.id}`) || 0 : null;
  let meus = null;
  if (aluno && !v.anonima) {
    const m = new Map();
    for (const x of votos) if (x.votacaoId === v.id && x.alunoId === u.id) m.set(x.opcaoId, (m.get(x.opcaoId) || 0) + x.quantidade);
    meus = [...m].map(([opcaoId, quantidade]) => ({ opcaoId, quantidade }));
  }
  return {
    id: v.id, titulo: v.titulo, descricao: v.descricao, inicio: v.inicio, fim: v.fim,
    votosPorAluno: v.votosPorAluno, permiteRepetirOpcao: v.permiteRepetirOpcao, anonima: v.anonima,
    visibilidadeResultado: v.visibilidadeResultado, estado: estado(v),
    docente: { id: v.docenteId, nome: usuarios.find((x) => x.id === v.docenteId)?.nome },
    turmas: v.turmaIds.map((tid) => ({ id: tid, nome: turmas.find((t) => t.id === tid)?.nome })),
    opcoes: v.opcoes, podeVerResultado: podeVer(v, u),
    votosUsados: usados, votosRestantes: aluno ? v.votosPorAluno - usados : null, meusVotos: meus,
  };
}
function dtoTurma(t, u) {
  return { id: t.id, nome: t.nome, descricao: t.descricao, codigo: u.papel === "DOCENTE" ? t.codigo : null,
    docenteNome: usuarios.find((x) => x.id === t.docenteId)?.nome, totalAlunos: t.alunos.size };
}
function gerarCodigo() {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => A[crypto.randomInt(A.length)]).join("");
}

// ---------------------------------------------------------------- http
class Erro extends Error {
  constructor(status, mensagem, campos, erro) { super(mensagem); this.status = status; this.campos = campos; this.erro = erro; }
}
const NOMES = { 400: "VALIDACAO", 401: "NAO_AUTENTICADO", 403: "SEM_PERMISSAO", 404: "NAO_ENCONTRADO", 409: "CONFLITO", 422: "REGRA_NEGOCIO", 429: "MUITAS_TENTATIVAS" };

function lerCorpo(req) {
  return new Promise((ok) => { const p = []; req.on("data", (c) => p.push(c)); req.on("end", () => ok(Buffer.concat(p))); });
}
function usuarioDaSessao(req) {
  const m = (req.headers.cookie || "").match(new RegExp(`${COOKIE}=(\\d+)`));
  return m ? usuarios.find((u) => u.id === Number(m[1])) : null;
}
function exigir(u, papel) {
  if (!u) throw new Erro(401, "Você precisa entrar para continuar.");
  // Sessões abertas também param de funcionar se o domínio sair da lista (seção 2.2).
  if (u.papel !== "ADMIN" && !dominioAceito(u.email)) throw erroDominio(u.email);
  if (papel && (u.status !== "ATIVO" || u.papel !== papel)) throw new Erro(403, "Você não tem permissão para fazer isso.");
}
function validarInput(b, publicar) {
  const c = {};
  if (!b.titulo || !String(b.titulo).trim()) c.titulo = "O título é obrigatório.";
  if (!b.inicio) c.inicio = "Informe o início.";
  if (!b.fim) c.fim = "Informe o fim.";
  if (b.inicio && b.fim && Date.parse(b.fim) <= Date.parse(b.inicio)) c.fim = "O fim deve ser depois do início.";
  if (!Number.isInteger(b.votosPorAluno) || b.votosPorAluno < 1) c.votosPorAluno = "Deve ser um inteiro maior ou igual a 1.";
  (b.opcoes || []).forEach((o, i) => { if (!o.titulo || !o.titulo.trim()) c[`opcoes[${i}].titulo`] = "O título da opção é obrigatório."; });
  if (publicar) {
    if ((b.opcoes || []).length < 2) c.opcoes = "Cadastre pelo menos 2 opções.";
    if (b.fim && Date.parse(b.fim) <= agora()) c.fim = "O fim precisa estar no futuro.";
    if (!b.permiteRepetirOpcao && b.votosPorAluno > (b.opcoes || []).length) c.votosPorAluno = "Sem repetir opção, os votos por aluno não podem passar do número de opções.";
  }
  return c;
}

async function rotear(req, res, url) {
  const u = usuarioDaSessao(req);
  const m = req.method;
  const p = url.pathname.replace(/^\/api/, "");
  const corpo = m === "GET" ? null : await lerCorpo(req);
  const json = () => { try { return corpo && corpo.length ? JSON.parse(corpo.toString()) : {}; } catch { throw new Erro(400, "JSON inválido."); } };
  let r;

  if (m === "GET" && (r = p.match(/^\/arquivos\/([\w.-]+)$/))) {
    const a = arquivos.get(r[1]);
    if (!a) throw new Erro(404, "Arquivo não encontrado.");
    res.writeHead(200, { "Content-Type": a.tipo, "Cache-Control": "public, max-age=3600" });
    res.end(a.dados);
    return null;
  }
  const validarSenha = (senha, campo, c) => {
    if (typeof senha !== "string" || [...senha].length < 8) c[campo] = "A senha precisa ter pelo menos 8 caracteres.";
    else if (Buffer.byteLength(senha) > 72) c[campo] = "A senha pode ter no máximo 72 caracteres.";
  };
  const abrirSessao = (x) => res.setHeader("Set-Cookie", `${COOKIE}=${x.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`);

  if (m === "POST" && p === "/auth/cadastro") {
    limitar(req);
    const b = json();
    const c = {};
    const email = String(b.email || "").trim().toLowerCase();
    if (!b.nome || !String(b.nome).trim()) c.nome = "O nome é obrigatório.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) c.email = "Informe um e-mail válido.";
    validarSenha(b.senha, "senha", c);
    if (!b.matricula || !String(b.matricula).trim()) c.matricula = "A matrícula é obrigatória.";
    if (!["ALUNO", "DOCENTE"].includes(b.papel)) c.papel = "Escolha Aluno ou Docente.";
    if (Object.keys(c).length) throw new Erro(400, "Alguns campos estão inválidos.", c);
    if (!dominioAceito(email)) throw erroDominio(email);
    if (usuarios.some((y) => y.email.toLowerCase() === email)) throw new Erro(409, "Já existe uma conta com este e-mail.");
    if (usuarios.some((y) => y.matricula === String(b.matricula).trim())) throw new Erro(409, "Essa matrícula já está cadastrada em outra conta.");
    const x = { id: id(), nome: String(b.nome).trim(), email, senha: b.senha, matricula: String(b.matricula).trim(), papel: b.papel, status: b.papel === "ALUNO" ? "ATIVO" : "PENDENTE_APROVACAO" };
    usuarios.push(x);
    abrirSessao(x);
    return [200, dtoUsuario(x)];
  }
  if (m === "POST" && p === "/auth/login") {
    limitar(req);
    const b = json();
    const email = String(b.email || "").trim().toLowerCase();
    const x = usuarios.find((y) => y.email.toLowerCase() === email);
    if (!x || x.senha !== b.senha) throw new Erro(401, "E-mail ou senha incorretos.");
    if (x.papel !== "ADMIN" && !dominioAceito(x.email)) throw erroDominio(x.email);
    abrirSessao(x);
    return [200, dtoUsuario(x)];
  }
  if (m === "GET" && p === "/auth/me") { exigir(u); return [200, dtoUsuario(u)]; }
  if (m === "POST" && p === "/auth/logout") {
    res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    return [204];
  }
  if (m === "PUT" && p === "/auth/senha") {
    exigir(u);
    if (u.papel === "ADMIN") throw new Erro(403, "A senha do administrador não pode ser trocada.");
    const b = json();
    const c = {};
    if (!b.senhaAtual) c.senhaAtual = "Informe a senha atual.";
    validarSenha(b.novaSenha, "novaSenha", c);
    if (Object.keys(c).length) throw new Erro(400, "Alguns campos estão inválidos.", c);
    if (b.senhaAtual !== u.senha) throw new Erro(422, "A senha atual está incorreta.");
    u.senha = b.novaSenha;
    return [204];
  }
  if (m === "POST" && p === "/auth/esqueci-senha") {
    limitar(req);
    const email = String(json().email || "").trim().toLowerCase();
    const x = usuarios.find((y) => y.email.toLowerCase() === email);
    if (x && x.papel !== "ADMIN") {
      for (const [k, t] of tokens) if (t.usuarioId === x.id) tokens.delete(k); // novo pedido invalida os anteriores
      const token = crypto.randomBytes(32).toString("base64url");
      tokens.set(sha256(token), { usuarioId: x.id, expira: agora() + H, usado: false });
      console.log(`[mock] Link de redefinição para ${x.email}: ${BASE_URL}/redefinir-senha?token=${token}`);
    }
    return [204];
  }
  if (m === "POST" && p === "/auth/redefinir-senha") {
    limitar(req);
    const b = json();
    const t = tokens.get(sha256(String(b.token || "")));
    if (!t || t.usado || t.expira < agora()) throw new Erro(422, "Este link de redefinição é inválido ou expirou.");
    const c = {};
    validarSenha(b.novaSenha, "novaSenha", c);
    if (Object.keys(c).length) throw new Erro(400, "Alguns campos estão inválidos.", c);
    t.usado = true;
    usuarios.find((y) => y.id === t.usuarioId).senha = b.novaSenha;
    return [204];
  }

  // admin
  if (m === "GET" && p === "/admin/usuarios") {
    exigir(u, "ADMIN");
    const s = url.searchParams.get("status"), pa = url.searchParams.get("papel");
    return [200, usuarios.filter((x) => (!s || x.status === s) && (!pa || x.papel === pa)).map(dtoUsuario)];
  }
  if (m === "POST" && (r = p.match(/^\/admin\/usuarios\/(\d+)\/(aprovar|rejeitar)$/))) {
    exigir(u, "ADMIN");
    const x = usuarios.find((y) => y.id === Number(r[1]));
    if (!x) throw new Erro(404, "Usuário não encontrado.");
    if (x.papel !== "DOCENTE" || x.status !== "PENDENTE_APROVACAO") throw new Erro(422, "Só docentes aguardando aprovação podem ser aprovados ou rejeitados.");
    x.status = r[2] === "aprovar" ? "ATIVO" : "REJEITADO";
    return [200, dtoUsuario(x)];
  }
  if (m === "GET" && p === "/admin/dominios") {
    exigir(u, "ADMIN");
    return [200, [...dominios].sort((a, b) => a.dominio.localeCompare(b.dominio))];
  }
  if (m === "POST" && p === "/admin/dominios") {
    exigir(u, "ADMIN");
    const d = String(json().dominio || "").replace(/\s+/g, "").replace(/^@+/, "").toLowerCase();
    if (!/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(d))
      throw new Erro(400, "Formato de domínio inválido.", { dominio: "Use um domínio como ifrs.edu.br, sem @ e sem espaços." });
    if (dominios.some((x) => x.dominio === d)) throw new Erro(409, `O domínio ${d} já está na lista.`);
    const novo = { id: id(), dominio: d, criadoEm: iso(agora()) };
    dominios.push(novo);
    return [200, novo];
  }
  if (m === "DELETE" && (r = p.match(/^\/admin\/dominios\/(\d+)$/))) {
    exigir(u, "ADMIN");
    const i = dominios.findIndex((x) => x.id === Number(r[1]));
    if (i < 0) throw new Erro(404, "Domínio não encontrado.");
    dominios.splice(i, 1);
    return [204];
  }

  // turmas
  if (p === "/turmas" && m === "GET") {
    exigir(u);
    if (u.papel === "DOCENTE") { exigir(u, "DOCENTE"); return [200, turmas.filter((t) => t.docenteId === u.id).map((t) => dtoTurma(t, u))]; }
    exigir(u, "ALUNO");
    return [200, turmas.filter((t) => t.alunos.has(u.id)).map((t) => dtoTurma(t, u))];
  }
  if (p === "/turmas" && m === "POST") {
    exigir(u, "DOCENTE");
    const b = json();
    if (!b.nome || !b.nome.trim()) throw new Erro(400, "Dados inválidos.", { nome: "O nome é obrigatório." });
    const t = { id: id(), nome: b.nome.trim(), descricao: b.descricao || null, codigo: gerarCodigo(), docenteId: u.id, alunos: new Set() };
    turmas.push(t);
    return [200, dtoTurma(t, u)];
  }
  if (p === "/turmas/entrar" && m === "POST") {
    exigir(u, "ALUNO");
    const b = json();
    const t = turmas.find((x) => x.codigo === String(b.codigo || "").trim().toUpperCase());
    if (!t) throw new Erro(404, "Código de turma inválido. Confira com seu docente.");
    if (t.alunos.has(u.id)) throw new Erro(409, "Você já participa desta turma.");
    t.alunos.add(u.id);
    return [200, dtoTurma(t, u)];
  }
  if ((r = p.match(/^\/turmas\/(\d+)(\/.*)?$/))) {
    exigir(u, "DOCENTE");
    const t = turmas.find((x) => x.id === Number(r[1]));
    if (!t) throw new Erro(404, "Turma não encontrada.");
    if (t.docenteId !== u.id) throw new Erro(403, "Esta turma não é sua.");
    const resto = r[2] || "";
    if (!resto && m === "PUT") {
      const b = json();
      if (!b.nome || !b.nome.trim()) throw new Erro(400, "Dados inválidos.", { nome: "O nome é obrigatório." });
      t.nome = b.nome.trim(); t.descricao = b.descricao || null;
      return [200, dtoTurma(t, u)];
    }
    if (!resto && m === "DELETE") {
      if (votacoes.some((v) => v.turmaIds.includes(t.id))) throw new Erro(409, "Esta turma está vinculada a uma votação e não pode ser excluída.");
      turmas.splice(turmas.indexOf(t), 1);
      return [204];
    }
    if (resto === "/codigo" && m === "POST") { t.codigo = gerarCodigo(); return [200, dtoTurma(t, u)]; }
    if (resto === "/alunos" && m === "GET") {
      return [200, [...t.alunos].map((aid) => usuarios.find((x) => x.id === aid)).map((x) => ({ id: x.id, nome: x.nome, matricula: x.matricula, email: x.email }))];
    }
    const ra = resto.match(/^\/alunos\/(\d+)$/);
    if (ra && m === "DELETE") { t.alunos.delete(Number(ra[1])); return [204]; }
  }

  // uploads
  if (p === "/uploads" && m === "POST") {
    exigir(u, "DOCENTE");
    const ct = req.headers["content-type"] || "";
    const bnd = ct.match(/boundary=(.+)$/)?.[1];
    if (!bnd) throw new Erro(400, "Envie o arquivo no campo 'arquivo'.");
    const partes = corpo.toString("latin1").split(`--${bnd}`);
    const parte = partes.find((x) => /name="arquivo"/.test(x));
    if (!parte) throw new Erro(400, "Envie o arquivo no campo 'arquivo'.", { arquivo: "obrigatório" });
    const ini = parte.indexOf("\r\n\r\n") + 4;
    const dados = Buffer.from(parte.slice(ini, parte.lastIndexOf("\r\n")), "latin1");
    if (dados.length > 5 * 1024 * 1024) throw new Erro(400, "Dados inválidos.", { arquivo: "A imagem deve ter no máximo 5 MB." });
    const sig = dados.subarray(0, 12);
    const tipo = sig[0] === 0xff && sig[1] === 0xd8 ? ["image/jpeg", "jpg"]
      : sig.subarray(0, 4).toString("hex") === "89504e47" ? ["image/png", "png"]
      : sig.subarray(8, 12).toString() === "WEBP" ? ["image/webp", "webp"] : null;
    if (!tipo) throw new Erro(400, "Dados inválidos.", { arquivo: "Formato não suportado. Envie JPEG, PNG ou WebP." });
    const nome = `${crypto.randomUUID()}.${tipo[1]}`;
    arquivos.set(nome, { tipo: tipo[0], dados });
    return [200, { url: `/api/arquivos/${nome}` }];
  }

  // votações
  if (p === "/votacoes" && m === "GET") {
    exigir(u);
    if (u.papel === "DOCENTE") { exigir(u, "DOCENTE"); return [200, votacoes.filter((v) => v.docenteId === u.id).map((v) => dtoVotacao(v, u))]; }
    exigir(u, "ALUNO");
    return [200, votacoes.filter((v) => v.publicada && elegivel(v, u)).map((v) => dtoVotacao(v, u))];
  }
  if (p === "/votacoes" && m === "POST") {
    exigir(u, "DOCENTE");
    const b = json();
    const c = validarInput(b, false);
    if (Object.keys(c).length) throw new Erro(400, "Alguns campos estão inválidos.", c);
    const v = novaVotacao({ ...b, descricao: b.descricao || null, docenteId: u.id, publicada: false });
    return [200, dtoVotacao(v, u)];
  }
  if ((r = p.match(/^\/votacoes\/(\d+)(\/\w+)?$/))) {
    exigir(u);
    const v = votacoes.find((x) => x.id === Number(r[1]));
    if (!v) throw new Erro(404, "Votação não encontrada.");
    const acao = r[2] || "";
    const e = estado(v);
    const dono = u.papel === "DOCENTE" && u.status === "ATIVO" && v.docenteId === u.id;
    const alunoOk = u.papel === "ALUNO" && u.status === "ATIVO" && v.publicada && elegivel(v, u);

    if (!acao && m === "GET") { if (!dono && !alunoOk) throw new Erro(404, "Votação não encontrada."); return [200, dtoVotacao(v, u)]; }
    if (acao === "/resultados" && m === "GET") {
      if (!dono && !alunoOk) throw new Erro(404, "Votação não encontrada.");
      if (!podeVer(v, u)) throw new Erro(403, "O resultado desta votação ainda não está disponível para você.");
      const doV = votos.filter((x) => x.votacaoId === v.id);
      const total = doV.reduce((a, b) => a + b.quantidade, 0);
      const part = [...participacoes.keys()].filter((k) => k.startsWith(`${v.id}:`)).length;
      return [200, {
        totalVotos: total, totalParticipantes: part,
        opcoes: v.opcoes.map((o) => {
          const vs = doV.filter((x) => x.opcaoId === o.id);
          const n = vs.reduce((a, b) => a + b.quantidade, 0);
          let votantes = null;
          if (!v.anonima) {
            const mm = new Map();
            for (const x of vs) mm.set(x.alunoId, (mm.get(x.alunoId) || 0) + x.quantidade);
            votantes = [...mm].map(([aid, q]) => { const a = usuarios.find((y) => y.id === aid); return { nome: a.nome, matricula: a.matricula, quantidade: q }; });
          }
          return { opcaoId: o.id, titulo: o.titulo, votos: n, percentual: total ? Math.round((n / total) * 10000) / 100 : 0, votantes };
        }),
      }];
    }
    if (acao === "/votos" && m === "POST") {
      exigir(u, "ALUNO");
      if (!alunoOk) throw new Erro(404, "Votação não encontrada.");
      if (e !== "ABERTA") throw new Erro(422, "Esta votação não está aberta.");
      const itens = json().votos || [];
      if (!itens.length || itens.some((x) => !Number.isInteger(x.quantidade) || x.quantidade < 1 || !v.opcoes.some((o) => o.id === x.opcaoId)))
        throw new Erro(400, "Votos inválidos.", { votos: "Informe opções válidas e quantidades a partir de 1." });
      const usados = participacoes.get(`${v.id}:${u.id}`) || 0;
      const soma = itens.reduce((a, b) => a + b.quantidade, 0);
      const rest = v.votosPorAluno - usados;
      if (soma > rest) throw new Erro(422, rest === 1 ? "Você só tem 1 voto restante." : `Você só tem ${rest} votos restantes.`);
      if (!v.permiteRepetirOpcao) {
        const ids = itens.map((x) => x.opcaoId);
        if (new Set(ids).size !== ids.length || itens.some((x) => x.quantidade > 1)) throw new Erro(422, "Nesta votação, só é permitido 1 voto por opção.");
        const ja = itens.some((x) => v.anonima ? guarda.has(`${v.id}:${u.id}:${x.opcaoId}`) : votos.some((y) => y.votacaoId === v.id && y.alunoId === u.id && y.opcaoId === x.opcaoId));
        if (ja) throw new Erro(422, "Você já votou em uma das opções escolhidas. Nesta votação, só é permitido 1 voto por opção.");
      }
      registrar(v, u.id, itens);
      return [200, dtoVotacao(v, u)];
    }
    if (!dono) throw new Erro(u.papel === "DOCENTE" ? 403 : 404, "Votação não encontrada.");
    if (!acao && m === "PUT") {
      if (e !== "RASCUNHO") throw new Erro(422, "Só rascunhos podem ser editados.");
      const b = json();
      const c = validarInput(b, false);
      if (Object.keys(c).length) throw new Erro(400, "Alguns campos estão inválidos.", c);
      const nova = novaVotacao({ ...b, descricao: b.descricao || null, docenteId: u.id, publicada: false });
      votacoes.splice(votacoes.indexOf(nova), 1);
      Object.assign(v, { ...nova, id: v.id });
      return [200, dtoVotacao(v, u)];
    }
    if (!acao && m === "DELETE") {
      if (e !== "RASCUNHO") throw new Erro(422, "Só rascunhos podem ser excluídos.");
      votacoes.splice(votacoes.indexOf(v), 1);
      return [204];
    }
    if (acao === "/publicar" && m === "POST") {
      if (e !== "RASCUNHO") throw new Erro(422, "Esta votação já foi publicada.");
      const c = validarInput({ ...v, opcoes: v.opcoes }, true);
      if (Object.keys(c).length) throw new Erro(422, "A votação ainda não pode ser publicada: " + Object.values(c).join(" "));
      v.publicada = true;
      return [200, dtoVotacao(v, u)];
    }
    if (acao === "/despublicar" && m === "POST") {
      if (e !== "AGENDADA") throw new Erro(422, "Só votações agendadas podem ser despublicadas.");
      v.publicada = false;
      return [200, dtoVotacao(v, u)];
    }
    if (acao === "/encerrar" && m === "POST") {
      if (e !== "ABERTA") throw new Erro(422, "Só votações abertas podem ser encerradas.");
      v.fim = iso(agora());
      return [200, dtoVotacao(v, u)];
    }
    if (acao === "/prorrogar" && m === "POST") {
      if (e !== "ABERTA") throw new Erro(422, "Só votações abertas podem ser prorrogadas.");
      const b = json();
      if (!b.fim || Date.parse(b.fim) <= Date.parse(v.fim)) throw new Erro(400, "Dados inválidos.", { fim: "O novo fim deve ser depois do fim atual." });
      v.fim = b.fim;
      return [200, dtoVotacao(v, u)];
    }
  }
  throw new Erro(404, "Rota não encontrada.");
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const t0 = Date.now();
    try {
      const out = await rotear(req, res, url);
      if (!out) return; // resposta já enviada
      const [status, body] = out;
      if (status === 204) { res.writeHead(204); res.end(); }
      else { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(body)); }
    } catch (e) {
      if (res.headersSent) return res.end();
      const status = e instanceof Erro ? e.status : 500;
      if (!(e instanceof Erro)) console.error(e);
      const body = { status, erro: (e instanceof Erro && e.erro) || NOMES[status] || "ERRO_INTERNO", mensagem: e instanceof Erro ? e.message : "Erro interno." };
      if (e instanceof Erro && e.campos) body.campos = e.campos;
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(body));
    } finally {
      if (process.env.MOCK_LOG) console.log(req.method, url.pathname + url.search, res.statusCode, `${Date.now() - t0}ms`);
    }
  })
  .listen(PORT, () => console.log(`Mock da API em http://localhost:${PORT}/api`));
