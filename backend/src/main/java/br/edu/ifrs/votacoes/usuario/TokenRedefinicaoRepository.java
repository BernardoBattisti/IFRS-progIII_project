package br.edu.ifrs.votacoes.usuario;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface TokenRedefinicaoRepository extends JpaRepository<TokenRedefinicao, Long> {

    /** Com lock na linha: dois usos simultâneos do mesmo token são serializados. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from TokenRedefinicao t where t.tokenHash = :hash")
    Optional<TokenRedefinicao> buscarParaUso(@Param("hash") String hash);

    /** Invalida (marca como usados) todos os tokens ainda não usados do usuário. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update TokenRedefinicao t set t.usadoEm = :agora where t.usuario.id = :usuarioId and t.usadoEm is null")
    int invalidarDoUsuario(@Param("usuarioId") Long usuarioId, @Param("agora") Instant agora);

    @Modifying
    @Query("delete from TokenRedefinicao t where t.expiraEm < :limite")
    int apagarExpiradosAntesDe(@Param("limite") Instant limite);
}
