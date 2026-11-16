package br.edu.ifrs.votacoes.votacao;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.edu.ifrs.votacoes.erro.ApiException;
import br.edu.ifrs.votacoes.turma.TurmaService;
import br.edu.ifrs.votacoes.usuario.Usuario;
import br.edu.ifrs.votacoes.usuario.UsuarioService;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.DocenteResumo;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.MeuVoto;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.OpcaoDto;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.OpcaoInput;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.TurmaResumo;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.VotacaoDto;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.VotacaoInput;

@Service
public class VotacaoService {

    private final VotacaoRepository votacoes;
    private final ParticipacaoRepository participacoes;
    private final VotoRepository votos;
    private final UsuarioService usuarios;
    private final TurmaService turmas;
    private final AcessoVotacao acesso;
    private final Clock clock;

    public VotacaoService(VotacaoRepository votacoes, ParticipacaoRepository participacoes, VotoRepository votos,
            UsuarioService usuarios, TurmaService turmas, AcessoVotacao acesso, Clock clock) {
        this.votacoes = votacoes;
        this.participacoes = participacoes;
        this.votos = votos;
        this.usuarios = usuarios;
        this.turmas = turmas;
        this.acesso = acesso;
        this.clock = clock;
    }

    // ---------- leitura ----------

    @Transactional(readOnly = true)
    public List<VotacaoDto> listar(Long usuarioId) {
        Usuario u = usuarios.buscar(usuarioId);
        if (u.isDocenteAtivo()) {
            return votacoes.findByDocenteIdOrderByInicioDescIdDesc(u.getId()).stream().map(v -> dto(v, u)).toList();
        }
        if (u.isAlunoAtivo()) {
            List<Long> ids = votacoes.idsVisiveisAoAluno(u.getId());
            var porId = new java.util.HashMap<Long, Votacao>();
            votacoes.findAllById(ids).forEach(v -> porId.put(v.getId(), v));
            return ids.stream().map(porId::get).map(v -> dto(v, u)).toList();
        }
        throw ApiException.semPermissao("Você não tem permissão para esta ação.");
    }

    @Transactional(readOnly = true)
    public VotacaoDto detalhar(Long usuarioId, Long votacaoId) {
        Usuario u = usuarios.buscar(usuarioId);
        Votacao v = acesso.buscar(votacaoId);
        acesso.exigirLeitura(v, u);
        return dto(v, u);
    }

    // ---------- edição (rascunho) ----------

    @Transactional
    public VotacaoDto criar(Long docenteId, VotacaoInput in) {
        Usuario docente = usuarios.buscar(docenteId);
        if (!docente.isDocenteAtivo()) {
            throw ApiException.semPermissao("Somente docentes podem criar votações.");
        }
        Votacao v = new Votacao(docente, clock.instant());
        aplicar(v, in, docenteId);
        return dto(votacoes.saveAndFlush(v), docente);
    }

    @Transactional
    public VotacaoDto atualizar(Long docenteId, Long votacaoId, VotacaoInput in) {
        Usuario u = usuarios.buscar(docenteId);
        Votacao v = doDonoNoEstado(u, votacaoId, EstadoVotacao.RASCUNHO,
                "Somente votações em rascunho podem ser editadas.");
        aplicar(v, in, docenteId);
        return dto(votacoes.saveAndFlush(v), u);
    }

    @Transactional
    public void excluir(Long docenteId, Long votacaoId) {
        Usuario u = usuarios.buscar(docenteId);
        Votacao v = doDonoNoEstado(u, votacaoId, EstadoVotacao.RASCUNHO,
                "Somente votações em rascunho podem ser excluídas.");
        votacoes.delete(v);
    }

    /**
     * Validação de rascunho (400): campos obrigatórios e coerência das datas. O que depende de a
     * votação estar completa (mínimo de opções, fim no futuro, N ≤ nº de opções) fica para a publicação.
     */
    private void aplicar(Votacao v, VotacaoInput in, Long docenteId) {
        if (!in.fim().isAfter(in.inicio())) {
            throw ApiException.validacao("fim", "deve ser posterior ao início");
        }
        v.setTitulo(in.titulo().trim());
        v.setDescricao(vazioParaNulo(in.descricao()));
        v.setInicio(in.inicio());
        v.setFim(in.fim());
        v.setVotosPorAluno(in.votosPorAluno());
        v.setPermiteRepetirOpcao(in.permiteRepetirOpcao());
        v.setAnonima(in.anonima());
        v.setVisibilidadeResultado(in.visibilidadeResultado());

        List<Long> turmaIds = in.turmaIds() == null ? List.of() : in.turmaIds();
        v.getTurmas().clear();
        v.getTurmas().addAll(turmas.turmasDoDocente(docenteId, turmaIds));

        List<OpcaoInput> opcoes = in.opcoes() == null ? List.of() : in.opcoes();
        v.getOpcoes().clear();
        int ordem = 1;
        for (OpcaoInput o : opcoes) {
            v.getOpcoes().add(new Opcao(v, o.titulo().trim(), vazioParaNulo(o.descricao()),
                    vazioParaNulo(o.imagemUrl()), ordem++));
        }
    }

    // ---------- ciclo de vida ----------

    @Transactional
    public VotacaoDto publicar(Long docenteId, Long votacaoId) {
        Usuario u = usuarios.buscar(docenteId);
        Votacao v = doDonoNoEstado(u, votacaoId, EstadoVotacao.RASCUNHO,
                "Somente votações em rascunho podem ser publicadas.");
        List<String> problemas = new ArrayList<>();
        Instant agora = clock.instant();
        if (v.getOpcoes().size() < 2) {
            problemas.add("A votação precisa de pelo menos 2 opções.");
        }
        if (!v.getFim().isAfter(v.getInicio())) {
            problemas.add("O fim deve ser posterior ao início.");
        }
        if (!v.getFim().isAfter(agora)) {
            problemas.add("O fim da votação deve estar no futuro.");
        }
        if (v.getVotosPorAluno() < 1) {
            problemas.add("Cada aluno deve ter pelo menos 1 voto.");
        }
        if (!v.isPermiteRepetirOpcao() && v.getVotosPorAluno() > v.getOpcoes().size()) {
            problemas.add("Sem repetir opção, os votos por aluno (" + v.getVotosPorAluno()
                    + ") não podem exceder o número de opções (" + v.getOpcoes().size() + ").");
        }
        if (!problemas.isEmpty()) {
            throw ApiException.regraNegocio(String.join(" ", problemas));
        }
        v.setPublicada(true);
        return dto(v, u);
    }

    @Transactional
    public VotacaoDto despublicar(Long docenteId, Long votacaoId) {
        Usuario u = usuarios.buscar(docenteId);
        Votacao v = doDonoNoEstado(u, votacaoId, EstadoVotacao.AGENDADA,
                "Somente votações agendadas (ainda não abertas) podem ser despublicadas.");
        v.setPublicada(false);
        return dto(v, u);
    }

    @Transactional
    public VotacaoDto encerrar(Long docenteId, Long votacaoId) {
        Usuario u = usuarios.buscar(docenteId);
        Votacao v = doDonoNoEstado(u, votacaoId, EstadoVotacao.ABERTA,
                "Somente votações abertas podem ser encerradas antecipadamente.");
        v.setFim(clock.instant());
        votacoes.flush();
        return dto(v, u);
    }

    @Transactional
    public VotacaoDto prorrogar(Long docenteId, Long votacaoId, Instant novoFim) {
        Usuario u = usuarios.buscar(docenteId);
        Votacao v = doDonoNoEstado(u, votacaoId, EstadoVotacao.ABERTA,
                "Somente votações abertas podem ser prorrogadas.");
        if (!novoFim.isAfter(v.getFim())) {
            throw ApiException.regraNegocio("O novo fim deve ser posterior ao fim atual.");
        }
        v.setFim(novoFim);
        return dto(v, u);
    }

    private Votacao doDonoNoEstado(Usuario u, Long votacaoId, EstadoVotacao exigido, String mensagem) {
        Votacao v = acesso.buscar(votacaoId);
        acesso.exigirDono(v, u);
        if (v.estado(clock.instant()) != exigido) {
            throw ApiException.regraNegocio(mensagem);
        }
        return v;
    }

    // ---------- representação ----------

    VotacaoDto dto(Votacao v, Usuario u) {
        EstadoVotacao estado = v.estado(clock.instant());
        Integer usados = null;
        Integer restantes = null;
        List<MeuVoto> meus = null;
        if (u.isAlunoAtivo()) {
            usados = participacoes.findById(new Participacao.Id(v.getId(), u.getId()))
                    .map(Participacao::getVotosUsados).orElse(0);
            restantes = Math.max(0, v.getVotosPorAluno() - usados);
            if (!v.isAnonima()) {
                meus = votos.somaDoAluno(v.getId(), u.getId()).stream()
                        .map(s -> new MeuVoto(s.getOpcaoId(), s.getQuantidade().intValue()))
                        .sorted(Comparator.comparing(MeuVoto::opcaoId))
                        .toList();
            }
        }
        return new VotacaoDto(v.getId(), v.getTitulo(), v.getDescricao(), v.getInicio(), v.getFim(),
                v.getVotosPorAluno(), v.isPermiteRepetirOpcao(), v.isAnonima(), v.getVisibilidadeResultado(),
                estado,
                new DocenteResumo(v.getDocente().getId(), v.getDocente().getNome()),
                v.getTurmas().stream()
                        .sorted(Comparator.comparing(t -> t.getNome(), String.CASE_INSENSITIVE_ORDER))
                        .map(t -> new TurmaResumo(t.getId(), t.getNome())).toList(),
                v.getOpcoes().stream()
                        .map(o -> new OpcaoDto(o.getId(), o.getTitulo(), o.getDescricao(), o.getImagemUrl(), o.getOrdem()))
                        .toList(),
                acesso.podeVerResultado(v, u),
                usados, restantes, meus);
    }

    private static String vazioParaNulo(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
