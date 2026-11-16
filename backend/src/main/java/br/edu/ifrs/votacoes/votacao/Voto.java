package br.edu.ifrs.votacoes.votacao;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

import org.springframework.data.domain.Persistable;

/**
 * Voto. Em votação anônima {@code alunoId} e {@code registradoEm} ficam nulos e o id é um UUID
 * aleatório, de modo que não há como ligar o voto ao aluno.
 */
@Entity
@Table(name = "voto")
public class Voto implements Persistable<UUID> {

    @Transient
    private boolean novo = true;

    @Id
    private UUID id;

    @Column(name = "votacao_id", nullable = false)
    private Long votacaoId;

    @Column(name = "opcao_id", nullable = false)
    private Long opcaoId;

    @Column(name = "aluno_id")
    private Long alunoId;

    @Column(nullable = false)
    private int quantidade;

    @Column(name = "registrado_em")
    private Instant registradoEm;

    protected Voto() {
    }

    private Voto(Long votacaoId, Long opcaoId, Long alunoId, int quantidade, Instant registradoEm) {
        this.id = UUID.randomUUID();
        this.votacaoId = votacaoId;
        this.opcaoId = opcaoId;
        this.alunoId = alunoId;
        this.quantidade = quantidade;
        this.registradoEm = registradoEm;
    }

    public static Voto anonimo(Long votacaoId, Long opcaoId, int quantidade) {
        return new Voto(votacaoId, opcaoId, null, quantidade, null);
    }

    public static Voto identificado(Long votacaoId, Long opcaoId, Long alunoId, int quantidade, Instant quando) {
        return new Voto(votacaoId, opcaoId, alunoId, quantidade, quando);
    }

    @Override
    public UUID getId() {
        return id;
    }

    public Long getOpcaoId() {
        return opcaoId;
    }

    public Long getAlunoId() {
        return alunoId;
    }

    public int getQuantidade() {
        return quantidade;
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
