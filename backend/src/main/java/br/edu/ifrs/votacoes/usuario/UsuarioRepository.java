package br.edu.ifrs.votacoes.usuario;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByMatricula(String matricula);

    @Query("""
            select u from Usuario u
            where (:status is null or u.status = :status)
              and (:papel is null or u.papel = :papel)
            order by u.nome, u.id
            """)
    List<Usuario> filtrar(@Param("status") StatusConta status, @Param("papel") Papel papel);
}
