package br.edu.ifrs.votacoes.votacao;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VotoRepository extends JpaRepository<Voto, UUID> {

    interface SomaPorOpcao {
        Long getOpcaoId();

        Long getQuantidade();
    }

    @Query("""
            select v.opcaoId as opcaoId, sum(v.quantidade) as quantidade from Voto v
            where v.votacaoId = :votacaoId and v.alunoId = :alunoId
            group by v.opcaoId
            """)
    List<SomaPorOpcao> somaDoAluno(@Param("votacaoId") Long votacaoId, @Param("alunoId") Long alunoId);

    @Query("""
            select v.opcaoId as opcaoId, sum(v.quantidade) as quantidade from Voto v
            where v.votacaoId = :votacaoId
            group by v.opcaoId
            """)
    List<SomaPorOpcao> totais(@Param("votacaoId") Long votacaoId);

    boolean existsByVotacaoIdAndAlunoIdAndOpcaoId(Long votacaoId, Long alunoId, Long opcaoId);
}
