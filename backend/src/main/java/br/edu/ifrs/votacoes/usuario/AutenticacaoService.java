package br.edu.ifrs.votacoes.usuario;

import java.time.Clock;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.edu.ifrs.votacoes.dominio.DominioService;
import br.edu.ifrs.votacoes.erro.ApiException;
import br.edu.ifrs.votacoes.seguranca.LimiteTentativas;
import br.edu.ifrs.votacoes.usuario.AuthDtos.CadastroRequest;

/** Cadastro, login e troca de senha (seções 2.1 a 2.3). */
@Service
public class AutenticacaoService {

    static final String MSG_CREDENCIAIS = "E-mail ou senha incorretos.";

    private final UsuarioRepository repo;
    private final DominioService dominios;
    private final Senhas senhas;
    private final LimiteTentativas limite;
    private final Clock clock;

    public AutenticacaoService(UsuarioRepository repo, DominioService dominios, Senhas senhas,
            LimiteTentativas limite, Clock clock) {
        this.repo = repo;
        this.dominios = dominios;
        this.senhas = senhas;
        this.limite = limite;
        this.clock = clock;
    }

    /** Aluno fica ATIVO; docente fica PENDENTE_APROVACAO. Nunca cria ADMIN. */
    @Transactional
    public Usuario cadastrar(CadastroRequest req) {
        if (req.papel() == Papel.ADMIN) {
            throw ApiException.validacao("papel", "deve ser ALUNO ou DOCENTE");
        }
        String email = Senhas.normalizarEmail(req.email());
        String matricula = req.matricula().trim();
        String hash = senhas.gerarHash(req.senha(), "senha");
        dominios.exigirAceito(email);
        if (repo.existsByEmail(email)) {
            throw ApiException.conflito("Este e-mail já está cadastrado.");
        }
        if (repo.existsByMatricula(matricula)) {
            throw ApiException.conflito("Esta matrícula já está cadastrada.");
        }
        StatusConta status = req.papel() == Papel.ALUNO ? StatusConta.ATIVO : StatusConta.PENDENTE_APROVACAO;
        try {
            return repo.saveAndFlush(new Usuario(email, req.nome().trim(), matricula, req.papel(), status, hash,
                    clock.instant()));
        } catch (DataIntegrityViolationException e) {
            // Cadastro simultâneo com o mesmo e-mail ou matrícula.
            throw ApiException.conflito("E-mail ou matrícula já cadastrados.");
        }
    }

    /**
     * Login com e-mail e senha. O domínio é conferido primeiro, só a partir do e-mail digitado (não
     * depende de a conta existir); depois a senha, sempre com uma comparação BCrypt, exista ou não a
     * conta. Contas em qualquer status entram (pendente/rejeitado só veem a tela de espera).
     */
    @Transactional(readOnly = true)
    public Usuario login(String emailBruto, String senha) {
        String email = Senhas.normalizarEmail(emailBruto);
        // Limite por e-mail, independente do IP; toda tentativa conta (sucesso não zera).
        limite.exigir("login:" + email, LimiteTentativas.LOGIN_POR_EMAIL);
        if (!AdminFixo.EMAIL.equals(email) && email.contains("@")) {
            dominios.exigirAceito(email);
        }
        Usuario u = repo.findByEmail(email).orElse(null);
        // confere() roda o BCrypt mesmo sem conta (hash fictício): mesmo custo nos dois casos.
        boolean ok = senhas.confere(senha, u == null ? null : u.getSenhaHash());
        if (!ok || u == null) {
            throw ApiException.naoAutenticado(MSG_CREDENCIAIS);
        }
        return u;
    }

    @Transactional
    public void trocarSenha(Long usuarioId, String senhaAtual, String novaSenha) {
        Usuario u = repo.findById(usuarioId)
                .orElseThrow(() -> ApiException.naoEncontrado("Usuário não encontrado."));
        if (u.isAdmin()) {
            throw ApiException.semPermissao("A senha do administrador não pode ser alterada.");
        }
        String novoHash = senhas.gerarHash(novaSenha, "novaSenha");
        if (!senhas.confere(senhaAtual, u.getSenhaHash())) {
            throw ApiException.regraNegocio("A senha atual está incorreta.");
        }
        u.setSenhaHash(novoHash);
    }
}
