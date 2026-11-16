package br.edu.ifrs.votacoes.turma;

import java.time.Clock;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.edu.ifrs.votacoes.erro.ApiException;
import br.edu.ifrs.votacoes.turma.TurmaDtos.AlunoDto;
import br.edu.ifrs.votacoes.turma.TurmaDtos.TurmaDto;
import br.edu.ifrs.votacoes.turma.TurmaDtos.TurmaInput;
import br.edu.ifrs.votacoes.usuario.Usuario;
import br.edu.ifrs.votacoes.usuario.UsuarioService;

@Service
public class TurmaService {

    private final TurmaRepository turmas;
    private final UsuarioService usuarios;
    private final GeradorCodigo gerador;
    private final Clock clock;

    public TurmaService(TurmaRepository turmas, UsuarioService usuarios, GeradorCodigo gerador, Clock clock) {
        this.turmas = turmas;
        this.usuarios = usuarios;
        this.gerador = gerador;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<TurmaDto> listar(Long usuarioId) {
        Usuario u = usuarios.buscar(usuarioId);
        if (u.isDocenteAtivo()) {
            return turmas.findByDocenteIdOrderByNomeAsc(u.getId()).stream().map(t -> dto(t, true)).toList();
        }
        if (u.isAlunoAtivo()) {
            return turmas.daQualParticipa(u.getId()).stream().map(t -> dto(t, false)).toList();
        }
        throw ApiException.semPermissao("Você não tem permissão para esta ação.");
    }

    @Transactional
    public TurmaDto criar(Long docenteId, TurmaInput in) {
        Usuario docente = exigirDocente(docenteId);
        Turma t = new Turma(docente, in.nome().trim(), vazioParaNulo(in.descricao()), novoCodigo(), clock.instant());
        return dto(turmas.save(t), true);
    }

    @Transactional
    public TurmaDto atualizar(Long docenteId, Long turmaId, TurmaInput in) {
        Turma t = turmaDoDocente(docenteId, turmaId);
        t.setNome(in.nome().trim());
        t.setDescricao(vazioParaNulo(in.descricao()));
        return dto(t, true);
    }

    @Transactional
    public void excluir(Long docenteId, Long turmaId) {
        Turma t = turmaDoDocente(docenteId, turmaId);
        if (turmas.vinculadaAVotacao(t.getId())) {
            throw ApiException.conflito("A turma está vinculada a uma votação e não pode ser excluída.");
        }
        turmas.delete(t);
    }

    @Transactional
    public TurmaDto regenerarCodigo(Long docenteId, Long turmaId) {
        Turma t = turmaDoDocente(docenteId, turmaId);
        t.setCodigo(novoCodigo());
        return dto(t, true);
    }

    @Transactional(readOnly = true)
    public List<AlunoDto> alunos(Long docenteId, Long turmaId) {
        Turma t = turmaDoDocente(docenteId, turmaId);
        return t.getAlunos().stream()
                .sorted(Comparator.comparing(Usuario::getNome, String.CASE_INSENSITIVE_ORDER).thenComparing(Usuario::getId))
                .map(a -> new AlunoDto(a.getId(), a.getNome(), a.getMatricula(), a.getEmail()))
                .toList();
    }

    @Transactional
    public void removerAluno(Long docenteId, Long turmaId, Long alunoId) {
        Turma t = turmaDoDocente(docenteId, turmaId);
        boolean removido = t.getAlunos().removeIf(a -> a.getId().equals(alunoId));
        if (!removido) {
            throw ApiException.naoEncontrado("Aluno não encontrado nesta turma.");
        }
    }

    @Transactional
    public TurmaDto entrar(Long alunoId, String codigoBruto) {
        Usuario aluno = usuarios.buscar(alunoId);
        if (!aluno.isAlunoAtivo()) {
            throw ApiException.semPermissao("Somente alunos podem entrar em turmas.");
        }
        String codigo = codigoBruto.trim().toUpperCase(Locale.ROOT);
        Turma t = turmas.findByCodigo(codigo)
                .orElseThrow(() -> ApiException.naoEncontrado("Código de turma inválido."));
        if (turmas.ehMembro(t.getId(), aluno.getId())) {
            throw ApiException.conflito("Você já participa desta turma.");
        }
        t.getAlunos().add(aluno);
        turmas.flush();
        return dto(t, false);
    }

    /** Usado pelas votações: valida que as turmas existem e pertencem ao docente. */
    @Transactional(readOnly = true)
    public List<Turma> turmasDoDocente(Long docenteId, List<Long> ids) {
        return ids.stream().distinct().map(id -> turmaDoDocenteOuRegra(docenteId, id)).toList();
    }

    private Turma turmaDoDocenteOuRegra(Long docenteId, Long id) {
        if (id == null) {
            throw ApiException.validacao("turmaIds", "contém valor nulo");
        }
        return turmas.findById(id).filter(t -> t.pertenceA(docenteId))
                .orElseThrow(() -> ApiException.regraNegocio("A turma " + id + " não existe ou não é sua."));
    }

    private Usuario exigirDocente(Long id) {
        Usuario u = usuarios.buscar(id);
        if (!u.isDocenteAtivo()) {
            throw ApiException.semPermissao("Somente docentes podem gerenciar turmas.");
        }
        return u;
    }

    private Turma turmaDoDocente(Long docenteId, Long turmaId) {
        exigirDocente(docenteId);
        Turma t = turmas.findById(turmaId).orElseThrow(() -> ApiException.naoEncontrado("Turma não encontrada."));
        if (!t.pertenceA(docenteId)) {
            // Não revela a existência de turmas de outros docentes.
            throw ApiException.naoEncontrado("Turma não encontrada.");
        }
        return t;
    }

    private String novoCodigo() {
        for (int i = 0; i < 20; i++) {
            String c = gerador.gerar();
            if (!turmas.existsByCodigo(c)) {
                return c;
            }
        }
        throw new IllegalStateException("Não foi possível gerar um código de turma único.");
    }

    private TurmaDto dto(Turma t, boolean comCodigo) {
        return new TurmaDto(t.getId(), t.getNome(), t.getDescricao(), comCodigo ? t.getCodigo() : null,
                t.getDocente().getNome(), t.getAlunos().size());
    }

    private static String vazioParaNulo(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
