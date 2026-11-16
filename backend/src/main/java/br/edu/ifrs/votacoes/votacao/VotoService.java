package br.edu.ifrs.votacoes.votacao;

import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.edu.ifrs.votacoes.erro.ApiException;
import br.edu.ifrs.votacoes.usuario.Usuario;
import br.edu.ifrs.votacoes.usuario.UsuarioService;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.VotacaoDto;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.VotarRequest;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.VotoItem;

@Service
public class VotoService {

    private final UsuarioService usuarios;
    private final AcessoVotacao acesso;
    private final ParticipacaoRepository participacoes;
    private final VotoRepository votos;
    private final GuardaAnonimaRepository guardas;
    private final GuardaHmac hmac;
    private final VotacaoService votacaoService;
    private final Clock clock;

    public VotoService(UsuarioService usuarios, AcessoVotacao acesso, ParticipacaoRepository participacoes,
            VotoRepository votos, GuardaAnonimaRepository guardas, GuardaHmac hmac, VotacaoService votacaoService,
            Clock clock) {
        this.usuarios = usuarios;
        this.acesso = acesso;
        this.participacoes = participacoes;
        this.votos = votos;
        this.guardas = guardas;
        this.hmac = hmac;
        this.votacaoService = votacaoService;
        this.clock = clock;
    }

    /**
     * Registra um envio de votos, aceito ou rejeitado por inteiro. Locks, nesta ordem:
     * <ol>
     * <li>linha da votação em FOR SHARE: encerrar/prorrogar/despublicar (FOR UPDATE) não podem mudar
     * a janela enquanto o voto está em andamento, e um voto que chega depois enxerga o novo fim;</li>
     * <li>linha de participação (aluno, votação) em FOR UPDATE: envios concorrentes do mesmo aluno
     * são serializados e nunca ultrapassam N.</li>
     * </ol>
     * A janela é validada depois dos locks. As somas usam long (sem overflow).
     */
    @Transactional
    public VotacaoDto votar(Long alunoId, Long votacaoId, VotarRequest req) {
        Usuario aluno = usuarios.buscar(alunoId);
        if (!aluno.isAlunoAtivo()) {
            throw ApiException.semPermissao("Somente alunos podem votar.");
        }
        Votacao v = acesso.buscarParaVotar(votacaoId);
        acesso.exigirLeitura(v, aluno);
        exigirAberta(v, clock.instant());

        // Agrupa por opção (o mesmo opcaoId pode aparecer mais de uma vez no envio).
        int n = v.getVotosPorAluno();
        Map<Long, Long> pedido = new LinkedHashMap<>();
        for (VotoItem item : req.votos()) {
            if (item.quantidade() > n) {
                throw ApiException.regraNegocio("Cada aluno tem no máximo " + n + (n == 1 ? " voto." : " votos."));
            }
            pedido.merge(item.opcaoId(), (long) item.quantidade(), Math::addExact);
        }
        Set<Long> opcoesValidas = v.getOpcoes().stream().map(Opcao::getId).collect(Collectors.toSet());
        for (Long opcaoId : pedido.keySet()) {
            if (!opcoesValidas.contains(opcaoId)) {
                throw ApiException.regraNegocio("A opção " + opcaoId + " não pertence a esta votação.");
            }
        }
        long total = pedido.values().stream().reduce(0L, Math::addExact);

        participacoes.garantir(v.getId(), aluno.getId());
        Participacao p = participacoes.travar(new Participacao.Id(v.getId(), aluno.getId()))
                .orElseThrow(() -> new IllegalStateException("Participação não encontrada após inserção"));

        Instant agora = clock.instant();
        exigirAberta(v, agora); // revalida a janela já com os locks obtidos

        // Primeiro tudo o que não depende de votos anteriores em opções específicas...
        int restantes = n - p.getVotosUsados();
        if (restantes <= 0) {
            throw ApiException.regraNegocio("Você já usou todos os seus " + n + " votos.");
        }
        if (total > restantes) {
            throw ApiException.regraNegocio(restantes == 1
                    ? "Você só tem 1 voto restante."
                    : "Você só tem " + restantes + " votos restantes.");
        }
        if (!v.isPermiteRepetirOpcao() && pedido.values().stream().anyMatch(q -> q > 1)) {
            throw ApiException.regraNegocio(MSG_UM_POR_OPCAO);
        }

        // ...e só então a checagem de "já votou nesta opção". Em votação anônima a mensagem é
        // genérica, sem o título da opção.
        if (!v.isPermiteRepetirOpcao()) {
            for (Long opcaoId : pedido.keySet()) {
                if (v.isAnonima()) {
                    if (guardas.existsById(hmac.calcular(v.getId(), aluno.getId(), opcaoId))) {
                        throw ApiException.regraNegocio("Envio recusado: esta votação permite no máximo "
                                + "1 voto por opção, considerando também os seus votos anteriores.");
                    }
                } else if (votos.existsByVotacaoIdAndAlunoIdAndOpcaoId(v.getId(), aluno.getId(), opcaoId)) {
                    throw ApiException.regraNegocio("Você já votou na opção \"" + tituloDa(v, opcaoId)
                            + "\" e esta votação permite no máximo 1 voto por opção.");
                }
            }
        }

        for (var e : pedido.entrySet()) {
            int quantidade = Math.toIntExact(e.getValue());
            if (v.isAnonima()) {
                votos.save(Voto.anonimo(v.getId(), e.getKey(), quantidade));
                if (!v.isPermiteRepetirOpcao()) {
                    guardas.save(new GuardaAnonima(hmac.calcular(v.getId(), aluno.getId(), e.getKey()), v.getId()));
                }
            } else {
                votos.save(Voto.identificado(v.getId(), e.getKey(), aluno.getId(), quantidade, agora));
            }
        }
        p.somarVotos(Math.toIntExact(total));
        participacoes.flush();
        return votacaoService.dto(v, aluno);
    }

    static final String MSG_UM_POR_OPCAO = "Esta votação permite no máximo 1 voto por opção.";

    private static void exigirAberta(Votacao v, Instant agora) {
        EstadoVotacao estado = v.estado(agora);
        if (estado != EstadoVotacao.ABERTA) {
            throw ApiException.regraNegocio(switch (estado) {
                case AGENDADA -> "A votação ainda não começou.";
                case ENCERRADA -> "A votação já foi encerrada.";
                default -> "A votação não está aberta.";
            });
        }
    }

    private static String tituloDa(Votacao v, Long opcaoId) {
        return v.getOpcoes().stream().filter(o -> o.getId().equals(opcaoId)).map(Opcao::getTitulo)
                .findFirst().orElse(String.valueOf(opcaoId));
    }
}
