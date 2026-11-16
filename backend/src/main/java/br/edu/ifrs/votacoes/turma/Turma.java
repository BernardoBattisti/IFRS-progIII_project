package br.edu.ifrs.votacoes.turma;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import br.edu.ifrs.votacoes.usuario.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "turma")
public class Turma {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    private String descricao;

    @Column(nullable = false, unique = true, length = 8)
    private String codigo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "docente_id")
    private Usuario docente;

    @ManyToMany
    @JoinTable(name = "turma_aluno",
            joinColumns = @JoinColumn(name = "turma_id"),
            inverseJoinColumns = @JoinColumn(name = "aluno_id"))
    private Set<Usuario> alunos = new HashSet<>();

    @Column(name = "criada_em", nullable = false)
    private Instant criadaEm;

    protected Turma() {
    }

    public Turma(Usuario docente, String nome, String descricao, String codigo, Instant criadaEm) {
        this.docente = docente;
        this.nome = nome;
        this.descricao = descricao;
        this.codigo = codigo;
        this.criadaEm = criadaEm;
    }

    public boolean pertenceA(Long docenteId) {
        return docente.getId().equals(docenteId);
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    public Usuario getDocente() {
        return docente;
    }

    public Set<Usuario> getAlunos() {
        return alunos;
    }
}
