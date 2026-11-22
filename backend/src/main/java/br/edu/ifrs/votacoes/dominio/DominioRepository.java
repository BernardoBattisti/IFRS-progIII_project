package br.edu.ifrs.votacoes.dominio;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DominioRepository extends JpaRepository<DominioAceito, Long> {

    boolean existsByDominio(String dominio);

    List<DominioAceito> findAllByOrderByDominioAsc();
}
