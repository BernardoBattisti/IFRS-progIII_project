package br.edu.ifrs.votacoes.usuario;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.edu.ifrs.votacoes.erro.ApiException;

@Service
public class UsuarioService {

    private final UsuarioRepository repo;

    public UsuarioService(UsuarioRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public Usuario buscar(Long id) {
        return repo.findById(id).orElseThrow(() -> ApiException.naoEncontrado("Usuário não encontrado."));
    }

    @Transactional(readOnly = true)
    public List<Usuario> listar(StatusConta status, Papel papel) {
        return repo.filtrar(status, papel);
    }

    /** Aprova/rejeita docente pendente. O admin (e qualquer não docente) nunca passa por aqui: 422. */
    @Transactional
    public Usuario decidirDocente(Long id, boolean aprovar) {
        Usuario u = buscar(id);
        if (u.getPapel() != Papel.DOCENTE || u.getStatus() != StatusConta.PENDENTE_APROVACAO) {
            throw ApiException.regraNegocio("Somente docentes com aprovação pendente podem ser "
                    + (aprovar ? "aprovados." : "rejeitados."));
        }
        u.setStatus(aprovar ? StatusConta.ATIVO : StatusConta.REJEITADO);
        return u;
    }
}
