package br.edu.ifrs.votacoes.votacao;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface ParticipacaoRepository extends JpaRepository<Participacao, Participacao.Id> {

    /** Garante que a linha exista (idempotente e seguro sob concorrência). */
    @Modifying
    @Query(value = """
            insert into participacao (votacao_id, aluno_id, votos_usados) values (:votacaoId, :alunoId, 0)
            on conflict (votacao_id, aluno_id) do nothing
            """, nativeQuery = true)
    void garantir(@Param("votacaoId") Long votacaoId, @Param("alunoId") Long alunoId);

    /** SELECT ... FOR UPDATE: serializa envios concorrentes do mesmo aluno na mesma votação. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Participacao p where p.id = :id")
    Optional<Participacao> travar(@Param("id") Participacao.Id id);

    @Query("select count(p) from Participacao p where p.id.votacaoId = :votacaoId and p.votosUsados > 0")
    long contarParticipantes(@Param("votacaoId") Long votacaoId);
}
