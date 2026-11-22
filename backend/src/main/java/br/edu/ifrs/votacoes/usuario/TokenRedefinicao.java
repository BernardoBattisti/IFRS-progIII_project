package br.edu.ifrs.votacoes.usuario;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Token de redefinição de senha: guarda só o hash SHA-256; vale 1 hora e uma única vez. */
@Entity
@Table(name = "token_redefinicao_senha")
public class TokenRedefinicao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;

    @Column(name = "usado_em")
    private Instant usadoEm;

    protected TokenRedefinicao() {
    }

    public TokenRedefinicao(Usuario usuario, String tokenHash, Instant criadoEm, Instant expiraEm) {
        this.usuario = usuario;
        this.tokenHash = tokenHash;
        this.criadoEm = criadoEm;
        this.expiraEm = expiraEm;
    }

    public boolean valido(Instant agora) {
        return usadoEm == null && agora.isBefore(expiraEm);
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void marcarUsado(Instant agora) {
        this.usadoEm = agora;
    }
}
