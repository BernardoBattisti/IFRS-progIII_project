package br.edu.ifrs.votacoes.votacao;

import java.time.Clock;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import br.edu.ifrs.votacoes.erro.ApiException;
import br.edu.ifrs.votacoes.usuario.Usuario;

/** Regras de acesso a uma votação (dono, elegibilidade, visibilidade de resultado). */
@Component
public class AcessoVotacao {

    private final VotacaoRepository votacoes;
    private final Clock clock;

    public AcessoVotacao(VotacaoRepository votacoes, Clock clock) {
        this.votacoes = votacoes;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Votacao buscar(Long id) {
        return votacoes.findById(id).orElseThrow(() -> ApiException.naoEncontrado("Votação não encontrada."));
    }

    public Votacao buscarParaVotar(Long id) {
        return votacoes.buscarParaVotar(id).orElseThrow(() -> ApiException.naoEncontrado("Votação não encontrada."));
    }

    public Votacao buscarParaAlterar(Long id) {
        return votacoes.buscarParaAlterar(id).orElseThrow(() -> ApiException.naoEncontrado("Votação não encontrada."));
    }

    /**
     * Docente dono, ou aluno elegível em votação publicada. Rascunho é invisível ao aluno (404) e
     * votação de outro docente responde 404 (não revela que existe). Aluno inelegível: 403.
     */
    public void exigirLeitura(Votacao v, Usuario u) {
        if (u.isDocenteAtivo()) {
            if (!v.pertenceA(u.getId())) {
                throw ApiException.naoEncontrado("Votação não encontrada.");
            }
            return;
        }
        if (u.isAlunoAtivo()) {
            if (!v.isPublicada()) {
                throw ApiException.naoEncontrado("Votação não encontrada.");
            }
            if (!votacoes.alunoElegivel(v.getId(), u.getId())) {
                throw ApiException.semPermissao("Você não é elegível para esta votação.");
            }
            return;
        }
        throw ApiException.semPermissao("Você não tem permissão para esta ação.");
    }

    public void exigirDono(Votacao v, Usuario u) {
        if (!u.isDocenteAtivo()) {
            throw ApiException.semPermissao("Somente o docente criador pode gerenciar esta votação.");
        }
        if (!v.pertenceA(u.getId())) {
            throw ApiException.naoEncontrado("Votação não encontrada.");
        }
    }

    /**
     * Docente criador: sempre, a partir da publicação. Aluno (já verificado como elegível):
     * SEMPRE a partir da abertura, APOS_ENCERRAR só encerrada, NUNCA nunca.
     */
    public boolean podeVerResultado(Votacao v, Usuario u) {
        EstadoVotacao estado = v.estado(clock.instant());
        if (u.isDocenteAtivo()) {
            return v.pertenceA(u.getId()) && estado != EstadoVotacao.RASCUNHO;
        }
        if (u.isAlunoAtivo()) {
            return switch (v.getVisibilidadeResultado()) {
                case SEMPRE -> estado == EstadoVotacao.ABERTA || estado == EstadoVotacao.ENCERRADA;
                case APOS_ENCERRAR -> estado == EstadoVotacao.ENCERRADA;
                case NUNCA -> false;
            };
        }
        return false;
    }
}
