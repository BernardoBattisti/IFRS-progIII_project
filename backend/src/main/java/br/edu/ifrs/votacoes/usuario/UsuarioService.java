package br.edu.ifrs.votacoes.usuario;

import java.time.Clock;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.edu.ifrs.votacoes.config.AppProperties;
import br.edu.ifrs.votacoes.erro.ApiException;

@Service
public class UsuarioService {

    private final UsuarioRepository repo;
    private final AppProperties props;
    private final Clock clock;

    public UsuarioService(UsuarioRepository repo, AppProperties props, Clock clock) {
        this.repo = repo;
        this.props = props;
        this.clock = clock;
    }

    /**
     * Login vindo do Google (ou do login de desenvolvimento): aplica a lista de domínios aceitos,
     * cria a conta no primeiro acesso como CADASTRO_INCOMPLETO e promove e-mails de APP_ADMIN_EMAILS.
     */
    @Transactional
    public Usuario login(String emailBruto, String nome, String fotoUrl, String googleSub) {
        if (emailBruto == null || emailBruto.isBlank() || !emailBruto.contains("@")) {
            throw new LoginNegadoException("email_invalido", "E-mail inválido.");
        }
        String email = emailBruto.trim().toLowerCase(Locale.ROOT);
        String dominio = email.substring(email.lastIndexOf('@') + 1);
        var dominios = props.dominiosPermitidos();
        if (!dominios.isEmpty() && !dominios.contains(dominio)) {
            throw new LoginNegadoException("dominio_nao_permitido",
                    "O domínio de e-mail \"" + dominio + "\" não é aceito por este sistema.");
        }

        Usuario usuario = (googleSub != null ? repo.findByGoogleSub(googleSub) : java.util.Optional.<Usuario>empty())
                .or(() -> repo.findByEmail(email))
                .orElseGet(() -> new Usuario(email, limitar(nomeOuEmail(nome, email), TAM_NOME), clock.instant()));

        // Conta já vinculada a outra identidade Google com o mesmo e-mail: não assume a conta.
        if (googleSub != null && usuario.getGoogleSub() != null && !googleSub.equals(usuario.getGoogleSub())) {
            throw new LoginNegadoException("conta_divergente",
                    "Este e-mail já está vinculado a outra conta Google.");
        }
        if (nome != null && !nome.isBlank()) {
            usuario.setNome(limitar(nome.trim(), TAM_NOME));
        }
        if (fotoUrl != null && !fotoUrl.isBlank()) {
            usuario.setFotoUrl(fotoUrl.length() <= TAM_FOTO ? fotoUrl : null);
        }
        if (googleSub != null && usuario.getGoogleSub() == null) {
            usuario.setGoogleSub(googleSub);
        }
        if (props.emailsAdmin().contains(email)) {
            usuario.setPapel(Papel.ADMIN);
            usuario.setStatus(StatusConta.ATIVO);
        }
        return repo.save(usuario);
    }

    private static final int TAM_NOME = 200;
    private static final int TAM_FOTO = 1000;

    private static String limitar(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }

    private static String nomeOuEmail(String nome, String email) {
        return (nome == null || nome.isBlank()) ? email.substring(0, email.indexOf('@')) : nome.trim();
    }

    @Transactional(readOnly = true)
    public Usuario buscar(Long id) {
        return repo.findById(id).orElseThrow(() -> ApiException.naoEncontrado("Usuário não encontrado."));
    }

    @Transactional
    public Usuario concluirCadastro(Long usuarioId, CadastroRequest req) {
        Usuario u = buscar(usuarioId);
        if (u.getStatus() != StatusConta.CADASTRO_INCOMPLETO) {
            throw ApiException.semPermissao("O cadastro desta conta já foi concluído.");
        }
        if (req.papel() == Papel.ADMIN) {
            throw ApiException.validacao("papel", "deve ser ALUNO ou DOCENTE");
        }
        String matricula = req.matricula().trim();
        if (repo.existsByMatricula(matricula)) {
            throw ApiException.conflito("Esta matrícula já está cadastrada.");
        }
        u.setMatricula(matricula);
        u.setPapel(req.papel());
        u.setStatus(req.papel() == Papel.ALUNO ? StatusConta.ATIVO : StatusConta.PENDENTE_APROVACAO);
        return repo.saveAndFlush(u);
    }

    @Transactional(readOnly = true)
    public List<Usuario> listar(StatusConta status, Papel papel) {
        return repo.filtrar(status, papel);
    }

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
