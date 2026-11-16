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
     * Registra um envio de votos. Tudo numa transação, com lock pessimista na linha de participação
     * (aluno, votação): envios concorrentes do mesmo aluno são serializados e nunca ultrapassam N.
     * O envio é aceito ou rejeitado por inteiro.
     */
    @Transactional
    public VotacaoDto votar(Long alunoId, Long votacaoId, VotarRequest req) {
        Usuario aluno = usuarios.buscar(alunoId);
        if (!aluno.isAlunoAtivo()) {
            throw ApiException.semPermissao("Somente alunos podem votar.");
        }
        Votacao v = acesso.buscar(votacaoId);
        acesso.exigirLeitura(v, aluno);
        exigirAberta(v, clock.instant());

        // Agrupa por opção (o mesmo opcaoId pode aparecer mais de uma vez no envio).
        Map<Long, Integer> pedido = new LinkedHashMap<>();
        for (VotoItem item : req.votos()) {
            pedido.merge(item.opcaoId(), item.quantidade(), Integer::sum);
        }
        Set<Long> opcoesValidas = v.getOpcoes().stream().map(Opcao::getId).collect(Collectors.toSet());
        for (Long opcaoId : pedido.keySet()) {
            if (!opcoesValidas.contains(opcaoId)) {
                throw ApiException.regraNegocio("A opção " + opcaoId + " não pertence a esta votação.");
            }
        }
        int total = pedido.values().stream().mapToInt(Integer::intValue).sum();

        participacoes.garantir(v.getId(), aluno.getId());
        Participacao p = participacoes.travar(new Participacao.Id(v.getId(), aluno.getId()))
                .orElseThrow(() -> new IllegalStateException("Participação não encontrada após inserção"));

        Instant agora = clock.instant();
        exigirAberta(v, agora); // o lock pode ter esperado; revalida a janela

        int restantes = v.getVotosPorAluno() - p.getVotosUsados();
        if (restantes <= 0) {
            throw ApiException.regraNegocio("Você já usou todos os seus " + v.getVotosPorAluno() + " votos.");
        }
        if (total > restantes) {
            throw ApiException.regraNegocio(restantes == 1
                    ? "Você só tem 1 voto restante."
                    : "Você só tem " + restantes + " votos restantes.");
        }

        if (!v.isPermiteRepetirOpcao()) {
            for (var e : pedido.entrySet()) {
                if (e.getValue() > 1) {
                    throw ApiException.regraNegocio("Esta votação permite no máximo 1 voto por opção.");
                }
                boolean jaVotou = v.isAnonima()
                        ? guardas.existsById(hmac.calcular(v.getId(), aluno.getId(), e.getKey()))
                        : votos.existsByVotacaoIdAndAlunoIdAndOpcaoId(v.getId(), aluno.getId(), e.getKey());
                if (jaVotou) {
                    throw ApiException.regraNegocio(
                            "Você já votou na opção \"" + tituloDa(v, e.getKey()) + "\" e esta votação permite no máximo 1 voto por opção.");
                }
            }
        }

        for (var e : pedido.entrySet()) {
            if (v.isAnonima()) {
                votos.save(Voto.anonimo(v.getId(), e.getKey(), e.getValue()));
                if (!v.isPermiteRepetirOpcao()) {
                    guardas.save(new GuardaAnonima(hmac.calcular(v.getId(), aluno.getId(), e.getKey()), v.getId()));
                }
            } else {
                votos.save(Voto.identificado(v.getId(), e.getKey(), aluno.getId(), e.getValue(), agora));
            }
        }
        p.somarVotos(total);
        participacoes.flush();
        return votacaoService.dto(v, aluno);
    }

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
