package br.edu.ifrs.votacoes.votacao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "opcao")
public class Opcao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "votacao_id")
    private Votacao votacao;

    @Column(nullable = false)
    private String titulo;

    private String descricao;

    @Column(name = "imagem_url")
    private String imagemUrl;

    @Column(nullable = false)
    private int ordem;

    protected Opcao() {
    }

    public Opcao(Votacao votacao, String titulo, String descricao, String imagemUrl, int ordem) {
        this.votacao = votacao;
        this.titulo = titulo;
        this.descricao = descricao;
        this.imagemUrl = imagemUrl;
        this.ordem = ordem;
    }

    public Long getId() {
        return id;
    }

    public Votacao getVotacao() {
        return votacao;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getDescricao() {
        return descricao;
    }

    public String getImagemUrl() {
        return imagemUrl;
    }

    public int getOrdem() {
        return ordem;
    }
}
