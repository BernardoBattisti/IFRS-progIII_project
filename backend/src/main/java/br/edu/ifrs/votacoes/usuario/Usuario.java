package br.edu.ifrs.votacoes.usuario;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String nome;

    private String matricula;

    @Enumerated(EnumType.STRING)
    private Papel papel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusConta status;

    /** Hash BCrypt da senha; nulo em contas antigas (login Google) até redefinirem a senha. */
    @Column(name = "senha_hash")
    private String senhaHash;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected Usuario() {
    }

    public Usuario(String email, String nome, String matricula, Papel papel, StatusConta status,
            String senhaHash, Instant criadoEm) {
        this.email = email;
        this.nome = nome;
        this.matricula = matricula;
        this.papel = papel;
        this.status = status;
        this.senhaHash = senhaHash;
        this.criadoEm = criadoEm;
    }

    /** O administrador (conta fixa): isento da verificação de domínio, sem troca/recuperação de senha. */
    public boolean isAdmin() {
        return papel == Papel.ADMIN;
    }

    public boolean isAtivo() {
        return status == StatusConta.ATIVO;
    }

    public boolean isAlunoAtivo() {
        return isAtivo() && papel == Papel.ALUNO;
    }

    public boolean isDocenteAtivo() {
        return isAtivo() && papel == Papel.DOCENTE;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public void setSenhaHash(String senhaHash) {
        this.senhaHash = senhaHash;
    }

    public String getMatricula() {
        return matricula;
    }

    public void setMatricula(String matricula) {
        this.matricula = matricula;
    }

    public Papel getPapel() {
        return papel;
    }

    public void setPapel(Papel papel) {
        this.papel = papel;
    }

    public StatusConta getStatus() {
        return status;
    }

    public void setStatus(StatusConta status) {
        this.status = status;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }
}
