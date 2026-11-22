package br.edu.ifrs.votacoes.votacao;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import br.edu.ifrs.votacoes.turma.Turma;
import br.edu.ifrs.votacoes.usuario.Usuario;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

@Entity
@Table(name = "votacao")
public class Votacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "docente_id")
    private Usuario docente;

    @Column(nullable = false)
    private String titulo;

    private String descricao;

    @Column(nullable = false)
    private Instant inicio;

    @Column(nullable = false)
    private Instant fim;

    @Column(name = "votos_por_aluno", nullable = false)
    private int votosPorAluno;

    @Column(name = "permite_repetir_opcao", nullable = false)
    private boolean permiteRepetirOpcao;

    @Column(nullable = false)
    private boolean anonima;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibilidade_resultado", nullable = false)
    private VisibilidadeResultado visibilidadeResultado;

    @Column(nullable = false)
    private boolean publicada;

    @Column(name = "criada_em", nullable = false)
    private Instant criadaEm;

    @ManyToMany
    @JoinTable(name = "votacao_turma",
            joinColumns = @JoinColumn(name = "votacao_id"),
            inverseJoinColumns = @JoinColumn(name = "turma_id"))
    private Set<Turma> turmas = new HashSet<>();

    @OneToMany(mappedBy = "votacao", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordem asc, id asc")
    private List<Opcao> opcoes = new ArrayList<>();

    protected Votacao() {
    }

    public Votacao(Usuario docente, Instant criadaEm) {
        this.docente = docente;
        this.criadaEm = criadaEm;
    }

    public EstadoVotacao estado(Instant agora) {
        return EstadoVotacao.derivar(publicada, inicio, fim, agora);
    }

    public boolean pertenceA(Long docenteId) {
        return docente.getId().equals(docenteId);
    }

    public Long getId() {
        return id;
    }

    public Usuario getDocente() {
        return docente;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public Instant getInicio() {
        return inicio;
    }

    public void setInicio(Instant inicio) {
        this.inicio = inicio;
    }

    public Instant getFim() {
        return fim;
    }

    public void setFim(Instant fim) {
        this.fim = fim;
    }

    public int getVotosPorAluno() {
        return votosPorAluno;
    }

    public void setVotosPorAluno(int votosPorAluno) {
        this.votosPorAluno = votosPorAluno;
    }

    public boolean isPermiteRepetirOpcao() {
        return permiteRepetirOpcao;
    }

    public void setPermiteRepetirOpcao(boolean permiteRepetirOpcao) {
        this.permiteRepetirOpcao = permiteRepetirOpcao;
    }

    public boolean isAnonima() {
        return anonima;
    }

    public void setAnonima(boolean anonima) {
        this.anonima = anonima;
    }

    public VisibilidadeResultado getVisibilidadeResultado() {
        return visibilidadeResultado;
    }

    public void setVisibilidadeResultado(VisibilidadeResultado visibilidadeResultado) {
        this.visibilidadeResultado = visibilidadeResultado;
    }

    public boolean isPublicada() {
        return publicada;
    }

    public void setPublicada(boolean publicada) {
        this.publicada = publicada;
    }

    public Set<Turma> getTurmas() {
        return turmas;
    }

    public List<Opcao> getOpcoes() {
        return opcoes;
    }
}
