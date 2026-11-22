package br.edu.ifrs.votacoes.votacao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

import org.springframework.data.domain.Persistable;

/** Linha de guarda: HMAC de "votacao:aluno:opcao" (não reversível sem o segredo). */
@Entity
@Table(name = "guarda_anonima")
public class GuardaAnonima implements Persistable<String> {

    @Transient
    private boolean novo = true;

    @Id
    @Column(length = 64)
    private String hash;

    @Column(name = "votacao_id", nullable = false)
    private Long votacaoId;

    protected GuardaAnonima() {
    }

    public GuardaAnonima(String hash, Long votacaoId) {
        this.hash = hash;
        this.votacaoId = votacaoId;
    }

    public String getHash() {
        return hash;
    }

    @Override
    public String getId() {
        return hash;
    }

    @Override
    public boolean isNew() {
        return novo;
    }

    @PostLoad
    @PostPersist
    void marcarPersistido() {
        this.novo = false;
    }
}
