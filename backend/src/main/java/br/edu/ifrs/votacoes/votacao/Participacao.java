package br.edu.ifrs.votacoes.votacao;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** Participação do aluno numa votação: apenas quantos votos já usou (sem data/hora, sem opções). */
@Entity
@Table(name = "participacao")
public class Participacao {

    @Embeddable
    public record Id(@Column(name = "votacao_id") Long votacaoId, @Column(name = "aluno_id") Long alunoId)
            implements Serializable {
    }

    @EmbeddedId
    private Id id;

    @Column(name = "votos_usados", nullable = false)
    private int votosUsados;

    protected Participacao() {
    }

    public Id getId() {
        return id;
    }

    public int getVotosUsados() {
        return votosUsados;
    }

    public void somarVotos(int quantidade) {
        this.votosUsados += quantidade;
    }
}
