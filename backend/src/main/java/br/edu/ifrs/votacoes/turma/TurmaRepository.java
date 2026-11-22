package br.edu.ifrs.votacoes.turma;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TurmaRepository extends JpaRepository<Turma, Long> {

    List<Turma> findByDocenteIdOrderByNomeAsc(Long docenteId);

    @Query("select t from Turma t join t.alunos a where a.id = :alunoId order by t.nome")
    List<Turma> daQualParticipa(@Param("alunoId") Long alunoId);

    Optional<Turma> findByCodigo(String codigo);

    boolean existsByCodigo(String codigo);

    @Query(value = "select count(*) from turma_aluno where turma_id = :turmaId", nativeQuery = true)
    long contarAlunos(@Param("turmaId") Long turmaId);

    @Query(value = "select exists(select 1 from turma_aluno where turma_id = :turmaId and aluno_id = :alunoId)",
            nativeQuery = true)
    boolean ehMembro(@Param("turmaId") Long turmaId, @Param("alunoId") Long alunoId);

    @Query(value = "select exists(select 1 from votacao_turma where turma_id = :turmaId)", nativeQuery = true)
    boolean vinculadaAVotacao(@Param("turmaId") Long turmaId);
}
