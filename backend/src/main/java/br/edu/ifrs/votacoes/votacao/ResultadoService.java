package br.edu.ifrs.votacoes.votacao;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.edu.ifrs.votacoes.erro.ApiException;
import br.edu.ifrs.votacoes.usuario.Usuario;
import br.edu.ifrs.votacoes.usuario.UsuarioService;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.Resultado;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.ResultadoOpcao;
import br.edu.ifrs.votacoes.votacao.VotacaoDtos.Votante;

@Service
public class ResultadoService {

    private final UsuarioService usuarios;
    private final AcessoVotacao acesso;
    private final VotoRepository votos;
    private final ParticipacaoRepository participacoes;
    private final JdbcClient jdbc;

    public ResultadoService(UsuarioService usuarios, AcessoVotacao acesso, VotoRepository votos,
            ParticipacaoRepository participacoes, JdbcClient jdbc) {
        this.usuarios = usuarios;
        this.acesso = acesso;
        this.votos = votos;
        this.participacoes = participacoes;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Resultado resultado(Long usuarioId, Long votacaoId) {
        Usuario u = usuarios.buscar(usuarioId);
        Votacao v = acesso.buscar(votacaoId);
        acesso.exigirLeitura(v, u);
        if (!acesso.podeVerResultado(v, u)) {
            throw ApiException.semPermissao("O resultado desta votação não está disponível para você.");
        }

        Map<Long, Long> totais = new HashMap<>();
        votos.totais(v.getId()).forEach(s -> totais.put(s.getOpcaoId(), s.getQuantidade()));
        long totalVotos = totais.values().stream().mapToLong(Long::longValue).sum();

        // Votação não anônima: quem pode ver o resultado vê também quem votou em quê.
        Map<Long, List<Votante>> votantes = v.isAnonima() ? Map.of() : votantesPorOpcao(v.getId());

        List<ResultadoOpcao> opcoes = new ArrayList<>();
        for (Opcao o : v.getOpcoes()) {
            long n = totais.getOrDefault(o.getId(), 0L);
            opcoes.add(new ResultadoOpcao(o.getId(), o.getTitulo(), n, percentual(n, totalVotos),
                    v.isAnonima() ? null : votantes.getOrDefault(o.getId(), List.of())));
        }
        return new Resultado(totalVotos, participacoes.contarParticipantes(v.getId()), opcoes);
    }

    private Map<Long, List<Votante>> votantesPorOpcao(Long votacaoId) {
        Map<Long, List<Votante>> mapa = new HashMap<>();
        jdbc.sql("""
                select vt.opcao_id, u.nome, u.matricula, sum(vt.quantidade) as quantidade
                from voto vt join usuario u on u.id = vt.aluno_id
                where vt.votacao_id = :votacaoId
                group by vt.opcao_id, u.id, u.nome, u.matricula
                order by lower(u.nome), u.id
                """)
                .param("votacaoId", votacaoId)
                .query((rs, i) -> {
                    mapa.computeIfAbsent(rs.getLong("opcao_id"), k -> new ArrayList<>())
                            .add(new Votante(rs.getString("nome"), rs.getString("matricula"), rs.getInt("quantidade")));
                    return null;
                })
                .list();
        return mapa;
    }

    static double percentual(long votos, long total) {
        if (total == 0) {
            return 0.0;
        }
        return BigDecimal.valueOf(votos * 100.0 / total).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
