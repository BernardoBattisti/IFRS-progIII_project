package br.edu.ifrs.votacoes.votacao;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface VotacaoRepository extends JpaRepository<Votacao, Long> {

    List<Votacao> findByDocenteIdOrderByInicioDescIdDesc(Long docenteId);

    /** SELECT ... FOR SHARE: votos concorrentes coexistem, mas esperam encerrar/prorrogar/despublicar. */
    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("select v from Votacao v where v.id = :id")
    Optional<Votacao> buscarParaVotar(@Param("id") Long id);

    /** SELECT ... FOR UPDATE: mudanças de janela esperam os votos em andamento (e vice-versa). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Votacao v where v.id = :id")
    Optional<Votacao> buscarParaAlterar(@Param("id") Long id);

    /** Votações publicadas em que o aluno é elegível (sem turmas ou membro de ao menos uma). */
    @Query(value = """
            select v.id from votacao v
            where v.publicada
              and (not exists (select 1 from votacao_turma vt where vt.votacao_id = v.id)
                   or exists (select 1 from votacao_turma vt
                              join turma_aluno ta on ta.turma_id = vt.turma_id
                              where vt.votacao_id = v.id and ta.aluno_id = :alunoId))
            order by v.inicio desc, v.id desc
            """, nativeQuery = true)
    List<Long> idsVisiveisAoAluno(@Param("alunoId") Long alunoId);

    @Query(value = """
            select (not exists (select 1 from votacao_turma vt where vt.votacao_id = :votacaoId)
                    or exists (select 1 from votacao_turma vt
                               join turma_aluno ta on ta.turma_id = vt.turma_id
                               where vt.votacao_id = :votacaoId and ta.aluno_id = :alunoId))
            """, nativeQuery = true)
    boolean alunoElegivel(@Param("votacaoId") Long votacaoId, @Param("alunoId") Long alunoId);
}
