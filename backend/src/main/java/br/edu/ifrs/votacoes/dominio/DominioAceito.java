package br.edu.ifrs.votacoes.dominio;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Domínio de e-mail aceito pelo sistema (lista mantida pelo admin; vazia = qualquer domínio). */
@Entity
@Table(name = "dominio_aceito")
public class DominioAceito {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String dominio;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected DominioAceito() {
    }

    public DominioAceito(String dominio, Instant criadoEm) {
        this.dominio = dominio;
        this.criadoEm = criadoEm;
    }

    public Long getId() {
        return id;
    }

    public String getDominio() {
        return dominio;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }
}
