// Tipos espelhando o contrato em docs/ESPECIFICACAO.md (seção 5).

export type Papel = "ALUNO" | "DOCENTE" | "ADMIN";
export type StatusConta = "PENDENTE_APROVACAO" | "ATIVO" | "REJEITADO";

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  matricula: string | null;
  papel: Papel;
  status: StatusConta;
};

/** Domínio de e-mail aceito no cadastro e no login (seção 5.2). */
export type Dominio = { id: number; dominio: string; criadoEm: string };

/** Senha: mínimo 8 caracteres; máximo 72 bytes (limite do BCrypt). */
export const SENHA_MIN = 8;
export const SENHA_MAX_BYTES = 72;

export type Turma = {
  id: number;
  nome: string;
  descricao: string | null;
  codigo: string | null;
  docenteNome: string;
  totalAlunos: number;
};

export type AlunoTurma = { id: number; nome: string; matricula: string; email: string };

export type Visibilidade = "SEMPRE" | "APOS_ENCERRAR" | "NUNCA";
export type EstadoVotacao = "RASCUNHO" | "AGENDADA" | "ABERTA" | "ENCERRADA";

export type OpcaoInput = { titulo: string; descricao?: string; imagemUrl?: string };

export type VotacaoInput = {
  titulo: string;
  descricao?: string;
  inicio: string;
  fim: string;
  votosPorAluno: number;
  permiteRepetirOpcao: boolean;
  anonima: boolean;
  visibilidadeResultado: Visibilidade;
  turmaIds: number[];
  opcoes: OpcaoInput[];
};

export type Opcao = {
  id: number;
  titulo: string;
  descricao: string | null;
  imagemUrl: string | null;
  ordem: number;
};

export type VotoItem = { opcaoId: number; quantidade: number };

export type Votacao = {
  id: number;
  titulo: string;
  descricao: string | null;
  inicio: string;
  fim: string;
  votosPorAluno: number;
  permiteRepetirOpcao: boolean;
  anonima: boolean;
  visibilidadeResultado: Visibilidade;
  estado: EstadoVotacao;
  docente: { id: number; nome: string };
  turmas: { id: number; nome: string }[];
  opcoes: Opcao[];
  podeVerResultado: boolean;
  votosUsados: number | null;
  votosRestantes: number | null;
  meusVotos: VotoItem[] | null;
};

export type Resultado = {
  totalVotos: number;
  totalParticipantes: number;
  opcoes: {
    opcaoId: number;
    titulo: string;
    votos: number;
    percentual: number;
    votantes: { nome: string; matricula: string; quantidade: number }[] | null;
  }[];
};
